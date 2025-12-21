from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class FileBase(BaseModel):
    filename: str = Field(..., min_length=1)
    file_path: str = Field(..., min_length=1)
    file_type: Optional[str] = None  # mime type
    file_size: Optional[int] = None  # en bytes
    description: Optional[str] = None


class FileCreate(FileBase):
    user_id: str  # Le fichier appartient à un user


class FileUpdate(BaseModel):
    filename: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = None


class File(FileBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class FileWithTags(File):
    """File with its tags"""
    tags: List['Tag'] = []
    
    class Config:
        from_attributes = True


class FileWithUser(File):
    """File with its owner"""
    user: Optional['User'] = None
    tags: List['Tag'] = []
    
    class Config:
        from_attributes = True


# Avoid circular imports
from .tag import Tag
from .user import User
FileWithTags.model_rebuild()
FileWithUser.model_rebuild()
