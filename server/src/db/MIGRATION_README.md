# SQLite Schema and Migration Prep

## What is included

- `schema.sql`: Core normalized schema for clients, invoices, payments, expenses, review queue, audit log, and import staging.
- `migrate.js`: Applies schema to the SQLite database.
- `schemaCoverage.js`: Verifies LC spreadsheet fields are mapped to schema columns.
- `stageBillingImport.js`: Stages CSV/XLSX billing rows into migration staging tables with validation and reject tracking.

## Quick start

From `prototype/server`:

```bash
npm run db:migrate
npm run db:coverage
npm run db:stage-billing -- "../path/to/billing-data.xlsx"
```

## Mapping conventions

- All money values are stored as integer cents (`*_cents`) to avoid floating point drift.
- Dates are stored as ISO `YYYY-MM-DD` text unless a full timestamp is required.
- Internal keys are integer autoincrement IDs.
- Display/business IDs are preserved as unique text columns (`invoice_code`, `payment_code`, etc.).

## Migration flow (full load)

1. Create import run in `data_import_log`.
2. Insert raw rows into `staging_billing_rows`.
3. Capture validation failures in `migration_rejects`.
4. Promote valid rows into domain tables (`clients`, `companies`, `invoices`, `payments`, `invoice_payments`).
5. Recalculate any derived fields and verify aging bucket outputs.

## Next implementation steps

- Add promotion script: `promoteStagedBilling.js`.
- Add deterministic code generation strategy for `client_code` / `invoice_code` / `payment_code`.
- Add reconciliation checks for payment over-allocation and duplicate `reference_no` handling.
