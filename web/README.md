# Senbud web

Landing page (and later the app) for Senbud. Next.js static export + Tailwind CSS.

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # demo logic tests (Vitest)
npm run build    # static site in out/, serve with nginx
```

## Environment

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Laravel API base URL. The waitlist form posts to `$NEXT_PUBLIC_API_URL/v1/waitlist`. Unset = the form shows "not open yet" and saves nothing. The API only accepts requests from its `WEB_ORIGIN`, so set that to where this site is served (see `../api/README.md`). |
| `NEXT_PUBLIC_SITE_URL` | Public site URL, used for social preview metadata, sitemap and robots.txt. |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Turns on cookie-free Plausible analytics for this domain. Unset = no analytics. |
| `NEXT_PUBLIC_PLAUSIBLE_SRC` | Optional script URL for a self-hosted Plausible (defaults to plausible.io's tagged-events script). |

## Deploying (Dokploy)

`web/Dockerfile` builds the static export and serves it with nginx (`web/nginx.conf`, which handles the clean URLs below). In Dokploy: Build Type Dockerfile, Dockerfile Path `web/Dockerfile`, Docker Context Path `.` (the repo root), container port 80, domain `senbud.com`. The `NEXT_PUBLIC_*` values are build arguments and default to production (`https://senbud.com`, `https://api.senbud.com`). `web/Dockerfile.dockerignore` replaces the root `.dockerignore` for this build.

## Serving with nginx

Pages are exported as `name.html` (for example `alternatives/ynab-alternative.html`). Serve clean URLs with:

```nginx
location / {
  try_files $uri $uri.html $uri/ =404;
}
error_page 404 /404.html;
location = /opengraph-image { default_type image/png; }
```
