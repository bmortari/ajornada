from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/api/health")
async def health(req: Request):
    cube_ok = False
    try:
        cube_client = req.app.state.cube_client
        cube_ok = await cube_client.health_check()
    except Exception:
        pass

    return {
        "status": "ok",
        "cube": "connected" if cube_ok else "disconnected",
    }
