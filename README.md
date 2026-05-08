# ICIT Employee Workload Recorder

A full-stack workload recording web application built from the provided Excel workbook.

- **Frontend:** Next.js + Tailwind CSS, Apple.com-style glass cards and quiet gradients
- **Backend:** Node.js + Express
- **Database:** MongoDB via Mongoose
- **Auth:** simple username/password JWT login now; replaceable with ICIT/SSO later
- **Export:** annual fiscal-year CSV export with UTF-8 BOM for Thai text in Excel

## Data imported from Excel

Seed files were generated from:

`แบบบันทึกปริมาณงานช่างเทคนิค.xlsx`

Imported:

- `Main` sheet: **2,099** workload rows
- `Member` sheet: staff seed users
- `DataList` sheet: duty groups, main duties, and minor-task dropdowns

> Note: the workbook contains **9 names** in `Member`, while the requirement says there are **8 people** in this position. The seed keeps all 9 names to avoid losing existing records. Remove or deactivate one user in `backend/src/data/seedMembers.json` if needed.

## Fiscal year rule

The Thai fiscal year is treated as:

- FY 2569 / FY 2026 = `2025-10-01` through `2026-09-30`
- API uses an exclusive end date internally: `2026-10-01`

Both Buddhist Era years (`2569`) and Gregorian years (`2026`) are accepted.

## Quick start

### 1) Start MongoDB

```bash
docker compose up -d mongo
```

### 2) Backend

```bash
cd backend
cp .env.example .env
npm install
npm run seed
npm run dev
```

Backend runs at:

```text
http://localhost:4000
```

### 3) Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Frontend runs at:

```text
http://localhost:3000
```

## Demo accounts

After seeding:

| Username | Password | Role |
|---|---|---|
| `admin` | `admin1234` | admin |
| `พงศกร` | `icit1234` | staff |
| any staff nickname from the Member sheet | `icit1234` | staff |

## Core workflow

1. Employee logs in using their simple ICIT-style username and password.
2. Employee records workload from the form.
3. The app stores:
   - date
   - time
   - employee
   - recipient / requester
   - duty group
   - main duty
   - minor task
   - comment
   - status
4. Employee can view their own records.
5. Admin can view all records, dashboard summaries, and export fiscal-year CSV.

## Main duty mapping

From `DataList`:

### Main Duties

- ดูแลห้องบริการคอมพิวเตอร์
- ให้บริการรับแจ้งและแก้ไขปัญหาระบบสารสนเทศ
- คุมสอบ DL

### Secondary Duties

- สนับสนุนการทำงานของสำนักคอมพิวเตอร์(ฝ่ายอื่นๆ)

### Other Tasks

- ปฏิบัติงานตามที่ผู้บังคับบัญชามอบหมาย

### Minor Tasks

Minor tasks from the Excel sheet are stored as `minorTask`.
This is the best mapping for items such as:

- Assist with computer usage
- Troubleshoot printers and computers
- Borrow headphones
- Return headphones
- ICIT account
- Microsoft Authenticator
- Gmail
- Wifi
- Microsoft 365
- Printing top-up
- Open/close classroom
- Install Windows
- Install software
- Borrow/return power outlet

## API summary

### Auth

```http
POST /api/auth/login
GET /api/auth/me
```

### Worklogs

```http
GET    /api/worklogs
POST   /api/worklogs
GET    /api/worklogs/:id
PUT    /api/worklogs/:id
DELETE /api/worklogs/:id
```

### Categories

```http
GET /api/categories
```

### Dashboard

```http
GET /api/stats/summary?fiscalYear=2569
```

### CSV export

```http
GET /api/export/fiscal-year/2569.csv
```

Admin exports all records. Staff exports only their own records.

## Production notes

- Replace `JWT_SECRET` in `.env`.
- Use HTTPS in production.
- Add ICIT SSO/OAuth in `backend/src/routes/auth.js`.
- Add server-side role management before live use.
- Use MongoDB Atlas or a managed MongoDB service for deployment.
