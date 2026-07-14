# Bio Trend Energy

Responsive Bio Trend Energy website rebuilt from the supplied visual reference.

Public navigation uses separate routes: `/`, `/about`, `/solutions`, `/process`,
`/impact`, `/projects`, `/blog`, and `/contact`. Individual blog posts live at
`/blog/<slug>`. The admin panel remains available at `/admin`.

## Commands

```powershell
npm install
npm run dev        # frontend only (Vite, port 5173)
npm run backend    # API server only (port 8787)
npm run dev:all    # frontend + backend together
npm run build
```

## Backend configuration (environment variables)

The API server (`backend/server.cjs`) reads the following, all optional:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8787` | API server port |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated CORS allow-list. Set to your production domain(s) before deploying. `*` allows any origin (not recommended). |
| `SESSION_TTL_HOURS` | `168` (7 days) | How long a login session stays valid. Sessions are persisted to `backend/data/sessions.json` so a restart no longer logs everyone out. |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_DISPLAY_NAME` | `admin` / `BioTrend@Admin2026` / `Primary Admin` | Bootstrap admin account, created only on first run when `users.json` does not yet exist. **Change the password for any real deployment.** |

## Blog

Posts are stored in `backend/data/blog-posts.json` and managed from the admin
dashboard's **Blog Studio** tab (compose, save draft, publish/unpublish, delete).
Only published posts appear on the public `/blog` Journal.

## Real-time traffic

The public site pings `/api/track/view` on each page view and sends periodic
heartbeats; the dashboard's **Live Traffic Views** tile polls `/api/analytics/live`
to show the running view count and current online-visitor figure.

Run `npm run qa:visual` while the development server is available at
`http://localhost:5173` to capture desktop and mobile checks with Microsoft Edge.

## Assets

Production-ready images and the compressed website film are in `public/assets`.
The untouched source video is preserved locally in `source-assets` and excluded
from Git and production builds because of its size.
