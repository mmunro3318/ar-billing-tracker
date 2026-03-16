PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'data_entry' CHECK (role IN ('admin', 'data_entry', 'viewer')),
  first_name TEXT,
  last_name TEXT,
  mfa_enabled INTEGER NOT NULL DEFAULT 1 CHECK (mfa_enabled IN (0, 1)),
  mfa_method TEXT CHECK (mfa_method IN ('email', 'sms') OR mfa_method IS NULL),
  mfa_phone TEXT,
  last_login_at TEXT,
  session_token TEXT,
  session_expires_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_code TEXT NOT NULL UNIQUE,
  external_id TEXT UNIQUE,
  name TEXT NOT NULL,
  date_of_birth TEXT,
  employer_no TEXT,
  contact_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'at_risk', 'review', 'inactive')),
  total_outstanding_cents INTEGER NOT NULL DEFAULT 0,
  on_time_payment_rate_bps INTEGER,
  days_past_due_max INTEGER,
  last_payment_at TEXT,
  is_verified INTEGER NOT NULL DEFAULT 0 CHECK (is_verified IN (0, 1)),
  has_active_disputes INTEGER NOT NULL DEFAULT 0 CHECK (has_active_disputes IN (0, 1)),
  created_by_user_id INTEGER,
  updated_by_user_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id),
  FOREIGN KEY (updated_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_code TEXT NOT NULL UNIQUE,
  external_id TEXT UNIQUE,
  name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'review')),
  contact_info_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_code TEXT NOT NULL UNIQUE,
  external_invoice_id TEXT UNIQUE,
  client_id INTEGER NOT NULL,
  company_id INTEGER NOT NULL,
  service_code TEXT NOT NULL,
  service_date TEXT NOT NULL,
  date_billed TEXT NOT NULL,
  billed_amount_cents INTEGER NOT NULL,
  received_amount_cents INTEGER NOT NULL DEFAULT 0,
  outstanding_amount_cents INTEGER GENERATED ALWAYS AS (billed_amount_cents - received_amount_cents) STORED,
  received_date TEXT,
  reference_no TEXT,
  rejection_code TEXT,
  aging_bucket TEXT NOT NULL DEFAULT 'current' CHECK (aging_bucket IN ('current', '30d', '60d', '90d', '120p', 'uncollectible')),
  is_uncollectible INTEGER NOT NULL DEFAULT 0 CHECK (is_uncollectible IN (0, 1)),
  uncollectible_at TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'active', 'rejected', 'archived')),
  approval_notes TEXT,
  created_by_user_id INTEGER,
  updated_by_user_id INTEGER,
  approved_by_user_id INTEGER,
  approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (created_by_user_id) REFERENCES users(id),
  FOREIGN KEY (updated_by_user_id) REFERENCES users(id),
  FOREIGN KEY (approved_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_code TEXT NOT NULL UNIQUE,
  external_payment_id TEXT UNIQUE,
  payment_date TEXT NOT NULL,
  amount_received_cents INTEGER NOT NULL,
  reference_no TEXT UNIQUE,
  company_id INTEGER,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'posted', 'rejected', 'archived')),
  allocation_method TEXT NOT NULL DEFAULT 'manual' CHECK (allocation_method IN ('manual', 'auto_oldest', 'auto_full_match')),
  reconciliation_status TEXT CHECK (reconciliation_status IN ('unmatched', 'matched', 'variance') OR reconciliation_status IS NULL),
  notes TEXT,
  created_by_user_id INTEGER,
  updated_by_user_id INTEGER,
  approved_by_user_id INTEGER,
  approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (created_by_user_id) REFERENCES users(id),
  FOREIGN KEY (updated_by_user_id) REFERENCES users(id),
  FOREIGN KEY (approved_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS invoice_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  payment_id INTEGER NOT NULL,
  amount_applied_cents INTEGER NOT NULL CHECK (amount_applied_cents > 0),
  created_by_user_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (invoice_id, payment_id),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS expense_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  budget_limit_cents_monthly INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_by_user_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_code TEXT NOT NULL UNIQUE,
  external_expense_id TEXT UNIQUE,
  vendor_name TEXT NOT NULL,
  expense_date TEXT NOT NULL,
  category_id INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'reimbursed', 'archived')),
  budget_code TEXT,
  notes TEXT,
  attachment_url TEXT,
  created_by_user_id INTEGER,
  updated_by_user_id INTEGER,
  approved_by_user_id INTEGER,
  approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES expense_categories(id),
  FOREIGN KEY (created_by_user_id) REFERENCES users(id),
  FOREIGN KEY (updated_by_user_id) REFERENCES users(id),
  FOREIGN KEY (approved_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS review_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('invoice', 'payment', 'expense')),
  entity_internal_id INTEGER NOT NULL,
  created_by_user_id INTEGER NOT NULL,
  queue_status TEXT NOT NULL DEFAULT 'pending' CHECK (queue_status IN ('pending', 'approved', 'denied', 'archived')),
  approval_notes TEXT,
  reviewed_by_user_id INTEGER,
  reviewed_at TEXT,
  is_selected_for_batch INTEGER NOT NULL DEFAULT 0 CHECK (is_selected_for_batch IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id),
  FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audit_code TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL CHECK (event_type IN ('field_update', 'approval', 'denial', 'escalation', 'creation', 'deletion', 'mark_uncollectible', 'payment_posted')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('invoice', 'payment', 'expense', 'client', 'category')),
  entity_code TEXT NOT NULL,
  actor_user_id INTEGER,
  actor_name TEXT,
  field_name TEXT,
  before_value TEXT,
  after_value TEXT,
  change_reason TEXT,
  ip_address TEXT,
  session_id TEXT,
  is_approved_action INTEGER NOT NULL DEFAULT 0 CHECK (is_approved_action IN (0, 1)),
  event_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS data_import_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  import_code TEXT NOT NULL UNIQUE,
  import_source TEXT NOT NULL CHECK (import_source IN ('advancedmd_odbc', 'advancedmd_api', 'csv_upload', 'excel_upload', 'manual')),
  import_status TEXT NOT NULL CHECK (import_status IN ('in_progress', 'succeeded', 'failed', 'partial', 'rolled_back')),
  file_name TEXT,
  rows_processed INTEGER NOT NULL DEFAULT 0,
  rows_succeeded INTEGER NOT NULL DEFAULT 0,
  rows_failed INTEGER NOT NULL DEFAULT 0,
  error_details_json TEXT,
  data_hash TEXT,
  is_delta_import INTEGER NOT NULL DEFAULT 0 CHECK (is_delta_import IN (0, 1)),
  initiated_by_user_id INTEGER,
  notes TEXT,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  external_ref_id TEXT,
  FOREIGN KEY (initiated_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS staging_billing_rows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  import_log_id INTEGER NOT NULL,
  source_row_number INTEGER NOT NULL,
  raw_client_name TEXT,
  raw_date_of_birth TEXT,
  raw_employer_no TEXT,
  raw_service_code TEXT,
  raw_company TEXT,
  raw_service_date TEXT,
  raw_billed_amount TEXT,
  raw_date_billed TEXT,
  raw_received_amount TEXT,
  raw_received_date TEXT,
  raw_reference_no TEXT,
  raw_difference TEXT,
  raw_rejection_code TEXT,
  normalized_payload_json TEXT,
  validation_error TEXT,
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (import_log_id) REFERENCES data_import_log(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS staging_expense_rows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  import_log_id INTEGER NOT NULL,
  source_row_number INTEGER NOT NULL,
  raw_vendor_name TEXT,
  raw_expense_date TEXT,
  raw_category_name TEXT,
  raw_amount TEXT,
  raw_budget_code TEXT,
  raw_notes TEXT,
  normalized_payload_json TEXT,
  validation_error TEXT,
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (import_log_id) REFERENCES data_import_log(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS migration_rejects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  import_log_id INTEGER NOT NULL,
  source_table TEXT NOT NULL,
  source_row_number INTEGER,
  reject_code TEXT NOT NULL,
  reject_message TEXT NOT NULL,
  raw_payload_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (import_log_id) REFERENCES data_import_log(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_employer_no ON clients(employer_no);
CREATE INDEX IF NOT EXISTS idx_clients_external_id ON clients(external_id);

CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date_billed ON invoices(date_billed);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_aging_bucket ON invoices(aging_bucket);
CREATE INDEX IF NOT EXISTS idx_invoices_reference_no ON invoices(reference_no);

CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

CREATE INDEX IF NOT EXISTS idx_review_queue_status_created_at ON review_queue(queue_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_event_at ON audit_log(entity_type, entity_code, event_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_import_log_started_at ON data_import_log(started_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_invoices_updated_at
AFTER UPDATE ON invoices
FOR EACH ROW
BEGIN
  UPDATE invoices SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_clients_updated_at
AFTER UPDATE ON clients
FOR EACH ROW
BEGIN
  UPDATE clients SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_payments_updated_at
AFTER UPDATE ON payments
FOR EACH ROW
BEGIN
  UPDATE payments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_expenses_updated_at
AFTER UPDATE ON expenses
FOR EACH ROW
BEGIN
  UPDATE expenses SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_review_queue_updated_at
AFTER UPDATE ON review_queue
FOR EACH ROW
BEGIN
  UPDATE review_queue SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
