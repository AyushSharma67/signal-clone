from datetime import datetime

from .database import SessionLocal
from .models import (
    User,
    Conversation,
    ConversationMember,
    Message,
)


def seed_database():
    db = SessionLocal()

    try:
        # -------------------------------------------------
        # 1. Get the first registered user
        # -------------------------------------------------
        current_user = db.query(User).first()

        if not current_user:
            print("No user found.")
            print("Register an account first, then run the seed again.")
            return

        print(
            f"Using existing user: "
            f"{current_user.display_name} "
            f"(id={current_user.id})"
        )

        # -------------------------------------------------
        # 2. Create Rahul
        # -------------------------------------------------
        rahul = (
            db.query(User)
            .filter(User.username == "rahul")
            .first()
        )

        if not rahul:
            rahul = User(
                username="rahul",
                phone="9000000001",
                display_name="Rahul",
                avatar=None,
            )
            db.add(rahul)
            db.commit()
            db.refresh(rahul)

        # -------------------------------------------------
        # 3. Create Priya
        # -------------------------------------------------
        priya = (
            db.query(User)
            .filter(User.username == "priya")
            .first()
        )

        if not priya:
            priya = User(
                username="priya",
                phone="9000000002",
                display_name="Priya",
                avatar=None,
            )
            db.add(priya)
            db.commit()
            db.refresh(priya)

        # -------------------------------------------------
        # Helper: create conversation
        # -------------------------------------------------
        def create_conversation(conv_type, name=None):
            conversation = Conversation(
                type=conv_type,
                name=name,
            )

            db.add(conversation)
            db.commit()
            db.refresh(conversation)

            return conversation

        # -------------------------------------------------
        # 4. You <-> Rahul
        # -------------------------------------------------
        direct_rahul = (
            db.query(Conversation)
            .join(ConversationMember)
            .filter(
                Conversation.type == "direct",
                ConversationMember.user_id == current_user.id,
            )
            .all()
        )

        rahul_conversation = None

        for conversation in direct_rahul:
            member_ids = {
                member.user_id
                for member in conversation.members
            }

            if member_ids == {
                current_user.id,
                rahul.id,
            }:
                rahul_conversation = conversation
                break

        if not rahul_conversation:
            rahul_conversation = create_conversation("direct")

            db.add(
                ConversationMember(
                    conversation_id=rahul_conversation.id,
                    user_id=current_user.id,
                )
            )

            db.add(
                ConversationMember(
                    conversation_id=rahul_conversation.id,
                    user_id=rahul.id,
                )
            )

            db.commit()

        # -------------------------------------------------
        # 5. You <-> Priya
        # -------------------------------------------------
        direct_priya = (
            db.query(Conversation)
            .join(ConversationMember)
            .filter(
                Conversation.type == "direct",
                ConversationMember.user_id == current_user.id,
            )
            .all()
        )

        priya_conversation = None

        for conversation in direct_priya:
            member_ids = {
                member.user_id
                for member in conversation.members
            }

            if member_ids == {
                current_user.id,
                priya.id,
            }:
                priya_conversation = conversation
                break

        if not priya_conversation:
            priya_conversation = create_conversation("direct")

            db.add(
                ConversationMember(
                    conversation_id=priya_conversation.id,
                    user_id=current_user.id,
                )
            )

            db.add(
                ConversationMember(
                    conversation_id=priya_conversation.id,
                    user_id=priya.id,
                )
            )

            db.commit()

        # -------------------------------------------------
        # 6. Project Team group
        # -------------------------------------------------
        project_team = (
            db.query(Conversation)
            .filter(
                Conversation.type == "group",
                Conversation.name == "Project Team",
            )
            .first()
        )

        if not project_team:
            project_team = create_conversation(
                "group",
                "Project Team",
            )

            db.add(
                ConversationMember(
                    conversation_id=project_team.id,
                    user_id=current_user.id,
                    is_admin=True,
                )
            )

            db.add(
                ConversationMember(
                    conversation_id=project_team.id,
                    user_id=rahul.id,
                )
            )

            db.add(
                ConversationMember(
                    conversation_id=project_team.id,
                    user_id=priya.id,
                )
            )

            db.commit()

        # -------------------------------------------------
        # 7. Add sample messages
        # -------------------------------------------------

        def add_message(conversation_id, sender_id, content):
            message = Message(
                conversation_id=conversation_id,
                sender_id=sender_id,
                content=content,
                status="sent",
                created_at=datetime.utcnow(),
            )

            db.add(message)
            db.commit()

        # Rahul messages
        if not db.query(Message).filter(
            Message.conversation_id == rahul_conversation.id
        ).first():
            add_message(
                rahul_conversation.id,
                rahul.id,
                "Hey, are you free today?",
            )

            add_message(
                rahul_conversation.id,
                current_user.id,
                "Yes, what's up?",
            )

        # Priya messages
        if not db.query(Message).filter(
            Message.conversation_id == priya_conversation.id
        ).first():
            add_message(
                priya_conversation.id,
                priya.id,
                "See you tomorrow!",
            )

        # Project Team messages
        if not db.query(Message).filter(
            Message.conversation_id == project_team.id
        ).first():
            add_message(
                project_team.id,
                rahul.id,
                "Let's discuss the project.",
            )

            add_message(
                project_team.id,
                current_user.id,
                "Sure, I'll prepare the updates.",
            )

        print("\nDatabase seeded successfully!")
        print("--------------------------------")
        print(f"Current user : {current_user.display_name} (id={current_user.id})")
        print(f"Rahul        : {rahul.id}")
        print(f"Priya        : {priya.id}")
        print(f"Rahul chat   : {rahul_conversation.id}")
        print(f"Priya chat   : {priya_conversation.id}")
        print(f"Project Team : {project_team.id}")

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()