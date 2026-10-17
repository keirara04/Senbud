# Senbud

Budgeting app for students. No bank login; spending stays on the phone.

| Folder | What it is |
|---|---|
| `mobile/` | The app. Expo (iOS and Android). |
| `web/` | Landing page, budget calculator and the Budget Dungeon game. Next.js static export. See `web/README.md`. |
| `packages/core/` | `@senbud/core`: budget, IOU, date and subscription logic plus design tokens, shared by `mobile` and `web`. |
| `api/` | Laravel backend. For now only the waitlist. See `api/README.md`. |
| `docs/` | Product spec, design system, store forms, GTM notes, HTML concept mockups. |
| `art/` | Logo drafts and pixel-art sprite build scripts for the game. |

`web`, `mobile` and `packages/*` are npm workspaces; `api` is separate (Composer).

```bash
npm install                      # once, at the repo root
npm run dev -w web               # landing page, http://localhost:3000
npm start -w mobile              # Expo dev server
npm test -w web -w @senbud/core  # Vitest
```

API setup is in `api/README.md`.
