import json
import logging
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .routers import auth, cases, files, imports

logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO), format="%(message)s")
logger = logging.getLogger("medper.api")

app = FastAPI(title="MedPer API", version="0.3.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)


@app.on_event("startup")
def validate_startup_security() -> None:
    settings.assert_secure_startup()


@app.middleware("http")
async def request_log(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception(json.dumps({
            "event": "request_error",
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
        }))
        raise
    duration_ms = round((time.perf_counter() - started) * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    logger.info(json.dumps({
        "event": "http_request",
        "request_id": request_id,
        "method": request.method,
        "path": request.url.path,
        "status": response.status_code,
        "duration_ms": duration_ms,
        "client": request.client.host if request.client else None,
    }, ensure_ascii=False))
    return response


app.include_router(auth.router)
app.include_router(cases.router)
app.include_router(imports.router)
app.include_router(files.router)


@app.get("/health")
def health():
    return {"status": "ok", "version": app.version}


@app.get("/ready")
def ready():
    issues = settings.security_issues()
    payload = {
        "status": "ready" if not issues else "not_ready",
        "version": app.version,
        "security": "ok" if not issues else "invalid",
        "fileStorage": "ready" if settings.file_encryption_key_is_valid else "disabled",
    }
    if issues:
        payload["issues"] = issues
        return JSONResponse(status_code=503, content=payload)
    return payload
