from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import SessionLocal, init_database
from .routers.admin import router as admin_router
from .routers.auth import router as auth_router
from .routers.documents import router as documents_router
from .routers.notifications import router as notifications_router
from .routers.quizzes import router as quizzes_router
from .routers.reports import router as reports_router
from .routers.user_settings import router as user_settings_router
from .seed import seed_demo_user

app = FastAPI(title=settings.app_name, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(documents_router)
app.include_router(notifications_router)
app.include_router(quizzes_router)
app.include_router(reports_router)
app.include_router(user_settings_router)


def bootstrap() -> None:
    if settings.auto_create_tables:
        init_database()
    if settings.env.lower() != "production" and settings.seed_demo:
        with SessionLocal() as db:
            seed_demo_user(db)
    if not settings.openai_api_key:
        print("[AI] API_OPENAI_API_KEY 未配置，系统运行在确定性回退模式（SHA-256 嵌入）。")


bootstrap()


@app.on_event("startup")
def startup() -> None:
    bootstrap()


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
