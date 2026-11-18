from app.routers.dashboard import router as dashboard_router
from app.routers.telemetry import router as telemetry_router
from app.routers.roadmap import router as roadmap_router
from app.routers.scholar import router as scholar_router
from app.routers.problem import router as problem_router

__all__ = [
    "dashboard_router",
    "telemetry_router",
    "roadmap_router",
    "scholar_router",
    "problem_router",
]
