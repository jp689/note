from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session
from uuid import uuid4

from ..config import settings
from ..database import get_db
from ..models import (
    AiUsageRecord,
    Document,
    DocumentChunk,
    FeedbackReport,
    KnowledgeNode,
    LoginLog,
    MindMapGraph,
    OperationLog,
    QuizAnswer,
    QuizQuestion,
    QuizSession,
    ReviewQueueItem,
    SystemSetting,
    TaskJob,
    User,
)
from ..schemas import CamelModel, UserProfile
from ..security import hash_password, require_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


class AdminUserUpdate(CamelModel):
    is_active: bool | None = None
    is_admin: bool | None = None


class AdminUserCreate(CamelModel):
    email: str
    full_name: str
    password: str
    is_admin: bool = False
    is_active: bool = True


class AdminUserUpdateProfile(CamelModel):
    email: str | None = None
    full_name: str | None = None
    password: str | None = None


class AdminUserListResponse(CamelModel):
    users: list[UserProfile]
    total: int
    page: int
    page_size: int


class AdminStatsResponse(CamelModel):
    total_users: int
    active_users: int
    admin_users: int
    total_documents: int


class AdminDetailedStatsResponse(CamelModel):
    total_users: int
    active_users: int
    admin_users: int
    total_documents: int
    total_ai_calls: int = 0
    total_files: int = 0
    documents_by_status: dict[str, int]
    recent_documents: list[dict[str, str]]
    recent_users: list[dict[str, str]]


class AdminDashboardResponse(CamelModel):
    user_count: int
    note_count: int
    ai_call_count: int
    file_count: int


class AdminListMeta(CamelModel):
    total: int
    page: int
    page_size: int


class AdminNoteItem(CamelModel):
    id: str
    title: str
    owner_email: str
    status: str
    page_count: int
    knowledge_count: int
    quiz_count: int
    created_at: str
    updated_at: str


class AdminNoteListResponse(AdminListMeta):
    items: list[AdminNoteItem]


class AdminFileItem(CamelModel):
    id: str
    title: str
    file_name: str
    file_size: int
    mime_type: str
    owner_email: str
    parse_status: str
    error_message: str | None = None
    uploaded_at: str


class AdminFileListResponse(AdminListMeta):
    items: list[AdminFileItem]


class AdminAiUsageItem(CamelModel):
    id: str
    provider: str
    model: str
    operation: str
    user_email: str | None = None
    document_title: str | None = None
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    status: str
    failure_reason: str | None = None
    created_at: str


class AdminAiUsageResponse(AdminListMeta):
    total_tokens: int
    failed_count: int
    items: list[AdminAiUsageItem]


class AdminSettingsResponse(CamelModel):
    ai_enabled: bool
    max_upload_bytes: int
    updated_at: str | None = None


class AdminSettingsUpdate(CamelModel):
    ai_enabled: bool | None = None
    max_upload_bytes: int | None = None


class AdminLoginLogItem(CamelModel):
    id: str
    email: str
    ip_address: str
    success: bool
    failure_reason: str | None = None
    created_at: str


class AdminOperationLogItem(CamelModel):
    id: str
    actor_email: str
    action: str
    target_type: str
    target_id: str
    detail: str
    created_at: str


class AdminLogsResponse(CamelModel):
    login_logs: list[AdminLoginLogItem]
    operation_logs: list[AdminOperationLogItem]


SYSTEM_SETTINGS_KEY = "system"


def _user_profile(user: User) -> UserProfile:
    return UserProfile(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_admin=user.is_admin,
        is_active=user.is_active,
    )


def _write_operation_log(
    db: Session,
    admin: User,
    *,
    action: str,
    target_type: str = "",
    target_id: str = "",
    detail: str = "",
) -> None:
    db.add(
        OperationLog(
            id=f"op-{uuid4().hex[:12]}",
            actor_id=admin.id,
            actor_email=admin.email,
            action=action,
            target_type=target_type,
            target_id=target_id,
            detail=detail,
        )
    )


def _get_settings_record(db: Session) -> SystemSetting:
    record = db.get(SystemSetting, SYSTEM_SETTINGS_KEY)
    if record is None:
        record = SystemSetting(
            key=SYSTEM_SETTINGS_KEY,
            value={"aiEnabled": True, "maxUploadBytes": settings.max_upload_bytes},
        )
        db.add(record)
        db.commit()
        db.refresh(record)
    return record


def _settings_response(record: SystemSetting) -> AdminSettingsResponse:
    return AdminSettingsResponse(
        ai_enabled=bool(record.value.get("aiEnabled", True)),
        max_upload_bytes=int(record.value.get("maxUploadBytes", settings.max_upload_bytes)),
        updated_at=record.updated_at.isoformat() if record.updated_at else None,
    )


def _document_query(search: str):
    query = select(Document, User.email).join(User, Document.user_id == User.id)
    count_query = select(func.count(Document.id)).join(User, Document.user_id == User.id)
    if search:
        pattern = f"%{search}%"
        condition = or_(Document.title.ilike(pattern), Document.file_name.ilike(pattern), User.email.ilike(pattern))
        query = query.where(condition)
        count_query = count_query.where(condition)
    return query, count_query


@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminStatsResponse:
    total_users = db.scalar(select(func.count(User.id))) or 0
    active_users = db.scalar(select(func.count(User.id)).where(User.is_active.is_(True))) or 0
    admin_users = db.scalar(select(func.count(User.id)).where(User.is_admin.is_(True))) or 0
    total_documents = db.scalar(select(func.count(Document.id))) or 0
    return AdminStatsResponse(
        total_users=total_users,
        active_users=active_users,
        admin_users=admin_users,
        total_documents=total_documents,
    )


@router.get("/stats/detailed", response_model=AdminDetailedStatsResponse)
def get_admin_detailed_stats(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminDetailedStatsResponse:
    total_users = db.scalar(select(func.count(User.id))) or 0
    active_users = db.scalar(select(func.count(User.id)).where(User.is_active.is_(True))) or 0
    admin_users = db.scalar(select(func.count(User.id)).where(User.is_admin.is_(True))) or 0
    total_documents = db.scalar(select(func.count(Document.id))) or 0
    total_ai_calls = db.scalar(select(func.count(AiUsageRecord.id))) or 0

    # Documents by status
    status_rows = db.execute(
        select(Document.status, func.count(Document.id)).group_by(Document.status)
    ).all()
    documents_by_status: dict[str, int] = {}
    for status_value, count in status_rows:
        documents_by_status[status_value] = count

    # Recent documents (last 5)
    recent_docs = db.scalars(
        select(Document).order_by(Document.created_at.desc()).limit(5)
    ).all()
    recent_documents = [
        {"id": d.id, "title": d.title, "status": d.status, "createdAt": d.created_at.isoformat()}
        for d in recent_docs
    ]

    # Recent users (last 5)
    recent_users_db = db.scalars(
        select(User).order_by(User.created_at.desc()).limit(5)
    ).all()
    recent_users = [
        {"id": u.id, "email": u.email, "fullName": u.full_name, "createdAt": u.created_at.isoformat()}
        for u in recent_users_db
    ]

    return AdminDetailedStatsResponse(
        total_users=total_users,
        active_users=active_users,
        admin_users=admin_users,
        total_documents=total_documents,
        total_ai_calls=total_ai_calls,
        total_files=total_documents,
        documents_by_status=documents_by_status,
        recent_documents=recent_documents,
        recent_users=recent_users,
    )


@router.get("/dashboard", response_model=AdminDashboardResponse)
def get_admin_dashboard(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminDashboardResponse:
    return AdminDashboardResponse(
        user_count=db.scalar(select(func.count(User.id))) or 0,
        note_count=db.scalar(select(func.count(Document.id))) or 0,
        ai_call_count=db.scalar(select(func.count(AiUsageRecord.id))) or 0,
        file_count=db.scalar(select(func.count(Document.id))) or 0,
    )


@router.get("/notes", response_model=AdminNoteListResponse)
def list_notes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=200),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminNoteListResponse:
    query, count_query = _document_query(search)
    total = db.scalar(count_query) or 0
    rows = db.execute(
        query.order_by(Document.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()
    items: list[AdminNoteItem] = []
    for document, owner_email in rows:
        knowledge_count = db.scalar(select(func.count(KnowledgeNode.id)).where(KnowledgeNode.document_id == document.id)) or 0
        quiz_count = db.scalar(select(func.count(QuizSession.id)).where(QuizSession.document_id == document.id)) or 0
        items.append(
            AdminNoteItem(
                id=document.id,
                title=document.title,
                owner_email=owner_email,
                status=document.status,
                page_count=document.page_count,
                knowledge_count=knowledge_count,
                quiz_count=quiz_count,
                created_at=document.created_at.isoformat(),
                updated_at=document.updated_at.isoformat(),
            )
        )
    return AdminNoteListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/files", response_model=AdminFileListResponse)
def list_files(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=200),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminFileListResponse:
    query, count_query = _document_query(search)
    total = db.scalar(count_query) or 0
    rows = db.execute(
        query.order_by(Document.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()
    return AdminFileListResponse(
        items=[
            AdminFileItem(
                id=document.id,
                title=document.title,
                file_name=document.file_name,
                file_size=document.file_size,
                mime_type=document.mime_type,
                owner_email=owner_email,
                parse_status=document.status,
                error_message=document.error_message,
                uploaded_at=document.created_at.isoformat(),
            )
            for document, owner_email in rows
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


def _delete_document(db: Session, document_id: str) -> None:
    knowledge_ids = list(db.scalars(select(KnowledgeNode.id).where(KnowledgeNode.document_id == document_id)))
    quiz_ids = list(db.scalars(select(QuizSession.id).where(QuizSession.document_id == document_id)))
    if quiz_ids:
        db.execute(delete(QuizAnswer).where(QuizAnswer.quiz_id.in_(quiz_ids)))
        db.execute(delete(FeedbackReport).where(FeedbackReport.quiz_id.in_(quiz_ids)))
    if knowledge_ids:
        db.execute(delete(ReviewQueueItem).where(ReviewQueueItem.knowledge_node_id.in_(knowledge_ids)))
    db.execute(delete(QuizQuestion).where(QuizQuestion.document_id == document_id))
    db.execute(delete(QuizSession).where(QuizSession.document_id == document_id))
    db.execute(delete(MindMapGraph).where(MindMapGraph.document_id == document_id))
    db.execute(delete(KnowledgeNode).where(KnowledgeNode.document_id == document_id))
    db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == document_id))
    db.execute(delete(TaskJob).where(TaskJob.document_id == document_id))
    db.execute(delete(AiUsageRecord).where(AiUsageRecord.document_id == document_id))
    db.execute(delete(Document).where(Document.id == document_id))


@router.delete("/notes/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    document_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    _delete_document(db, document_id)
    _write_operation_log(db, admin, action="delete_note", target_type="document", target_id=document_id, detail=document.title)
    db.commit()


@router.delete("/files/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(
    document_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    delete_note(document_id, admin, db)


@router.get("/ai-usage", response_model=AdminAiUsageResponse)
def list_ai_usage(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminAiUsageResponse:
    total = db.scalar(select(func.count(AiUsageRecord.id))) or 0
    total_tokens = db.scalar(select(func.coalesce(func.sum(AiUsageRecord.total_tokens), 0))) or 0
    failed_count = db.scalar(select(func.count(AiUsageRecord.id)).where(AiUsageRecord.status == "failed")) or 0
    rows = db.execute(
        select(AiUsageRecord, User.email, Document.title)
        .outerjoin(User, AiUsageRecord.user_id == User.id)
        .outerjoin(Document, AiUsageRecord.document_id == Document.id)
        .order_by(AiUsageRecord.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return AdminAiUsageResponse(
        items=[
            AdminAiUsageItem(
                id=record.id,
                provider=record.provider,
                model=record.model,
                operation=record.operation,
                user_email=email,
                document_title=title,
                prompt_tokens=record.prompt_tokens,
                completion_tokens=record.completion_tokens,
                total_tokens=record.total_tokens,
                status=record.status,
                failure_reason=record.failure_reason,
                created_at=record.created_at.isoformat(),
            )
            for record, email, title in rows
        ],
        total=total,
        page=page,
        page_size=page_size,
        total_tokens=int(total_tokens),
        failed_count=failed_count,
    )


@router.get("/settings", response_model=AdminSettingsResponse)
def get_admin_settings(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminSettingsResponse:
    return _settings_response(_get_settings_record(db))


@router.patch("/settings", response_model=AdminSettingsResponse)
def update_admin_settings(
    payload: AdminSettingsUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminSettingsResponse:
    record = _get_settings_record(db)
    next_value = dict(record.value)
    if payload.ai_enabled is not None:
        next_value["aiEnabled"] = payload.ai_enabled
    if payload.max_upload_bytes is not None:
        if payload.max_upload_bytes <= 0:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="File size limit must be positive")
        next_value["maxUploadBytes"] = payload.max_upload_bytes
    record.value = next_value
    record.updated_by = admin.id
    _write_operation_log(db, admin, action="update_settings", target_type="system_settings", target_id=record.key)
    db.commit()
    db.refresh(record)
    return _settings_response(record)


@router.get("/logs", response_model=AdminLogsResponse)
def list_admin_logs(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminLogsResponse:
    login_logs = db.scalars(select(LoginLog).order_by(LoginLog.created_at.desc()).limit(50)).all()
    operation_logs = db.scalars(select(OperationLog).order_by(OperationLog.created_at.desc()).limit(50)).all()
    return AdminLogsResponse(
        login_logs=[
            AdminLoginLogItem(
                id=log.id,
                email=log.email,
                ip_address=log.ip_address,
                success=log.success,
                failure_reason=log.failure_reason,
                created_at=log.created_at.isoformat(),
            )
            for log in login_logs
        ],
        operation_logs=[
            AdminOperationLogItem(
                id=log.id,
                actor_email=log.actor_email,
                action=log.action,
                target_type=log.target_type,
                target_id=log.target_id,
                detail=log.detail,
                created_at=log.created_at.isoformat(),
            )
            for log in operation_logs
        ],
    )


@router.get("/users", response_model=AdminUserListResponse)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=200),
    is_active: bool | None = Query(None),
    is_admin: bool | None = Query(None),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminUserListResponse:
    query = select(User)
    count_query = select(func.count(User.id))

    if search:
        pattern = f"%{search}%"
        filter_cond = or_(User.email.ilike(pattern), User.full_name.ilike(pattern))
        query = query.where(filter_cond)
        count_query = count_query.where(filter_cond)

    if is_active is not None:
        query = query.where(User.is_active.is_(is_active))
        count_query = count_query.where(User.is_active.is_(is_active))

    if is_admin is not None:
        query = query.where(User.is_admin.is_(is_admin))
        count_query = count_query.where(User.is_admin.is_(is_admin))

    total = db.scalar(count_query) or 0
    offset = (page - 1) * page_size
    users = db.scalars(query.order_by(User.created_at.desc()).offset(offset).limit(page_size)).all()

    return AdminUserListResponse(
        users=[
            UserProfile(
                id=u.id,
                email=u.email,
                full_name=u.full_name,
                is_admin=u.is_admin,
                is_active=u.is_active,
            )
            for u in users
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/users", response_model=UserProfile, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: AdminUserCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> UserProfile:
    if db.scalar(select(User).where(User.email == payload.email)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    user = User(
        id=f"user-{uuid4().hex[:10]}",
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        is_admin=payload.is_admin,
        is_active=payload.is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserProfile(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_admin=user.is_admin,
        is_active=user.is_active,
    )


@router.patch("/users/{user_id}", response_model=UserProfile)
def update_user(
    user_id: str,
    payload: AdminUserUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> UserProfile:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot modify your own account")

    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.is_admin is not None:
        user.is_admin = payload.is_admin

    db.commit()
    db.refresh(user)
    return UserProfile(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_admin=user.is_admin,
        is_active=user.is_active,
    )


@router.patch("/users/{user_id}/profile", response_model=UserProfile)
def update_user_profile(
    user_id: str,
    payload: AdminUserUpdateProfile,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> UserProfile:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.email is not None:
        existing = db.scalar(select(User).where(User.email == payload.email, User.id != user_id))
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
        user.email = payload.email
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.password is not None:
        user.password_hash = hash_password(payload.password)

    db.commit()
    db.refresh(user)
    return UserProfile(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_admin=user.is_admin,
        is_active=user.is_active,
    )


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account")

    db.delete(user)
    db.commit()
