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

# System tags configuration
SYSTEM_TAGS = [
    {"name": "Favoris", "color": "#ef4444", "description": "Tag spécial pour marquer les liens favoris"},
    {"name": "Partage", "color": "#3b82f6", "description": "Tag spécial pour marquer les liens partagés"}
]


class PaginatedTagResponse(BaseModel):
    """Response model for paginated Tag results"""
    items: List[Tag]
    total: int
    skip: int
    limit: int
    has_more: bool


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


@router.get("/", response_model=PaginatedTagResponse)
def get_tags(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    include_system: bool = Query(False, description="Include system tags (favoris, partage, type)"),
    repo: TagRepository = Depends(get_tag_repository),
    current_user: TokenData = Depends(get_current_active_user)
):
    """Get all tags for the authenticated user with pagination"""
    if include_system:
        items = repo.get_all_by_user(user_id=current_user.user_id, skip=skip, limit=limit)
    else:
        items = repo.get_all_by_user_non_system(user_id=current_user.user_id, skip=skip, limit=limit)
    
    total = repo.count_by_user(user_id=current_user.user_id)
    has_more = (skip + limit) < total
    
    return PaginatedTagResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit,
        has_more=has_more
    )


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
                user_id=current_user.user_id,
                is_system=True  # Mark as system tag
            ))
            created_tags.append(new_tag.name)
    
    return {
        "message": f"Document type tags initialized",
        "created": created_tags,
        "total_document_types": len(DOCUMENT_TYPES)
    }


@router.post("/initialize-system-tags", status_code=status.HTTP_201_CREATED)
def initialize_system_tags(
    repo: TagRepository = Depends(get_tag_repository),
    current_user: TokenData = Depends(get_current_active_user)
):
    """Initialize system tags (Favoris, Partage) for the current user if they don't exist"""
    # Get existing tags to avoid duplicates
    existing_tags = repo.get_all_by_user(current_user.user_id, skip=0, limit=1000)
    existing_tag_names = {tag.name for tag in existing_tags}
    
    # Create missing system tags
    created_tags = []
    for system_tag in SYSTEM_TAGS:
        if system_tag["name"] not in existing_tag_names:
            new_tag = repo.create(TagCreate(
                name=system_tag["name"],
                description=system_tag["description"],
                color=system_tag["color"],
                user_id=current_user.user_id,
                is_system=True
            ))
            created_tags.append(new_tag.name)
    
    return {
        "message": f"System tags initialized",
        "created": created_tags,
        "total_system_tags": len(SYSTEM_TAGS)
    }


@router.post("/migrate-system-tags", status_code=status.HTTP_200_OK)
def migrate_system_tags(
    repo: TagRepository = Depends(get_tag_repository),
    current_user: TokenData = Depends(get_current_active_user)
):
    """
    Mark existing tags as system tags if they match system tag names.
    This is useful for migrating existing data.
    """
    # Get all user's tags
    existing_tags = repo.get_all_by_user(current_user.user_id, skip=0, limit=1000)
    
    # System tag names to mark
    system_tag_names = {tag["name"] for tag in SYSTEM_TAGS} | set(DOCUMENT_TYPES)
    
    # Update tags that match system names but aren't marked as system
    updated_tags = []
    for tag in existing_tags:
        if tag.name in system_tag_names and not tag.is_system:
            # Update the tag to mark it as system
            from src.models.tag import TagUpdate
            repo.update(tag.id, TagUpdate(name=tag.name, description=tag.description, color=tag.color))
            # Manually update is_system field via Cypher
            from src.database import get_driver
            driver = get_driver()
            with driver.session() as session:
                session.run("""
                    MATCH (t:Tag {id: $id})
                    SET t.is_system = true
                    RETURN t
                """, id=tag.id)
            updated_tags.append(tag.name)
    
    return {
        "message": f"System tags migrated",
        "updated": updated_tags,
        "total_updated": len(updated_tags)
    }


@router.get("/search/", response_model=List[Tag])
def search_tags(
    q: str = Query(..., min_length=1, description="Search query"),
    threshold: float = Query(0.6, ge=0.0, le=1.0, description="Minimum similarity threshold (0.0 to 1.0)"),
    limit: int = Query(100, ge=1, le=1000),
    include_system: bool = Query(False, description="Include system tags (favoris, partage, type)"),
    repo: TagRepository = Depends(get_tag_repository),
    current_user: TokenData = Depends(get_current_active_user)
):
    """
    Search tags by name using Levenshtein distance for fuzzy matching.
    
    Returns tags sorted by similarity to the query (most similar first).
    """
    # Get all user's tags (filtered or not by system tags)
    if include_system:
        all_tags = repo.get_all_by_user(user_id=current_user.user_id, skip=0, limit=1000)
    else:
        all_tags = repo.get_all_by_user_non_system(user_id=current_user.user_id, skip=0, limit=1000)
    
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
    # Check if tag is a system tag
    existing_tag = repo.get_by_id(tag_id)
    if not existing_tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tag with id {tag_id} not found"
        )
    
    if existing_tag.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify system tags (favoris, partage, type)"
        )
    
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
    # Check if tag is a system tag
    existing_tag = repo.get_by_id(tag_id)
    if existing_tag and existing_tag.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete system tags (favoris, partage, type)"
        )
    
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
        # Prevent merging system tags
        if tag.is_system:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot merge system tags (favoris, partage, type)"
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


