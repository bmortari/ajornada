# Developer README

Local development (dev compose)

1. Copy `.env.example` to `.env` and fill required keys for local testing.
2. Start dev environment (hot-reload frontend + backend):

```bash
docker compose up --build
```

Notes
- The frontend runs via Vite on port `5173` in dev mode; the backend on `8000`.
- The Postgres container seeds `normativos` from `data/normativos_cnj_bgem3.csv`.
- Keep `.env` out of version control; use `.env.example` as template.

Troubleshooting
- If Vite reports parser or HMR errors after editing TSX files, restart the frontend container:

```bash
docker restart chatnormas-frontend
```
