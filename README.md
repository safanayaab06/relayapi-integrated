# RelayAPI — Full-Stack Integrated Project

This project keeps the original **RelayAPI React + TypeScript frontend** and includes the **API Nova Express + PostgreSQL backend** plus RelayAPI-compatible API endpoints.

## Project contents

- `src/` — original RelayAPI frontend (React, TypeScript, Vite)
- `backend/` — Express API, API Nova authentication/share/collection routes, RelayAPI compatibility routes, request execution proxy and PostgreSQL schema
- `docker-compose.yml` — PostgreSQL 16 service
- `.env.example` and `backend/.env.example` — configuration templates

## Requirements

- Node.js 20 or newer (Node 22 LTS recommended)
- npm
- Docker Desktop (recommended; used to run PostgreSQL)

## Run on Windows (PowerShell)

### 1. Extract the ZIP

Extract the entire ZIP to a normal folder, for example `C:\Projects\RelayAPI-Integrated`.

### 2. Start PostgreSQL

Open a terminal in the project root:

```powershell
docker compose up -d db
```

Wait until the database container is healthy.

### 3. Configure and start the backend

Open **Terminal 1** in VS Code:

```powershell
cd backend
Copy-Item .env.example .env
npm install
npm run db:init
npm run dev
```

Backend health URL: `http://localhost:5000/api/health`

The default backend database settings are for the included local Docker database. Change `backend/.env` if you use a different PostgreSQL instance.

### 4. Install and start the original RelayAPI frontend

Open **Terminal 2** in the project root (not inside `backend`):

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:3000`.

## Useful commands

From the project root:

```powershell
npm run build       # production frontend build
npm run lint        # TypeScript check
```

From the `backend` folder:

```powershell
npm run dev         # development backend
npm start           # production backend
npm run db:init     # create/update database tables
```

## Backend endpoints

- `GET /api/health`
- `POST /api/requests/execute`
- `POST /api/requests/validate`
- `POST /api/security/check`
- `POST /api/errors/explain`
- `GET|POST /api/collections`
- `PUT|DELETE /api/collections/:id`
- `POST /api/collections/:id/run`
- `GET|POST|DELETE /api/history`
- `GET|PUT|DELETE /api/environments`
- `POST /api/auth/signup`, `POST /api/auth/login`
- `/api/nova/collections/*` — API Nova collection routes
- `/api/share/*` — share-link routes

## Important implementation notes

- The existing RelayAPI frontend source in `src/` is retained; API Nova's separate frontend is not substituted for it.
- PostgreSQL is used by the backend for persisted collections, history and environments. The frontend retains its existing local-storage fallback.
- The backend request proxy blocks private/local network destinations by default as an SSRF safety measure. This can prevent requests to `localhost`, LAN devices and private IPs; do not disable this protection on an internet-exposed server.
- API Nova authentication and share endpoints are included in the backend. The current RelayAPI UI does not yet include login/signup screens.
- The collection runner UI executes its requests sequentially using the existing RelayAPI request service. The backend `/api/collections/:id/run` compatibility endpoint currently reports saved requests as skipped; it is not the execution path used by the UI.
- Dependencies are not bundled in this ZIP. Run `npm install` in the project root and in `backend` as shown above.

## Troubleshooting

- If `localhost:5000/api/health` fails, check that the backend terminal is running and Docker reports the database as healthy.
- If the database connection fails, check `backend/.env` against the credentials in `docker-compose.yml`.
- If the frontend cannot reach the backend, confirm the backend is on port `5000` and the frontend is on port `3000` or `5173`.
- If npm reports an engine/version error, install Node.js 22 LTS and reopen VS Code.
