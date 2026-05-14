# AI Study Notes MVP

Monorepo scaffold for an AI-powered self-study notes platform. The product turns uploaded PDF notes into structured knowledge, mind maps, quizzes, feedback reports, and a review queue.

## Workspace

- `apps/web`: Next.js app for the learner-facing web experience
- `apps/api`: FastAPI service for auth, document metadata, knowledge, quizzes, reports, and review queue
- `workers/ai-pipeline`: Python worker for PDF parsing, OCR fallback, structuring, quiz generation, and scoring
- `packages/contracts`: Shared TypeScript contracts used by the web app

## Local stack

The repository is designed around:

- Next.js + TypeScript + Tailwind CSS
- FastAPI + Pydantic
- PostgreSQL + pgvector
- Redis
- S3-compatible object storage

For local orchestration, see `docker-compose.yml`.

```bash
docker compose up --build
```

## Quick start

### Web

```bash
npm install
npm run dev:web
```

### API

```bash
cd apps/api
pip install -e .
uvicorn app.main:app --reload --port 8000
```

### Worker

```bash
cd workers/ai-pipeline
pip install -e .
python -m worker.main
```

## Notes

- The scaffold includes deterministic demo data and inline processing helpers so the shape of the full MVP is implemented even before infrastructure is wired.
- PostgreSQL, Redis, and MinIO are represented in config and compose files, while application code still degrades to in-memory flows for local exploration.
- The API emits camelCase JSON so it matches the web contracts in `packages/contracts`.
