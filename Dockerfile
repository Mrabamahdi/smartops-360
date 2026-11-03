FROM node:22-bookworm-slim AS frontend
WORKDIR /build
COPY apps/frontend/package*.json ./
RUN npm ci
COPY apps/frontend/ ./
RUN npm run build
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app/apps/backend
COPY apps/backend/requirements-lock.txt ./
RUN pip install --no-cache-dir -r requirements-lock.txt
COPY apps/backend/ ./
COPY --from=frontend /build/dist /app/apps/frontend/dist
RUN SMARTOPS_DEBUG=1 python manage.py collectstatic --noinput
RUN useradd --create-home smartops && chown -R smartops:smartops /app
USER smartops
ENV SMARTOPS_DEBUG=0
CMD ["sh","-c","python manage.py migrate && waitress-serve --listen=0.0.0.0:${PORT:-8000} config.wsgi:application"]
