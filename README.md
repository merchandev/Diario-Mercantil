# Dashboard Uploader - Docker Dev Setup

Sistema de gestión de publicaciones legales para el Diario Mercantil de Venezuela.

## Arquitectura

- **Backend**: PHP 8.2 con SQLite (puerto 8000)
- **Frontend**: React 18 + TypeScript + Vite + Tailwind (puerto 5173)
- **Base de datos**: SQLite en `backend/storage/database.sqlite`

## Inicio rápido

### Requisitos
- Docker Desktop (Windows) y PowerShell

## Start the stack
```powershell
# From the repository root
docker compose up --build
```
Luego abre:
- Frontend: http://localhost:5173
- Backend ping: http://localhost:8000/api/ping

## Development notes
- Frontend code lives in `frontend/`; the dev server proxies `/api` to the backend. HMR works through port 5173.
- Backend code lives in `backend/`; a built-in PHP server serves the API on port 8000. SQLite DB file is at `backend/database.sqlite` (configurable via `DB_PATH`).
- Uploaded files and results go under `backend/storage/` (bind-mounted for persistence).
- The refactorized backend lives inside `backend/modern/`; it is built with FastRoute + DI and can be used for future migrations or to spin up a more structured API alongside the legacy endpoints.
- To try the modular backend, run `composer install` inside `backend/modern/` and then `composer start` (or `php -S 0.0.0.0:8080 public/index.php`) while pointing `DB_PATH` to `../storage/database.sqlite`.

## Useful endpoints
- `GET /api/ping` health check
- `POST /api/files` (multipart: `files[]`) to upload
- `GET /api/files` list
- `GET /api/files/{id}` details
- `POST /api/files/{id}/retry` reprocess
- `DELETE /api/files/{id}` delete
- `GET /api/events` Server-Sent Events stream

## Troubleshooting
- If the frontend can’t reach the backend from Docker: ensure `docker compose ps` shows both services up, and that `VITE_BACKEND_URL` in `docker-compose.yml` is `http://backend:8000`.
- On first run, the backend initializes the SQLite DB using `migrations/init.sql`.
- Windows file sharing: make sure the drive is shared in Docker Desktop so volumes mount correctly.

## Production note
This setup uses dev servers (Vite dev and PHP built-in). For production, build the frontend (`npm run build`) and serve static files with a web server; run PHP behind a proper server (e.g., nginx + php-fpm) or use a PHP runtime suited for production.

## Deployment on Vercel

- The React + Vite frontend lives in `frontend/` with its own `package.json` and build script; a root `vercel.json` now targets that folder (`@vercel/static-build` with `npm run build`) so Vercel no longer assumes Create React App or tries to run `react-scripts`.
- When configuring the Vercel project, set the Framework Preset to **Vite** and (if needed) the Root Directory to `frontend/`. The build command is `npm run build` and the output directory is `dist`.
- Vercel can only host the frontend. The PHP backend must deploy elsewhere (shared PHP hosting, Render, etc.). Expose the backend API via a public URL and point the frontend at it (e.g., through `VITE_API_URL` in `.env`/Vercel Environment Variables`).

With this setup the `frontend/` app builds cleanly on Vercel while the backend remains a separately hosted service.
