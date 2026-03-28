from fastapi import APIRouter, HTTPException
from werkzeug.security import check_password_hash, generate_password_hash

from db import create_user, get_user_by_email
from models import LoginRequest, LoginResponse, MessageResponse, SignupRequest, UserResponse

router = APIRouter()


@router.post("/signup")
def signup(data: SignupRequest):
    existing_email = get_user_by_email(data.email)
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already in use")

    hashed_password = generate_password_hash(data.password)
    user_id, account_token = create_user(data.email, hashed_password)

    return {
        "message": "Signup successful",
        "user": UserResponse(
            id=user_id,
            email=data.email,
        ),
        "account_token": account_token,
    }


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
            email=user["email"],
        ),
        account_token=user["account_token"],
    )


@router.get("/health", response_model=MessageResponse)
def auth_health():
    return MessageResponse(message="Auth routes working")