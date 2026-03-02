-- CreateTable
CREATE TABLE "cities" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "state" TEXT,
    "stateCode" TEXT,
    "country" TEXT NOT NULL,
    "cityCode" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "libraries" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "cityId" INTEGER NOT NULL,
    "libraryCode" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "libraries_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "phone" TEXT,
    "address" TEXT,
    "libraryId" INTEGER,
    "homeLibraryId" INTEGER,
    "notificationPreferences" TEXT NOT NULL DEFAULT '{"email": true, "in_app": true}',
    "maxReissues" INTEGER NOT NULL DEFAULT 2,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "users_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "users_homeLibraryId_fkey" FOREIGN KEY ("homeLibraryId") REFERENCES "libraries" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "books" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "description" TEXT,
    "isbn" TEXT NOT NULL,
    "imageUrl" TEXT,
    "totalCopies" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "book_copies" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "copyId" TEXT NOT NULL,
    "bookId" INTEGER NOT NULL,
    "libraryId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "reservedUntil" DATETIME,
    "reservedBy" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "book_copies_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "book_copies_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "book_copies_reservedBy_fkey" FOREIGN KEY ("reservedBy") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "loans" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "bookCopyId" INTEGER NOT NULL,
    "borrowedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATETIME NOT NULL,
    "returnedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "issueTokenId" INTEGER,
    "reissueCount" INTEGER NOT NULL DEFAULT 0,
    "fineAmount" REAL NOT NULL DEFAULT 0,
    "pickupVerifiedAt" DATETIME,
    "pickupVerifiedBy" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "loans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "loans_bookCopyId_fkey" FOREIGN KEY ("bookCopyId") REFERENCES "book_copies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "loans_issueTokenId_fkey" FOREIGN KEY ("issueTokenId") REFERENCES "issue_tokens" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "loans_pickupVerifiedBy_fkey" FOREIGN KEY ("pickupVerifiedBy") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "book_requests" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "memberId" INTEGER NOT NULL,
    "bookCopyId" INTEGER NOT NULL,
    "libraryId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedDate" DATETIME,
    "processedBy" INTEGER,
    "rejectionNote" TEXT,
    "pickupDeadline" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "book_requests_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "book_requests_bookCopyId_fkey" FOREIGN KEY ("bookCopyId") REFERENCES "book_copies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "book_requests_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "book_requests_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "issue_tokens" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "requestId" INTEGER NOT NULL,
    "qrCode" TEXT NOT NULL,
    "alphanumericCode" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "bookCopyId" INTEGER NOT NULL,
    "issueDate" DATETIME NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GENERATED',
    "verifiedAt" DATETIME,
    "verifiedBy" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "issue_tokens_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "book_requests" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "issue_tokens_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "issue_tokens_bookCopyId_fkey" FOREIGN KEY ("bookCopyId") REFERENCES "book_copies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "issue_tokens_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "loan_transactions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "loanId" INTEGER,
    "transactionType" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "bookCopyId" INTEGER NOT NULL,
    "libraryId" INTEGER NOT NULL,
    "processedBy" INTEGER,
    "transactionDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATETIME,
    "fineAmount" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "loan_transactions_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "loan_transactions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "loan_transactions_bookCopyId_fkey" FOREIGN KEY ("bookCopyId") REFERENCES "book_copies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "loan_transactions_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "loan_transactions_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "notificationType" TEXT NOT NULL,
    "deliveryMethod" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryStatus" TEXT NOT NULL DEFAULT 'SENT',
    "relatedLoanId" INTEGER,
    "relatedRequestId" INTEGER,
    CONSTRAINT "notification_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "notification_logs_relatedLoanId_fkey" FOREIGN KEY ("relatedLoanId") REFERENCES "loans" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "notification_logs_relatedRequestId_fkey" FOREIGN KEY ("relatedRequestId") REFERENCES "book_requests" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reminder_schedules" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "loanId" INTEGER NOT NULL,
    "reminderType" TEXT NOT NULL,
    "scheduledDate" DATETIME NOT NULL,
    "sentAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reminder_schedules_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "cities_cityCode_key" ON "cities"("cityCode");

-- CreateIndex
CREATE UNIQUE INDEX "libraries_libraryCode_key" ON "libraries"("libraryCode");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "books_isbn_key" ON "books"("isbn");

-- CreateIndex
CREATE UNIQUE INDEX "book_copies_copyId_key" ON "book_copies"("copyId");

-- CreateIndex
CREATE UNIQUE INDEX "issue_tokens_requestId_key" ON "issue_tokens"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "issue_tokens_qrCode_key" ON "issue_tokens"("qrCode");

-- CreateIndex
CREATE UNIQUE INDEX "issue_tokens_alphanumericCode_key" ON "issue_tokens"("alphanumericCode");
