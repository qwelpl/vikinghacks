from fastapi import FastAPI
from auth import router as auth_router
from db import init_db

app = FastAPI(title="Warden Backend")


@app.on_event("startup")
def startup():
    init_db()


app.include_router(auth_router, prefix="/auth", tags=["auth"])


@app.get("/")
def root():
    return {"message": "Warden backend running"}