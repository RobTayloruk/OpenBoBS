FROM python:3.11-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY . /app

RUN chmod +x /app/run.sh /app/update-openbobs.sh /app/docker-start.sh

EXPOSE 4173

ENTRYPOINT ["/app/docker-start.sh"]
