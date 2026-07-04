# Financial Tracker

Personal finance tracker. Django REST Framework backend (JWT auth, SQLite) + React (Vite) frontend with recharts charts and lucide-react icons.

## Backend

```
cd backend
venv\Scripts\activate
python manage.py runserver
```
Runs on http://127.0.0.1:8000. Admin panel at /admin/ (create a superuser with `python manage.py createsuperuser`).

## Frontend

```
cd frontend
npm run dev
```
Runs on http://localhost:5173 (or next free port — update Django's `CORS_ALLOWED_ORIGINS` in `backend/config/settings.py` if it picks a different one).

## Features

- Register/login (JWT, auto-refresh)
- Income & expense transactions, filterable by type, with a floating quick-add button reachable from any page
- Custom categories (income/expense, color + lucide icon)
- Monthly per-category budgets with spend tracking and over/under difference
- Weekly Monday-Friday spending grid, grouped by week
- Loans tracker (money lent to / borrowed from people), separate from regular expenses
- Wallet/Depot: a starting balance you set manually, with a live "remaining" figure (and a second figure that also factors in outstanding loans)
- Dashboard: income/expense/balance summary, avg daily spend, top category, busiest day, spending-by-category donut chart, 6-month income vs expense bar chart

## API

All endpoints under `/api/`:
- `auth/register/`, `auth/login/`, `auth/refresh/`, `auth/me/`
- `categories/` (CRUD)
- `transactions/` (CRUD, filters: `type`, `category`, `start_date`, `end_date`)
- `transactions/summary/` (dashboard data, params: `month`, `year`)
- `transactions/weekly/` (Mon-Fri weekly breakdown, params: `month`, `year`)
- `budgets/` (CRUD, filters: `month`, `year`)
- `loans/` (CRUD, filter: `settled`), `loans/summary/` (owed_to_me / i_owe / net)
- `wallet/` (GET/PATCH `starting_balance`; response includes computed `remaining` and `remaining_with_loans`)

## Wallet math

`remaining = starting_balance + total_income(all-time) - total_expense(all-time)`
`remaining_with_loans = remaining + owed_to_me(unsettled) - i_owe(unsettled)`

Update the Depot (starting balance) from the Dashboard whenever you want to reset the baseline (e.g. after reconciling with your actual cash on hand).
