from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import (
    RegisterRequest,
    VerifyOTPRequest,
    LoginRequest,
)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/register")
def register(
    data: RegisterRequest,
    db: Session = Depends(get_db)
):
    existing_user = db.query(User).filter(
        User.username == data.username
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Username already exists"
        )

    user = User(
        username=data.username,
        phone=data.phone,
        display_name=data.display_name,
        password=data.password
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "message": "Registration successful. OTP sent.",
        "username": user.username,
        "otp": "123456"
    }


@router.post("/verify-otp")
def verify_otp(data: VerifyOTPRequest):
    if data.otp != "123456":
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP"
        )

    return {
        "message": "OTP verified successfully"
    }


@router.post("/login")
def login(
    data: LoginRequest,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.username == data.username
    ).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    if user.password != data.password:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    return {
        "message": "Login successful",
        "user": {
            "id": user.id,
            "username": user.username,
            "display_name": user.display_name,
            "phone": user.phone,
            "avatar": user.avatar
        }
    }