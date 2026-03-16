const { createDbConnection } = require("./connection");
const { runSchemaMigration } = require("./migrate");

function toCode(prefix, id, width = 6) {
  return `${prefix}-${String(id).padStart(width, "0")}`;
}

function temporaryCode(prefix) {
  const randomSuffix = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");
  return `${prefix}-TMP-${Date.now()}-${randomSuffix}`;
}

function parsePayload(rawJson) {
  try {
    return JSON.parse(rawJson);
  } catch {
    return null;
  }
}

function computeAgingBucket(dateBilledIso, isUncollectible = false) {
  if (isUncollectible) {
    return "uncollectible";
  }

  if (!dateBilledIso) {
    return "current";
  }

  const dateBilled = new Date(dateBilledIso);
  if (Number.isNaN(dateBilled.getTime())) {
    return "current";
  }

  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  const dayDiff = Math.floor((now.getTime() - dateBilled.getTime()) / msPerDay);

  if (dayDiff >= 120) return "120p";
  if (dayDiff >= 90) return "90d";
  if (dayDiff >= 60) return "60d";
  if (dayDiff >= 30) return "30d";
  return "current";
}

function resolveImportTarget(db, options) {
  if (options.importLogId) {
    const row = db
      .prepare("SELECT id, import_code, import_status FROM data_import_log WHERE id = ?")
      .get(options.importLogId);

    if (!row) {
      throw new Error(`Import log not found for id ${options.importLogId}`);
    }

    return row;
  }

  if (options.importCode) {
    const row = db
      .prepare("SELECT id, import_code, import_status FROM data_import_log WHERE import_code = ?")
      .get(options.importCode);

    if (!row) {
      throw new Error(`Import log not found for code ${options.importCode}`);
    }

    return row;
  }

  const latest = db
    .prepare(
      `SELECT id, import_code, import_status
       FROM data_import_log
       WHERE import_status IN ('succeeded', 'partial')
       ORDER BY started_at DESC
       LIMIT 1`
    )
    .get();

  if (!latest) {
    throw new Error("No succeeded or partial import logs found to promote.");
  }

  return latest;
}

function promoteStagedBilling(options = {}) {
  runSchemaMigration();

  const db = createDbConnection();

  const selectStagedRowsByImport = db.prepare(
    `SELECT id, source_row_number, normalized_payload_json
     FROM staging_billing_rows
     WHERE import_log_id = ? AND processing_status = 'processed'
     ORDER BY source_row_number ASC`
  );

  const selectClientByEmployer = db.prepare(
    `SELECT id FROM clients WHERE employer_no = ? AND name = ? LIMIT 1`
  );
  const selectClientByNameDob = db.prepare(
    `SELECT id FROM clients WHERE name = ? AND COALESCE(date_of_birth, '') = COALESCE(?, '') LIMIT 1`
  );
  const insertClient = db.prepare(
    `INSERT INTO clients (client_code, name, date_of_birth, employer_no, contact_name, status)
     VALUES (?, ?, ?, ?, ?, 'active')`
  );
  const updateClientCode = db.prepare("UPDATE clients SET client_code = ? WHERE id = ?");

  const selectCompanyByName = db.prepare("SELECT id FROM companies WHERE name = ? LIMIT 1");
  const insertCompany = db.prepare(
    `INSERT INTO companies (company_code, name, status)
     VALUES (?, ?, 'active')`
  );
  const updateCompanyCode = db.prepare("UPDATE companies SET company_code = ? WHERE id = ?");

  const selectInvoiceByRef = db.prepare(
    `SELECT id FROM invoices
     WHERE client_id = ?
       AND company_id = ?
       AND date_billed = ?
       AND service_date = ?
       AND billed_amount_cents = ?
       AND reference_no = ?
     LIMIT 1`
  );

  const selectInvoiceWithoutRef = db.prepare(
    `SELECT id FROM invoices
     WHERE client_id = ?
       AND company_id = ?
       AND date_billed = ?
       AND service_date = ?
       AND billed_amount_cents = ?
       AND service_code = ?
       AND (reference_no IS NULL OR reference_no = '')
     LIMIT 1`
  );

  const insertInvoice = db.prepare(
    `INSERT INTO invoices (
      invoice_code,
      client_id,
      company_id,
      service_code,
      service_date,
      date_billed,
      billed_amount_cents,
      received_amount_cents,
      received_date,
      reference_no,
      rejection_code,
      aging_bucket,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`
  );

  const updateInvoiceCode = db.prepare("UPDATE invoices SET invoice_code = ? WHERE id = ?");

  const updateInvoice = db.prepare(
    `UPDATE invoices
     SET received_amount_cents = ?,
         received_date = ?,
         rejection_code = ?,
         aging_bucket = ?,
         status = 'active',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  );

  const selectPaymentByReference = db.prepare("SELECT id FROM payments WHERE reference_no = ? LIMIT 1");

  const selectPaymentWithoutReference = db.prepare(
    `SELECT id FROM payments
     WHERE payment_date = ?
       AND amount_received_cents = ?
       AND COALESCE(company_id, 0) = COALESCE(?, 0)
       AND (reference_no IS NULL OR reference_no = '')
     LIMIT 1`
  );

  const insertPayment = db.prepare(
    `INSERT INTO payments (
      payment_code,
      payment_date,
      amount_received_cents,
      reference_no,
      company_id,
      status,
      allocation_method
    ) VALUES (?, ?, ?, ?, ?, 'posted', 'manual')`
  );

  const updatePaymentCode = db.prepare("UPDATE payments SET payment_code = ? WHERE id = ?");

  const upsertInvoicePayment = db.prepare(
    `INSERT INTO invoice_payments (invoice_id, payment_id, amount_applied_cents)
     VALUES (?, ?, ?)
     ON CONFLICT(invoice_id, payment_id)
     DO UPDATE SET amount_applied_cents = excluded.amount_applied_cents`
  );

  const updateClientMetrics = db.prepare(
    `UPDATE clients
     SET total_outstanding_cents = COALESCE((
           SELECT SUM(CASE WHEN outstanding_amount_cents > 0 THEN outstanding_amount_cents ELSE 0 END)
           FROM invoices
           WHERE invoices.client_id = clients.id AND invoices.status IN ('active', 'approved')
         ), 0),
         days_past_due_max = (
           SELECT MAX(CAST(julianday('now') - julianday(date_billed) AS INTEGER))
           FROM invoices
           WHERE invoices.client_id = clients.id
             AND invoices.status IN ('active', 'approved')
             AND outstanding_amount_cents > 0
         ),
         last_payment_at = (
           SELECT MAX(payment_date)
           FROM payments p
           JOIN invoice_payments ip ON ip.payment_id = p.id
           JOIN invoices i ON i.id = ip.invoice_id
           WHERE i.client_id = clients.id
         ),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  );

  const updateImportLogNotes = db.prepare(
    `UPDATE data_import_log
     SET notes = TRIM(COALESCE(notes || ' ', '') || ?)
     WHERE id = ?`
  );

  try {
    const targetImport = resolveImportTarget(db, options);
    const stagedRows = selectStagedRowsByImport.all(targetImport.id);

    if (stagedRows.length === 0) {
      return {
        importLogId: targetImport.id,
        importCode: targetImport.import_code,
        promotedRows: 0,
        createdClients: 0,
        createdCompanies: 0,
        createdInvoices: 0,
        createdPayments: 0,
        linkedInvoicePayments: 0,
        skippedRows: 0,
      };
    }

    const stats = {
      promotedRows: 0,
      createdClients: 0,
      createdCompanies: 0,
      createdInvoices: 0,
      createdPayments: 0,
      linkedInvoicePayments: 0,
      skippedRows: 0,
    };

    const touchedClientIds = new Set();

    const transaction = db.transaction(() => {
      for (const row of stagedRows) {
        const payload = parsePayload(row.normalized_payload_json);
        if (!payload || !payload.clientName || !payload.company || !payload.serviceCode) {
          stats.skippedRows += 1;
          continue;
        }

        let client = null;
        if (payload.employerNo) {
          client = selectClientByEmployer.get(payload.employerNo, payload.clientName);
        }
        if (!client) {
          client = selectClientByNameDob.get(payload.clientName, payload.dateOfBirth);
        }
        if (!client) {
          const tempClientCode = temporaryCode("CLI");
          const inserted = insertClient.run(
            tempClientCode,
            payload.clientName,
            payload.dateOfBirth,
            payload.employerNo,
            payload.clientName
          );
          const clientId = Number(inserted.lastInsertRowid);
          updateClientCode.run(toCode("CLI", clientId), clientId);
          client = { id: clientId };
          stats.createdClients += 1;
        }

        let company = selectCompanyByName.get(payload.company);
        if (!company) {
          const tempCompanyCode = temporaryCode("COM");
          const inserted = insertCompany.run(tempCompanyCode, payload.company);
          const companyId = Number(inserted.lastInsertRowid);
          updateCompanyCode.run(toCode("COM", companyId), companyId);
          company = { id: companyId };
          stats.createdCompanies += 1;
        }

        const billedAmountCents = payload.billedAmountCents || 0;
        const receivedAmountCents = payload.receivedAmountCents || 0;
        const agingBucket = computeAgingBucket(payload.dateBilled, false);

        let invoice = null;
        if (payload.referenceNo) {
          invoice = selectInvoiceByRef.get(
            client.id,
            company.id,
            payload.dateBilled,
            payload.serviceDate,
            billedAmountCents,
            payload.referenceNo
          );
        } else {
          invoice = selectInvoiceWithoutRef.get(
            client.id,
            company.id,
            payload.dateBilled,
            payload.serviceDate,
            billedAmountCents,
            payload.serviceCode
          );
        }

        if (!invoice) {
          const tempInvoiceCode = temporaryCode("INV");
          const inserted = insertInvoice.run(
            tempInvoiceCode,
            client.id,
            company.id,
            payload.serviceCode,
            payload.serviceDate,
            payload.dateBilled,
            billedAmountCents,
            receivedAmountCents,
            payload.receivedDate,
            payload.referenceNo,
            payload.rejectionCode,
            agingBucket
          );
          const invoiceId = Number(inserted.lastInsertRowid);
          updateInvoiceCode.run(toCode("INV", invoiceId), invoiceId);
          invoice = { id: invoiceId };
          stats.createdInvoices += 1;
        } else {
          updateInvoice.run(
            receivedAmountCents,
            payload.receivedDate,
            payload.rejectionCode,
            agingBucket,
            invoice.id
          );
        }

        if (receivedAmountCents > 0 && payload.receivedDate) {
          let payment = null;

          if (payload.referenceNo) {
            payment = selectPaymentByReference.get(payload.referenceNo);
          } else {
            payment = selectPaymentWithoutReference.get(
              payload.receivedDate,
              receivedAmountCents,
              company.id
            );
          }

          if (!payment) {
            const tempPaymentCode = temporaryCode("PAY");
            const inserted = insertPayment.run(
              tempPaymentCode,
              payload.receivedDate,
              receivedAmountCents,
              payload.referenceNo,
              company.id
            );
            const paymentId = Number(inserted.lastInsertRowid);
            updatePaymentCode.run(toCode("PAY", paymentId), paymentId);
            payment = { id: paymentId };
            stats.createdPayments += 1;
          }

          upsertInvoicePayment.run(invoice.id, payment.id, receivedAmountCents);
          stats.linkedInvoicePayments += 1;
        }

        touchedClientIds.add(client.id);
        stats.promotedRows += 1;
      }

      for (const clientId of touchedClientIds) {
        updateClientMetrics.run(clientId);
      }

      const note = `Promotion summary: rows=${stats.promotedRows}, clients=${stats.createdClients}, companies=${stats.createdCompanies}, invoices=${stats.createdInvoices}, payments=${stats.createdPayments}, links=${stats.linkedInvoicePayments}, skipped=${stats.skippedRows}.`;
      updateImportLogNotes.run(note, targetImport.id);
    });

    transaction();

    return {
      importLogId: targetImport.id,
      importCode: targetImport.import_code,
      ...stats,
    };
  } finally {
    db.close();
  }
}

function parseCliArgs(argv) {
  const args = { importLogId: null, importCode: null };

  for (const arg of argv) {
    if (arg.startsWith("--import-log-id=")) {
      args.importLogId = Number(arg.split("=")[1]);
    } else if (arg.startsWith("--import-code=")) {
      args.importCode = arg.split("=")[1];
    }
  }

  return args;
}

if (require.main === module) {
  const options = parseCliArgs(process.argv.slice(2));

  try {
    const result = promoteStagedBilling(options);
    console.log("Staged billing promotion complete.");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Staged billing promotion failed.");
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  promoteStagedBilling,
};
