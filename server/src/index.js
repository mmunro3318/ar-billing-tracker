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

const DASHBOARD_BUCKETS = [
  { code: "current", label: "Current", key: "current", tone: "success" },
  { code: "30d", label: "30 Days", key: "30-days", tone: "accent" },
  { code: "60d", label: "60 Days", key: "60-days", tone: "accent" },
  { code: "90d", label: "90 Days", key: "90-days", tone: "warning" },
  { code: "120p", label: "120+ Days", key: "120-plus-days", tone: "danger" },
  { code: "uncollectible", label: "Uncollectible", key: "uncollectible", tone: "muted" },
];

function getBucketConfig(bucketCode) {
  return DASHBOARD_BUCKETS.find((bucket) => bucket.code === bucketCode) || DASHBOARD_BUCKETS[0];
}

function toPeriodLabel(isoDate, options) {
  if (!isoDate) {
    return "Unknown";
  }

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleDateString("en-US", options);
}

function formatPercent(value, total) {
  if (!total) {
    return "0%";
  }

  return `${Math.round((value / total) * 100)}%`;
}

function formatDurationFromHours(totalHours) {
  if (!Number.isFinite(totalHours) || totalHours <= 0) {
    return "0h 00m";
  }

  const hours = Math.floor(totalHours);
  const minutes = Math.round((totalHours - hours) * 60);
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function normalizeReportType(value) {
  const key = String(value || "cash-flow").toLowerCase();
  if (key === "cash-flow" || key === "ar-summary" || key === "client-summary" || key === "expense-summary") {
    return key;
  }

  return "cash-flow";
}

function asIsoDateOrNull(value) {
  const parsed = toIsoDate(value);
  return parsed || null;
}

function buildCategoryCode(name) {
  const token = String(name || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 18);

  const suffix = Math.floor(Date.now() % 10000)
    .toString()
    .padStart(4, "0");

  return `TAG-${token || "CUSTOM"}-${suffix}`;
}

function normalizeWeekRows(rawRows) {
  return rawRows
    .sort((a, b) => String(a.period_date).localeCompare(String(b.period_date)))
    .map((row) => ({
      label: toPeriodLabel(row.period_date, { month: "short", day: "numeric" }),
      date: String(row.period_date || ""),
      inflow: Number(row.inflow_cents || 0) / 100,
      outflow: Number(row.outflow_cents || 0) / 100,
      net: (Number(row.inflow_cents || 0) - Number(row.outflow_cents || 0)) / 100,
    }));
}

function normalizeMonthRows(rawRows) {
  return rawRows
    .sort((a, b) => String(a.period_date).localeCompare(String(b.period_date)))
    .map((row) => ({
      label: toPeriodLabel(row.period_date, { month: "short" }),
      date: String(row.period_date || ""),
      inflow: Number(row.inflow_cents || 0) / 100,
      outflow: Number(row.outflow_cents || 0) / 100,
      net: (Number(row.inflow_cents || 0) - Number(row.outflow_cents || 0)) / 100,
    }));
}

function normalizeQuarterRows(rawRows) {
  return rawRows
    .sort((a, b) => String(a.period_date).localeCompare(String(b.period_date)))
    .map((row) => ({
      label: `Q${row.quarter} ${row.year}`,
      date: String(row.period_date || ""),
      inflow: Number(row.inflow_cents || 0) / 100,
      outflow: Number(row.outflow_cents || 0) / 100,
      net: (Number(row.inflow_cents || 0) - Number(row.outflow_cents || 0)) / 100,
    }));
}

function normalizeYearRows(rawRows) {
  return rawRows
    .sort((a, b) => Number(a.year || 0) - Number(b.year || 0))
    .map((row) => ({
      label: String(row.year || "Year"),
      date: `${row.year || "2000"}-12-31`,
      inflow: Number(row.inflow_cents || 0) / 100,
      outflow: Number(row.outflow_cents || 0) / 100,
      net: (Number(row.inflow_cents || 0) - Number(row.outflow_cents || 0)) / 100,
    }));
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

app.get("/api/dashboard", (_req, res) => {
  ensureInvoicesExist();

  const statRow = db.prepare(`
    SELECT
      (SELECT COALESCE(SUM(outstanding_amount_cents), 0) FROM invoices) AS open_receivables_cents,
      (SELECT COALESCE(SUM(amount_received_cents), 0) FROM payments WHERE strftime('%Y-%m', payment_date) = strftime('%Y-%m', 'now')) AS collected_month_cents,
      (SELECT COALESCE(SUM(outstanding_amount_cents), 0) FROM invoices WHERE aging_bucket IN ('120p', 'uncollectible')) AS uncollectible_watch_cents,
      (SELECT COALESCE(AVG(julianday('now') - julianday(date_billed)), 0) FROM invoices WHERE outstanding_amount_cents > 0) AS avg_days_open,
      (
        (SELECT COALESCE(SUM(amount_received_cents), 0) FROM payments WHERE strftime('%Y-%m', payment_date) = strftime('%Y-%m', 'now'))
        -
        (SELECT COALESCE(SUM(amount_cents), 0) FROM expenses WHERE strftime('%Y-%m', expense_date) = strftime('%Y-%m', 'now'))
      ) AS net_inflow_month_cents
  `).get();

  const pendingReviewRow = db.prepare(`
    SELECT COUNT(*) AS pending_count
    FROM review_queue
    WHERE queue_status = 'pending'
  `).get();

  const approvalSlaRow = db.prepare(`
    SELECT AVG((julianday(reviewed_at) - julianday(created_at)) * 24.0) AS avg_review_hours
    FROM review_queue
    WHERE reviewed_at IS NOT NULL AND queue_status IN ('approved', 'denied')
  `).get();

  const bucketRows = db.prepare(`
    SELECT
      aging_bucket,
      COUNT(*) AS invoice_count,
      COALESCE(SUM(outstanding_amount_cents), 0) AS outstanding_cents,
      COALESCE(SUM(received_amount_cents), 0) AS received_cents,
      COALESCE(SUM(billed_amount_cents), 0) AS billed_cents
    FROM invoices
    GROUP BY aging_bucket
  `).all();

  const bucketLookup = {};
  bucketRows.forEach((row) => {
    bucketLookup[row.aging_bucket] = row;
  });

  const totalOutstandingCents = DASHBOARD_BUCKETS.reduce((sum, bucket) => {
    return sum + Number(bucketLookup[bucket.code]?.outstanding_cents || 0);
  }, 0);

  const agingBuckets = DASHBOARD_BUCKETS.map((bucket) => {
    const row = bucketLookup[bucket.code] || {};
    const outstandingCents = Number(row.outstanding_cents || 0);

    return {
      label: bucket.label,
      value: formatCurrency(outstandingCents),
      count: Number(row.invoice_count || 0),
      share: formatPercent(outstandingCents, totalOutstandingCents),
      tone: bucket.tone,
    };
  });

  const agingVisualBuckets = DASHBOARD_BUCKETS.map((bucket) => {
    const row = bucketLookup[bucket.code] || {};

    return {
      bucket: bucket.label,
      bucketKey: bucket.key,
      paymentsReceived: Math.round(Number(row.received_cents || 0) / 100),
      totalInvoiceAmount: Math.round(Number(row.billed_cents || 0) / 100),
    };
  });

  const breakdownRows = db.prepare(`
    SELECT
      i.aging_bucket,
      c.name AS client_name,
      COALESCE(SUM(i.received_amount_cents), 0) AS received_cents,
      COALESCE(SUM(i.billed_amount_cents), 0) AS billed_cents
    FROM invoices i
    INNER JOIN clients c ON c.id = i.client_id
    GROUP BY i.aging_bucket, c.id
    ORDER BY i.aging_bucket ASC, billed_cents DESC
  `).all();

  const bucketClientBreakdown = {};
  DASHBOARD_BUCKETS.forEach((bucket) => {
    bucketClientBreakdown[bucket.key] = [];
  });

  breakdownRows.forEach((row) => {
    const config = getBucketConfig(row.aging_bucket);
    const bucketKey = config.key;

    if (bucketClientBreakdown[bucketKey].length >= 8) {
      return;
    }

    bucketClientBreakdown[bucketKey].push({
      client: row.client_name || "Unknown client",
      paymentsReceived: Math.round(Number(row.received_cents || 0) / 100),
      totalInvoiceAmount: Math.round(Number(row.billed_cents || 0) / 100),
    });
  });

  const monthRows = db.prepare(`
    WITH inflow AS (
      SELECT date(payment_date, 'weekday 0', '-6 days') AS period_date, SUM(amount_received_cents) AS cents
      FROM payments
      WHERE payment_date >= date('now', 'start of month')
      GROUP BY period_date
    ),
    outflow AS (
      SELECT date(expense_date, 'weekday 0', '-6 days') AS period_date, SUM(amount_cents) AS cents
      FROM expenses
      WHERE expense_date >= date('now', 'start of month')
      GROUP BY period_date
    ),
    periods AS (
      SELECT period_date FROM inflow
      UNION
      SELECT period_date FROM outflow
    )
    SELECT
      periods.period_date,
      COALESCE(inflow.cents, 0) AS inflow_cents,
      COALESCE(outflow.cents, 0) AS outflow_cents
    FROM periods
    LEFT JOIN inflow ON inflow.period_date = periods.period_date
    LEFT JOIN outflow ON outflow.period_date = periods.period_date
    ORDER BY periods.period_date ASC
  `).all();

  const rolling30Rows = db.prepare(`
    WITH inflow AS (
      SELECT date(payment_date, 'weekday 0', '-6 days') AS period_date, SUM(amount_received_cents) AS cents
      FROM payments
      WHERE payment_date >= date('now', '-30 days')
      GROUP BY period_date
    ),
    outflow AS (
      SELECT date(expense_date, 'weekday 0', '-6 days') AS period_date, SUM(amount_cents) AS cents
      FROM expenses
      WHERE expense_date >= date('now', '-30 days')
      GROUP BY period_date
    ),
    periods AS (
      SELECT period_date FROM inflow
      UNION
      SELECT period_date FROM outflow
    )
    SELECT
      periods.period_date,
      COALESCE(inflow.cents, 0) AS inflow_cents,
      COALESCE(outflow.cents, 0) AS outflow_cents
    FROM periods
    LEFT JOIN inflow ON inflow.period_date = periods.period_date
    LEFT JOIN outflow ON outflow.period_date = periods.period_date
    ORDER BY periods.period_date ASC
  `).all();

  const rolling60Rows = db.prepare(`
    WITH inflow AS (
      SELECT date(payment_date, 'start of month') AS period_date, SUM(amount_received_cents) AS cents
      FROM payments
      WHERE payment_date >= date('now', '-60 days')
      GROUP BY period_date
    ),
    outflow AS (
      SELECT date(expense_date, 'start of month') AS period_date, SUM(amount_cents) AS cents
      FROM expenses
      WHERE expense_date >= date('now', '-60 days')
      GROUP BY period_date
    ),
    periods AS (
      SELECT period_date FROM inflow
      UNION
      SELECT period_date FROM outflow
    )
    SELECT
      periods.period_date,
      COALESCE(inflow.cents, 0) AS inflow_cents,
      COALESCE(outflow.cents, 0) AS outflow_cents
    FROM periods
    LEFT JOIN inflow ON inflow.period_date = periods.period_date
    LEFT JOIN outflow ON outflow.period_date = periods.period_date
    ORDER BY periods.period_date ASC
  `).all();

  const rolling90Rows = db.prepare(`
    WITH inflow AS (
      SELECT date(payment_date, 'start of month') AS period_date, SUM(amount_received_cents) AS cents
      FROM payments
      WHERE payment_date >= date('now', '-90 days')
      GROUP BY period_date
    ),
    outflow AS (
      SELECT date(expense_date, 'start of month') AS period_date, SUM(amount_cents) AS cents
      FROM expenses
      WHERE expense_date >= date('now', '-90 days')
      GROUP BY period_date
    ),
    periods AS (
      SELECT period_date FROM inflow
      UNION
      SELECT period_date FROM outflow
    )
    SELECT
      periods.period_date,
      COALESCE(inflow.cents, 0) AS inflow_cents,
      COALESCE(outflow.cents, 0) AS outflow_cents
    FROM periods
    LEFT JOIN inflow ON inflow.period_date = periods.period_date
    LEFT JOIN outflow ON outflow.period_date = periods.period_date
    ORDER BY periods.period_date ASC
  `).all();

  const quarterRows = db.prepare(`
    WITH inflow AS (
      SELECT
        CAST(strftime('%Y', payment_date) AS INTEGER) AS year,
        CAST(((CAST(strftime('%m', payment_date) AS INTEGER) - 1) / 3) + 1 AS INTEGER) AS quarter,
        SUM(amount_received_cents) AS cents
      FROM payments
      WHERE payment_date >= date('now', '-12 months')
      GROUP BY year, quarter
    ),
    outflow AS (
      SELECT
        CAST(strftime('%Y', expense_date) AS INTEGER) AS year,
        CAST(((CAST(strftime('%m', expense_date) AS INTEGER) - 1) / 3) + 1 AS INTEGER) AS quarter,
        SUM(amount_cents) AS cents
      FROM expenses
      WHERE expense_date >= date('now', '-12 months')
      GROUP BY year, quarter
    ),
    periods AS (
      SELECT year, quarter FROM inflow
      UNION
      SELECT year, quarter FROM outflow
    )
    SELECT
      periods.year,
      periods.quarter,
      printf('%04d-%02d-01', periods.year, ((periods.quarter - 1) * 3) + 1) AS period_date,
      COALESCE(inflow.cents, 0) AS inflow_cents,
      COALESCE(outflow.cents, 0) AS outflow_cents
    FROM periods
    LEFT JOIN inflow ON inflow.year = periods.year AND inflow.quarter = periods.quarter
    LEFT JOIN outflow ON outflow.year = periods.year AND outflow.quarter = periods.quarter
    ORDER BY periods.year ASC, periods.quarter ASC
  `).all();

  const yearRows = db.prepare(`
    WITH inflow AS (
      SELECT CAST(strftime('%Y', payment_date) AS INTEGER) AS year, SUM(amount_received_cents) AS cents
      FROM payments
      WHERE payment_date >= date('now', '-4 years')
      GROUP BY year
    ),
    outflow AS (
      SELECT CAST(strftime('%Y', expense_date) AS INTEGER) AS year, SUM(amount_cents) AS cents
      FROM expenses
      WHERE expense_date >= date('now', '-4 years')
      GROUP BY year
    ),
    periods AS (
      SELECT year FROM inflow
      UNION
      SELECT year FROM outflow
    )
    SELECT
      periods.year,
      COALESCE(inflow.cents, 0) AS inflow_cents,
      COALESCE(outflow.cents, 0) AS outflow_cents
    FROM periods
    LEFT JOIN inflow ON inflow.year = periods.year
    LEFT JOIN outflow ON outflow.year = periods.year
    ORDER BY periods.year ASC
  `).all();

  const recentTimelineRows = db.prepare(`
    SELECT
      COALESCE(event_type, 'field_update') AS event_type,
      COALESCE(entity_type, 'invoice') AS entity_type,
      COALESCE(entity_code, 'N/A') AS entity_code,
      COALESCE(actor_name, 'System') AS actor_name,
      COALESCE(change_reason, '') AS change_reason,
      event_at
    FROM audit_log
    ORDER BY event_at DESC, id DESC
    LIMIT 6
  `).all();

  const timelineItems = recentTimelineRows.map((row, index) => {
    const normalizedType = String(row.event_type || "").toLowerCase();
    let tone = "accent";

    if (normalizedType.includes("payment")) {
      tone = "success";
    } else if (normalizedType.includes("denial") || normalizedType.includes("reject")) {
      tone = "danger";
    } else if (normalizedType.includes("escalation")) {
      tone = "warning";
    }

    return {
      id: `dashboard-timeline-${index + 1}`,
      title: `${row.event_type.replace(/_/g, " ")} - ${row.entity_code}`,
      detail: row.change_reason || `${row.entity_type} updated by ${row.actor_name}`,
      meta: compactTimestamp(row.event_at),
      tone,
    };
  });

  const currentMonthPaymentCents = Number(statRow?.collected_month_cents || 0);
  const pendingCount = Number(pendingReviewRow?.pending_count || 0);
  const openReceivablesCents = Number(statRow?.open_receivables_cents || 0);
  const uncollectibleWatchCents = Number(statRow?.uncollectible_watch_cents || 0);

  const heroMetrics = [
    { label: "Approval SLA", value: formatDurationFromHours(Number(approvalSlaRow?.avg_review_hours || 0)) },
    { label: "Avg days in AR", value: Number(statRow?.avg_days_open || 0).toFixed(1) },
    { label: "Claims flagged", value: String(pendingCount) },
    { label: "Net inflow", value: formatCurrency(Number(statRow?.net_inflow_month_cents || 0)) },
  ];

  const statCards = [
    {
      title: "Open receivables",
      value: formatCurrency(openReceivablesCents),
      trend: { label: "Live", context: "Outstanding invoice balances" },
      tone: "accent",
    },
    {
      title: "Collected this month",
      value: formatCurrency(currentMonthPaymentCents),
      trend: { label: "Live", context: "Posted payments in current month" },
      tone: "success",
    },
    {
      title: "Pending review",
      value: String(pendingCount),
      trend: { label: "Admin action", context: "Review queue pending items" },
      tone: "warning",
    },
    {
      title: "Uncollectible watch",
      value: formatCurrency(uncollectibleWatchCents),
      trend: { label: "Live", context: "120+ and uncollectible balances" },
      tone: "danger",
    },
  ];

  const cashFlowByPeriod = {
    month: normalizeWeekRows(monthRows),
    "30d": normalizeWeekRows(rolling30Rows),
    "60d": normalizeMonthRows(rolling60Rows),
    "90d": normalizeMonthRows(rolling90Rows),
    quarter: normalizeQuarterRows(quarterRows),
    year: normalizeYearRows(yearRows),
  };

  res.status(200).json({
    heroMetrics,
    statCards,
    agingBuckets,
    agingVisualBuckets,
    bucketClientBreakdown,
    cashFlowByPeriod,
    timelineItems,
  });
});

app.get("/api/invoices/options", (req, res) => {
  ensureInvoicesExist();

  const clientCode = String(req.query.clientCode || "").trim() || null;
  const rows = db.prepare(`
    SELECT
      i.invoice_code,
      i.client_id,
      i.outstanding_amount_cents,
      i.date_billed,
      c.client_code,
      c.name AS client_name
    FROM invoices i
    INNER JOIN clients c ON c.id = i.client_id
    WHERE i.outstanding_amount_cents > 0
      AND (? IS NULL OR c.client_code = ?)
    ORDER BY i.date_billed DESC, i.id DESC
    LIMIT 200
  `).all(clientCode, clientCode);

  const options = rows.map((row) => ({
    value: row.invoice_code,
    clientCode: row.client_code,
    label: `${row.invoice_code} / ${row.client_name} / ${formatCurrency(row.outstanding_amount_cents)}`,
    outstandingAmount: formatCurrency(row.outstanding_amount_cents),
    dateBilled: asDateLabel(row.date_billed),
  }));

  res.status(200).json({ options });
});

app.get("/api/expense-tags", (_req, res) => {
  const rows = db.prepare(`
    SELECT category_code, name
    FROM expense_categories
    WHERE is_active = 1
    ORDER BY name COLLATE NOCASE ASC
  `).all();

  const tags = rows.map((row) => ({
    value: row.category_code,
    label: row.name,
  }));

  res.status(200).json({ tags });
});

app.post("/api/expense-tags", (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (!name) {
    res.status(400).json({ error: "Tag name is required." });
    return;
  }

  const existing = db.prepare(`
    SELECT category_code, name
    FROM expense_categories
    WHERE lower(name) = lower(?)
    LIMIT 1
  `).get(name);

  if (existing) {
    res.status(200).json({
      tag: { value: existing.category_code, label: existing.name },
      existed: true,
    });
    return;
  }

  const categoryCode = buildCategoryCode(name);
  db.prepare(`
    INSERT INTO expense_categories (
      category_code,
      name,
      description,
      is_active,
      created_by_user_id
    ) VALUES (?, ?, ?, 1, 1)
  `).run(categoryCode, name, `${name} expenses`);

  res.status(201).json({
    tag: { value: categoryCode, label: name },
    existed: false,
  });
});

app.get("/api/reports/generate", (req, res) => {
  ensureInvoicesExist();

  const reportType = normalizeReportType(req.query.type);
  const fromDate = asIsoDateOrNull(req.query.from);
  const toDate = asIsoDateOrNull(req.query.to);

  if (reportType === "cash-flow") {
    const rows = db.prepare(`
      WITH inflow AS (
        SELECT date(payment_date, 'start of month') AS period_date, SUM(amount_received_cents) AS cents
        FROM payments
        WHERE (? IS NULL OR date(payment_date) >= date(?))
          AND (? IS NULL OR date(payment_date) <= date(?))
        GROUP BY period_date
      ),
      outflow AS (
        SELECT date(expense_date, 'start of month') AS period_date, SUM(amount_cents) AS cents
        FROM expenses
        WHERE (? IS NULL OR date(expense_date) >= date(?))
          AND (? IS NULL OR date(expense_date) <= date(?))
        GROUP BY period_date
      ),
      periods AS (
        SELECT period_date FROM inflow
        UNION
        SELECT period_date FROM outflow
      )
      SELECT
        periods.period_date,
        COALESCE(inflow.cents, 0) AS inflow_cents,
        COALESCE(outflow.cents, 0) AS outflow_cents
      FROM periods
      LEFT JOIN inflow ON inflow.period_date = periods.period_date
      LEFT JOIN outflow ON outflow.period_date = periods.period_date
      ORDER BY periods.period_date ASC
    `).all(fromDate, fromDate, toDate, toDate, fromDate, fromDate, toDate, toDate);

    const mappedRows = rows.map((row, index) => ({
      id: `cf-${index + 1}`,
      period: toPeriodLabel(row.period_date, { month: "short", year: "numeric" }),
      inflow: formatCurrency(row.inflow_cents),
      outflow: formatCurrency(row.outflow_cents),
      net: formatCurrency(Number(row.inflow_cents || 0) - Number(row.outflow_cents || 0)),
    }));

    const totalInflow = rows.reduce((sum, row) => sum + Number(row.inflow_cents || 0), 0);
    const totalOutflow = rows.reduce((sum, row) => sum + Number(row.outflow_cents || 0), 0);

    res.status(200).json({
      reportType,
      title: "Cash Flow Summary Report",
      generatedAt: new Date().toISOString(),
      summary: [
        { label: "Total inflow", value: formatCurrency(totalInflow) },
        { label: "Total outflow", value: formatCurrency(totalOutflow) },
        { label: "Net", value: formatCurrency(totalInflow - totalOutflow) },
      ],
      columns: [
        { key: "period", label: "Period" },
        { key: "inflow", label: "Inflow", align: "right", mono: true },
        { key: "outflow", label: "Outflow", align: "right", mono: true },
        { key: "net", label: "Net", align: "right", mono: true },
      ],
      rows: mappedRows,
    });
    return;
  }

  if (reportType === "ar-summary") {
    const rows = db.prepare(`
      SELECT
        aging_bucket,
        COUNT(*) AS invoice_count,
        COALESCE(SUM(billed_amount_cents), 0) AS billed_cents,
        COALESCE(SUM(received_amount_cents), 0) AS received_cents,
        COALESCE(SUM(outstanding_amount_cents), 0) AS outstanding_cents
      FROM invoices
      WHERE (? IS NULL OR date(date_billed) >= date(?))
        AND (? IS NULL OR date(date_billed) <= date(?))
      GROUP BY aging_bucket
      ORDER BY outstanding_cents DESC
    `).all(fromDate, fromDate, toDate, toDate);

    const mappedRows = rows.map((row, index) => ({
      id: `ar-${index + 1}`,
      bucket: getBucketConfig(row.aging_bucket).label,
      invoices: String(row.invoice_count || 0),
      billed: formatCurrency(row.billed_cents),
      received: formatCurrency(row.received_cents),
      outstanding: formatCurrency(row.outstanding_cents),
    }));

    const totalOutstanding = rows.reduce((sum, row) => sum + Number(row.outstanding_cents || 0), 0);
    const totalInvoices = rows.reduce((sum, row) => sum + Number(row.invoice_count || 0), 0);

    res.status(200).json({
      reportType,
      title: "AR Summary Report",
      generatedAt: new Date().toISOString(),
      summary: [
        { label: "Invoices", value: String(totalInvoices) },
        { label: "Outstanding AR", value: formatCurrency(totalOutstanding) },
      ],
      columns: [
        { key: "bucket", label: "Aging bucket" },
        { key: "invoices", label: "Invoices", align: "right", mono: true },
        { key: "billed", label: "Billed", align: "right", mono: true },
        { key: "received", label: "Received", align: "right", mono: true },
        { key: "outstanding", label: "Outstanding", align: "right", mono: true },
      ],
      rows: mappedRows,
    });
    return;
  }

  if (reportType === "client-summary") {
    const rows = db.prepare(`
      SELECT
        c.client_code,
        c.name,
        c.status,
        COALESCE(COUNT(i.id), 0) AS invoice_count,
        COALESCE(SUM(i.received_amount_cents), 0) AS received_cents,
        COALESCE(SUM(i.outstanding_amount_cents), 0) AS outstanding_cents
      FROM clients c
      LEFT JOIN invoices i ON i.client_id = c.id
        AND (? IS NULL OR date(i.date_billed) >= date(?))
        AND (? IS NULL OR date(i.date_billed) <= date(?))
      GROUP BY c.id
      ORDER BY outstanding_cents DESC, c.name COLLATE NOCASE ASC
    `).all(fromDate, fromDate, toDate, toDate);

    const mappedRows = rows.map((row) => ({
      id: row.client_code,
      client: row.name,
      status: mapClientStatus(row.status).label,
      invoices: String(row.invoice_count || 0),
      received: formatCurrency(row.received_cents),
      outstanding: formatCurrency(row.outstanding_cents),
    }));

    const totalOutstanding = rows.reduce((sum, row) => sum + Number(row.outstanding_cents || 0), 0);

    res.status(200).json({
      reportType,
      title: "Client Summary Report",
      generatedAt: new Date().toISOString(),
      summary: [
        { label: "Clients", value: String(rows.length) },
        { label: "Outstanding AR", value: formatCurrency(totalOutstanding) },
      ],
      columns: [
        { key: "client", label: "Client" },
        { key: "status", label: "Status" },
        { key: "invoices", label: "Invoices", align: "right", mono: true },
        { key: "received", label: "Received", align: "right", mono: true },
        { key: "outstanding", label: "Outstanding", align: "right", mono: true },
      ],
      rows: mappedRows,
    });
    return;
  }

  const rows = db.prepare(`
    SELECT
      ec.name AS category,
      COUNT(e.id) AS expense_count,
      COALESCE(SUM(e.amount_cents), 0) AS amount_cents,
      MAX(e.expense_date) AS last_expense_date
    FROM expenses e
    INNER JOIN expense_categories ec ON ec.id = e.category_id
    WHERE (? IS NULL OR date(e.expense_date) >= date(?))
      AND (? IS NULL OR date(e.expense_date) <= date(?))
    GROUP BY ec.id
    ORDER BY amount_cents DESC, ec.name COLLATE NOCASE ASC
  `).all(fromDate, fromDate, toDate, toDate);

  const mappedRows = rows.map((row, index) => ({
    id: `exp-${index + 1}`,
    category: row.category,
    entries: String(row.expense_count || 0),
    amount: formatCurrency(row.amount_cents),
    lastExpense: asDateLabel(row.last_expense_date),
  }));

  const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount_cents || 0), 0);

  res.status(200).json({
    reportType,
    title: "Expense Summary Report",
    generatedAt: new Date().toISOString(),
    summary: [
      { label: "Expense entries", value: String(rows.reduce((sum, row) => sum + Number(row.expense_count || 0), 0)) },
      { label: "Total spend", value: formatCurrency(totalAmount) },
    ],
    columns: [
      { key: "category", label: "Tag" },
      { key: "entries", label: "Entries", align: "right", mono: true },
      { key: "amount", label: "Amount", align: "right", mono: true },
      { key: "lastExpense", label: "Last expense" },
    ],
    rows: mappedRows,
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

  const invoiceCode = String(payload.invoiceCode || "").trim();
  if (invoiceCode) {
    const invoiceRow = db.prepare(`
      SELECT id, billed_amount_cents, received_amount_cents
      FROM invoices
      WHERE invoice_code = ?
      LIMIT 1
    `).get(invoiceCode);

    if (invoiceRow) {
      const paymentRow = db.prepare("SELECT id FROM payments WHERE payment_code = ?").get(paymentCode);
      const requestedApplyCents = toCents(payload.amountApplied || payload.amountReceived);
      const outstandingCents = Math.max(0, Number(invoiceRow.billed_amount_cents || 0) - Number(invoiceRow.received_amount_cents || 0));
      const amountAppliedCents = Math.max(0, Math.min(requestedApplyCents || amountCents, outstandingCents));

      if (paymentRow?.id && amountAppliedCents > 0) {
        db.prepare(`
          INSERT INTO invoice_payments (
            invoice_id,
            payment_id,
            amount_applied_cents,
            created_by_user_id
          ) VALUES (?, ?, ?, 1)
        `).run(invoiceRow.id, paymentRow.id, amountAppliedCents);

        db.prepare(`
          UPDATE invoices
          SET
            received_amount_cents = received_amount_cents + ?,
            updated_by_user_id = 1
          WHERE id = ?
        `).run(amountAppliedCents, invoiceRow.id);
      }
    }
  }

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

  const requestedCategoryCode = String(payload.categoryCode || payload.tag || "").trim();
  const categoryIdRow = requestedCategoryCode
    ? db.prepare("SELECT id FROM expense_categories WHERE category_code = ? LIMIT 1").get(requestedCategoryCode)
    : db.prepare("SELECT id FROM expense_categories ORDER BY id ASC LIMIT 1").get();
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
