const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const XLSX = require("xlsx");
const { createDbConnection } = require("./connection");
const { runSchemaMigration } = require("./migrate");

const importSourceByExtension = {
  ".csv": "csv_upload",
  ".xlsx": "excel_upload",
  ".xls": "excel_upload",
};

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

function toCents(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const normalized = String(value).replace(/[$,\s]/g, "");
  const parsed = Number(normalized);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return Math.round(parsed * 100);
}

function sanitizeText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function hashFile(fileBuffer) {
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

function readRowsFromSpreadsheet(filePath) {
  const workbook = XLSX.readFile(filePath, { raw: false, cellDates: true });
  const firstSheet = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheet];

  return XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
    raw: false,
  });
}

function normalizeBillingPayload(row) {
  const payload = {
    clientName: sanitizeText(row["Client Name"]),
    dateOfBirth: toIsoDate(row["Date of Birth (DOB)"]),
    employerNo: sanitizeText(row["Employer No."]),
    serviceCode: sanitizeText(row["Service Code"]),
    company: sanitizeText(row["Company"]),
    serviceDate: toIsoDate(row["Service Date"]),
    billedAmountCents: toCents(row["Billed Amount"]),
    dateBilled: toIsoDate(row["Date Billed"]),
    receivedAmountCents: toCents(row["Received Amount"]),
    receivedDate: toIsoDate(row["Received Date"]),
    referenceNo: sanitizeText(row["Reference No."]),
    differenceCents: toCents(row["Difference"]),
    rejectionCode: sanitizeText(row["Rejection Code"]),
  };

  const errors = [];

  if (!payload.clientName) {
    errors.push("Missing Client Name");
  }
  if (!payload.serviceCode) {
    errors.push("Missing Service Code");
  }
  if (!payload.company) {
    errors.push("Missing Company");
  }
  if (!payload.serviceDate) {
    errors.push("Invalid or missing Service Date");
  }
  if (payload.billedAmountCents === null) {
    errors.push("Invalid or missing Billed Amount");
  }
  if (!payload.dateBilled) {
    errors.push("Invalid or missing Date Billed");
  }

  return {
    payload,
    errors,
  };
}

function stageBillingImport(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  runSchemaMigration();

  const extension = path.extname(filePath).toLowerCase();
  const source = importSourceByExtension[extension] || "manual";
  const fileBuffer = fs.readFileSync(filePath);
  const dataHash = hashFile(fileBuffer);
  const fileName = path.basename(filePath);
  const rows = readRowsFromSpreadsheet(filePath);

  const db = createDbConnection();
  const nowIso = new Date().toISOString();
  const importCode = `IMP-${nowIso.replace(/[-:.TZ]/g, "").slice(0, 14)}`;

  const insertImportLog = db.prepare(`
    INSERT INTO data_import_log (
      import_code,
      import_source,
      import_status,
      file_name,
      rows_processed,
      rows_succeeded,
      rows_failed,
      data_hash,
      is_delta_import,
      started_at
    ) VALUES (?, ?, 'in_progress', ?, 0, 0, 0, ?, 0, CURRENT_TIMESTAMP)
  `);

  const insertStagingRow = db.prepare(`
    INSERT INTO staging_billing_rows (
      import_log_id,
      source_row_number,
      raw_client_name,
      raw_date_of_birth,
      raw_employer_no,
      raw_service_code,
      raw_company,
      raw_service_date,
      raw_billed_amount,
      raw_date_billed,
      raw_received_amount,
      raw_received_date,
      raw_reference_no,
      raw_difference,
      raw_rejection_code,
      normalized_payload_json,
      validation_error,
      processing_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertReject = db.prepare(`
    INSERT INTO migration_rejects (
      import_log_id,
      source_table,
      source_row_number,
      reject_code,
      reject_message,
      raw_payload_json
    ) VALUES (?, 'staging_billing_rows', ?, ?, ?, ?)
  `);

  const updateImportLog = db.prepare(`
    UPDATE data_import_log
    SET import_status = ?,
        rows_processed = ?,
        rows_succeeded = ?,
        rows_failed = ?,
        completed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const transaction = db.transaction(() => {
    const { lastInsertRowid } = insertImportLog.run(importCode, source, fileName, dataHash);
    const importLogId = Number(lastInsertRowid);

    let succeeded = 0;
    let failed = 0;

    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      const { payload, errors } = normalizeBillingPayload(row);
      const hasErrors = errors.length > 0;
      const validationError = hasErrors ? errors.join("; ") : null;
      const processingStatus = hasErrors ? "rejected" : "processed";

      insertStagingRow.run(
        importLogId,
        rowNumber,
        sanitizeText(row["Client Name"]),
        sanitizeText(row["Date of Birth (DOB)"]),
        sanitizeText(row["Employer No."]),
        sanitizeText(row["Service Code"]),
        sanitizeText(row["Company"]),
        sanitizeText(row["Service Date"]),
        sanitizeText(row["Billed Amount"]),
        sanitizeText(row["Date Billed"]),
        sanitizeText(row["Received Amount"]),
        sanitizeText(row["Received Date"]),
        sanitizeText(row["Reference No."]),
        sanitizeText(row["Difference"]),
        sanitizeText(row["Rejection Code"]),
        JSON.stringify(payload),
        validationError,
        processingStatus
      );

      if (hasErrors) {
        failed += 1;
        insertReject.run(
          importLogId,
          rowNumber,
          "VALIDATION_ERROR",
          validationError,
          JSON.stringify(row)
        );
      } else {
        succeeded += 1;
      }
    });

    const totalRows = rows.length;
    const status = failed > 0 && succeeded > 0 ? "partial" : failed > 0 ? "failed" : "succeeded";
    updateImportLog.run(status, totalRows, succeeded, failed, importLogId);

    return {
      importLogId,
      importCode,
      totalRows,
      succeeded,
      failed,
      status,
    };
  });

  try {
    return transaction();
  } finally {
    db.close();
  }
}

if (require.main === module) {
  const inputPath = process.argv[2];

  if (!inputPath) {
    console.error("Usage: node src/db/stageBillingImport.js <path-to-csv-or-xlsx>");
    process.exitCode = 1;
  } else {
    try {
      const result = stageBillingImport(path.resolve(process.cwd(), inputPath));
      console.log("Billing import staged successfully.");
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error("Billing import staging failed.");
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}

module.exports = {
  stageBillingImport,
};
