# 阿里云 ECS Docker Compose 部署指南

本文档说明如何把 AI Study Notes 部署到阿里云 ECS `8.218.69.237`。当前方案使用单台 ECS、阿里云 ACR、Docker Compose、Caddy 反向代理和自动 HTTPS，公网入口为 `https://ainote.cloud`。

## 1. ECS 准备

1. 安装 Docker 和 Docker Compose v2。
2. 创建部署目录：

```bash
mkdir -p /opt/ai-study-notes/infrastructure/caddy
```

3. 安全组只需要开放：
   - `80/tcp`：HTTP 访问和 ACME HTTP-01 证书校验。
   - `443/tcp`：HTTPS 访问，由 Caddy 自动签发和续期证书。
   - `22/tcp`：仅允许你的管理 IP 或 GitHub Actions 出口来源访问。

不要对公网开放 `3000`、`8000`、`5432`、`6379`、`9000`、`9001`。

## 2. 创建阿里云 ACR

1. 在阿里云容器镜像服务 ACR 中创建个人版或企业版实例。
2. 创建命名空间，例如 `ai-study-notes`。
3. 创建三个镜像仓库：
   - `ai-study-web`
   - `ai-study-api`
   - `ai-study-worker`
4. 记录镜像仓库域名，例如 `registry.cn-hongkong.aliyuncs.com`。

## 3. GitHub Secrets

在 GitHub 仓库的 `Settings -> Secrets and variables -> Actions` 中配置：

```text
ACR_REGISTRY=registry.cn-hongkong.aliyuncs.com
ACR_NAMESPACE=ai-study-notes
ACR_USERNAME=<acr-login-username>
ACR_PASSWORD=<acr-login-password>
ECS_HOST=8.218.69.237
ECS_USER=root
ECS_SSH_KEY=<private-key-content>
```

`ECS_SSH_KEY` 必须是能以 `root` 登录 ECS 的私钥内容。对应公钥需要提前加入 `/root/.ssh/authorized_keys`。

## 4. 服务器生产环境变量

在 ECS 上创建 `/opt/ai-study-notes/.env`：

```bash
cd /opt/ai-study-notes
cat > .env <<'EOF'
ACR_REGISTRY=registry.cn-hongkong.aliyuncs.com
ACR_NAMESPACE=ai-study-notes
IMAGE_TAG=latest

POSTGRES_DB=ai_study_notes
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<replace-with-strong-postgres-password>

MINIO_ROOT_USER=<replace-with-minio-user>
MINIO_ROOT_PASSWORD=<replace-with-strong-minio-password>

NEXT_PUBLIC_API_BASE_URL=https://ainote.cloud
INTERNAL_API_BASE_URL=http://api:8000

API_APP_NAME=AI Study Notes API
API_ENV=production
API_HOST=0.0.0.0
API_PORT=8000
API_CORS_ORIGINS=https://ainote.cloud,https://www.ainote.cloud,http://ainote.cloud,http://www.ainote.cloud,http://8.218.69.237
API_SECRET_KEY=<replace-with-32-plus-random-characters>
API_DATABASE_URL=postgresql+psycopg://postgres:<replace-with-strong-postgres-password>@postgres:5432/ai_study_notes
API_REDIS_URL=redis://redis:6379/0
API_S3_ENDPOINT=http://minio:9000
API_S3_BUCKET=study-notes
API_S3_ACCESS_KEY=<same-as-minio-user>
API_S3_SECRET_KEY=<same-as-minio-password>
API_OPENAI_BASE_URL=https://api.openai.com/v1
API_OPENAI_API_KEY=
AI_BASE_URL=https://maas-api.cn-huabei-1.xf-yun.com/v2
AI_API_KEY=<replace-with-text-ai-api-key>
AI_MODEL_ID=xopqwen36v35b
API_DEEPSEEK_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
API_DEEPSEEK_API_KEY=<replace-with-text-ai-api-key>
API_DEEPSEEK_MODEL=xopqwen36v35b
API_PADDLEOCR_API_URL=https://paddleocr.aistudio-app.com/api/v2/ocr/jobs
API_PADDLEOCR_TOKEN=<replace-with-ocr-access-token>
API_PADDLEOCR_MODEL=PaddleOCR-VL-1.5
OCR_ACCESS_TOKEN=<replace-with-ocr-access-token>
API_PROCESS_INLINE=false
API_SEED_DEMO=false
API_AUTO_CREATE_TABLES=false
API_MAX_UPLOAD_BYTES=31457280
API_WORKER_REDIS_QUEUE=study-documents
API_WORKER_INTERNAL_TOKEN=<replace-with-32-plus-random-characters>
API_LOCAL_STORAGE_DIR=.local/storage

REDIS_URL=redis://redis:6379/0
WORKER_REDIS_QUEUE=study-documents
WORKER_POLL_SECONDS=3
WORKER_API_BASE_URL=http://api:8000
WORKER_INTERNAL_TOKEN=<same-as-api-worker-internal-token>

OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=
EOF
chmod 600 .env
```

生产环境会拒绝默认弱密码和弱 token。`POSTGRES_PASSWORD` 必须和 `API_DATABASE_URL` 中的密码一致，MinIO 账号密码也必须和 `API_S3_ACCESS_KEY/API_S3_SECRET_KEY` 一致。

## 5. 自动发布

合并到 `main` 后：

1. `.github/workflows/ci.yml` 先运行前端 lint/build、API tests、Worker tests。
2. CI 成功后，`.github/workflows/deploy.yml` 自动构建三类镜像并推送到 ACR。
3. Deploy workflow 通过 SSH 把 `docker-compose.prod.yml` 和 `infrastructure/caddy/Caddyfile` 复制到 ECS。
4. ECS 执行：

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d postgres redis minio
docker compose -f docker-compose.prod.yml run --rm api alembic upgrade head
docker compose -f docker-compose.prod.yml up -d --remove-orphans
```

迁移命令成功后再启动 API、Worker、Web 和 Caddy。

## 6. 手动部署或排障

如果还没有配置 ACR，可以先在 ECS 上从源码构建并部署：

```bash
cd /opt/ai-study-notes
docker compose -f docker-compose.ecs-build.yml up -d postgres redis minio
docker compose -f docker-compose.ecs-build.yml build api worker web
docker compose -f docker-compose.ecs-build.yml run --rm api alembic upgrade head
docker compose -f docker-compose.ecs-build.yml up -d --remove-orphans
docker compose -f docker-compose.ecs-build.yml ps
```

在 ECS 上手动拉取并重启：

```bash
cd /opt/ai-study-notes
export ACR_REGISTRY=registry.cn-hongkong.aliyuncs.com
export ACR_NAMESPACE=ai-study-notes
export IMAGE_TAG=latest
docker login "$ACR_REGISTRY"
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d postgres redis minio
docker compose -f docker-compose.prod.yml run --rm api alembic upgrade head
docker compose -f docker-compose.prod.yml up -d --remove-orphans
docker compose -f docker-compose.prod.yml ps
```

查看日志：

```bash
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f worker
docker compose -f docker-compose.prod.yml logs -f proxy
```

验收地址：

```text
https://ainote.cloud
https://ainote.cloud/health
```

如果后续更换域名，把 `NEXT_PUBLIC_API_BASE_URL`、`API_CORS_ORIGINS` 和 `infrastructure/caddy/Caddyfile` 改为正式域名，并重新运行 GitHub Actions 发布 Web 镜像。
