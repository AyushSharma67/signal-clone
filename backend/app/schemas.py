from pydantic import BaseModel


class RegisterRequest(BaseModel):
    username: str
    phone: str
    display_name: str
    password: str


class VerifyOTPRequest(BaseModel):
    username: str
    otp: str


class LoginRequest(BaseModel):
    username: str
    password: str