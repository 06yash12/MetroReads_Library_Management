# MetroReads — Library Management System

A full-stack web app for managing libraries across multiple cities. Members browse and borrow books, librarians handle requests and loans, admins run the whole system.

> Updated and enhanced from [Book_Store_Management_System](https://github.com/06yash12/Book_Store_Management_System)

---

## What's inside

- 3 role-based portals — Member, Librarian and Admin, each with their own dashboard
- Book request and pickup flow with unique 8-character codes
- Live India map showing library locations
- Full loan tracking, overdue detection and activity history
- JWT auth with role guards on every route

Full feature breakdown → [project_documentation.md](project_documentation.md)

---

## Screenshots

**Home Page** — live stats, book carousel, India map, city selector. No login needed.
![Home Page](demo/docs/Image/Home%20Page.png)

**Member Books List** — browse your home library's books, filter by availability, request in one click.
![Member Books List](demo/docs/Image/Member%20Books%20List.png)

---

## Quick start

**1. Clone**
```bash
git clone <repository-url>
cd MetroReads_Digital_Library
```

**2. Backend**
```bash
cd backend
cp .env.example .env       # fill in DATABASE_URL and JWT_SECRET
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev                # http://localhost:5001
```

**3. Frontend**
```bash
cd frontend
cp .env.example .env       # set VITE_API_URL=http://localhost:5001/api
npm install
npm run dev                # http://localhost:5173
```

**4. Browse the database (optional)**
```bash
cd backend
npx prisma studio          # http://localhost:5555
```

---

## Default login credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@library.com | admin@library.com |
| Librarian | librarian@library.com | librarian@library.com |
| Member | member@library.com | member@library.com |

---

## Tech stack

| Layer | Tools |
|-------|-------|
| Frontend | React, Vite, Tailwind CSS, React Router, Axios |
| Backend | Node.js, Express.js, Prisma ORM |
| Database | SQLite (dev) / PostgreSQL (production) |
| Auth | JWT, bcrypt |
| Other | QRCode generation, React Icons |

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

## Useful commands

```bash
# Backend
npm run dev                            # dev server
npx prisma studio                      # database GUI
npx prisma migrate dev --name <name>   # new migration

# Frontend
npm run dev                            # dev server
npm run build                          # production build
```

---

<div align="center">
  <p>Thanks for checking out MetroReads.</p>
</div>
