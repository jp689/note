from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


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
    assert payload["accessToken"].startswith("token-")


def test_generate_quiz_for_seeded_document() -> None:
    response = client.post(
        "/api/quizzes/generate",
        json={
            "document_id": "doc-neural-learning",
            "knowledge_node_ids": ["kn-gradient-descent"],
            "question_count": 1,
            "difficulty": "basic",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["documentId"] == "doc-neural-learning"
    assert len(payload["questions"]) == 1


def test_upload_process_and_submit_document_quiz() -> None:
    upload_response = client.post(
        "/api/documents/upload",
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
        headers={"content-type": "application/pdf"},
    )

    assert content_response.status_code == 200
    assert content_response.json()["receivedBytes"] == 15

    process_response = client.post(f"/api/documents/{document_id}/process")
    assert process_response.status_code == 200
    assert process_response.json()["status"] == "quiz_ready"

    quiz_response = client.get(f"/api/documents/{document_id}/quiz")
    assert quiz_response.status_code == 200
    quiz = quiz_response.json()

    answers = [
        {"questionId": question["id"], "answer": question["answer"]}
        for question in quiz["questions"]
    ]
    submit_response = client.post(
        f"/api/quizzes/{quiz['id']}/submit",
        json={"answers": answers},
    )

    assert submit_response.status_code == 200
    attempt_id = submit_response.json()["attemptId"]

    report_response = client.get(f"/api/reports/{attempt_id}")
    assert report_response.status_code == 200
    assert report_response.json()["quizId"] == quiz["id"]
