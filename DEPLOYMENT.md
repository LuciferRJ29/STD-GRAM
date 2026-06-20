# Deployment Guide

## 1. MongoDB Atlas

1. Create a free or M10+ cluster at https://cloud.mongodb.com (any Atlas
   cluster is a replica set, which the realtime layer's change streams
   require — a standalone `mongod` will not work).
2. Create a database user and allow network access from `0.0.0.0/0` (or
   Vercel's IP ranges if you've configured them).
3. Copy the connection string into `MONGODB_URI`.

## 2. Mega.nz accounts

1. Create one or more Mega.nz accounts (the owner-provided pool described
   in the architecture — 10–20 accounts is the originally specced range,
   but the app works fine with just one to start).
2. Build the `MEGA_ACCOUNTS` env var as a JSON array:
   ```json
   [
     { "id": "mega1", "email": "acct1@example.com", "password": "..." },
     { "id": "mega2", "email": "acct2@example.com", "password": "..." }
   ]
   ```
3. Keep this in Vercel's environment variables, never in source control.

## 3. SMTP

Any SMTP provider works (e.g. a transactional email service). Set
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`.

## 4. Redis (optional but recommended)

Used for rate limiting and typing/presence pub-sub across multiple Vercel
function instances. Without it, the app falls back to in-memory state,
which works for a single instance but won't sync typing indicators across
concurrent function invocations on Vercel's distributed infrastructure.
A free-tier Redis (e.g. Upstash) is enough for 100–500 users.

## 5. Generate secrets

```bash
openssl rand -base64 48   # JWT_ACCESS_SECRET
openssl rand -base64 48   # JWT_REFRESH_SECRET
openssl rand -base64 32   # COOKIE_SECRET
```

## 6. Deploy to Vercel

1. Push this repository to GitHub/GitLab/Bitbucket.
2. Import the project in the Vercel dashboard.
3. Add all environment variables from `.env.example` (with real values) in
   **Project Settings → Environment Variables**.
4. Set `NEXT_PUBLIC_APP_URL` to your production URL (e.g.
   `https://your-app.vercel.app`).
5. Deploy. Vercel auto-detects Next.js — no custom build command needed.

### Function duration

The `/api/events` SSE route sets `maxDuration = 300`. On Vercel's Hobby
plan, function duration is capped lower than that; the route will simply be
cut off at the platform's actual limit and the client reconnects
automatically (see `useRealtime`). On Pro/Enterprise plans you can raise
this further in `src/app/api/events/route.ts` if you want longer-lived
connections.

## 7. Self-hosting alternative (Docker)

If you ever want to run this off Vercel:

```bash
docker compose up --build
```

This builds the app with `output: 'standalone'` (already configured in
`next.config.js`) and runs it alongside a local Redis container. You'll
still point `MONGODB_URI` at Atlas (or your own replica set) and configure
the same environment variables.

## 8. Post-deploy checklist

- [ ] Confirm `/api/events` connects (browser dev tools → Network → look
      for a pending `text/event-stream` request on `/chats`).
- [ ] Send yourself a test message between two accounts and confirm it
      arrives without a manual refresh.
- [ ] Upload a file and confirm it appears via a Mega account in your pool.
- [ ] Trigger a password reset email and confirm delivery.
- [ ] Enable 2FA on a test account and confirm login requires the code.
