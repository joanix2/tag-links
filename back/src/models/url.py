from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class URLBase(BaseModel):
    url: str = Field(..., min_length=1)
    title: Optional[str] = None
    description: Optional[str] = None


class URLCreate(URLBase):
    user_id: Optional[str] = None  # Optional, will be set by the backend from auth token
    tag_ids: List[str] = []  # Liste des IDs de tags à associer
    created_at: Optional[datetime] = None  # Optional, pour les imports CSV avec date personnalisée


class URLUpdate(BaseModel):
    url: Optional[str] = Field(None, min_length=1)
    title: Optional[str] = None
    description: Optional[str] = None
    tag_ids: Optional[List[str]] = None  # Liste des IDs de tags à associer (None = pas de changement)


class URL(URLBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class URLWithTags(URL):
    """URL with its tags"""
    tags: List['Tag'] = []
    
    class Config:
        from_attributes = True


class URLWithUser(URL):
    """URL with its owner"""
    user: Optional['User'] = None
    tags: List['Tag'] = []
    
    class Config:
        from_attributes = True


# Avoid circular imports
from .tag import Tag
from .user import User
URLWithTags.model_rebuild()
URLWithUser.model_rebuild()
