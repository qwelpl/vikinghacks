from fastapi import APIRouter, HTTPException
from werkzeug.security import check_password_hash, generate_password_hash

from db import create_user, get_user_by_email, get_user_by_username
from models import LoginRequest, LoginResponse, MessageResponse, SignupRequest, UserResponse

router = APIRouter()


@router.post("/signup", response_model=UserResponse)
def signup(data: SignupRequest):
    existing_email = get_user_by_email(data.email)
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already in use")

    existing_username = get_user_by_username(data.username)
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already in use")

    hashed_password = generate_password_hash(data.password)
    user_id = create_user(data.username, data.email, hashed_password)

    return UserResponse(
        id=user_id,
        username=data.username,
        email=data.email,
    )


@router.post("/login", response_model=LoginResponse)
def login(data: LoginRequest):
    user = get_user_by_email(data.email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not check_password_hash(user["password"], data.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return LoginResponse(
        message="Login successful",
        user=UserResponse(
            id=user["id"],
            username=user["username"],
            email=user["email"],
        ),
    )


@router.get("/health", response_model=MessageResponse)
def auth_health():
    return MessageResponse(message="Auth routes working")