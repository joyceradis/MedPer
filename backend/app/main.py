from fastapi import FastAPI
from .routers import auth, cases

app = FastAPI(title="MedPer API", version="0.1.0")
app.include_router(auth.router)
app.include_router(cases.router)

@app.get("/health")
def health():
    return {"status": "ok"}
