# AI Study Notes MVP

Monorepo MVP for an AI-powered self-study notes platform. The product turns uploaded PDF notes into structured knowledge, mind maps, quizzes, feedback reports, and a review queue.

## Workspace

The project is organized into four top-level areas:

- `frontend`: Next.js app and design references (`frontend/web`, `frontend/design-references`)
- `backend`: FastAPI service for auth, document metadata, knowledge, quizzes, reports, and review queue (`backend/api`)
- `integration`: Shared TypeScript contracts and the AI pipeline worker (`integration/contracts`, `integration/ai-pipeline`)
- `infrastructure`: Docker Compose and service Dockerfiles

## Local stack

The repository is designed around:

- Next.js + TypeScript + Tailwind CSS
- FastAPI + Pydantic
- PostgreSQL + pgvector
- Redis
- S3-compatible object storage

For local orchestration, see `infrastructure/docker-compose.yml`.

```bash
docker compose -f infrastructure/docker-compose.yml up --build
```

The default Docker path uses PostgreSQL/pgvector, Redis, and MinIO. When those services are unavailable in a bare local shell, the API falls back to a local SQLite database and local file storage so the demo flow and tests still run.

## Quick start

### Web

```bash
npm install
npm run dev:web
```

### API

```bash
cd backend/api
pip install -e .
uvicorn app.main:app --reload --port 8000
```

### Worker

```bash
cd integration/ai-pipeline
pip install -e .
python -m worker.main
```

## Notes

- Auth uses JWT bearer tokens. The web app stores the token in both `localStorage` and a cookie so server-rendered pages can call the API.
- The API proxies PDF uploads into MinIO, creates processing jobs, and can fall back to inline deterministic processing when Redis or the worker is unavailable.
- The worker consumes Redis jobs, reads PDFs from S3-compatible storage, extracts text with `pypdf`, generates deterministic AI fallback artifacts, and posts results back through the internal API callback.
- The API emits camelCase JSON so it matches the web contracts in `integration/contracts`.
