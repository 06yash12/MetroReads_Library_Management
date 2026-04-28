# MetroReads — Library Management System

MetroReads is a web app that helps manage libraries across multiple cities. It connects members with books, gives librarians the tools to run their branch and lets admins oversee everything from one place.

---

## Screenshots

### Home Page
<img width="1920" height="2182" alt="Home Page" src="https://github.com/user-attachments/assets/a86c56ea-b70f-4bb9-a21a-e4a126efaa08" />

The public landing page. Shows live system stats (cities, libraries, books, members), a searchable book carousel with cover images, an interactive India map highlighting states with active libraries and a city selector to find nearby branches. No login required to browse.

---

### Member Books List
<img width="1910" height="1564" alt="Member Books List" src="https://github.com/user-attachments/assets/3ac5a7d7-7855-4a83-b05c-9142864cda0b" />

The book browsing view for logged-in members. Displays all books available at the member's home library with cover images, author and copy count. Members can filter by availability (all / available only / high stock / low stock) and sort by title, author or number of copies. A single click sends a borrow request.

---

### Book Request Approved
<img width="1911" height="776" alt="Book Request Approved" src="https://github.com/user-attachments/assets/a8a39500-6894-4301-8f05-c919d18de1a6" />

What a member sees after their request is approved by the librarian. A unique 8-character pickup code and QR code are displayed with a 48-hour countdown timer. The member brings this code to the library to collect their book.

---

### Librarian Dashboard
<img width="1767" height="921" alt="Librarian Dashboard" src="https://github.com/user-attachments/assets/b0ede3dd-e698-47fd-a678-7eaf3f1da179" />

The librarian's overview panel. Shows key stats for their branch — total books, active loans, available copies, books in maintenance and pending requests — plus a feed of the 5 most recent loans. Entry point to all librarian workflows via the tab navigation.

---

### Librarian Work (Requests & Approvals)
<img width="1919" height="901" alt="Librarian Work" src="https://github.com/user-attachments/assets/a94c45ce-4f8e-441e-82cf-98337fc4d370" />

The requests tab where librarians review pending borrow requests. Each card shows the book cover, book details, member info (name, email, phone) and the member's borrowing history (total loans, overdue count, fines). Librarians can approve or reject with a reason directly from this view.

---

### Pickup Verify
<img width="1919" height="917" alt="Pickup Verify" src="https://github.com/user-attachments/assets/7c55d2fa-bbc0-430f-912f-3f130af1aff9" />

The pickup verification screen. When a member arrives at the library, the librarian enters or scans the member's 8-character code here. The system validates the code, confirms the book and member details and issues the loan — creating a loan record with a due date and marking the book copy as borrowed.

---

### Admin Dashboard
<img width="1315" height="910" alt="Admin Dashboard" src="https://github.com/user-attachments/assets/044551aa-f4d9-4bfb-9af0-6e72e6c6c398" />

The admin control panel. Provides a system-wide overview of all cities, libraries, books, members and active loans. From here, admins manage the full hierarchy — creating cities and library branches, assigning librarians and monitoring members and loans across every location.

---

## What it does

- Members browse books, request them and pick them up with a unique code
- Librarians approve requests, verify pickups, track loans and manage their inventory
- Admins manage cities, libraries and staff accounts

---

## Who uses it

| Role | What they do |
|------|-------------|
| Admin | Manages cities, libraries and librarian accounts |
| Librarian | Handles requests, pickups, loans and books for their library |
| Member | Browses books, makes requests, tracks loans |

---

## Tech Stack

**Frontend** — React + Vite, Tailwind CSS, React Router, Axios

**Backend** — Node.js, Express.js, Prisma ORM

**Database** — SQLite (dev) / PostgreSQL (production)

**Auth** — JWT tokens, bcrypt password hashing

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (React)                          │
│                                                                 │
│   ┌─────────────┐   ┌──────────────────┐   ┌───────────────┐    │
│   │   Member    │   │    Librarian     │   │     Admin     │    │
│   │  Dashboard  │   │    Dashboard     │   │   Dashboard   │    │
│   └─────────────┘   └──────────────────┘   └───────────────┘    │
│                                                                 │
│   AuthContext (JWT)  ──  React Router  ──  Axios (api.js)       │
└────────────────────────────┬────────────────────────────────────┘
                             │  REST API (HTTPS)
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                     Express.js Server                           │
│                                                                 │
│   ┌──────────┐   ┌──────────────┐   ┌────────────────────────┐  │
│   │  /auth   │   │  /member     │   │  /librarian  /admin    │  │
│   │  routes  │   │  routes      │   │  routes                │  │
│   └──────────┘   └──────────────┘   └────────────────────────┘  │
│                                                                 │
│   JWT Middleware  ──  Role Guard  ──  Error Handler             │
└────────────────────────────┬────────────────────────────────────┘
                             │  Prisma ORM
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                         Database                                │
│                                                                 │
│   Users  ──  Cities  ──  Libraries  ──  Books  ──  BookCopies   │
│                                                                 │
│   BookRequests  ──  IssueTokens  ──  Loans  ──  Transactions    │
└─────────────────────────────────────────────────────────────────┘
```

**Request lifecycle:**
1. React component calls a service function in `api.js`
2. Axios attaches the JWT from localStorage to the `Authorization` header
3. Express receives the request, runs JWT middleware to verify identity
4. Role guard checks the user has permission for that route
5. Route handler runs business logic via Prisma
6. Prisma queries the database and returns typed data
7. Response flows back to the component as JSON

---

## How the app is structured

```
frontend/src/
  pages/          → One page per role (Home, MemberDashboard, LibrarianDashboard, AdminDashboard)
  components/     → Shared UI pieces (BookBrowser, LibrarySelector, LoanManager, etc.)
  contexts/       → Auth state (user, login, logout)
  services/       → API calls (api.js)

backend/
  routes/         → API endpoints (auth, member, librarian, admin, books, loans)
  middleware/     → Auth checks, role guards
  prisma/         → Schema, migrations, seed data
```

---

## Features — what's actually working

### Authentication
There's a login selector page (`/login-select`) where users pick their role — Member, Librarian or Admin — each with its own styled card and portal. Members can also sign up directly from that page. All three roles share the same login endpoint; the backend checks the role on the account and the frontend redirects accordingly.

**How JWT works here:**
1. User submits email + password
2. Backend verifies the password with bcrypt, then signs a JWT containing the user's id, role and library assignment
3. The token is sent back and stored in `localStorage` alongside the user object
4. On every API request, Axios automatically attaches it as `Authorization: Bearer <token>`
5. Express middleware decodes the token on each request — if it's missing, expired or tampered with, the request is rejected with a 401
6. A role guard then checks whether that user's role is allowed to hit that specific route
7. When the app loads, `AuthContext` reads the token from storage and calls `/api/auth/me` to verify it's still valid — if not, it clears everything and the user is logged out silently
8. Tokens expire after 7 days; logout clears both the token and user from storage immediately


The landing page shows live stats (cities, libraries, books, members) pulled from the API. There's a book search that works without logging in, a scrollable carousel of all available books with cover images, an interactive India map showing which states have libraries, a city selector to find nearby libraries and a newsletter subscribe form.

### Member
- **Pick a home library** — step-by-step flow: choose city (with search, state filter and A–Z sort), then pick a library from that city, then confirm. The selection is saved to the account.
- **Browse books** — shows all available books in the home library with cover images. Filterable by availability (all / available only / high stock / low stock) and sortable by title, author or number of copies.
- **Request a book** — one click to request. The system reserves a copy immediately.
- **My Requests** — see all past and current requests with their status (pending, approved, rejected).
- **My Loans** — see active loans with due dates and return status.
- **Pickup notification** — when a request is approved, a pickup code appears in the dashboard with a countdown.
- **Change library** — members can switch their home library at any time.

### Librarian
- **Overview** — stats card showing total books, active loans, available copies, books in maintenance and pending requests. Also shows the 5 most recent loans at a glance.
- **Requests tab** — lists all pending book requests. Each card shows the book cover, book info, member details (name, email, phone) and their borrowing history (total loans, overdue count, fines). Librarian can approve or reject with a reason.
- **Pickups tab** — approved requests waiting for the member to show up. Shows a countdown (48h deadline). Librarian can verify the member's pickup code to issue the book, or cancel the pickup with a reason if needed. Cancelling frees the book copy immediately.
- **Books tab** — full inventory of the library's books with add/edit/delete.
- **Active Loans tab** — all currently borrowed books. Librarian can request a return from the member or collect a return directly.
- **Overdue tab** — side-by-side view: overdue books list on the left, activity history feed on the right.
- **History tab** — full activity log showing every issue, return, reissue, fine payment, approval and rejection with colour-coded badges and timestamps.

### Admin
- **Overview** — system-wide stats: total cities, libraries, books, members and active loans.
- **Cities** — create, edit and delete cities. Cities are grouped by state with a toggle between state view and flat list.
- **Libraries** — create, edit and delete library branches. Each library is linked to a city and can have a librarian assigned.
- **Librarians** — create librarian accounts, assign them to libraries, edit their details or remove them. Searchable and filterable by city.
- **Members** — view all registered members. Searchable by name/email, filterable by city and library, sortable by name or join date.
- **Books** — system-wide book list with search.
- **Loans** — view all active loans across all libraries.

---

## Core workflows

### Borrowing a book

1. Member picks a home library and browses available books
2. Member requests a book
3. System reserves the copy and notifies the librarian
4. Librarian reviews the request (can see member's loan history) and approves or rejects
5. On approval, a unique 8-character pickup code + QR code is generated with a 48-hour deadline
6. Member visits the library and shows their code
7. Librarian enters the code to verify and issue the book
8. A loan record is created with a due date

### Returning a book

1. Member initiates a return request (or librarian requests it)
2. Member brings the book to the library
3. Librarian processes the return — checks condition, calculates any fine if overdue
4. Book copy goes back to AVAILABLE

### Cancelling a pickup

If a member can't make it, the librarian can cancel the approved pickup with a reason. The book copy is freed immediately and the member is notified.

---

## Database models

| Model | Purpose |
|-------|---------|
| User | Members, librarians, admins |
| City | Geographic grouping for libraries |
| Library | A physical branch with books and staff |
| Book | Title, author, ISBN, cover image |
| BookCopy | A physical copy of a book in a specific library |
| BookRequest | A member's request for a book (PENDING → APPROVED/REJECTED) |
| IssueToken | The pickup code generated after approval |
| Loan | An active or completed borrowing record |
| LoanTransaction | Audit log — every issue, return, reissue, fine |
| NotificationLog | Tracks what notifications were sent and when |

---

## API overview

**Auth**
- `POST /api/auth/signup` — register
- `POST /api/auth/login` — login, returns JWT
- `GET /api/auth/me` — get current user

**Member**
- `GET /api/member/library/:id/books` — browse books
- `POST /api/member/requests` — request a book
- `GET /api/member/requests` — view my requests
- `GET /api/member/loans` — view my loans
- `GET /api/member/home-library` — get saved home library
- `PUT /api/member/home-library` — set home library

**Librarian**
- `GET /api/librarian/requests/pending` — pending requests
- `POST /api/librarian/requests/:id/approve` — approve
- `POST /api/librarian/requests/:id/reject` — reject with reason
- `POST /api/librarian/requests/:id/cancel-pickup` — cancel an approved pickup
- `GET /api/librarian/pending-issues` — approved, awaiting pickup
- `POST /api/librarian/verify-code` — verify pickup code
- `POST /api/librarian/complete-issue` — issue the book
- `GET /api/librarian/overdue-books` — overdue list
- `GET /api/librarian/activity-history` — full transaction log

**Admin**
- `GET/POST /api/cities` — manage cities
- `GET/POST /api/libraries` — manage libraries
- `GET /api/libraries/:id/stats` — library stats
- `GET /api/stats` — system-wide stats (public)

---

## Running locally

**Backend**
```bash
cd backend
cp .env.example .env        # set DATABASE_URL and JWT_SECRET
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev                 # runs on :5001
```

**Frontend**
```bash
cd frontend
cp .env.example .env        # set VITE_API_URL=http://localhost:5001/api
npm install
npm run dev                 # runs on :5173
```

**Browse the database**
```bash
cd backend
npx prisma studio           # opens at http://localhost:5555
```

---

## Environment variables

**Backend `.env`**
```
PORT=5001
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET=your-secret-here
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```

**Frontend `.env`**
```
VITE_API_URL=http://localhost:5001/api
```

---

## Security notes

- Passwords are hashed with bcrypt before storage
- JWT tokens expire after 7 days
- Every API route checks the user's role before doing anything
- Prisma ORM prevents SQL injection by design
- CORS is restricted to the configured frontend URL
