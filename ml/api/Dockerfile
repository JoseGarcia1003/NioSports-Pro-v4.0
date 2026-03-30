FROM python:3.12-slim-bullseye

RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . ./ml/

EXPOSE 8000

CMD uvicorn ml.api.main:app --host 0.0.0.0 --port ${PORT:-8000}