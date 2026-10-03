from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UserRegister, UserLogin, TokenResponse
from app.utils.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token


async def register(db: AsyncSession, data: UserRegister) -> User:
    existing = await db.execute(select(User).where((User.username == data.username) | (User.email == data.email)))
    if existing.scalar_one_or_none():
        raise ValueError("Username or email already exists")

    user = User(
        username=data.username,
        email=data.email,
        hashed_password=hash_password(data.password),
    )
    db.add(user)
    await db.flush()
    return user


async def login(db: AsyncSession, data: UserLogin) -> TokenResponse:
    result = await db.execute(select(User).where(User.username == data.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        raise ValueError("Invalid username or password")

    user.last_login_at = datetime.now(timezone.utc)
    await db.flush()

    access_token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token({"sub": user.id})

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


async def refresh_access_token(db: AsyncSession, refresh_token: str) -> TokenResponse:
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise ValueError("Invalid refresh token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise ValueError("User not found")

    new_access_token = create_access_token({"sub": user.id})
    new_refresh_token = create_refresh_token({"sub": user.id})

    return TokenResponse(access_token=new_access_token, refresh_token=new_refresh_token)


async def get_current_user(db: AsyncSession, token: str) -> User:
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise ValueError("Invalid token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise ValueError("User not found")

    return user
