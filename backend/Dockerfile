FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN useradd --create-home --uid 1000 app

# dev.txt for the local compose stack, base.txt for production images
ARG REQUIREMENTS=base.txt
COPY requirements/ requirements/
RUN pip install -r requirements/${REQUIREMENTS}

COPY . .

# Placeholder values: collectstatic only needs settings to load, not a real DB or secret.
RUN DJANGO_SECRET_KEY=collectstatic DATABASE_URL=postgres://u@localhost/db \
    python manage.py collectstatic --noinput \
    && chown -R app:app /app

USER app
EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--access-logfile", "-"]
