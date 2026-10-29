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

The current frontend authentication is a client-side demo flow, so the
`/telegram/link-code` endpoint requires a bearer token but cannot independently
verify its email claim. Production deployments should replace the demo auth with
server-validated sessions before treating account linking as fully verified.

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

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Cloudflare Worker API base URL |
| `VITE_APP_NAME` | Application display name |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth web client ID |

## License

MIT — Built for portfolio and academic demonstrations.
