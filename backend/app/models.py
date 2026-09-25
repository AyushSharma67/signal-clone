from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Text,
    Boolean,
)
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, unique=True, nullable=True)
    display_name = Column(String, nullable=False)
    avatar = Column(String, nullable=True)
    password = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    memberships = relationship(
        "ConversationMember",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    messages = relationship(
        "Message",
        back_populates="sender",
    )


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)

    # direct or group
    type = Column(String, nullable=False)

    name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    members = relationship(
        "ConversationMember",
        back_populates="conversation",
        cascade="all, delete-orphan",
    )

    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
    )


class ConversationMember(Base):
    __tablename__ = "conversation_members"

    id = Column(Integer, primary_key=True, index=True)

    conversation_id = Column(
        Integer,
        ForeignKey("conversations.id"),
        nullable=False,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    is_admin = Column(Boolean, default=False)

    conversation = relationship(
        "Conversation",
        back_populates="members",
    )

    user = relationship(
        "User",
        back_populates="memberships",
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)

    conversation_id = Column(
        Integer,
        ForeignKey("conversations.id"),
        nullable=False,
    )

    sender_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    content = Column(Text, nullable=False)

    # sending / sent / delivered / read
    status = Column(String, default="sent")

    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship(
        "Conversation",
        back_populates="messages",
    )

    sender = relationship(
        "User",
        back_populates="messages",
    )