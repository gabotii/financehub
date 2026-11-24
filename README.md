# FinanceHub

A personal-finance app: a REST API built with Django 5.2, Django REST Framework and
PostgreSQL, plus a React + TypeScript single-page frontend, fully containerised with
Docker.

Users track income and expenses by category, set monthly budgets per category and get
analytics (balance, savings rate, spending breakdown and monthly trends).

## Features

- **JWT authentication**: register, login, refresh-token rotation with blacklisting,
  logout, profile and password change. Credential endpoints are rate limited.
- **Strict per-user isolation**: every resource is scoped to its owner. Other users'
  objects return 404, and their ids are rejected as nonexistent.
- **Categories**: income and expense categories. Names are unique per user,
  case-insensitively. New accounts are seeded with a default set.
- **Transactions**: filter by date range, category, kind and amount range. Full-text
  search, ordering, and a CSV export that guards against formula injection.
- **Budgets**: monthly limits per expense category, with `spent`, `remaining` and
  `percent_used` computed in a single SQL query.
- **Analytics**: a period summary, a per-category breakdown and a monthly income vs.
  expense trend. Months with no activity are included as zeros.
- **OpenAPI docs** with Swagger UI, plus a health-check endpoint for container probes.
- **React frontend** (Spanish UI) with a dashboard, transactions, budgets and categories
  pages. Charts are hand-built in SVG with hover tooltips and a table view, using a
  colour-blind-safe palette. Light and dark themes, responsive down to phone width.
  JWT tokens refresh automatically.
- **46 pytest tests** run against real PostgreSQL. CI covers linting, tests, migration
  drift, schema validation and the Docker build.

## Tech stack

Python 3.13 · Django 5.2 · DRF · SimpleJWT · django-filter · drf-spectacular ·
PostgreSQL 17 · Gunicorn · WhiteNoise · React 19 · TypeScript · Vite · React Router ·
Docker Compose · pytest · factory-boy · Ruff · GitHub Actions

## Quick start (Docker)

```bash
cp .env.example .env            # set DJANGO_SECRET_KEY to a random value
docker compose up --build
docker compose exec backend python manage.py seed_demo   # optional demo data
```

- **App: <http://localhost:5173>**. The Vite dev server proxies `/api` to Django.
- API: <http://localhost:8000/api/v1/>
- Swagger UI: <http://localhost:8000/api/docs/>
- Admin: <http://localhost:8000/admin/> (create a user with
  `docker compose exec backend python manage.py createsuperuser`)
- Demo login: `demo@financehub.dev` / `demo-pass-123`

The dev stack mounts `backend/` into the container, so code changes reload
automatically. Migrations run on startup.

## Running tests and linting

```bash
docker compose exec backend pytest --cov=apps
docker compose exec backend ruff check . && docker compose exec backend ruff format --check .
```

To run outside Docker, create a venv in `backend/`, install `requirements/dev.txt` and
start only the database with `docker compose up db`. The `DATABASE_URL` in `.env`
already points to `localhost:5432`.

## API overview

All endpoints live under `/api/v1/` and require `Authorization: Bearer <access>`,
except register, login, refresh and health.

| Method | Path | Description |
| --- | --- | --- |
| GET | `health/` | Liveness and database check |
| POST | `auth/register/` | Create an account; returns user + tokens |
| POST | `auth/login/` | Email + password → access/refresh tokens |
| POST | `auth/refresh/` | Rotate the refresh token |
| POST | `auth/logout/` | Blacklist a refresh token |
| GET/PATCH | `auth/me/` | Current user's profile |
| POST | `auth/change-password/` | Change password |
| CRUD | `categories/` | Filter: `kind`; search: `name` |
| CRUD | `transactions/` | Filters: `date_from`, `date_to`, `category`, `kind`, `min_amount`, `max_amount`; `search`; `ordering` |
| GET | `transactions/export/` | CSV export (same filters) |
| CRUD | `budgets/` | Filters: `month=YYYY-MM`, `category` |
| GET | `analytics/summary/` | Income, expense, balance and savings rate (`date_from`, `date_to`; defaults to the current month) |
| GET | `analytics/by-category/` | Totals and percentage per category (`kind`, date range) |
| GET | `analytics/monthly/` | Trend for the last `months` months (1–36, default 12) |

Example:

```bash
TOKEN=$(curl -s -X POST localhost:8000/api/v1/auth/login/ \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@financehub.dev","password":"demo-pass-123"}' | jq -r .access)
curl -s localhost:8000/api/v1/analytics/summary/ -H "Authorization: Bearer $TOKEN"
```

## Design notes

- **Amounts are always positive.** The category's `kind` decides whether money comes in
  or goes out, which avoids sign bugs. Amounts use `Decimal` and are serialized as
  strings.
- **Database constraints back the serializer validation**: positive amounts, one budget
  per category and month, budget months stored as the first day, and case-insensitive
  unique category names. The serializers return friendly 400 errors first.
- **Deleting a category that has transactions is blocked** with a 409 response
  (`on_delete=RESTRICT`). Deleting a user still cascades cleanly.
- **One settings module** driven by environment variables (12-factor). Running with
  `DJANGO_ENV=production` and `DEBUG` on is refused at startup.

## Production

```bash
cp .env.prod.example .env.prod   # fill in real secrets and hosts
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

The production stack runs Gunicorn with DEBUG off and a container health check, and
does not publish the database port. HTTPS redirect, HSTS and secure cookies are
enabled. Put a TLS-terminating reverse proxy in front of the API (Nginx, Caddy or a
cloud load balancer) and make it send `X-Forwarded-Proto`.

## Project layout

```
backend/
  config/            settings, URLs, WSGI/ASGI
  apps/
    core/            shared base model, pagination, ownership mixin, health, seed_demo
    accounts/        email-based User and auth endpoints
    categories/      income/expense categories
    transactions/    transactions, filters, CSV export
    budgets/         monthly budgets with computed spending
    analytics/       aggregation services and report endpoints
  conftest.py        shared pytest fixtures
frontend/
  src/api.ts         typed API client with token refresh
  src/pages/         dashboard, transactions, budgets, categories, auth
  src/components/    layout, SVG charts, budget progress, modal
docker-compose.yml       development stack (db + backend + frontend)
docker-compose.prod.yml  production-like stack
.github/workflows/ci.yml lint, tests, frontend build and Docker build
```
