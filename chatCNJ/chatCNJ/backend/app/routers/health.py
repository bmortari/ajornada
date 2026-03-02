"""Health router."""

from fastapi import APIRouter
from app.services import db

router = APIRouter()


@router.get("/api/health")
async def health():
    try:
        count = await db.get_normativos_count()
        return {"status": "ok", "normativos_count": count}
    except Exception as e:
        return {"status": "degraded", "error": str(e)}
