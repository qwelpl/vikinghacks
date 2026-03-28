from fastapi import FastAPI
from contextlib import asynccontextmanager
from auth import router as auth_router
from db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Warden",
    lifespan=lifespan
)

app.include_router(auth_router, prefix="/auth")


@app.get("/")
def root():
    return {"message": "Warden backend running"}