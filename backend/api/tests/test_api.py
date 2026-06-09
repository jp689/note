from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def auth_headers() -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        json={"email": "demo@example.com", "password": "password123"},
    )
    token = response.json()["accessToken"]
    return {"authorization": f"Bearer {token}"}


def admin_headers() -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "admin123"},
    )
    token = response.json()["accessToken"]
    return {"authorization": f"Bearer {token}"}


def test_healthcheck() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_login_success() -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": "demo@example.com", "password": "password123"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["user"]["email"] == "demo@example.com"
    assert payload["accessToken"].count(".") == 2


def test_public_registration_is_disabled() -> None:
    response = client.post(
        "/api/auth/register",
        json={
            "email": "new-user@example.com",
            "fullName": "New User",
            "password": "password123",
        },
    )

    assert response.status_code == 403
    assert response.json() == {"detail": "Registration is not open"}


def test_admin_dashboard_reports_required_metrics() -> None:
    response = client.get("/api/admin/dashboard", headers=admin_headers())

    assert response.status_code == 200
    payload = response.json()
    assert payload["userCount"] >= 2
    assert payload["noteCount"] >= 1
    assert payload["aiCallCount"] >= 0
    assert payload["fileCount"] >= 1


def test_admin_notes_files_and_document_delete() -> None:
    headers = auth_headers()
    upload_response = client.post(
        "/api/documents/upload",
        headers=headers,
        json={"filename": "admin-managed.pdf", "contentType": "application/pdf", "sizeBytes": 64},
    )
    document_id = upload_response.json()["document"]["id"]

    admin = admin_headers()
    notes_response = client.get("/api/admin/notes?search=admin-managed", headers=admin)
    files_response = client.get("/api/admin/files?search=admin-managed", headers=admin)

    assert notes_response.status_code == 200
    assert files_response.status_code == 200
    assert any(item["id"] == document_id for item in notes_response.json()["items"])
    file_item = next(item for item in files_response.json()["items"] if item["id"] == document_id)
    assert file_item["fileName"] == "admin-managed.pdf"
    assert file_item["parseStatus"] == "uploaded"

    delete_response = client.delete(f"/api/admin/notes/{document_id}", headers=admin)
    assert delete_response.status_code == 204

    missing_response = client.get(f"/api/documents/{document_id}/status", headers=headers)
    assert missing_response.status_code == 404


def test_admin_ai_settings_and_logs() -> None:
    admin = admin_headers()

    settings_response = client.patch(
        "/api/admin/settings",
        headers=admin,
        json={"aiEnabled": False, "maxUploadBytes": 12_582_912},
    )
    assert settings_response.status_code == 200
    settings_payload = settings_response.json()
    assert settings_payload["aiEnabled"] is False
    assert settings_payload["maxUploadBytes"] == 12_582_912

    ai_response = client.get("/api/admin/ai-usage", headers=admin)
    logs_response = client.get("/api/admin/logs", headers=admin)

    assert ai_response.status_code == 200
    ai_payload = ai_response.json()
    assert "items" in ai_payload
    assert "totalTokens" in ai_payload
    assert "failedCount" in ai_payload

    assert logs_response.status_code == 200
    logs_payload = logs_response.json()
    assert any(log["action"] == "update_settings" for log in logs_payload["operationLogs"])
    assert any(log["email"] == "admin@example.com" for log in logs_payload["loginLogs"])


def test_generate_quiz_for_seeded_document() -> None:
    headers = auth_headers()
    upload_response = client.post(
        "/api/documents/upload",
        headers=headers,
        json={"filename": "seeded.pdf", "contentType": "application/pdf", "sizeBytes": 32},
    )
    document_id = upload_response.json()["document"]["id"]
    client.put(
        f"/api/documents/{document_id}/content",
        content=b"%PDF-1.7\nsample",
        headers={**headers, "content-type": "application/pdf"},
    )
    client.post(f"/api/documents/{document_id}/process", headers=headers)

    response = client.post(
        "/api/quizzes/generate",
        headers=headers,
        json={
            "document_id": document_id,
            "question_count": 1,
            "difficulty": "basic",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["documentId"] == document_id
    assert len(payload["questions"]) == 1


def test_upload_process_and_submit_document_quiz() -> None:
    headers = auth_headers()
    upload_response = client.post(
        "/api/documents/upload",
        headers=headers,
        json={
            "filename": "calculus.pdf",
            "contentType": "application/pdf",
            "sizeBytes": 32,
        },
    )

    assert upload_response.status_code == 200
    document = upload_response.json()["document"]
    document_id = document["id"]

    content_response = client.put(
        f"/api/documents/{document_id}/content",
        content=b"%PDF-1.7\nsample",
        headers={**headers, "content-type": "application/pdf"},
    )

    assert content_response.status_code == 200
    assert content_response.json()["receivedBytes"] == 15

    process_response = client.post(f"/api/documents/{document_id}/process", headers=headers)
    assert process_response.status_code == 200
    assert process_response.json()["status"] == "quiz_ready"

    quiz_response = client.get(f"/api/documents/{document_id}/quiz", headers=headers)
    assert quiz_response.status_code == 200
    quiz = quiz_response.json()

    answers = [
        {"questionId": question["id"], "answer": question["answer"]}
        for question in quiz["questions"]
    ]
    submit_response = client.post(
        f"/api/quizzes/{quiz['id']}/submit",
        headers=headers,
        json={"answers": answers},
    )

    assert submit_response.status_code == 200
    attempt_id = submit_response.json()["attemptId"]

    report_response = client.get(f"/api/reports/{attempt_id}", headers=headers)
    assert report_response.status_code == 200
    assert report_response.json()["quizId"] == quiz["id"]

    queue_response = client.get("/api/review-queue", headers=headers)
    assert queue_response.status_code == 200
    queue = queue_response.json()
    assert queue

    complete_response = client.post(
        f"/api/review-queue/{queue[0]['knowledgeNodeId']}/complete",
        headers=headers,
    )
    assert complete_response.status_code == 200
    assert complete_response.json()["knowledgeNodeId"] == queue[0]["knowledgeNodeId"]


def test_download_document_streams_object_storage_when_local_file_is_missing(monkeypatch, tmp_path) -> None:
    from app.routers import documents as documents_router

    headers = auth_headers()
    upload_response = client.post(
        "/api/documents/upload",
        headers=headers,
        json={"filename": "remote-only.pdf", "contentType": "application/pdf", "sizeBytes": 28},
    )
    document_id = upload_response.json()["document"]["id"]
    pdf_content = b"%PDF-1.7\nremote object storage"

    class FakeStorage:
        def get_local_file_path(self, key: str):
            return tmp_path / "missing.pdf"

        def get_bytes(self, key: str) -> bytes:
            return pdf_content

    monkeypatch.setattr(documents_router, "storage", FakeStorage())

    response = client.get(f"/api/documents/{document_id}/download", headers=headers)

    assert response.status_code == 200
    assert response.content == pdf_content
    assert response.headers["content-type"].startswith("application/pdf")
    assert response.headers["content-disposition"].startswith("inline")
