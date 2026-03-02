# ChatNormas — Assistente CNJ

Minimal instructions for operators / users.

Prerequisites
- Docker and Docker Compose installed on the host

Production (self-hosted using docker-compose)

1. Create a `.env` from `.env.example` and fill secrets.
2. Build images and start services:

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

3. Check backend health: `curl http://localhost:8000/api/health`

See `README.dev.md` for developer setup and notes.
