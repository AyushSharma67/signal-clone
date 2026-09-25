from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi import WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from ..database import get_db
from ..models import (
    User,
    Conversation,
    ConversationMember,
    Message,
)

router = APIRouter(prefix="/conversations", tags=["Conversations"])
class ConversationCreate(BaseModel):
    user_id: int
    other_user_id: int
class GroupCreate(BaseModel):
    user_id: int
    name: str
    member_ids: list[int]
@router.post("/")
def create_conversation(
    conversation_data: ConversationCreate,
    db: Session = Depends(get_db),
):
    user_id = conversation_data.user_id
    other_user_id = conversation_data.other_user_id

    if user_id == other_user_id:
        raise HTTPException(
            status_code=400,
            detail="Cannot create conversation with yourself",
        )

    # Check both users exist
    user = db.query(User).filter(User.id == user_id).first()
    other_user = (
        db.query(User)
        .filter(User.id == other_user_id)
        .first()
    )

    if not user or not other_user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    # Check whether direct conversation already exists
    user_memberships = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.user_id == user_id
        )
        .all()
    )

    for membership in user_memberships:
        conversation = membership.conversation

        if conversation.type != "direct":
            continue

        member_ids = [
            member.user_id
            for member in conversation.members
        ]

        if set(member_ids) == {user_id, other_user_id}:
            return {
                "id": conversation.id,
                "type": conversation.type,
                "name": other_user.display_name,
            }

    # Create new conversation
    conversation = Conversation(
        type="direct",
    )

    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    # Add both users
    member1 = ConversationMember(
        conversation_id=conversation.id,
        user_id=user_id,
        is_admin=False,
    )

    member2 = ConversationMember(
        conversation_id=conversation.id,
        user_id=other_user_id,
        is_admin=False,
    )

    db.add(member1)
    db.add(member2)

    db.commit()

    return {
        "id": conversation.id,
        "type": conversation.type,
        "name": other_user.display_name,
    }
class AddMember(BaseModel):
    user_id: int
    member_id: int


class RemoveMember(BaseModel):
    user_id: int
    member_id: int


@router.get("/{conversation_id}/members")
def get_group_members(
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

    if conversation.type != "group":
        raise HTTPException(
            status_code=400,
            detail="Not a group conversation",
        )

    return [
        {
            "id": member.user.id,
            "username": member.user.username,
            "display_name": member.user.display_name,
            "avatar": member.user.avatar,
            "is_admin": member.is_admin,
        }
        for member in conversation.members
    ]


@router.post("/{conversation_id}/members")
def add_group_member(
    conversation_id: int,
    data: AddMember,
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

    if conversation.type != "group":
        raise HTTPException(
            status_code=400,
            detail="Not a group conversation",
        )

    # Check admin
    admin = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == data.user_id,
        )
        .first()
    )

    if not admin or not admin.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Only admins can add members",
        )

    # Check user exists
    user = (
        db.query(User)
        .filter(User.id == data.member_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    # Check already member
    existing = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == data.member_id,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="User is already a member",
        )

    member = ConversationMember(
        conversation_id=conversation_id,
        user_id=data.member_id,
        is_admin=False,
    )

    db.add(member)
    db.commit()

    return {
        "message": "Member added successfully",
        "user_id": data.member_id,
    }


@router.delete("/{conversation_id}/members")
def remove_group_member(
    conversation_id: int,
    data: RemoveMember,
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

    if conversation.type != "group":
        raise HTTPException(
            status_code=400,
            detail="Not a group conversation",
        )

    # Check admin
    admin = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == data.user_id,
        )
        .first()
    )

    if not admin or not admin.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Only admins can remove members",
        )

    member = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == data.member_id,
        )
        .first()
    )

    if not member:
        raise HTTPException(
            status_code=404,
            detail="Member not found",
        )

    db.delete(member)
    db.commit()

    return {
        "message": "Member removed successfully",
        "user_id": data.member_id,
    }
class ConnectionManager:
    def __init__(self):
        self.active_connections = {}

    async def connect(self, conversation_id: int, websocket: WebSocket):
        await websocket.accept()

        if conversation_id not in self.active_connections:
            self.active_connections[conversation_id] = []

        self.active_connections[conversation_id].append(websocket)

    def disconnect(self, conversation_id: int, websocket: WebSocket):
        if conversation_id in self.active_connections:
            if websocket in self.active_connections[conversation_id]:
                self.active_connections[conversation_id].remove(websocket)

            if not self.active_connections[conversation_id]:
                del self.active_connections[conversation_id]

    async def broadcast(self, conversation_id: int, message: dict):
        if conversation_id not in self.active_connections:
            return

        for connection in self.active_connections[conversation_id]:
            await connection.send_json(message)


manager = ConnectionManager()
online_users = set()
@router.get("/users/{user_id}")
def get_users(
    user_id: int,
    db: Session = Depends(get_db),
):
    users = (
        db.query(User)
        .filter(User.id != user_id)
        .all()
    )

    return [
        {
            "id": user.id,
            "username": user.username,
            "display_name": user.display_name,
            "avatar": user.avatar,
        }
        for user in users
    ]
@router.post("/group")
def create_group(
    group_data: GroupCreate,
    db: Session = Depends(get_db),
):
    creator_id = group_data.user_id

    # Check creator exists
    creator = (
        db.query(User)
        .filter(User.id == creator_id)
        .first()
    )

    if not creator:
        raise HTTPException(
            status_code=404,
            detail="Creator not found",
        )

    # Remove duplicate members
    member_ids = list(set(group_data.member_ids))

    # Creator must be part of group
    if creator_id not in member_ids:
        member_ids.append(creator_id)

    # Check all users exist
    users = (
        db.query(User)
        .filter(User.id.in_(member_ids))
        .all()
    )

    if len(users) != len(member_ids):
        raise HTTPException(
            status_code=404,
            detail="One or more users not found",
        )

    # Create group conversation
    conversation = Conversation(
        type="group",
        name=group_data.name,
    )

    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    # Add members
    for user_id in member_ids:

        member = ConversationMember(
            conversation_id=conversation.id,
            user_id=user_id,
            is_admin=(user_id == creator_id),
        )

        db.add(member)

    db.commit()

    return {
        "id": conversation.id,
        "type": conversation.type,
        "name": conversation.name,
    }
@router.get("/{user_id}")
def get_conversations(
    user_id: int,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    memberships = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.user_id == user_id
        )
        .all()
    )

    result = []

    for membership in memberships:
        conversation = membership.conversation

        last_message = (
            db.query(Message)
            .filter(
                Message.conversation_id == conversation.id
            )
            .order_by(Message.created_at.desc())
            .first()
        )

        # For direct conversations, find the other user
        other_user = None

        if conversation.type == "direct":
            for member in conversation.members:
                if member.user_id != user_id:
                    other_user = member.user
                    break

        result.append({
            "id": conversation.id,
            "type": conversation.type,
            "name": (
                conversation.name
                if conversation.type == "group"
                else (
                    other_user.display_name
                    if other_user
                    else "Unknown"
                )
            ),
            "avatar": (
                other_user.avatar
                if conversation.type == "direct"
                and other_user
                else None
            ),
            "last_message": (
                last_message.content
                if last_message
                else None
            ),
            "last_message_time": (
                last_message.created_at
                if last_message
                else conversation.created_at
            ),
        })

    # Most recent conversation first
    result.sort(
        key=lambda x: x["last_message_time"],
        reverse=True,
    )

    return result
@router.websocket("/ws/{conversation_id}/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    conversation_id: int,
    user_id: int,
):
    db = next(get_db())

    try:
        # Check whether user exists
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            await websocket.close(code=1008)
            return

        # Check whether user belongs to this conversation
        membership = (
            db.query(ConversationMember)
            .filter(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id == user_id,
            )
            .first()
        )

        if not membership:
            await websocket.close(code=1008)
            return

    finally:
        db.close()

    await manager.connect(conversation_id, websocket)
    online_users.add(user_id)

    await manager.broadcast(
        conversation_id,
        {
            "type": "presence",
            "user_id": user_id,
            "status": "online",
        },
    )
    try:
        while True:
            data = await websocket.receive_json()


            if data.get("type") == "message":

                content = data.get("content")

                if not content:
                    continue

                db = next(get_db())

                try:
                    message = Message(
                        conversation_id=conversation_id,
                        sender_id=user_id,
                        content=content,
                        status="sent",
                    )

                    db.add(message)
                    db.commit()
                    db.refresh(message)

                    message_data = {
                        "type": "message",
                        "id": message.id,
                        "conversation_id": conversation_id,
                        "sender_id": user_id,
                        "content": message.content,
                        "status": message.status,
                        "created_at": message.created_at.isoformat(),
                    }

                finally:
                    db.close()

                await manager.broadcast(
                    conversation_id,
                    message_data)
            elif data.get("type") == "status_update":

                message_id = data.get("message_id")
                status = data.get("status")

                if not message_id or not status:
                    continue

                db = next(get_db())

                try:
                    message = (
                        db.query(Message)
                        .filter(Message.id == message_id)
                        .first()
                    )

                    if not message:
                        continue

                    message.status = status
                    db.commit()
                    db.refresh(message)

                    status_data = {
                        "type": "status_update",
                        "message_id": message.id,
                        "status": message.status,
                    }

                finally:
                    db.close()

                await manager.broadcast(
                    conversation_id,
                    status_data,
                )
            elif data.get("type") == "typing":

                await manager.broadcast(
                    conversation_id,
                {
                    "type": "typing",
                    "user_id": user_id,
                    "is_typing": data.get("is_typing", False),
                },
                )

    except WebSocketDisconnect:
        manager.disconnect(conversation_id, websocket)

        online_users.discard(user_id)

        await manager.broadcast(
            conversation_id,
            {
                "type": "presence",
                "user_id": user_id,
                "status": "offline",
            },
        )