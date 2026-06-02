from pydantic import BaseModel, Field


class ChatThreadCreate(BaseModel):
    subject: str = Field(min_length=2)
    creator_email: str
    participant_emails: list[str] = Field(min_length=1)


class ChatMessageCreate(BaseModel):
    sender_email: str
    body: str = Field(min_length=1)
