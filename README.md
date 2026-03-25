# Hunter vs Runner

A real-time **2-player multiplayer 3D web game** where one player is the Hunter (trying to catch the Runner) and the other is the Runner (trying to survive 2 minutes.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vite + React + TypeScript |
| 3D Rendering | React Three Fiber + `@react-three/drei` + `@react-three/postprocessing` |
| WebSocket Client | Colyseus.js |
| State Management | Zustand |
| Routing | React Router DOM |
| Styling | Tailwind CSS v4 (custom dark/neon theme) |
| Backend | NestJS (DI/config modules) + Colyseus 0.17 (HTTP + WebSocket game server) |
| Auth | Supabase Auth (Email OTP) |
| Database | Supabase Postgres |

---

## Getting Started

### Prerequisites
- Node.js 20+
- A [Supabase](https://supabase.com) account (free tier works)
- Supabase project with enabled Email provider

---

### Step 1 — Set up Supabase

1. Go to [https://app.supabase.com](https://app.supabase.com) and create a new project.
2. In the Supabase dashboard, go to **SQL Editor** and paste the entire contents of `docs/supabase-migration.sql`, then click **Run**. This creates the `users` and `game_results` tables, RLS policies, and helper RPC functions.
3. Go to **Authentication → Providers** and make sure **Email** provider is enabled.
4. Keep default OTP settings (or adjust OTP expiration if needed) in Email provider options.

---

### Step 2 — Get your Supabase keys

In the Supabase dashboard, go to **Settings → API**:
- `Project URL` → your `SUPABASE_URL`
- `anon` key → your `VITE_SUPABASE_ANON_KEY` (public, safe for browser)
- `service_role` key → your `SUPABASE_SERVICE_ROLE_KEY` (**keep secret**, backend only)

---

### Step 3 — Configure frontend environment

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_COLYSEUS_ENDPOINT=ws://localhost:2567
VITE_SITE_URL=http://localhost:5173
```

---

### Step 4 — Configure backend environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
NODE_ENV=development
PORT=2567
CORS_ORIGIN=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

---

### Step 5 — Install dependencies

```bash
cd frontend && npm install
cd ../backend && npm install
```

---

## Running the App

### Development

Open **two terminals**:

**Terminal 1 — Backend:**
```bash
cd backend
npm run start:dev
# Server starts on http://localhost:2567
# Health check: http://localhost:2567/health
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# Opens http://localhost:5173
```

Open `http://localhost:5173` in **two different browser windows** to test multiplayer.

### Production

```bash
# Backend
cd backend
npm run build
npm run start:prod

# Frontend
cd frontend
npm run build
# Serve dist/ with nginx, Vercel, Netlify, etc.
```

### Deployment (Vercel + Render)

Frontend:
- Deploy `frontend/` as a Vite project on Vercel.
- Set Vercel Production env vars:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_COLYSEUS_ENDPOINT=wss://<your-render-backend-domain>`
  - `VITE_SITE_URL=https://<your-vercel-domain>`

Backend:
- Deploy `backend/` as a Docker Web Service on Render.
- You can use the included `render.yaml` blueprint from repo root.
- Set Render env vars:
  - `NODE_ENV=production`
  - `PORT=2567`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CORS_ORIGIN=https://<your-vercel-domain>` (or comma-separated list for multiple domains)

Important production notes:
- Use `wss://` (never `ws://`) for `VITE_COLYSEUS_ENDPOINT` when frontend is on HTTPS.
- Add Supabase redirect URL: `https://<your-vercel-domain>/auth/callback`.
- Free hosting can sleep; first request may take up to ~60s.

### Docker

```bash
# Start containers in background
docker compose up --build -d

# Show logs
docker compose logs -f

# Stop stack
docker compose down
```

---

## Environment Variables

| Variable | Service | Description | Where to get it |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Frontend | Supabase project URL | Supabase → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Public anon key (safe for browser) | Supabase → Settings → API → anon key |
| `VITE_COLYSEUS_ENDPOINT` | Frontend | WebSocket URL of backend | `ws://localhost:2567` for dev, `wss://<render-domain>` for prod |
| `VITE_SITE_URL` | Frontend | App base URL (for OAuth redirects) | `http://localhost:5173` for dev |
| `PORT` | Backend | HTTP/WebSocket server port | Set to `2567` |
| `CORS_ORIGIN` | Backend | Allowed frontend origin(s), comma-separated | `http://localhost:5173` for dev |
| `SUPABASE_URL` | Backend | Supabase project URL | Supabase → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | Service role key — **NEVER expose to browser** | Supabase → Settings → API → service_role key |

---

## Project Structure

```
multiplayer-3d/
├─ frontend/                    # Vite + React + R3F client
│  └─ src/
│     ├─ routes/                # StartRoute, MatchmakingRoute, GameRoute, AuthCallbackRoute
│     ├─ lib/                   # Supabase client, Colyseus client, config
│     ├─ state/                 # Zustand stores (auth, matchmaking, game)
│     ├─ game/                  # Input handling, client-side prediction, constants
│     ├─ r3f/                   # React Three Fiber: Scene, Arena, PlayerMesh, Lights
│     └─ ui/                    # HUD, CountdownOverlay, EndOverlay
│
├─ backend/                     # NestJS + Colyseus game server
│  └─ src/
│     ├─ colyseus/
│     │  ├─ rooms/              # GameRoom (matchmaking, simulation loop, lifecycle)
│     │  ├─ state/              # GameState + PlayerState schemas, enums
│     │  └─ logic/              # movement, stamina, catch detection, spawns
│     ├─ supabase/              # Supabase service role client
│     ├─ auth/                  # JWT verification helpers
│     └─ health/                # GET /health endpoint
│
├─ docs/
│  ├─ instructions.md           # Planner architecture document
│  ├─ design.md                 # Designer visual specification
│  ├─ supabase-migration.sql    # SQL to run in Supabase SQL Editor
│  └─ coder-summary.md          # Implementation notes
│
├─ docker-compose.yml           # Frontend + backend containers
└─ README.md                    # This file
```

---

## Game Rules

- **Hunter** (red-orange): catch the Runner before time runs out
- **Runner** (cyan): survive 2 minutes without being caught
- **Controls**: WASD to move, SHIFT to sprint (consumes stamina)
- **Match length**: 2:00 minutes
- **Catch condition**: Hunter within 1.2 units of Runner for 100ms
- **Win**: Hunter catches Runner → Hunter wins; Timer reaches 0 → Runner wins
- **Matchmaking**: Real-time, max 30s wait

## Known Limitations

- Keyboard only — no mobile joystick support
- Single server (no horizontal scaling); for scale, use Colyseus distributed mode
- Use `ws://` locally and `wss://` in production (`VITE_COLYSEUS_ENDPOINT`)
- On free hosts, backend cold starts can delay first matchmaking request

## Portfolio Runbook

- Backend health URL: `https://<render-domain>/health`
- If game does not connect, first open the health URL once to wake the backend.
- Then refresh the frontend and retry matchmaking after 30-60s.
- Check backend logs in Render dashboard and frontend logs in Vercel dashboard.
- Optional uptime ping: monitor `/health` with [UptimeRobot](https://uptimerobot.com/) on a low-frequency interval.
- Full post-deploy validation steps: `docs/deployment-checklist.md`
