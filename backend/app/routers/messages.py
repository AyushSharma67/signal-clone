from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Conversation, Message
from pydantic import BaseModel
router = APIRouter(prefix="/messages", tags=["Messages"])


@router.get("/{conversation_id}")
def get_messages(
    conversation_id: int,
    db: Session = Depends(get_db),
):
    conversation = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id)
        .first()
    )

    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found",
        )

    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    )

    return [
        {
            "id": message.id,
            "sender_id": message.sender_id,
            "content": message.content,
            "status": message.status,
            "created_at": message.created_at,
        }
        for message in messages
    ]
class MessageCreate(BaseModel):
    conversation_id: int
    sender_id: int
    content: str


@router.post("/")
def create_message(
    message_data: MessageCreate,
    db: Session = Depends(get_db),
):
    conversation = (
        db.query(Conversation)
        .filter(
            Conversation.id == message_data.conversation_id
        )
        .first()
    )

    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found",
        )

    message = Message(
        conversation_id=message_data.conversation_id,
        sender_id=message_data.sender_id,
        content=message_data.content,
        status="sent",
    )

    db.add(message)
    db.commit()
    db.refresh(message)

    return {
        "id": message.id,
        "sender_id": message.sender_id,
        "content": message.content,
        "status": message.status,
        "created_at": message.created_at,
    }

class MessageStatusUpdate(BaseModel):
    status: str


@router.patch("/{message_id}/status")
def update_message_status(
    message_id: int,
    status_data: MessageStatusUpdate,
    db: Session = Depends(get_db),
):
    message = (
        db.query(Message)
        .filter(Message.id == message_id)
        .first()
    )

    if not message:
        raise HTTPException(
            status_code=404,
            detail="Message not found",
        )

    allowed_statuses = ["sent", "delivered", "read"]

    if status_data.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid message status",
        )

    message.status = status_data.status

    db.commit()
    db.refresh(message)

    return {
        "id": message.id,
        "sender_id": message.sender_id,
        "content": message.content,
        "status": message.status,
        "created_at": message.created_at,
    }