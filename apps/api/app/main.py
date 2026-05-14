from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers.auth import router as auth_router
from .routers.documents import router as documents_router
from .routers.quizzes import router as quizzes_router
from .routers.reports import router as reports_router

app = FastAPI(title=settings.app_name, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(quizzes_router)
app.include_router(reports_router)


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
