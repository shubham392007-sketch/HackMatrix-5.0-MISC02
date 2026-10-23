import os
from dotenv import load_dotenv

# Load backend/.env into environment
env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "backend", ".env")
if not os.path.exists(env_file):
    env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
if os.path.exists(env_file):
    load_dotenv(env_file)

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from backend.app.core.config import get_settings
from backend.app.core.logging import setup_logging, get_logger
from backend.app.core.exceptions import SkillPassportError, DatabaseUnavailableError
from sqlalchemy.exc import SQLAlchemyError
from backend.app.api.router import api_router

logger = get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    setup_logging(debug=(settings.app_env == "development"))
    logger.info(
        f"Starting {settings.app_name} [v{settings.app_version}] in {settings.app_env} mode"
    )
    yield
    logger.info(f"Shutting down {settings.app_name}")
    try:
        from backend.app.db.session import engine
        engine.dispose()
        logger.info("Database engine connection pool disposed cleanly")
    except Exception as e:
        logger.warning(f"Error disposing database engine: {e}")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="SkillPassport Domain 1: Evidence Intelligence & Work Ingestion Backend",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Response Compression for large payloads
    from fastapi.middleware.gzip import GZipMiddleware
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # Centralized Exception Handler for Domain Exceptions
    @app.exception_handler(SkillPassportError)
    async def skill_passport_error_handler(request: Request, exc: SkillPassportError):
        logger.error(f"Domain error [{exc.code}]: {exc.message}")
        status_code = status.HTTP_400_BAD_REQUEST
        if exc.code == "NOT_FOUND":
            status_code = status.HTTP_404_NOT_FOUND
        elif exc.code == "UNAUTHORIZED":
            status_code = status.HTTP_403_FORBIDDEN
        elif exc.code == "CONNECTOR_AUTH_FAILED":
            status_code = status.HTTP_401_UNAUTHORIZED
        elif exc.code in ("DATABASE_UNAVAILABLE", "STORAGE_UNAVAILABLE"):
            status_code = status.HTTP_503_SERVICE_UNAVAILABLE

        headers = {}
        if isinstance(exc, DatabaseUnavailableError) and hasattr(exc, "retry_after"):
            headers["Retry-After"] = str(exc.retry_after)

        return JSONResponse(
            status_code=status_code,
            headers=headers,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details,
                }
            },
        )

    # Centralized Exception Handler for Raw SQLAlchemy / Connection Errors
    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError):
        from backend.app.db.reliability import (
            circuit_breaker,
            is_transient_connection_error,
            is_connection_exhaustion_error,
        )
        circuit_breaker.record_failure(exc)
        # Safe error-type logging ensures database credentials, connection URIs,
        # and sensitive SQL query parameters cannot be leaked into server logs.
        logger.error(
            f"Unhandled database error on {request.method} {request.url.path}: {type(exc).__name__}"
        )

        is_transient = is_transient_connection_error(exc) or is_connection_exhaustion_error(exc)
        msg = (
            "The database is currently experiencing high load or connection limits. Please try again shortly."
            if is_transient
            else "A database operation could not be completed. Please try again later."
        )
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            headers={"Retry-After": "15"},
            content={
                "error": {
                    "code": "DATABASE_TEMPORARILY_UNAVAILABLE",
                    "message": msg,
                    "details": {"retry_after_seconds": 15},
                }
            },
        )

    # Mount API v1 router
    app.include_router(api_router, prefix=settings.api_v1_prefix)

    @app.get("/")
    def root():
        return {
            "name": settings.app_name,
            "version": settings.app_version,
            "documentation": "/docs",
            "health": f"{settings.api_v1_prefix}/health/ready",
        }

    return app


app = create_app()
