from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class TagBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    color: Optional[str] = None


class TagCreate(TagBase):
    user_id: Optional[str] = None  # Optional, will be set by the backend from auth token
    is_system: Optional[bool] = False  # System tags are not editable/visible in lists


class TagUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    color: Optional[str] = None


class Tag(TagBase):
    id: str
    user_id: str  # User ID of the tag owner
    created_at: datetime
    updated_at: datetime
    is_system: bool = False  # System tags (favoris, partage, type) are hidden from normal lists
    
    class Config:
        from_attributes = True


class TagRelation(BaseModel):
    """Represents a tag with its relationship type"""
    tag: Tag
    relationship_type: str  # PARENT_OF, COMPOSED_OF, RELATED_TO


class TagWithRelations(Tag):
    """Tag with all its relationships"""
    parents: List[Tag] = []
    children: List[Tag] = []
    composed_of: List[Tag] = []
    part_of: List[Tag] = []
    related_to: List[Tag] = []
    
    class Config:
        from_attributes = True
