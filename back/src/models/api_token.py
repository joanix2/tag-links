from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class APITokenBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class APITokenCreate(APITokenBase):
    pass  # user_id will be obtained from auth context


class APIToken(APITokenBase):
    id: str
    token: str  # The actual token (only shown once at creation)
    created_at: datetime
    last_used_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class APITokenInDB(APIToken):
    """Model with hashed token for database storage"""
    hashed_token: str
