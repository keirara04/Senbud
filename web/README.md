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
| `NEXT_PUBLIC_API_URL` | Laravel API base URL. The waitlist form posts to `$NEXT_PUBLIC_API_URL/v1/waitlist`. Unset = the form shows "not open yet" and saves nothing. |
| `NEXT_PUBLIC_SITE_URL` | Public site URL, used for social preview metadata. |
