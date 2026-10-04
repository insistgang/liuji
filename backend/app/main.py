import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import init_db
from app.limiter import limiter
from app.routers import auth, vocabulary, exam, listening, writing, user

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Validating security configuration...")
    if not settings.SECRET_KEY:
        raise RuntimeError("SECRET_KEY is not set")
    logger.info("Security configuration validated")
    logger.info("Initializing database...")
    await init_db()
    logger.info("Database initialized")
    yield


app = FastAPI(title="六级学习系统", version="0.1.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info("%s %s", request.method, request.url.path)
    response = await call_next(request)
    logger.info("%s %s -> %d", request.method, request.url.path, response.status_code)
    return response


app.include_router(auth.router, prefix="/api/v1")
app.include_router(vocabulary.router, prefix="/api/v1")
app.include_router(exam.router, prefix="/api/v1")
app.include_router(listening.router, prefix="/api/v1")
app.include_router(writing.router, prefix="/api/v1")
app.include_router(user.router, prefix="/api/v1")

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
STATIC_DIR.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/health")
async def health():
    return {"status": "ok"}
