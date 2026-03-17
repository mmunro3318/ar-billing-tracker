const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { createDbConnection } = require("./db/connection");
const { runSchemaMigration } = require("./db/migrate");
const { seedDemoData } = require("./db/seedDemoData");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 4000;

runSchemaMigration();
const db = createDbConnection();

function formatCurrency(cents) {
  const dollars = Number(cents || 0) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(dollars);
}

function toCents(value) {
  if (typeof value === "number") {
    return Math.round(value * 100);
  }

  const text = String(value || "").trim().replace(/[$,]/g, "");
  if (!text) {
    return 0;
  }

  const parsed = Number(text);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.round(parsed * 100);
}

function toIsoDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function asDateLabel(value) {
  if (!value) {
    return "Unknown date";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function mapClientStatus(status) {
  const value = String(status || "").toLowerCase();

  if (value === "active") {
    return { label: "Active", tone: "success" };
  }

  if (value === "at_risk") {
    return { label: "At risk", tone: "warning" };
  }

  if (value === "review") {
    return { label: "Review", tone: "accent" };
  }

  return { label: "Inactive", tone: "muted" };
}

function mapReviewStatus(status) {
  const value = String(status || "").toLowerCase();

  if (value === "approved") {
    return { label: "Approved", tone: "success" };
  }

  if (value === "denied") {
    return { label: "Denied", tone: "danger" };
  }

  if (value === "archived") {
    return { label: "Queued", tone: "muted" };
  }

  return { label: "Needs review", tone: "warning" };
}

function mapReviewType(entityType) {
  if (entityType === "payment") {
    return "Payment entry";
  }

  if (entityType === "expense") {
    return "Expense add";
  }

  return "Invoice edit";
}

function mapInvoiceStatus(status) {
  const value = String(status || "").toLowerCase();

  if (value === "approved" || value === "active") {
    return { label: "Ready", tone: "success" };
  }

  if (value === "pending_review" || value === "draft") {
    return { label: "Needs review", tone: "warning" };
  }

  if (value === "rejected") {
    return { label: "Denied", tone: "danger" };
  }

  return { label: "Queued", tone: "muted" };
}

function normalizeBucketKey(value) {
  const key = String(value || "").toLowerCase();

  if (key === "current") {
    return "current";
  }

  if (key === "30-days" || key === "30d") {
    return "30d";
  }

  if (key === "60-days" || key === "60d") {
    return "60d";
  }

  if (key === "90-days" || key === "90d") {
    return "90d";
  }

  if (key === "120-plus-days" || key === "120p" || key === "120") {
    return "120p";
  }

  if (key === "uncollectible") {
    return "uncollectible";
  }

  return "current";
}

function mapInvoiceRow(row) {
  return {
    id: row.invoice_code,
    client: row.client_name,
    serviceDate: asDateLabel(row.date_billed),
    company: row.company_name,
    billedAmount: formatCurrency(row.billed_amount_cents),
    receivedAmount: formatCurrency(row.received_amount_cents),
    status: mapInvoiceStatus(row.status),
    bucket: row.aging_bucket,
  };
}

function ensureInvoicesExist() {
  const counts = db.prepare("SELECT COUNT(*) AS client_count, (SELECT COUNT(*) FROM invoices) AS invoice_count FROM clients").get();

  if (Number(counts?.invoice_count || 0) === 0) {
    seedDemoData();
  }
}

function compactTimestamp(value) {
  if (!value) {
    return "Unknown time";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  const datePart = date.toLocaleDateString("en-CA");
  const timePart = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  return `${datePart} ${timePart}`;
}

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "ar-billing-tracker-server" });
});

app.get("/api/invoices", (req, res) => {
  ensureInvoicesExist();

  const bucket = normalizeBucketKey(req.query.bucket);
  const rows = db.prepare(`
    SELECT
      i.invoice_code,
      i.date_billed,
      i.billed_amount_cents,
      i.received_amount_cents,
      i.status,
      i.aging_bucket,
      c.name AS client_name,
      comp.name AS company_name
    FROM invoices i
    INNER JOIN clients c ON c.id = i.client_id
    INNER JOIN companies comp ON comp.id = i.company_id
    WHERE i.aging_bucket = ?
    ORDER BY i.date_billed DESC, i.id DESC
  `).all(bucket);

  res.status(200).json({
    invoiceRows: rows.map(mapInvoiceRow),
  });
});

app.get("/api/clients", (_req, res) => {
  ensureInvoicesExist();

  const rows = db.prepare(`
    SELECT
      c.id,
      c.client_code,
      c.name,
      c.contact_name,
      c.status,
      c.total_outstanding_cents,
      c.days_past_due_max,
      c.last_payment_at,
      c.on_time_payment_rate_bps,
      COALESCE(inv.total_invoices, 0) AS total_invoices,
      COALESCE(inv.on_time_invoices, 0) AS on_time_invoices
    FROM clients c
    LEFT JOIN (
      SELECT
        i.client_id,
        COUNT(*) AS total_invoices,
        SUM(
          CASE
            WHEN first_payment.first_payment_date IS NOT NULL
             AND julianday(first_payment.first_payment_date) - julianday(i.date_billed) <= 30
            THEN 1
            ELSE 0
          END
        ) AS on_time_invoices
      FROM invoices i
      LEFT JOIN (
        SELECT ip.invoice_id, MIN(p.payment_date) AS first_payment_date
        FROM invoice_payments ip
        INNER JOIN payments p ON p.id = ip.payment_id
        GROUP BY ip.invoice_id
      ) first_payment ON first_payment.invoice_id = i.id
      GROUP BY i.client_id
    ) inv ON inv.client_id = c.id
    ORDER BY c.name COLLATE NOCASE ASC
  `).all();

  const totalOutstandingCents = rows.reduce((sum, row) => sum + Number(row.total_outstanding_cents || 0), 0);
  const totalOnTimeBps = rows.reduce((sum, row) => sum + Number(row.on_time_payment_rate_bps || 0), 0);
  const avgOutstanding = rows.length ? Math.round(totalOutstandingCents / rows.length) : 0;
  const onTimeRate = rows.length ? `${Math.round((totalOnTimeBps / rows.length) / 100)}%` : "0%";

  const clientRows = rows.map((row) => {
    const denominator = Number(row.total_invoices || 0);
    const numerator = Number(row.on_time_invoices || 0);
    const rateLabel = denominator ? `${numerator}/${denominator} on time` : "No history";

    return {
      id: row.client_code,
      name: row.name,
      contact: row.contact_name || "Unassigned",
      status: mapClientStatus(row.status),
      totalOutstanding: formatCurrency(row.total_outstanding_cents),
      daysPastDue: String(row.days_past_due_max || 0),
      lastPaymentDate: asDateLabel(row.last_payment_at),
      paymentHistory: rateLabel,
    };
  });

  const clientMetrics = [
    { id: "active-clients", label: "Active clients", value: String(rows.filter((row) => row.status === "active").length) },
    { id: "avg-outstanding", label: "Avg outstanding balance", value: formatCurrency(avgOutstanding) },
    { id: "total-ar", label: "Total AR", value: formatCurrency(totalOutstandingCents) },
    { id: "on-time-rate", label: "On-time payment rate", value: onTimeRate },
  ];

  const timelineItems = db.prepare(`
    SELECT payment_code, amount_received_cents, payment_date
    FROM payments
    ORDER BY payment_date DESC, id DESC
    LIMIT 6
  `).all().map((row, index) => ({
    id: `client-timeline-${index + 1}`,
    title: "Payment received",
    detail: `${row.payment_code} posted for ${formatCurrency(row.amount_received_cents)}.`,
    meta: compactTimestamp(row.payment_date),
    tone: "success",
  }));

  res.status(200).json({
    clientMetrics,
    clientRows,
    timelineItems,
  });
});

app.get("/api/clients/options", (_req, res) => {
  const rows = db.prepare(`
    SELECT client_code, name, contact_name
    FROM clients
    ORDER BY name COLLATE NOCASE ASC
  `).all();

  const options = rows.map((row) => ({
    value: row.client_code,
    label: `${row.name} / ${row.contact_name || "Unassigned"}`,
  }));

  res.status(200).json({ options });
});

app.post("/api/clients", (req, res) => {
  const name = String(req.body?.name || "").trim();
  const contactName = String(req.body?.contactName || "").trim();

  if (!name) {
    res.status(400).json({ error: "Client name is required." });
    return;
  }

  const maxCode = db.prepare("SELECT MAX(id) AS max_id FROM clients").get();
  const nextNumber = Number(maxCode?.max_id || 0) + 1;
  const clientCode = `CLI-${String(nextNumber).padStart(3, "0")}`;

  db.prepare(`
    INSERT INTO clients (
      client_code,
      external_id,
      name,
      contact_name,
      status,
      is_verified,
      created_by_user_id,
      updated_by_user_id
    ) VALUES (?, ?, ?, ?, 'active', 1, 1, 1)
  `).run(clientCode, `EXT-${clientCode}`, name, contactName || null);

  const created = db.prepare(`
    SELECT client_code, name, contact_name, status
    FROM clients
    WHERE client_code = ?
  `).get(clientCode);

  res.status(201).json({
    client: {
      id: created.client_code,
      name: created.name,
      contactName: created.contact_name || "Unassigned",
      status: mapClientStatus(created.status),
    },
  });
});

app.get("/api/clients/:clientCode/detail", (req, res) => {
  const clientCode = String(req.params.clientCode || "");
  const detail = db.prepare(`
    SELECT
      c.client_code,
      c.name,
      c.contact_name,
      c.status,
      c.total_outstanding_cents,
      c.days_past_due_max,
      c.last_payment_at,
      COUNT(DISTINCT i.id) AS total_invoices,
      COUNT(DISTINCT p.id) AS total_payments
    FROM clients c
    LEFT JOIN invoices i ON i.client_id = c.id
    LEFT JOIN invoice_payments ip ON ip.invoice_id = i.id
    LEFT JOIN payments p ON p.id = ip.payment_id
    WHERE c.client_code = ?
    GROUP BY c.id
  `).get(clientCode);

  if (!detail) {
    res.status(404).json({ error: "Client not found." });
    return;
  }

  res.status(200).json({
    summary: {
      id: detail.client_code,
      name: detail.name,
      contact: detail.contact_name || "Unassigned",
      status: mapClientStatus(detail.status),
      totalOutstanding: formatCurrency(detail.total_outstanding_cents),
      daysPastDue: String(detail.days_past_due_max || 0),
      lastPaymentDate: asDateLabel(detail.last_payment_at),
      totalInvoices: String(detail.total_invoices || 0),
      totalPayments: String(detail.total_payments || 0),
    },
  });
});

app.get("/api/clients/:clientCode/invoices", (req, res) => {
  const clientCode = String(req.params.clientCode || "");
  const rows = db.prepare(`
    SELECT
      i.invoice_code,
      i.date_billed,
      i.billed_amount_cents,
      i.received_amount_cents,
      i.status,
      i.aging_bucket,
      c.name AS client_name,
      comp.name AS company_name
    FROM invoices i
    INNER JOIN clients c ON c.id = i.client_id
    INNER JOIN companies comp ON comp.id = i.company_id
    WHERE c.client_code = ?
    ORDER BY i.date_billed DESC, i.id DESC
  `).all(clientCode);

  res.status(200).json({
    invoiceRows: rows.map(mapInvoiceRow),
  });
});

app.get("/api/clients/:clientCode/payments", (req, res) => {
  const clientCode = String(req.params.clientCode || "");
  const rows = db.prepare(`
    SELECT
      p.payment_code,
      p.payment_date,
      p.amount_received_cents,
      p.status,
      COUNT(ip.invoice_id) AS invoice_count
    FROM payments p
    INNER JOIN invoice_payments ip ON ip.payment_id = p.id
    INNER JOIN invoices i ON i.id = ip.invoice_id
    INNER JOIN clients c ON c.id = i.client_id
    WHERE c.client_code = ?
    GROUP BY p.id
    ORDER BY p.payment_date DESC, p.id DESC
  `).all(clientCode);

  const paymentRows = rows.map((row) => ({
    id: row.payment_code,
    paymentDate: asDateLabel(row.payment_date),
    amount: formatCurrency(row.amount_received_cents),
    allocations: `${row.invoice_count} invoice${row.invoice_count === 1 ? "" : "s"}`,
    status: mapInvoiceStatus(row.status),
  }));

  res.status(200).json({ paymentRows });
});

app.get("/api/review-inbox", (_req, res) => {
  const reviewRowsRaw = db.prepare(`
    SELECT
      rq.id,
      rq.entity_type,
      rq.entity_internal_id,
      rq.queue_status,
      rq.approval_notes,
      rq.created_at,
      rq.reviewed_at,
      TRIM(COALESCE(creator.first_name, '') || ' ' || COALESCE(creator.last_name, '')) AS creator_name,
      invoice.invoice_code,
      invoice.billed_amount_cents,
      invoice.received_amount_cents,
      payment.payment_code,
      payment.amount_received_cents AS payment_amount_cents,
      expense.vendor_name,
      expense.amount_cents AS expense_amount_cents
    FROM review_queue rq
    INNER JOIN users creator ON creator.id = rq.created_by_user_id
    LEFT JOIN invoices invoice ON rq.entity_type = 'invoice' AND invoice.id = rq.entity_internal_id
    LEFT JOIN payments payment ON rq.entity_type = 'payment' AND payment.id = rq.entity_internal_id
    LEFT JOIN expenses expense ON rq.entity_type = 'expense' AND expense.id = rq.entity_internal_id
    ORDER BY rq.created_at DESC, rq.id DESC
    LIMIT 120
  `).all();

  const reviewRows = reviewRowsRaw.map((row) => {
    const reviewId = `REV-${row.id}`;
    let subject = row.invoice_code || row.payment_code || row.vendor_name || "Unknown subject";
    let change = "Pending diff";

    if (row.entity_type === "invoice") {
      change = `Billed amount ${formatCurrency(row.billed_amount_cents)} / Received ${formatCurrency(row.received_amount_cents)}`;
    } else if (row.entity_type === "payment") {
      change = `Payment received ${formatCurrency(row.payment_amount_cents)}`;
    } else if (row.entity_type === "expense") {
      change = `Expense amount ${formatCurrency(row.expense_amount_cents)}`;
    }

    return {
      id: reviewId,
      type: mapReviewType(row.entity_type),
      subject,
      user: (row.creator_name || "Unknown user").trim(),
      submittedAt: compactTimestamp(row.created_at),
      change,
      denialNote: row.queue_status === "denied" ? row.approval_notes || "Denied during admin review." : "",
      reviewedAt: row.reviewed_at ? compactTimestamp(row.reviewed_at) : "",
      status: mapReviewStatus(row.queue_status),
    };
  });

  const diffById = {};
  const lookupCodeStmt = db.prepare(`
    SELECT
      CASE
        WHEN rq.entity_type = 'invoice' THEN invoice.invoice_code
        WHEN rq.entity_type = 'payment' THEN payment.payment_code
        WHEN rq.entity_type = 'expense' THEN expense.expense_code
        ELSE NULL
      END AS entity_code
    FROM review_queue rq
    LEFT JOIN invoices invoice ON rq.entity_type = 'invoice' AND invoice.id = rq.entity_internal_id
    LEFT JOIN payments payment ON rq.entity_type = 'payment' AND payment.id = rq.entity_internal_id
    LEFT JOIN expenses expense ON rq.entity_type = 'expense' AND expense.id = rq.entity_internal_id
    WHERE rq.id = ?
  `);

  const auditStmt = db.prepare(`
    SELECT field_name, before_value, after_value, actor_name, event_at
    FROM audit_log
    WHERE entity_code = ?
    ORDER BY event_at DESC, id DESC
    LIMIT 3
  `);

  reviewRowsRaw.forEach((rawRow) => {
    const reviewId = `REV-${rawRow.id}`;
    const codeRow = lookupCodeStmt.get(rawRow.id);
    const auditRows = codeRow?.entity_code ? auditStmt.all(codeRow.entity_code) : [];

    diffById[reviewId] = auditRows.map((auditRow, index) => ({
      id: `${reviewId}-${index + 1}`,
      label: auditRow.field_name || "Updated field",
      before: auditRow.before_value || "N/A",
      after: auditRow.after_value || "N/A",
      actor: auditRow.actor_name || "System",
      timestamp: compactTimestamp(auditRow.event_at),
    }));
  });

  const timelineItems = reviewRows.slice(0, 8).map((row, index) => ({
    id: `review-timeline-${index + 1}`,
    title: `${row.status.label}: ${row.id}`,
    detail: `${row.type} by ${row.user}`,
    meta: row.reviewedAt || row.submittedAt,
    tone: row.status.tone,
  }));

  res.status(200).json({
    reviewRows,
    diffById,
    timelineItems,
  });
});

app.post("/api/payments", (req, res) => {
  const payload = req.body || {};
  const paymentDate = toIsoDate(payload.paymentDate);
  const amountCents = toCents(payload.amountReceived);

  if (!paymentDate || amountCents <= 0) {
    res.status(400).json({ error: "paymentDate and amountReceived are required." });
    return;
  }

  const companyIdRow = db.prepare("SELECT id FROM companies ORDER BY id ASC LIMIT 1").get();
  const nextId = Number(db.prepare("SELECT IFNULL(MAX(id), 0) AS max_id FROM payments").get().max_id) + 1;
  const paymentCode = payload.paymentCode || `PAY-MAN-${String(nextId).padStart(5, "0")}`;

  db.prepare(`
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
      updated_by_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, 'unmatched', ?, 1, 1)
  `).run(
    paymentCode,
    `EXT-${paymentCode}`,
    paymentDate,
    amountCents,
    payload.referenceNumber || null,
    companyIdRow?.id || null,
    payload.allocationMethod || "manual",
    payload.notes || null,
  );

  res.status(201).json({
    payment: {
      id: paymentCode,
      paymentDate: asDateLabel(paymentDate),
      amount: formatCurrency(amountCents),
      status: mapInvoiceStatus("draft"),
    },
  });
});

app.post("/api/expenses", (req, res) => {
  const payload = req.body || {};
  const expenseDate = toIsoDate(payload.expenseDate);
  const amountCents = toCents(payload.amount);
  const vendorName = String(payload.vendorName || "").trim();

  if (!expenseDate || amountCents <= 0 || !vendorName) {
    res.status(400).json({ error: "vendorName, expenseDate and amount are required." });
    return;
  }

  const categoryIdRow = db.prepare("SELECT id FROM expense_categories ORDER BY id ASC LIMIT 1").get();
  const nextId = Number(db.prepare("SELECT IFNULL(MAX(id), 0) AS max_id FROM expenses").get().max_id) + 1;
  const expenseCode = payload.expenseCode || `EXP-MAN-${String(nextId).padStart(4, "0")}`;

  db.prepare(`
    INSERT INTO expenses (
      expense_code,
      external_expense_id,
      vendor_name,
      expense_date,
      category_id,
      amount_cents,
      status,
      notes,
      created_by_user_id,
      updated_by_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, 1, 1)
  `).run(
    expenseCode,
    `EXT-${expenseCode}`,
    vendorName,
    expenseDate,
    categoryIdRow?.id || 1,
    amountCents,
    payload.notes || null,
  );

  res.status(201).json({
    expense: {
      id: expenseCode,
      vendorName,
      expenseDate: asDateLabel(expenseDate),
      amount: formatCurrency(amountCents),
      status: mapInvoiceStatus("draft"),
    },
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
