from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from typing import List
from src.models.tag import Tag, TagCreate, TagUpdate, TagWithRelations
from src.repositories.tag_repository import TagRepository
from src.database import get_db
from src.auth import get_current_active_user, TokenData
from src.services.levenshtein_service import search_by_similarity
from src.models.url import DOCUMENT_TYPES
from neo4j import Driver
from pydantic import BaseModel

router = APIRouter(prefix="/tags", tags=["tags"])

# Color for document type tags
DOCUMENT_TYPE_TAG_COLOR = "#92400E"


class NewTagData(BaseModel):
    name: str
    color: str


class MergeTagsRequest(BaseModel):
    source_tag_ids: List[str]
    target_tag_id: NewTagData


def get_tag_repository(driver: Driver = Depends(get_db)) -> TagRepository:
    return TagRepository(driver)


@router.post("/", response_model=Tag, status_code=status.HTTP_201_CREATED)
def create_tag(
    tag: TagCreate,
    repo: TagRepository = Depends(get_tag_repository),
    current_user: TokenData = Depends(get_current_active_user)
):
    """Create a new tag linked to the authenticated user"""
    # Override user_id with the authenticated user's ID
    tag.user_id = current_user.user_id
    return repo.create(tag)


@router.get("/", response_model=List[Tag])
def get_tags(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    repo: TagRepository = Depends(get_tag_repository),
    current_user: TokenData = Depends(get_current_active_user)
):
    """Get all tags for the authenticated user with pagination"""
    return repo.get_all_by_user(user_id=current_user.user_id, skip=skip, limit=limit)


@router.post("/initialize-document-types", status_code=status.HTTP_201_CREATED)
def initialize_document_type_tags(
    repo: TagRepository = Depends(get_tag_repository),
    current_user: TokenData = Depends(get_current_active_user)
):
    """Initialize all document type tags for the current user if they don't exist"""
    # Get existing tags to avoid duplicates
    existing_tags = repo.get_all_by_user(current_user.user_id, skip=0, limit=1000)
    existing_tag_names = {tag.name for tag in existing_tags}
    
    # Create missing document type tags
    created_tags = []
    for doc_type in DOCUMENT_TYPES:
        if doc_type not in existing_tag_names:
            new_tag = repo.create(TagCreate(
                name=doc_type,
                description=f"Type de document : {doc_type}",
                color=DOCUMENT_TYPE_TAG_COLOR,
                user_id=current_user.user_id
            ))
            created_tags.append(new_tag.name)
    
    return {
        "message": f"Document type tags initialized",
        "created": created_tags,
        "total_document_types": len(DOCUMENT_TYPES)
    }


@router.get("/search/", response_model=List[Tag])
def search_tags(
    q: str = Query(..., min_length=1, description="Search query"),
    threshold: float = Query(0.6, ge=0.0, le=1.0, description="Minimum similarity threshold (0.0 to 1.0)"),
    limit: int = Query(100, ge=1, le=1000),
    repo: TagRepository = Depends(get_tag_repository),
    current_user: TokenData = Depends(get_current_active_user)
):
    """
    Search tags by name using Levenshtein distance for fuzzy matching.
    
    Returns tags sorted by similarity to the query (most similar first).
    """
    # Get all user's tags
    all_tags = repo.get_all_by_user(user_id=current_user.user_id, skip=0, limit=1000)
    
    # Prepare items for similarity search: (name, tag_object)
    items = [(tag.name, tag) for tag in all_tags]
    
    # Search using Levenshtein distance
    results = search_by_similarity(q, items, threshold=threshold)
    
    # Extract tags from results and apply limit
    matching_tags = [tag for tag, similarity in results[:limit]]
    
    return matching_tags


@router.get("/{tag_id}", response_model=Tag)
def get_tag(
    tag_id: str,
    repo: TagRepository = Depends(get_tag_repository)
):
    """Get a tag by ID"""
    tag = repo.get_by_id(tag_id)
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tag with id {tag_id} not found"
        )
    return tag


@router.get("/{tag_id}/relations", response_model=TagWithRelations)
def get_tag_with_relations(
    tag_id: str,
    repo: TagRepository = Depends(get_tag_repository)
):
    """Get a tag with all its relationships"""
    tag = repo.get_with_relations(tag_id)
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tag with id {tag_id} not found"
        )
    return tag


@router.put("/{tag_id}", response_model=Tag)
def update_tag(
    tag_id: str,
    tag: TagUpdate,
    repo: TagRepository = Depends(get_tag_repository)
):
    """Update a tag"""
    updated_tag = repo.update(tag_id, tag)
    if not updated_tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tag with id {tag_id} not found"
        )
    return updated_tag


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(
    tag_id: str,
    repo: TagRepository = Depends(get_tag_repository)
):
    """Delete a tag"""
    if not repo.delete(tag_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tag with id {tag_id} not found"
        )


# Relationship endpoints
@router.post("/{parent_id}/parent-of/{child_id}", status_code=status.HTTP_201_CREATED)
def create_parent_of_relation(
    parent_id: str,
    child_id: str,
    repo: TagRepository = Depends(get_tag_repository)
):
    """Create a PARENT_OF relationship between two tags"""
    if parent_id == child_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create relationship with itself"
        )
    
    if not repo.create_parent_of_relation(parent_id, child_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or both tags not found"
        )
    return {"message": "Relationship created successfully"}


@router.post("/{whole_id}/composed-of/{part_id}", status_code=status.HTTP_201_CREATED)
def create_composed_of_relation(
    whole_id: str,
    part_id: str,
    repo: TagRepository = Depends(get_tag_repository)
):
    """Create a COMPOSED_OF relationship between two tags"""
    if whole_id == part_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create relationship with itself"
        )
    
    if not repo.create_composed_of_relation(whole_id, part_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or both tags not found"
        )
    return {"message": "Relationship created successfully"}


@router.post("/{tag1_id}/related-to/{tag2_id}", status_code=status.HTTP_201_CREATED)
def create_related_to_relation(
    tag1_id: str,
    tag2_id: str,
    repo: TagRepository = Depends(get_tag_repository)
):
    """Create a RELATED_TO relationship between two tags"""
    if tag1_id == tag2_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create relationship with itself"
        )
    
    if not repo.create_related_to_relation(tag1_id, tag2_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or both tags not found"
        )
    return {"message": "Relationship created successfully"}


@router.delete("/{from_id}/{relation_type}/{to_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_relation(
    from_id: str,
    to_id: str,
    relation_type: str,
    repo: TagRepository = Depends(get_tag_repository)
):
    """Delete a specific relationship between tags"""
    valid_types = ["PARENT_OF", "COMPOSED_OF", "RELATED_TO"]
    if relation_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid relation type. Must be one of: {', '.join(valid_types)}"
        )
    
    if not repo.delete_relation(from_id, to_id, relation_type):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Relationship not found"
        )


@router.post("/merge", status_code=status.HTTP_200_OK)
def merge_tags(
    request: MergeTagsRequest,
    repo: TagRepository = Depends(get_tag_repository),
    current_user: TokenData = Depends(get_current_active_user)
):
    """
    Merge multiple source tags into one.
    All URLs linked to source tags will be linked to the first tag.
    The first tag will be renamed and recolored.
    Other source tags will be deleted.
    """
    # Validate that we have at least 2 source tags
    if not request.source_tag_ids or len(request.source_tag_ids) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least two source tags are required for merging"
        )
    
    # Use the first tag as the target
    target_tag_id = request.source_tag_ids[0]
    
    # Verify all source tags exist and belong to the user
    for tag_id in request.source_tag_ids:
        tag = repo.get_by_id(tag_id)
        if not tag:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Source tag {tag_id} not found"
            )
        if tag.user_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Source tag {tag_id} does not belong to the current user"
            )
    
    # Perform the merge
    try:
        result = repo.merge_tags(
            request.source_tag_ids,
            target_tag_id,
            request.target_tag_id.name,
            request.target_tag_id.color
        )
        return {
            "message": "Tags merged successfully",
            "target_tag_id": target_tag_id,
            "urls_updated": result["urls_updated"],
            "tags_merged": result["tags_merged"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to merge tags: {str(e)}"
        )

    
    # Perform the merge
    try:
        result = repo.merge_tags(request.source_tag_ids, target_tag_id)
        return {
            "message": "Tags merged successfully",
            "target_tag_id": target_tag_id,
            "urls_updated": result["urls_updated"],
            "tags_deleted": result["tags_deleted"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to merge tags: {str(e)}"
        )


