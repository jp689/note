FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml ./
COPY worker ./worker

RUN pip install --no-cache-dir -e .

CMD ["python", "-m", "worker.main"]

