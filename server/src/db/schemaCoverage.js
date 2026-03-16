const { createDbConnection } = require("./connection");
const { runSchemaMigration } = require("./migrate");

const lcFieldMappings = [
  { sourceField: "Client Name", table: "clients", column: "name", required: true },
  { sourceField: "Date of Birth (DOB)", table: "clients", column: "date_of_birth", required: false },
  { sourceField: "Employer No.", table: "clients", column: "employer_no", required: false },
  { sourceField: "Service Code", table: "invoices", column: "service_code", required: true },
  { sourceField: "Company", table: "companies", column: "name", required: true },
  { sourceField: "Service Date", table: "invoices", column: "service_date", required: true },
  { sourceField: "Billed Amount", table: "invoices", column: "billed_amount_cents", required: true },
  { sourceField: "Date Billed", table: "invoices", column: "date_billed", required: true },
  { sourceField: "Received Amount", table: "invoices", column: "received_amount_cents", required: false },
  { sourceField: "Received Date", table: "invoices", column: "received_date", required: false },
  { sourceField: "Reference No.", table: "invoices", column: "reference_no", required: false },
  { sourceField: "Difference", table: "invoices", column: "outstanding_amount_cents", required: true, derived: true },
  { sourceField: "Rejection Code", table: "invoices", column: "rejection_code", required: false },
  { sourceField: "Aging Bucket (30/60/90/120+)", table: "invoices", column: "aging_bucket", required: true, derived: true },
];

function getColumnSet(db, tableName) {
  const rows = db.prepare(`PRAGMA table_xinfo(${tableName})`).all();
  return new Set(rows.map((row) => row.name));
}

function verifyLcCoverage() {
  runSchemaMigration();

  const db = createDbConnection();
  const groupedColumns = new Map();

  try {
    for (const mapping of lcFieldMappings) {
      if (!groupedColumns.has(mapping.table)) {
        groupedColumns.set(mapping.table, getColumnSet(db, mapping.table));
      }
    }

    const reportRows = lcFieldMappings.map((mapping) => {
      const columnSet = groupedColumns.get(mapping.table);
      const covered = columnSet.has(mapping.column);

      return {
        sourceField: mapping.sourceField,
        target: `${mapping.table}.${mapping.column}`,
        required: mapping.required ? "yes" : "no",
        derived: mapping.derived ? "yes" : "no",
        covered: covered ? "yes" : "no",
      };
    });

    const missing = reportRows.filter((row) => row.covered === "no");

    console.table(reportRows);

    if (missing.length > 0) {
      console.error("Coverage check failed. Missing schema mappings were found.");
      process.exitCode = 1;
      return;
    }

    console.log("Coverage check passed. All LC spreadsheet fields map to schema columns.");
  } finally {
    db.close();
  }
}

if (require.main === module) {
  verifyLcCoverage();
}

module.exports = {
  verifyLcCoverage,
};
