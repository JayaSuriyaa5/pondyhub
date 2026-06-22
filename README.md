# PondyHub

Pondicherry's community forum. Built with Next.js 15 (App Router), TypeScript, Tailwind CSS, PostgreSQL, Prisma, JWT auth, and Socket.IO for real-time notifications and live comments.

*Powered by SafeShield.*

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router), TypeScript |
| Styling | Tailwind CSS (custom coastal theme, dark mode) |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT (access + refresh tokens, httpOnly cookies) |
| Real-time | Socket.IO, attached to a custom Node server (`server.ts`) |
| Server runtime | `tsx` (runs `server.ts` directly, in both dev and production) |
| Containerization | Docker + Docker Compose |

**Why a custom server?** Socket.IO needs a persistent `http.Server` instance to upgrade connections to WebSockets on. Standard Next.js route handlers are request/response functions, not a long-lived server object — so `server.ts` creates the actual HTTP server, hands all normal requests to Next's own request handler unchanged, and attaches Socket.IO alongside it. This replaces `next dev`/`next start` with `tsx server.ts` for both development and production. See the comments at the top of `server.ts` for the full reasoning.

---

## Project Structure

```
pondyhub/
├── server.ts                  # Custom server entry point (Next.js + Socket.IO)
├── docker-compose.yml         # Production orchestration (app + Postgres)
├── docker-compose.dev.yml     # Dev override (hot reload, source mounted)
├── Dockerfile                 # Multi-stage production image
├── docker/entrypoint.sh       # Runs migrations, then execs into the server
├── prisma/
│   ├── schema.prisma           # Full data model
│   └── seed.ts                 # Seeds 10 default categories + admin account
└── src/
    ├── app/                    # Pages + API routes (App Router)
    ├── components/             # UI, layout, posts, comments, votes, admin
    ├── context/                # Auth, Theme, Notification providers
    ├── hooks/                  # useAuth, useSocket, useDebounce, etc.
    ├── lib/                    # Prisma client, auth, validation, socket, etc.
    ├── types/                  # Shared TypeScript types (client + server safe)
    └── middleware.ts           # Route guards (auth + admin)
```

---

## 1. Local Development (without Docker)

### Prerequisites
- Node.js 20+
- A running PostgreSQL instance (local install, or run just the `db` service from Docker Compose — see step 4 below)

### Setup

```bash
# 1. Install dependencies
npm install
# This also generates package-lock.json, which the Dockerfile's
# `npm ci` step requires -- do this before your first `docker build`,
# even if you plan to develop primarily inside Docker.

# 2. Copy environment variables
cp .env.example .env
```

Edit `.env` and set real values, especially:

```bash
DATABASE_URL="postgresql://forum_user:forum_password@localhost:5432/forum_db?schema=public"
JWT_ACCESS_SECRET="<generate with: openssl rand -base64 48>"
JWT_REFRESH_SECRET="<generate a DIFFERENT random string the same way>"
```

`JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must each be at least 32 characters (enforced at runtime in `src/lib/auth.ts`) and must be different from each other.

```bash
# 3. Push the schema and seed default data
npx prisma migrate dev --name init
npm run prisma:seed

# 4. Start the dev server (custom server + Socket.IO, with hot reload)
npm run dev
```

The app is now running at `http://localhost:3000`.

**Default admin account** (created by the seed script):
- Email: `admin@pondyhub.com`
- Password: `ChangeMe123!`
- **Change this password immediately** via Settings, or directly in the database, before deploying anywhere reachable by the public.

---

## 2. Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Yes | Signs short-lived (15 min) access tokens. Min 32 chars. |
| `JWT_REFRESH_SECRET` | Yes | Signs long-lived (7 day) refresh tokens. Min 32 chars, must differ from the access secret. |
| `JWT_ACCESS_EXPIRES_IN` | No (default `15m`) | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | No (default `7d`) | Refresh token lifetime |
| `NEXT_PUBLIC_APP_URL` | Yes | Public URL of the app (used in metadata, Socket.IO CORS origin) |
| `NODE_ENV` | Set automatically | `development` or `production` |
| `PORT` | No (default `3000`) | Port the custom server listens on |
| `HOSTNAME` | No (default `0.0.0.0`) | Bind address — must be `0.0.0.0` inside Docker |

Generate strong secrets with:
```bash
openssl rand -base64 48
```

---

## 3. Database Migrations

This project uses Prisma Migrate. Common commands:

```bash
# Create a new migration after editing prisma/schema.prisma
npx prisma migrate dev --name describe_your_change

# Apply pending migrations in production (no schema drift prompts)
npx prisma migrate deploy

# Open Prisma Studio (visual DB browser) at localhost:5555
npm run prisma:studio

# Re-run the seed script (safe to re-run -- uses upsert for categories,
# skips admin creation if one already exists)
npm run prisma:seed
```

In Docker, `prisma migrate deploy` runs automatically on every container start via `docker/entrypoint.sh`, before the server boots.

---

## 4. Running with Docker

### Quick start (production-like, single command)

```bash
# 1. Create .env in the project root (docker-compose reads it automatically)
cp .env.example .env
# Edit .env: set real JWT secrets at minimum.

# 2. Build and start everything (Postgres + app)
docker compose up --build
```

This starts:
- `db` — PostgreSQL 16, with a healthcheck gating the app's startup
- `app` — the production-built Next.js + Socket.IO server, on port 3000

The app container's entrypoint automatically waits for the database and runs migrations before starting. **It does not run the seed script automatically** — run that once after the first successful start:

```bash
docker compose exec app npm run prisma:seed
```

Visit `http://localhost:3000`.

### Local development inside Docker (hot reload)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

This mounts your local `src/`, `prisma/`, and config files into the container and runs `npm run dev` instead of the production build, so file edits on your host are picked up immediately.

### Stopping / cleaning up

```bash
docker compose down            # stop containers, keep volumes (DB data, avatars)
docker compose down -v         # stop and delete volumes too (full reset)
```

### Important: generate `package-lock.json` before your first build

The Dockerfile's dependency stage uses `npm ci`, which requires `package-lock.json` to already exist and match `package.json` exactly. If you've never run `npm install` locally:

```bash
npm install   # generates package-lock.json
git add package-lock.json && git commit -m "Add lockfile"
```

Then `docker compose up --build` will succeed. Without this, the build fails at the `npm ci` step with a missing-lockfile error.

---

## 5. Production Deployment Notes

This app is **not** a static/serverless deployment target (it cannot run on platforms that only support `next start` or edge functions, like a default Vercel deployment) — it needs a long-running Node process, because of the Socket.IO server. Suitable targets:

- A VM / dedicated server running Docker (the included `Dockerfile` + `docker-compose.yml`)
- Any container platform that supports long-running services and WebSocket connections (e.g. a Kubernetes Deployment, AWS ECS/Fargate, Render, Railway, Fly.io)
- A bare-metal/VM Node process manager (e.g. `pm2 start server.ts --interpreter tsx`), behind a reverse proxy

### Reverse proxy / WebSocket support

If you put PondyHub behind nginx, Caddy, or a load balancer, make sure it's configured to **upgrade connections for WebSockets**, not just proxy plain HTTP. For nginx, this means the `Upgrade`/`Connection` headers must be forwarded on the `/socket.io/` path. Without this, the app will still load and HTTP requests will work, but real-time notifications and live comments will silently fall back to no live updates (the rest of the app's polling/on-mount fetches still work, since the socket layer is additive UX, not the system of record).

### Scaling beyond one instance

Two pieces of this MVP are intentionally single-instance-only and will need upgrading before running multiple app replicas behind a load balancer:

1. **Rate limiting** (`src/lib/rateLimit.ts`) is in-memory per process. With multiple instances, each one tracks limits independently, effectively multiplying the real limit by the instance count. Replace with a shared store (Redis) for consistent enforcement.
2. **Socket.IO rooms** are also in-memory per process by default. With multiple instances, a notification pushed on instance A won't reach a user connected to instance B. Add the Socket.IO Redis adapter (`@socket.io/redis-adapter`) to fan out events across instances once you scale past one.

### Security checklist before going live

- [ ] Change the seeded admin password (or delete that account and create a real one)
- [ ] Set strong, unique `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (never reuse the `.env.example` placeholders)
- [ ] Serve over HTTPS — cookies are marked `secure` automatically when `NODE_ENV=production`, which means they won't be sent over plain HTTP in production
- [ ] Set `NEXT_PUBLIC_APP_URL` to your real domain (used for Socket.IO CORS origin validation)
- [ ] Review `docker-compose.yml`'s exposed Postgres port (`5432:5432`) — remove this mapping in production so the database is only reachable from other containers, not the public internet
- [ ] Set up real database backups (the named Docker volume `pondyhub_db_data` is not a backup strategy by itself)

### Windows note

The `npm start` script in `package.json` uses `NODE_ENV=production tsx server.ts`, which relies on POSIX-style inline environment variable assignment. This works in Docker (Linux containers) and on macOS/Linux shells, but will fail on native Windows `cmd.exe`. If running outside Docker on Windows, use PowerShell with `$env:NODE_ENV='production'; tsx server.ts`, or install `cross-env` and adjust the script.

---

## 6. Feature Reference

| Feature | Where to find it |
|---|---|
| Signup / login / logout | `src/app/(auth)/`, `src/app/api/auth/` |
| JWT access + refresh tokens | `src/lib/auth.ts`, `src/lib/session.ts`, `src/app/api/auth/refresh/` |
| User profiles + reputation tiers | `src/app/u/[username]/`, `src/lib/reputation.ts` |
| Categories | `src/app/categories/[slug]/`, `src/app/api/categories/` |
| Posts (CRUD, rich text) | `src/app/posts/`, `src/components/posts/RichTextEditor.tsx` |
| Nested comments | `src/components/comments/`, `src/lib/commentSerializer.ts` |
| Upvotes / downvotes | `src/lib/voting.ts`, `src/components/votes/VoteButtons.tsx` |
| Search | `?q=` param on `/`, handled in `src/app/api/posts/route.ts` |
| Infinite scroll | `src/hooks/useInfiniteScroll.ts`, `src/components/posts/PostList.tsx` |
| Trending / Featured sections | `src/components/posts/TrendingSidebar.tsx`, `FeaturedSection.tsx` |
| Real-time notifications | `src/lib/socket/`, `src/context/NotificationContext.tsx` |
| Real-time comments | `comment:new` socket event, wired in `CommentList.tsx` |
| Admin dashboard | `src/app/admin/`, `src/components/admin/` |
| Moderation (hide/delete posts, ban users) | `src/app/api/admin/` |
| Dark mode | `src/context/ThemeContext.tsx`, `class` strategy in `tailwind.config.ts` |
| Rate limiting | `src/lib/rateLimit.ts` (in-memory; see scaling notes above) |
| HTML sanitization (XSS protection) | `src/lib/sanitize.ts`, applied on every post/comment write |

---

## 7. What's Out of Scope for This MVP

Per the original project scope, the following were intentionally not built and would be natural next steps:
- Email verification and password reset (no email-sending service wired up)
- Avatar upload (the `avatarUrl` field and UI exist; file upload handling does not)
- Private messaging (the real-time layer is structured to support it — see `src/lib/socket/emit.ts` and the `userRoom()` helper — but no DM data model or UI was built)
- User @mentions (the `MENTION` notification type exists in the schema as a placeholder, unused)
- Reports / formal moderation queue (admins can hide/delete directly; there's no user-facing "report this" flow)
- Tags (categories exist; a separate tagging system does not)
