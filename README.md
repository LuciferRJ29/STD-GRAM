# Telegram Clone

A Telegram-inspired messaging app built with Next.js 15 (App Router), MongoDB
Atlas, and a multi-account Mega.nz storage backend — designed to run
**entirely on Vercel** with no separate WebSocket/signaling server.

This README covers what's in this build, the architecture decisions behind
it, and what's left on the roadmap. See `DEPLOYMENT.md` for step-by-step
Vercel deployment instructions.

## What's included in this build

- **Auth**: sign up, email OTP verification, login, logout, forgot/reset
  password, remember me, active sessions & device management, login
  history, two-factor authentication (TOTP + backup codes).
- **Profiles & privacy**: username, display name, bio, avatar, last
  seen/online status, per-field privacy controls (last seen, profile photo,
  phone, forwarding, group invites), block/unblock.
- **Chats**: real-time 1:1 and group messaging, typing indicators, delivered
  / read receipts, replies, forwards, edits, deletes, reactions, mentions,
  hashtags, scheduled & silent messages.
- **Groups**: owner/admin/moderator/member roles, invite links, join
  requests with approval, slow mode, bans, anonymous-admin flag on the data
  model (UI surfacing of anonymous-admin posting is on the roadmap).
- **Media**: image/video/audio/voice/document uploads, deduplication by
  checksum, signed download URLs, per-account upload size limits
  (free vs. premium).
- **Search**: global search across people, chats, and messages.
- **Notifications**: in-app notification feed (mentions, reactions, group
  invites, role changes); push-notification delivery wiring is present in
  the service worker but subscription management UI is on the roadmap.
- **Realtime**: Server-Sent Events backed by MongoDB change streams (durable
  events) plus a Redis/in-memory pub-sub layer (ephemeral events like typing
  and presence) — see "Why SSE instead of Socket.io" below.
- **Storage**: provider-abstracted storage layer with a Mega.nz multi-account
  implementation — rotation, failover, health checks, dedup.
- **Security**: JWT access/refresh tokens (refresh tokens stored hashed),
  rate limiting, security headers, input validation via Zod, password
  hashing via bcrypt, slow-mode/ban enforcement.
- **PWA**: installable manifest, offline app-shell caching service worker,
  push notification handlers.

## What's on the roadmap (not in this build)

Per the agreed scope, this build is the **Phase 1 core**. The architecture
(storage provider interface, role-based chat access helper, model layer) is
built so the following slot in later without refactoring what exists:

- Voice/video calls (WebRTC) and group voice/video chat
- Stories
- Channels (broadcast-only chats with subscribers/view counts)
- Bot platform (bot accounts, tokens, webhooks, inline bots)
- Founder dashboard & admin dashboard
- Premium feature gating beyond the upload-size check already in place
- Custom emoji / animated stickers
- Contacts list (the `isContact` privacy check is stubbed to `false` today)

## Architecture notes

### Why SSE instead of Socket.io

Vercel Functions don't support long-lived, stateful WebSocket connections —
each invocation is a fresh, short-lived process. Per the "Vercel-only, no
separate server" requirement, realtime here is built on:

1. **Server-Sent Events** (`/api/events`) for the durable stream a browser
   tab keeps open. Each connection runs a MongoDB **change stream** scoped
   to the user's chats, so new messages/edits/reactions/notifications push
   down as they're written — no polling required for those events.
2. **Redis pub/sub** (falls back to in-memory if `REDIS_URL` isn't set) for
   ephemeral signals — typing indicators and presence — that don't need to
   be durable or stored in MongoDB.
3. The client (`useRealtime` hook) reconnects automatically when the
   connection drops, which happens periodically because the underlying
   function has a max execution duration.

Trade-off: this is not as low-latency as a dedicated Socket.io server, and
on Vercel's Hobby tier the function duration cap means more frequent
reconnects. For 100–500 users this is a reasonable trade for staying
single-platform and low-cost. If you outgrow it, the realtime layer is
isolated in `src/lib/realtime.ts` and `src/hooks/useRealtime.ts` — swapping
in a dedicated realtime server later doesn't require touching the data
model or API routes.

### Storage provider abstraction

`src/storage/StorageProvider.ts` defines the interface every backend
implements. `src/storage/MegaStorageProvider.ts` is the current
implementation; `src/storage/index.ts` is the single place that wires up
which provider is active. Swapping to S3/R2/B2 later means writing one new
class and changing one import — nothing in the API routes, models, or UI
needs to change.

**A note on Mega for production use:** Mega's API isn't purpose-built for
high-volume programmatic multi-account upload orchestration, and routing
all app media through personal Mega accounts may not align with Mega's
terms of service for this kind of usage. This implementation does what was
asked (multi-account rotation, failover, health checks), but if you hit
reliability issues in production, an S3-compatible backend is a drop-in
replacement at the `StorageProvider` interface level.

### Data model

See `src/models/` for the full Mongoose schemas: `User`, `Session`,
`Device`, `OtpCode`, `File`, `Chat` (covers both direct chats and groups via
a `type` discriminator), `Message`, `Notification`.

## Local development

```bash
npm install
cp .env.example .env   # fill in MongoDB URI, JWT secrets, SMTP, Mega accounts
npm run dev
```

Requires:
- A MongoDB **Atlas** cluster (replica set) — change streams require it;
  a local single-node `mongod` will not support the realtime SSE layer.
- At least one Mega.nz account to upload media (set `MEGA_ACCOUNTS`).
- SMTP credentials for OTP/password-reset emails.

## Tech stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS · MongoDB Atlas
(Mongoose) · JWT auth · Server-Sent Events + MongoDB change streams ·
Redis (optional) · Mega.nz multi-account storage · Zustand · PWA

## Project structure

```
src/
├── app/                # Pages (App Router) + API routes
│   ├── (auth)/          # login, register, verify, forgot/reset password
│   ├── chats/            # chat list, chat window, settings
│   └── api/              # all backend routes
├── components/          # UI components (auth, chat, layout, ui)
├── hooks/               # useRealtime, useFileUrl, useGlobalRealtime
├── lib/                 # db, auth, jwt, crypto, mailer, rateLimit, realtime, validators
├── models/              # Mongoose schemas
├── storage/              # StorageProvider interface + Mega implementation
├── store/                # Zustand stores
└── types/                # Shared frontend types
```
