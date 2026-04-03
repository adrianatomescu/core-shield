from fastapi import APIRouter

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/ping")
def users_ping():
    return {"message": "Users router is ready"}
