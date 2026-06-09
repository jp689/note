from __future__ import annotations

from .database import SessionLocal
from .reprocess import enqueue_outdated_documents


def main() -> None:
    with SessionLocal() as db:
        queued = enqueue_outdated_documents(db)
    print(f"Queued {queued} outdated document(s) for analysis v3.")


if __name__ == "__main__":
    main()
