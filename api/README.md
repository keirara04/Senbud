# Senbud API

Laravel backend for Senbud. It never stores transactions. For now its only job is the landing page waitlist.

| Route | What it does |
|---|---|
| `POST /v1/waitlist` | JSON `{ "email": "...", "feature": "receipt\|afford\|split\|subscriptions\|wrapped", "ref": "optional referral code" }`. Stores the email unconfirmed and emails a confirm link. Always `200 {"ok":true,"status":"pending_confirmation"}`, for new, pending and confirmed emails alike, so the API never reveals who is on the list. `422` with field errors on bad input, `429` after 5 requests a minute from one IP. |
| `GET /v1/waitlist/confirm/{token}` | The link in the email. Confirms the signup, credits the referrer once, and redirects to `$WEB_ORIGIN/confirmed?code={referral_code}`. Unknown, used or expired (7 days) tokens redirect to `$WEB_ORIGIN/confirmed?status=invalid`. |
| `GET /up` | Health check. |

### Double opt-in and referrals

- Each signup gets an 8-character `referral_code`. A `ref` that matches another signup's code records the referrer; unknown codes are ignored.
- The referrer's `referrals_count` goes up when the referred person confirms, never before and never twice.
- Signing up again with a pending email resends the confirm email with a new link (the old link stops working), at most once every 5 minutes per address. A confirmed address gets no email.
- Only a sha256 hash of the confirm token is stored.

Invite order (confirmed signups, most referrals first, then earliest confirmation):

```bash
php artisan waitlist:order                       # local
docker compose exec api php artisan waitlist:order
```

### Email

Confirm emails go through Laravel's default mailer. `.env.example` uses `MAIL_MAILER=log`, which writes each email, link included, to `storage/logs/laravel.log` instead of sending it. Find the latest link with:

```bash
docker compose exec api grep -o 'http://[^ ]*/v1/waitlist/confirm/[A-Za-z0-9]*' storage/logs/laravel.log | tail -1
```

For real delivery set `MAIL_MAILER=smtp` with `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, and a `MAIL_FROM_ADDRESS` on a domain you send from. Emails are sent inline during the request; move them to the queue once the API runs a queue worker.

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

Tests use in-memory SQLite and cover signup, duplicate and resend, confirm, invalid/used/expired tokens, referral credit, the order command, validation, rate limit and CORS.

## Environment

Laravel's usual variables (`APP_KEY`, `DB_*`, ...) plus:

| Variable | Default | Purpose |
|---|---|---|
| `APP_URL` | `http://localhost:8080` | Public base URL of this API. Confirm links in emails are built from it (never from the request's Host header). Production: `https://api.senbud.app`. |
| `WEB_ORIGIN` | `http://localhost:3000` | The only browser origin allowed by CORS, and where confirm links redirect. Exact match: scheme, host and port, no trailing slash. Production: `https://senbud.app`. |
| `MAIL_*` | `MAIL_MAILER=log` | See [Email](#email). |
| `TRUSTED_PROXIES` | empty | Comma-separated IPs/CIDRs of the reverse proxy in front of the API. Without it, every request behind a proxy shares the proxy's IP and the per-IP rate limit becomes global. Never `*`: anyone could then fake their IP. |
| `RUN_MIGRATIONS` | `true` | Docker only. Run `migrate --force` when the container starts. |

`compose.yaml` overrides the `DB_*` values to point at its Postgres container.

## Hooking up the web form

Build the landing page with the API URL, and set `WEB_ORIGIN` here to wherever it is served:

```bash
cd ../web
NEXT_PUBLIC_API_URL=http://localhost:8080 npm run build
```
