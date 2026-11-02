# CloudNotify

A modern, production-ready React frontend for **CloudNotify** — a Serverless Multi-Channel Notification Scheduler. Schedule reminders and receive them via **Telegram**, **Gmail**, or **both** at specified times.

![CloudNotify](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat-square&logo=tailwind-css)

## Features

- Premium SaaS dashboard UI with glassmorphism and smooth animations
- Dark / light mode with persistent theme
- Authentication (login, register, validation, social placeholders)
- Dashboard with analytics, channel distribution, and activity widgets
- Create notifications with date/time, channels, and recurrence
- History with search, filter, sort, and pagination
- Profile and settings pages
- Cloudflare Pages frontend with a Cloudflare Worker API
- Cloudflare D1 persistence and scheduled notification delivery

## Tech Stack

- React 19 + Vite 8
- Tailwind CSS 4
- React Router 7
- Axios
- Lucide React icons
- date-fns

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Demo Login

Use any valid email and a password with **6+ characters** to sign in. Registration requires **8+ characters**.

## Project Structure

```
src/
├── assets/
├── components/     # UI, layout, dashboard, notifications
├── constants/      # Routes, config, mock data
├── context/        # Theme & auth providers
├── hooks/          # useNotifications, useMediaQuery
├── layouts/        # Auth & dashboard shells
├── pages/          # Route pages
├── routes/         # Lazy-loaded routing
├── services/       # Axios + mock API
├── styles/         # Global CSS & Tailwind
├── utils/          # Helpers
├── App.jsx
└── main.jsx
```

## Cloudflare Deployment

### API (Worker + D1)

The backend lives in [`worker/`](./worker). Create a D1 database, set its ID in
`worker/wrangler.toml`, and run:

```bash
cd worker
npm install
npm run db:migrate:remote
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_REFRESH_TOKEN
npx wrangler secret put GMAIL_SENDER
npm run deploy
```

Run `npm run db:migrate:remote` again after pulling new migration files. The
notification timezone migration stores each schedule's IANA timezone, so new
notifications run in the timezone selected in Settings.

`GMAIL_SENDER` is the Gmail account authorized for the Gmail API. The
`TELEGRAM_WEBHOOK_SECRET` value must match the secret token configured on the
Telegram webhook. The Profile page now creates a short-lived, single-use
Telegram connection code.

### Gmail Intelligence (read-only mailbox connection)

Google sign-in and Gmail inbox access are separate. The Gmail integration
requests only `https://www.googleapis.com/auth/gmail.readonly`; it does not
replace or change the existing global Gmail sender used for outgoing reminders.

1. Enable the Gmail API in the Google Cloud project used by CloudNotify.
2. Add this exact redirect URI to the OAuth web client’s **Authorized redirect URIs**:
   `${VITE_API_BASE_URL}/gmail/oauth/callback` (without a trailing slash).
   For local Worker development, also authorize
   `http://localhost:8787/gmail/oauth/callback`.
3. Add the Gmail read-only scope to the OAuth consent screen and add test users
   while the app is in testing. Google may require app verification and a
   security assessment before external users can authorize this restricted
   Gmail scope.
4. Configure the Worker’s `GMAIL_APP_ORIGINS` variable as a comma-separated
   allowlist of exact frontend origins, for example
   `https://cloudnotify.pages.dev,http://localhost:5173`. Do not use `*`.
5. Set the Worker secret `GMAIL_TOKEN_ENCRYPTION_KEY` to a newly generated,
   base64-encoded 32-byte key. Generate it locally with:
   `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`
   Store the output in a password manager and configure it with
   `npx wrangler secret put GMAIL_TOKEN_ENCRYPTION_KEY`. Do not commit the key.
6. Optionally set the Worker variable `GMAIL_SYNC_QUERY`. The default is
   `newer_than:30d {category:primary category:updates}` so initial sync is
   limited to recent Primary and Updates mail; set an appropriately restricted
   Gmail search query if your supported categories differ.
7. Apply the additive D1 migrations before deploying the Worker:
   `cd worker && npm run db:migrate:remote`

Google refresh tokens are encrypted with AES-GCM before being stored in D1 and
are never returned to the browser. OAuth uses a single-use state and PKCE
challenge. The synchronizer stores message IDs and minimal timestamps only;
email content is processed in memory and not retained. Potential invitations
are heuristic detections with confidence scores, not AI-generated facts. Users
must review and confirm an event before reminders are created. The day-before
reminder is scheduled for 9:00 AM local time; the morning-of reminder is
scheduled for 8:00 AM, or 30 minutes before interviews starting by 8:30 AM.
Past reminder times are skipped rather than sent late.
The existing Worker cron incrementally checks connected mailboxes every 15
minutes (with initial-sync pages resumed as needed); **Sync now** can continue
additional pages immediately.

The mailbox connection is per user and can be disconnected from **Profile**.
The existing global `GOOGLE_REFRESH_TOKEN`, `GMAIL_SENDER`, Gmail outgoing
delivery, Telegram integration, sign-in flow, and scheduled notification
records remain separate.

Google sign-in credentials are verified by the Worker through Google's
token-introspection endpoint. The Worker issues a short-lived opaque session
token stored only as a hash in D1; authenticated notification and channel
endpoints derive the account email from that session rather than trusting
client-supplied email fields. Apply all migrations, including
`0004_auth_sessions.sql`, before deploying the Worker.

### Frontend (Cloudflare Pages)

1. Connect the repository in the Cloudflare dashboard under **Workers & Pages**.
2. Select the `dist` output directory and use `npm run build` as the build command.
3. Configure these variables in the Pages project under **Settings → Environment variables**:
   - `VITE_API_BASE_URL`: the deployed Worker URL, for example `https://cloudnotify-api.<account>.workers.dev`.
   - `VITE_APP_NAME`: `CloudNotify`.
   - `VITE_GOOGLE_CLIENT_ID`: the Google OAuth web client ID.
4. Configure the variables for the environment being tested (Production and/or Preview).
5. Redeploy Pages after changing any `VITE_*` variable because Vite embeds them during the build.
6. Add the Pages origin, without a path, to Google OAuth **Authorized JavaScript origins**. For example:
   `https://cloudnotify.pages.dev`
7. SPA routing is handled via `public/_redirects`.

### Telegram Mini App Google sign-in

CloudNotify uses Google Identity Services (`@react-oauth/google`) for normal
browser sign-in. Telegram's embedded WebView cannot reliably complete that GIS
flow because Google's account chooser requires browser capabilities that are
blocked in the WebView; this causes the `postMessage` error and blank page.

The app loads Telegram's official Web Apps SDK and detects a real Mini App
session using `Telegram.WebApp.initData`. In Telegram it does not render the
GIS button. Instead, **Continue in external browser** calls
`Telegram.WebApp.openLink()` and opens the existing `/auth` page. No tokens,
cookies, localStorage values, or `postMessage` calls are exchanged between the
two contexts, so the existing browser flow remains unchanged and the user is
given an explicit return instruction.

No additional environment variables or Google Cloud Console callback URLs are
required for this fallback. Keep `https://cloudnotify.pages.dev` in Authorized
JavaScript origins; do not add a Telegram WebView origin or weaken Google's
embedded-browser restrictions.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Cloudflare Worker API base URL |
| `VITE_APP_NAME` | Application display name |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth web client ID |

## License

MIT — Built for portfolio and academic demonstrations.
