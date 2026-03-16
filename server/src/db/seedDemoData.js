const { runSchemaMigration } = require("./migrate");
const { createDbConnection } = require("./connection");

const CLIENT_COUNT = 10;
const INVOICES_PER_CLIENT = 15;
const MIN_PAYMENTS_PER_INVOICE = 10;
const MAX_PAYMENTS_PER_INVOICE = 20;

function createRng(seed = 20260316) {
  let value = seed >>> 0;
  return function next() {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function randomInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randomChoice(rng, values) {
  return values[Math.floor(rng() * values.length)];
}

function createPartition(rng, totalCents, parts) {
  if (parts <= 1) {
    return [totalCents];
  }

  const weights = [];
  for (let index = 0; index < parts; index += 1) {
    weights.push(rng() + 0.05);
  }

  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  const values = [];
  let allocated = 0;

  for (let index = 0; index < parts; index += 1) {
    if (index === parts - 1) {
      values.push(totalCents - allocated);
      break;
    }

    const next = Math.max(1, Math.floor((totalCents * weights[index]) / weightTotal));
    values.push(next);
    allocated += next;
  }

  return values;
}

function computeAgingBucket(outstandingCents, dateBilledIso, nowDate) {
  if (outstandingCents <= 0) {
    return "current";
  }

  const billedDate = new Date(dateBilledIso);
  const ageDays = Math.max(0, Math.floor((nowDate - billedDate) / 86400000));

  if (ageDays <= 29) {
    return "current";
  }

  if (ageDays <= 59) {
    return "30d";
  }

  if (ageDays <= 89) {
    return "60d";
  }

  if (ageDays <= 119) {
    return "90d";
  }

  return "120p";
}

function seedDemoData() {
  runSchemaMigration();
  const db = createDbConnection();
  const rng = createRng();

  const insertUser = db.prepare(`
    INSERT INTO users (username, email, password_hash, role, first_name, last_name, mfa_enabled, is_active)
    VALUES (@username, @email, @passwordHash, @role, @firstName, @lastName, 1, 1)
  `);

  const insertCompany = db.prepare(`
    INSERT INTO companies (company_code, external_id, name, status)
    VALUES (@companyCode, @externalId, @name, 'active')
  `);

  const insertClient = db.prepare(`
    INSERT INTO clients (
      client_code,
      external_id,
      name,
      employer_no,
      contact_name,
      status,
      created_by_user_id,
      updated_by_user_id,
      is_verified
    ) VALUES (
      @clientCode,
      @externalId,
      @name,
      @employerNo,
      @contactName,
      @status,
      @createdBy,
      @updatedBy,
      1
    )
  `);

  const insertInvoice = db.prepare(`
    INSERT INTO invoices (
      invoice_code,
      external_invoice_id,
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
      is_uncollectible,
      status,
      approval_notes,
      created_by_user_id,
      updated_by_user_id,
      approved_by_user_id,
      approved_at
    ) VALUES (
      @invoiceCode,
      @externalInvoiceId,
      @clientId,
      @companyId,
      @serviceCode,
      @serviceDate,
      @dateBilled,
      @billedAmountCents,
      @receivedAmountCents,
      @receivedDate,
      @referenceNo,
      @rejectionCode,
      @agingBucket,
      @isUncollectible,
      @status,
      @approvalNotes,
      @createdBy,
      @updatedBy,
      @approvedBy,
      @approvedAt
    )
  `);

  const insertPayment = db.prepare(`
    INSERT INTO payments (
      payment_code,
      external_payment_id,
      payment_date,
      amount_received_cents,
      reference_no,
      company_id,
      status,
      allocation_method,
      reconciliation_status,
      notes,
      created_by_user_id,
      updated_by_user_id,
      approved_by_user_id,
      approved_at
    ) VALUES (
      @paymentCode,
      @externalPaymentId,
      @paymentDate,
      @amountReceivedCents,
      @referenceNo,
      @companyId,
      'posted',
      'manual',
      'matched',
      @notes,
      @createdBy,
      @updatedBy,
      @approvedBy,
      @approvedAt
    )
  `);

  const insertInvoicePayment = db.prepare(`
    INSERT INTO invoice_payments (
      invoice_id,
      payment_id,
      amount_applied_cents,
      created_by_user_id
    ) VALUES (
      @invoiceId,
      @paymentId,
      @amountAppliedCents,
      @createdBy
    )
  `);

  const insertExpenseCategory = db.prepare(`
    INSERT INTO expense_categories (category_code, name, description, created_by_user_id)
    VALUES (@categoryCode, @name, @description, @createdBy)
  `);

  const insertExpense = db.prepare(`
    INSERT INTO expenses (
      expense_code,
      external_expense_id,
      vendor_name,
      expense_date,
      category_id,
      amount_cents,
      status,
      budget_code,
      notes,
      created_by_user_id,
      updated_by_user_id,
      approved_by_user_id,
      approved_at
    ) VALUES (
      @expenseCode,
      @externalExpenseId,
      @vendorName,
      @expenseDate,
      @categoryId,
      @amountCents,
      @status,
      @budgetCode,
      @notes,
      @createdBy,
      @updatedBy,
      @approvedBy,
      @approvedAt
    )
  `);

  const insertReviewQueue = db.prepare(`
    INSERT INTO review_queue (
      entity_type,
      entity_internal_id,
      created_by_user_id,
      queue_status,
      approval_notes,
      reviewed_by_user_id,
      reviewed_at,
      is_selected_for_batch
    ) VALUES (
      @entityType,
      @entityInternalId,
      @createdBy,
      @queueStatus,
      @approvalNotes,
      @reviewedBy,
      @reviewedAt,
      0
    )
  `);

  const insertAuditLog = db.prepare(`
    INSERT INTO audit_log (
      audit_code,
      event_type,
      entity_type,
      entity_code,
      actor_user_id,
      actor_name,
      field_name,
      before_value,
      after_value,
      change_reason,
      is_approved_action,
      event_at
    ) VALUES (
      @auditCode,
      @eventType,
      @entityType,
      @entityCode,
      @actorUserId,
      @actorName,
      @fieldName,
      @beforeValue,
      @afterValue,
      @changeReason,
      @isApprovedAction,
      @eventAt
    )
  `);

  const transaction = db.transaction(() => {
    db.exec(`
      DELETE FROM invoice_payments;
      DELETE FROM review_queue;
      DELETE FROM audit_log;
      DELETE FROM payments;
      DELETE FROM invoices;
      DELETE FROM expenses;
      DELETE FROM expense_categories;
      DELETE FROM clients;
      DELETE FROM companies;
      DELETE FROM users;
      DELETE FROM migration_rejects;
      DELETE FROM staging_billing_rows;
      DELETE FROM staging_expense_rows;
      DELETE FROM data_import_log;

      DELETE FROM sqlite_sequence
      WHERE name IN (
        'users',
        'clients',
        'companies',
        'invoices',
        'payments',
        'invoice_payments',
        'expense_categories',
        'expenses',
        'review_queue',
        'audit_log',
        'data_import_log',
        'staging_billing_rows',
        'staging_expense_rows',
        'migration_rejects'
      );
    `);

    const users = [
      { username: "admin", email: "admin@arbilling.local", role: "admin", firstName: "Dana", lastName: "Reyes" },
      { username: "dentry1", email: "alex@arbilling.local", role: "data_entry", firstName: "Alex", lastName: "Parker" },
      { username: "dentry2", email: "mia@arbilling.local", role: "data_entry", firstName: "Mia", lastName: "Ibarra" },
      { username: "viewer", email: "viewer@arbilling.local", role: "viewer", firstName: "Casey", lastName: "Vega" },
    ].map((user) => ({ ...user, passwordHash: "not-set" }));

    const userIds = users.map((user) => insertUser.run(user).lastInsertRowid);
    const adminId = Number(userIds[0]);
    const entryIds = [Number(userIds[1]), Number(userIds[2])];

    const companies = [
      "BlueCross",
      "Aetna",
      "Cigna",
      "Humana",
      "United Healthcare",
    ];

    const companyIds = companies.map((name, index) => Number(insertCompany.run({
      companyCode: `COM-${String(index + 1).padStart(3, "0")}`,
      externalId: `EXT-COM-${index + 1}`,
      name,
    }).lastInsertRowid));

    const categoryIds = [
      { code: "OPS", name: "Operations" },
      { code: "TECH", name: "Technology" },
      { code: "SUP", name: "Supplies" },
    ].map((category) => Number(insertExpenseCategory.run({
      categoryCode: category.code,
      name: category.name,
      description: `${category.name} expenses`,
      createdBy: adminId,
    }).lastInsertRowid));

    const now = new Date();
    const yearStart = addDays(now, -364);
    const clientIds = [];
    const invoiceRecords = [];
    const paymentRecords = [];
    const expenseRecords = [];

    for (let clientIndex = 0; clientIndex < CLIENT_COUNT; clientIndex += 1) {
      const status = randomChoice(rng, ["active", "active", "active", "at_risk", "review"]);
      const clientCode = `CLI-${String(clientIndex + 1).padStart(3, "0")}`;
      const clientId = Number(insertClient.run({
        clientCode,
        externalId: `EXT-${clientCode}`,
        name: `Client ${clientIndex + 1}`,
        employerNo: `EMP-${5000 + clientIndex}`,
        contactName: `${String.fromCharCode(65 + clientIndex)}. Contact`,
        status,
        createdBy: adminId,
        updatedBy: adminId,
      }).lastInsertRowid);

      clientIds.push(clientId);

      for (let invoiceIndex = 0; invoiceIndex < INVOICES_PER_CLIENT; invoiceIndex += 1) {
        const serial = clientIndex * INVOICES_PER_CLIENT + invoiceIndex + 1;
        const invoiceCode = `INV-${String(serial).padStart(5, "0")}`;
        const billedAmountCents = randomInt(rng, 50000, 280000);
        const paymentCount = randomInt(rng, MIN_PAYMENTS_PER_INVOICE, MAX_PAYMENTS_PER_INVOICE);
        const targetReceivedCents = Math.floor(billedAmountCents * (0.4 + rng() * 0.6));
        const paymentParts = createPartition(rng, targetReceivedCents, paymentCount);
        const billedOffset = Math.floor((serial / (CLIENT_COUNT * INVOICES_PER_CLIENT)) * 364);
        const dateBilled = toIsoDate(addDays(yearStart, billedOffset));
        const serviceDate = toIsoDate(addDays(new Date(dateBilled), -randomInt(rng, 3, 21)));
        const companyId = randomChoice(rng, companyIds);

        const invoiceInsert = insertInvoice.run({
          invoiceCode,
          externalInvoiceId: `EXT-${invoiceCode}`,
          clientId,
          companyId,
          serviceCode: `SRV-${String(randomInt(rng, 101, 999))}`,
          serviceDate,
          dateBilled,
          billedAmountCents,
          receivedAmountCents: 0,
          receivedDate: null,
          referenceNo: `REF-${invoiceCode}`,
          rejectionCode: null,
          agingBucket: "current",
          isUncollectible: 0,
          status: "approved",
          approvalNotes: "Seeded invoice",
          createdBy: randomChoice(rng, entryIds),
          updatedBy: adminId,
          approvedBy: adminId,
          approvedAt: toIsoDate(addDays(new Date(dateBilled), randomInt(rng, 0, 10))),
        });

        const invoiceId = Number(invoiceInsert.lastInsertRowid);
        let maxPaymentDate = null;

        paymentParts.forEach((amount, paymentIndex) => {
          const paymentDate = toIsoDate(addDays(new Date(dateBilled), randomInt(rng, 2, 150)));
          const paymentCode = `PAY-${String(serial).padStart(5, "0")}-${String(paymentIndex + 1).padStart(2, "0")}`;
          const paymentInsert = insertPayment.run({
            paymentCode,
            externalPaymentId: `EXT-${paymentCode}`,
            paymentDate,
            amountReceivedCents: amount,
            referenceNo: `RF-${paymentCode}`,
            companyId,
            notes: "Seeded payment",
            createdBy: randomChoice(rng, entryIds),
            updatedBy: adminId,
            approvedBy: adminId,
            approvedAt: paymentDate,
          });

          const paymentId = Number(paymentInsert.lastInsertRowid);
          insertInvoicePayment.run({
            invoiceId,
            paymentId,
            amountAppliedCents: amount,
            createdBy: adminId,
          });

          paymentRecords.push({ paymentId, paymentCode, paymentDate, amount, invoiceId, invoiceCode });

          if (!maxPaymentDate || paymentDate > maxPaymentDate) {
            maxPaymentDate = paymentDate;
          }
        });

        const outstanding = billedAmountCents - targetReceivedCents;
        const agingBucket = computeAgingBucket(outstanding, dateBilled, now);
        const invoiceStatus = outstanding > 0 ? randomChoice(rng, ["active", "approved", "pending_review"]) : "approved";

        db.prepare(`
          UPDATE invoices
          SET
            received_amount_cents = ?,
            received_date = ?,
            aging_bucket = ?,
            status = ?,
            updated_by_user_id = ?
          WHERE id = ?
        `).run(targetReceivedCents, maxPaymentDate, agingBucket, invoiceStatus, adminId, invoiceId);

        invoiceRecords.push({
          invoiceId,
          invoiceCode,
          clientId,
          dateBilled,
          billedAmountCents,
          receivedAmountCents: targetReceivedCents,
          outstandingCents: outstanding,
          firstPaymentDate: paymentRecords[paymentRecords.length - paymentCount].paymentDate,
          maxPaymentDate,
          status: invoiceStatus,
        });
      }
    }

    for (let index = 0; index < 40; index += 1) {
      const expenseDate = toIsoDate(addDays(yearStart, randomInt(rng, 0, 364)));
      const expenseCode = `EXP-${String(index + 1).padStart(4, "0")}`;
      const amountCents = randomInt(rng, 2500, 120000);
      const status = randomChoice(rng, ["approved", "pending_review", "rejected"]);
      const entryUserId = randomChoice(rng, entryIds);
      const expenseId = Number(insertExpense.run({
        expenseCode,
        externalExpenseId: `EXT-${expenseCode}`,
        vendorName: `Vendor ${index + 1}`,
        expenseDate,
        categoryId: randomChoice(rng, categoryIds),
        amountCents,
        status,
        budgetCode: `BUD-${String(randomInt(rng, 100, 999))}`,
        notes: "Seeded expense",
        createdBy: entryUserId,
        updatedBy: adminId,
        approvedBy: adminId,
        approvedAt: status === "approved" ? expenseDate : null,
      }).lastInsertRowid);

      expenseRecords.push({ expenseId, expenseCode, status, expenseDate, amountCents, entryUserId });
    }

    const reviewableInvoices = invoiceRecords.slice(0, 70);
    reviewableInvoices.forEach((invoice, index) => {
      const queueStatus = randomChoice(rng, ["pending", "pending", "approved", "denied"]);
      const reviewedAt = queueStatus === "pending" ? null : toIsoDate(addDays(new Date(invoice.dateBilled), randomInt(rng, 15, 60)));
      const queueRow = insertReviewQueue.run({
        entityType: "invoice",
        entityInternalId: invoice.invoiceId,
        createdBy: randomChoice(rng, entryIds),
        queueStatus,
        approvalNotes: queueStatus === "denied" ? "Missing source attachment" : "Reviewed",
        reviewedBy: queueStatus === "pending" ? null : adminId,
        reviewedAt,
      });

      insertAuditLog.run({
        auditCode: `AUD-INV-${String(index + 1).padStart(4, "0")}`,
        eventType: queueStatus === "denied" ? "denial" : "approval",
        entityType: "invoice",
        entityCode: invoice.invoiceCode,
        actorUserId: adminId,
        actorName: "Dana Reyes",
        fieldName: "queue_status",
        beforeValue: "pending",
        afterValue: queueStatus,
        changeReason: "Seeded review action",
        isApprovedAction: queueStatus === "approved" ? 1 : 0,
        eventAt: reviewedAt || invoice.dateBilled,
      });

      if (!queueRow.lastInsertRowid) {
        throw new Error("Failed to insert review queue invoice row");
      }
    });

    paymentRecords.slice(0, 40).forEach((payment, index) => {
      const queueStatus = randomChoice(rng, ["pending", "approved", "denied"]);
      const reviewedAt = queueStatus === "pending" ? null : toIsoDate(addDays(new Date(payment.paymentDate), randomInt(rng, 1, 14)));
      insertReviewQueue.run({
        entityType: "payment",
        entityInternalId: payment.paymentId,
        createdBy: randomChoice(rng, entryIds),
        queueStatus,
        approvalNotes: queueStatus === "denied" ? "Payment slip mismatch" : "Reviewed",
        reviewedBy: queueStatus === "pending" ? null : adminId,
        reviewedAt,
      });

      insertAuditLog.run({
        auditCode: `AUD-PAY-${String(index + 1).padStart(4, "0")}`,
        eventType: queueStatus === "denied" ? "denial" : "approval",
        entityType: "payment",
        entityCode: payment.paymentCode,
        actorUserId: adminId,
        actorName: "Dana Reyes",
        fieldName: "reconciliation_status",
        beforeValue: "unmatched",
        afterValue: queueStatus === "approved" ? "matched" : "variance",
        changeReason: "Seeded review action",
        isApprovedAction: queueStatus === "approved" ? 1 : 0,
        eventAt: reviewedAt || payment.paymentDate,
      });
    });

    expenseRecords.slice(0, 30).forEach((expense, index) => {
      const queueStatus = randomChoice(rng, ["pending", "approved", "denied"]);
      const reviewedAt = queueStatus === "pending" ? null : toIsoDate(addDays(new Date(expense.expenseDate), randomInt(rng, 1, 10)));
      insertReviewQueue.run({
        entityType: "expense",
        entityInternalId: expense.expenseId,
        createdBy: expense.entryUserId,
        queueStatus,
        approvalNotes: queueStatus === "denied" ? "Receipt not attached" : "Reviewed",
        reviewedBy: queueStatus === "pending" ? null : adminId,
        reviewedAt,
      });

      insertAuditLog.run({
        auditCode: `AUD-EXP-${String(index + 1).padStart(4, "0")}`,
        eventType: queueStatus === "denied" ? "denial" : "approval",
        entityType: "expense",
        entityCode: expense.expenseCode,
        actorUserId: adminId,
        actorName: "Dana Reyes",
        fieldName: "status",
        beforeValue: "pending_review",
        afterValue: queueStatus,
        changeReason: "Seeded review action",
        isApprovedAction: queueStatus === "approved" ? 1 : 0,
        eventAt: reviewedAt || expense.expenseDate,
      });
    });

    const invoiceSummaryByClient = db.prepare(`
      SELECT
        client_id,
        SUM(outstanding_amount_cents) AS total_outstanding,
        MAX(CASE WHEN outstanding_amount_cents > 0 THEN CAST(julianday('now') - julianday(date_billed) AS INTEGER) ELSE 0 END) AS max_days_past_due,
        MAX(received_date) AS last_payment_at,
        SUM(
          CASE
            WHEN received_amount_cents >= billed_amount_cents
             AND received_date IS NOT NULL
             AND julianday(received_date) - julianday(date_billed) <= 30
            THEN 1
            ELSE 0
          END
        ) AS paid_on_time,
        COUNT(*) AS invoice_count
      FROM invoices
      GROUP BY client_id
    `).all();

    const updateClientRollup = db.prepare(`
      UPDATE clients
      SET
        total_outstanding_cents = @totalOutstanding,
        on_time_payment_rate_bps = @onTimeRateBps,
        days_past_due_max = @daysPastDueMax,
        last_payment_at = @lastPaymentAt,
        updated_by_user_id = @updatedBy
      WHERE id = @clientId
    `);

    invoiceSummaryByClient.forEach((summary) => {
      const paidOnTime = Number(summary.paid_on_time || 0);
      const invoiceCount = Number(summary.invoice_count || 0);
      const rate = invoiceCount ? Math.round((paidOnTime / invoiceCount) * 10000) : 0;

      updateClientRollup.run({
        totalOutstanding: Number(summary.total_outstanding || 0),
        onTimeRateBps: rate,
        daysPastDueMax: Number(summary.max_days_past_due || 0),
        lastPaymentAt: summary.last_payment_at,
        updatedBy: adminId,
        clientId: summary.client_id,
      });
    });
  });

  try {
    transaction();

    const counts = {
      clients: db.prepare("SELECT COUNT(*) AS count FROM clients").get().count,
      invoices: db.prepare("SELECT COUNT(*) AS count FROM invoices").get().count,
      payments: db.prepare("SELECT COUNT(*) AS count FROM payments").get().count,
      invoicePayments: db.prepare("SELECT COUNT(*) AS count FROM invoice_payments").get().count,
      reviewQueue: db.prepare("SELECT COUNT(*) AS count FROM review_queue").get().count,
    };

    console.log("Demo seed complete.");
    console.log(JSON.stringify(counts, null, 2));
  } finally {
    db.close();
  }
}

if (require.main === module) {
  try {
    seedDemoData();
  } catch (error) {
    console.error("Demo seed failed.");
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  seedDemoData,
};
