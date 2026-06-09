from __future__ import annotations

from pathlib import Path

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

from .config import settings


class ObjectStorage:
    def __init__(self) -> None:
        self._client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            config=Config(connect_timeout=1, read_timeout=1, retries={"max_attempts": 0}),
        )
        self._local_root = Path(settings.local_storage_dir)

    def put_bytes(self, key: str, content: bytes, content_type: str) -> None:
        try:
            self._ensure_bucket()
            self._client.put_object(
                Bucket=settings.s3_bucket,
                Key=key,
                Body=content,
                ContentType=content_type,
            )
            return
        except (BotoCoreError, ClientError):
            if settings.env == "production":
                raise

        local_root = self._local_root.resolve()
        target = (local_root / key).resolve()
        try:
            target.relative_to(local_root)
        except ValueError as error:
            raise ValueError("Object storage key must stay inside the local storage directory") from error
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)

    def get_presigned_url(self, key: str, expires_in: int = 3600) -> str:
        """Generate a presigned URL for downloading an object."""
        try:
            self._ensure_bucket()
            url = self._client.generate_presigned_url(
                "get_object",
                Params={"Bucket": settings.s3_bucket, "Key": key},
                ExpiresIn=expires_in,
            )
            return url
        except (BotoCoreError, ClientError):
            if settings.env == "production":
                raise

        # Fallback: return a local file URL path for development
        return f"/api/documents/content/{key}"

    def get_bytes(self, key: str) -> bytes:
        """Read an object from S3-compatible storage, with local fallback for development."""
        try:
            self._ensure_bucket()
            response = self._client.get_object(Bucket=settings.s3_bucket, Key=key)
            return response["Body"].read()
        except ClientError as error:
            error_code = error.response.get("Error", {}).get("Code")
            if settings.env == "production" and error_code not in {"NoSuchKey", "NoSuchBucket", "404"}:
                raise
        except BotoCoreError:
            if settings.env == "production":
                raise

        local_path = self.get_local_file_path(key)
        if local_path.exists():
            return local_path.read_bytes()
        raise FileNotFoundError(key)

    def get_local_file_path(self, key: str) -> Path:
        """Get the local file path for a given storage key."""
        local_root = self._local_root.resolve()
        target = (local_root / key).resolve()
        try:
            target.relative_to(local_root)
        except ValueError as error:
            raise ValueError("Object storage key must stay inside the local storage directory") from error
        return target

    def _ensure_bucket(self) -> None:
        try:
            self._client.head_bucket(Bucket=settings.s3_bucket)
        except ClientError:
            self._client.create_bucket(Bucket=settings.s3_bucket)


storage = ObjectStorage()
