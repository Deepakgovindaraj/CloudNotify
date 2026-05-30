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
- Mock API layer ready for backend integration
- AWS Amplify deployment ready (SPA redirects, build config)

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

## AWS Amplify Deployment

1. Connect your repository in the AWS Amplify Console.
2. Amplify detects `amplify.yml` automatically.
3. Set environment variables (`VITE_API_BASE_URL`, `VITE_APP_NAME`) in the Amplify console.
4. SPA routing is handled via `public/_redirects`.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Backend API base URL |
| `VITE_APP_NAME` | Application display name |

## License

MIT — Built for portfolio and academic demonstrations.
