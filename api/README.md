# Senbud API

Laravel backend for Senbud. It never stores transactions. For now its only job is the landing page waitlist.

| Route | What it does |
|---|---|
| `POST /v1/waitlist` | JSON `{ "email": "...", "feature": "receipt\|afford\|split\|subscriptions\|wrapped" }`. Returns `201 {"ok":true}` for a new email, `200 {"ok":true}` for one already on the list, `422` with field errors on bad input, `429` after 5 requests a minute from one IP. |
| `GET /up` | Health check. |

## Run with Docker

Needs a `.env` with an app key (one-off, needs local PHP + Composer):

```bash
cp .env.example .env
composer install
php artisan key:generate
```

Then start the API and Postgres:

```bash
docker compose up --build
```

The API is on http://localhost:8080. The container runs migrations on start (set `RUN_MIGRATIONS=false` to skip). Data lives in the `db` volume; `docker compose down -v` wipes it.

Look at signups:

```bash
docker compose exec db psql -U senbud -d senbud -c 'select * from waitlist_signups'
```

## Run without Docker

Uses SQLite from `.env.example`:

```bash
touch database/database.sqlite
php artisan migrate
php artisan serve --port=8080
```

## Test

```bash
php artisan test
```

Tests use in-memory SQLite and cover signup, duplicate email, invalid email, invalid feature, rate limit and CORS.

## Environment

Laravel's usual variables (`APP_KEY`, `DB_*`, ...) plus:

| Variable | Default | Purpose |
|---|---|---|
| `WEB_ORIGIN` | `http://localhost:3000` | The only browser origin allowed by CORS. Exact match: scheme, host and port, no trailing slash. Production: `https://senbud.app`. |
| `TRUSTED_PROXIES` | empty | Comma-separated IPs/CIDRs of the reverse proxy in front of the API. Without it, every request behind a proxy shares the proxy's IP and the per-IP rate limit becomes global. Never `*`: anyone could then fake their IP. |
| `RUN_MIGRATIONS` | `true` | Docker only. Run `migrate --force` when the container starts. |

`compose.yaml` overrides the `DB_*` values to point at its Postgres container.

## Hooking up the web form

Build the landing page with the API URL, and set `WEB_ORIGIN` here to wherever it is served:

```bash
cd ../web
NEXT_PUBLIC_API_URL=http://localhost:8080 npm run build
```
