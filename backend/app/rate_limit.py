from collections import defaultdict, deque
from threading import Lock
from time import monotonic

from fastapi import HTTPException, Request

from .config import settings


_hits: dict[str, deque[float]] = defaultdict(deque)
_lock = Lock()


def enforce_auth_rate_limit(request: Request, bucket: str) -> None:
    limit = max(1, settings.auth_rate_limit_attempts)
    window = max(1, settings.auth_rate_limit_window_seconds)
    now = monotonic()
    client = request.client.host if request.client else "unknown"
    key = f"{bucket}:{client}"
    with _lock:
        hits = _hits[key]
        cutoff = now - window
        while hits and hits[0] <= cutoff:
            hits.popleft()
        if len(hits) >= limit:
            retry_after = max(1, int(window - (now - hits[0])))
            raise HTTPException(
                status_code=429,
                detail="Muitas tentativas. Tente novamente mais tarde.",
                headers={"Retry-After": str(retry_after)},
            )
        hits.append(now)
