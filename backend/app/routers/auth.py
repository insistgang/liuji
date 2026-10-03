from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user_dep
from app.limiter import limiter
from app.models.user import User
from app.schemas.user import UserRegister, UserLogin, UserResponse, TokenResponse, TokenRefresh
from app.schemas.common import ApiResponse
from app.services.auth_service import register, login, refresh_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=ApiResponse[UserResponse])
@limiter.limit("10/minute")
async def register_endpoint(request: Request, data: UserRegister, db: AsyncSession = Depends(get_db)):
    try:
        user = await register(db, data)
        return ApiResponse(data=UserResponse.model_validate(user))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=ApiResponse[TokenResponse])
@limiter.limit("10/minute")
async def login_endpoint(request: Request, data: UserLogin, db: AsyncSession = Depends(get_db)):
    try:
        tokens = await login(db, data)
        return ApiResponse(data=tokens)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/refresh", response_model=ApiResponse[TokenResponse])
async def refresh_endpoint(data: TokenRefresh, db: AsyncSession = Depends(get_db)):
    try:
        tokens = await refresh_access_token(db, data.refresh_token)
        return ApiResponse(data=tokens)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.get("/me", response_model=ApiResponse[UserResponse])
async def me_endpoint(user: User = Depends(get_current_user_dep)):
    return ApiResponse(data=UserResponse.model_validate(user))
