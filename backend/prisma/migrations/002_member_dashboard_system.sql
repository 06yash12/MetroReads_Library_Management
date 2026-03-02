-- Member Dashboard System Migration
-- Add new tables and columns for book request workflow

-- Update Users table with home library and notification preferences
ALTER TABLE users ADD COLUMN home_library_id INTEGER REFERENCES libraries(id);
ALTER TABLE users ADD COLUMN notification_preferences TEXT DEFAULT '{"email": true, "in_app": true}';
ALTER TABLE users ADD COLUMN max_reissues INTEGER DEFAULT 2;

-- Update BookCopies table with reservation fields
ALTER TABLE book_copies ADD COLUMN reserved_until DATETIME;
ALTER TABLE book_copies ADD COLUMN reserved_by INTEGER REFERENCES users(id);

-- Update Loans table with new tracking fields
ALTER TABLE loans ADD COLUMN issue_token_id INTEGER;
ALTER TABLE loans ADD COLUMN reissue_count INTEGER DEFAULT 0;
ALTER TABLE loans ADD COLUMN fine_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE loans ADD COLUMN pickup_verified_at DATETIME;
ALTER TABLE loans ADD COLUMN pickup_verified_by INTEGER REFERENCES users(id);

-- Create BookRequests table
CREATE TABLE book_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES users(id),
  book_copy_id INTEGER NOT NULL REFERENCES book_copies(id),
  library_id INTEGER NOT NULL REFERENCES libraries(id),
  status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, EXPIRED
  request_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_date DATETIME,
  processed_by INTEGER REFERENCES users(id), -- Librarian who processed
  rejection_note TEXT,
  pickup_deadline DATETIME, -- When approved request expires
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create IssueTokens table
CREATE TABLE issue_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL REFERENCES book_requests(id),
  qr_code TEXT NOT NULL UNIQUE,
  alphanumeric_code TEXT NOT NULL UNIQUE,
  member_id INTEGER NOT NULL REFERENCES users(id),
  book_copy_id INTEGER NOT NULL REFERENCES book_copies(id),
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'GENERATED', -- GENERATED, VERIFIED, ISSUED, EXPIRED
  verified_at DATETIME,
  verified_by INTEGER REFERENCES users(id), -- Librarian who verified
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create LoanTransactions table for audit trail
CREATE TABLE loan_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loan_id INTEGER REFERENCES loans(id),
  transaction_type TEXT NOT NULL, -- ISSUE, RETURN, REISSUE, FINE_PAYMENT
  member_id INTEGER NOT NULL REFERENCES users(id),
  book_copy_id INTEGER NOT NULL REFERENCES book_copies(id),
  library_id INTEGER NOT NULL REFERENCES libraries(id),
  processed_by INTEGER REFERENCES users(id), -- Librarian
  transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  due_date DATE,
  fine_amount DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create NotificationLogs table
CREATE TABLE notification_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  notification_type TEXT NOT NULL, -- REQUEST_APPROVED, REQUEST_REJECTED, DUE_REMINDER, OVERDUE_NOTICE
  delivery_method TEXT NOT NULL, -- EMAIL, IN_APP, SMS
  subject TEXT,
  message TEXT,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  delivery_status TEXT DEFAULT 'SENT', -- SENT, FAILED, RETRY
  related_loan_id INTEGER REFERENCES loans(id),
  related_request_id INTEGER REFERENCES book_requests(id)
);

-- Create ReminderSchedules table
CREATE TABLE reminder_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loan_id INTEGER NOT NULL REFERENCES loans(id),
  reminder_type TEXT NOT NULL, -- DUE_REMINDER, OVERDUE_NOTICE
  scheduled_date DATE NOT NULL,
  sent_at DATETIME,
  status TEXT DEFAULT 'SCHEDULED', -- SCHEDULED, SENT, FAILED
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_book_requests_member_status ON book_requests(member_id, status, request_date);
CREATE INDEX idx_issue_tokens_codes ON issue_tokens(qr_code, alphanumeric_code);
CREATE INDEX idx_loan_transactions_member_date ON loan_transactions(member_id, transaction_date);
CREATE INDEX idx_reminder_schedules_date_status ON reminder_schedules(scheduled_date, status);
CREATE INDEX idx_users_home_library ON users(home_library_id);
CREATE INDEX idx_book_copies_reserved ON book_copies(reserved_by, reserved_until);