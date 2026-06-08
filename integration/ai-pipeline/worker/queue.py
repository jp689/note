from __future__ import annotations

from collections import deque
from typing import Deque

from .models import DocumentJob


class InMemoryWorkerQueue:
    def __init__(self) -> None:
        self._queue: Deque[DocumentJob] = deque()

    def push(self, job: DocumentJob) -> None:
        self._queue.append(job)

    def has_jobs(self) -> bool:
        return bool(self._queue)

    def pop(self) -> DocumentJob | None:
        if not self._queue:
            return None
        return self._queue.popleft()


queue = InMemoryWorkerQueue()
