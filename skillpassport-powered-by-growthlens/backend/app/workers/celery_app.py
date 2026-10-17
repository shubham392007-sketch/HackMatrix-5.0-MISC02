from celery import Celery
from backend.app.core.config import get_settings
from backend.app.core.logging import get_logger

logger = get_logger("workers.celery")
settings = get_settings()

celery_app = Celery(
    "skillpassport_evidence",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

# Mandatory Sequential Processing Policy:
# Concurrency is strictly 1 by default so that evidence extraction runs sequentially one item at a time.
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    worker_concurrency=settings.evidence_processing_concurrency,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
)
