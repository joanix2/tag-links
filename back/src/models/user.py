from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    username: str
    password: str


class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = Field(None, min_length=6)


class User(UserBase):
    id: str
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class UserInDB(User):
    """User model with hashed password (for internal use)"""
    hashed_password: str


class UserWithContent(User):
    """User with their URLs and Files"""
    urls: List['URL'] = []
    files: List['File'] = []
    
    class Config:
        from_attributes = True


# Avoid circular imports
from .url import URL
from .file import File
UserWithContent.model_rebuild()
