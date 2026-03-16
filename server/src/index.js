const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { createDbConnection } = require("./db/connection");
const { runSchemaMigration } = require("./db/migrate");

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

app.get("/api/clients", (_req, res) => {
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

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
