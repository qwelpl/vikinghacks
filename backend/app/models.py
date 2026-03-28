from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: EmailStr


class MessageResponse(BaseModel):
    message: str


class LoginResponse(BaseModel):
    message: str
    user: UserResponse
    account_token: str


class PermitExceptionRequest(BaseModel):
    goal: str = Field(min_length=1, max_length=500)
    website: str = Field(min_length=1, max_length=500)
    reason: str = Field(min_length=1, max_length=1000)


class PermitExceptionResponse(BaseModel):
    decision: str
    explanation: str