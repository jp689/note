from __future__ import annotations

import json

import redis
from redis.exceptions import RedisError

from .config import settings


def enqueue_document_job(payload: dict[str, object]) -> bool:
    try:
        client = redis.from_url(settings.redis_url, socket_connect_timeout=1, socket_timeout=1)
        client.rpush(settings.worker_redis_queue, json.dumps(payload))
        return True
    except RedisError:
        if settings.env == "production":
            raise
        return False
