FROM python:3.12-slim-bullseye

# XGBoost requires libgomp1 — without it, ImportError on startup
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY ml/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY ml/ ./ml/

EXPOSE 8000

CMD uvicorn ml.api.main:app --host 0.0.0.0 --port ${PORT:-8000}