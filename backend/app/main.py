from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models import *  # Ensure all models are registered
from app.routers import dashboard_router, telemetry_router, roadmap_router, scholar_router, problem_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize tables on startup
    Base.metadata.create_all(bind=engine)
    try:
        from seed_data import seed_database
        seed_database()
    except Exception:
        pass
    yield

app = FastAPI(
    title=settings.APP_NAME,
    description="StepCode Scholar AI Core Engine - Proactive Competence Mentor",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for frontend clients
cors_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health endpoint
@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "database": settings.DATABASE_URL.split(":///")[0],
    }

# Register API routers under /api
app.include_router(dashboard_router, prefix=settings.API_V1_PREFIX)
app.include_router(telemetry_router, prefix=settings.API_V1_PREFIX)
app.include_router(roadmap_router, prefix=settings.API_V1_PREFIX)
app.include_router(scholar_router, prefix=settings.API_V1_PREFIX)
app.include_router(problem_router, prefix=settings.API_V1_PREFIX)
