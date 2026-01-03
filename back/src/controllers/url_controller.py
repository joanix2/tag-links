from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from src.models.url import URL, URLCreate, URLUpdate, URLWithTags, DOCUMENT_TYPES
from src.repositories.url_repository import URLRepository
from src.repositories.tag_repository import TagRepository
from src.database import get_db
from src.auth import get_current_active_user, TokenData
from src.services.levenshtein_service import search_by_similarity
from neo4j import Driver
from pydantic import BaseModel

router = APIRouter(prefix="/urls", tags=["urls"])

# System tag names
SYSTEM_TAG_NAMES = {"Favoris", "Partage"} | set(DOCUMENT_TYPES)


def get_url_repository(driver: Driver = Depends(get_db)) -> URLRepository:
    return URLRepository(driver)


def get_tag_repository(driver: Driver = Depends(get_db)) -> TagRepository:
    return TagRepository(driver)


class PaginatedURLResponse(BaseModel):
    """Response model for paginated URL results"""
    items: List[URLWithTags]
    total: int
    skip: int
    limit: int
    has_more: bool


class URLIdsResponse(BaseModel):
    """Response model for URL IDs only"""
    ids: List[str]
    total: int


class CSVLinkImport(BaseModel):
    title: str
    url: str
    tags: List[str]
    description: str | None = None
    created_at: str | None = None


class BulkImportRequest(BaseModel):
    links: List[CSVLinkImport]


class BulkImportResponse(BaseModel):
    success: int
    errors: List[dict]


@router.post("/bulk-import", response_model=BulkImportResponse)
def bulk_import_urls(
    request: BulkImportRequest,
    url_repo: URLRepository = Depends(get_url_repository),
    tag_repo: TagRepository = Depends(get_tag_repository),
    current_user: TokenData = Depends(get_current_active_user)
):
    """Import multiple URLs from CSV data. If a URL already exists, merge tags instead of creating a duplicate."""
    success_count = 0
    errors = []

    # Get all user's tags once
    user_tags = tag_repo.get_all_by_user(current_user.user_id)
    tag_map = {tag.name.lower(): tag.id for tag in user_tags}

    for idx, link_data in enumerate(request.links):
        line_number = idx + 2  # +2 because: +1 for 0-index, +1 for header row
        try:
            # Validate required fields
            if not link_data.title or not link_data.title.strip():
                errors.append({
                    "line": line_number,
                    "url": link_data.url or "N/A",
                    "title": link_data.title or "N/A",
                    "error": "Title is required and cannot be empty"
                })
                continue
            
            if not link_data.url or not link_data.url.strip():
                errors.append({
                    "line": line_number,
                    "url": "N/A",
                    "title": link_data.title,
                    "error": "URL is required and cannot be empty"
                })
                continue

            # Find or create tags
            tag_ids = []
            for tag_name in link_data.tags:
                tag_name_lower = tag_name.lower()
                if tag_name_lower in tag_map:
                    tag_ids.append(tag_map[tag_name_lower])
                else:
                    # Create new tag
                    from src.models.tag import TagCreate
                    import random
                    colors = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899"]
                    
                    # Check if this is a system tag
                    is_system = tag_name in SYSTEM_TAG_NAMES
                    
                    new_tag = tag_repo.create(TagCreate(
                        name=tag_name,
                        color=random.choice(colors),
                        user_id=current_user.user_id,
                        is_system=is_system
                    ))
                    tag_ids.append(new_tag.id)
                    tag_map[tag_name_lower] = new_tag.id

            # Check if URL already exists for this user
            existing_url = url_repo.get_by_url_and_user(link_data.url, current_user.user_id)
            
            if existing_url:
                # URL exists - merge tags
                existing_tag_ids = [tag.id for tag in existing_url.tags]
                # Combine existing and new tags (no duplicates)
                merged_tag_ids = list(set(existing_tag_ids + tag_ids))
                
                # Update the URL with merged tags and potentially new description
                from src.models.url import URLUpdate
                update_data = URLUpdate(tag_ids=merged_tag_ids)
                
                # Update description if provided and not empty
                if link_data.description and link_data.description.strip():
                    # Keep the existing description if new one is empty
                    update_data.description = link_data.description
                
                url_repo.update(existing_url.id, update_data)
                success_count += 1
            else:
                # URL doesn't exist - create new
                # Parse created_at if provided
                created_at = None
                if link_data.created_at:
                    try:
                        from datetime import datetime
                        # Try to parse ISO format date
                        created_at = datetime.fromisoformat(link_data.created_at.replace('Z', '+00:00'))
                    except (ValueError, AttributeError) as e:
                        # If parsing fails, log warning but continue with current datetime
                        errors.append({
                            "line": line_number,
                            "url": link_data.url,
                            "title": link_data.title,
                            "error": f"Invalid date format '{link_data.created_at}', using current date instead"
                        })

                # Create URL
                url_create = URLCreate(
                    title=link_data.title,
                    url=link_data.url,
                    description=link_data.description,
                    user_id=current_user.user_id,
                    tag_ids=tag_ids,
                    created_at=created_at
                )
                
                url_repo.create(url_create)
                success_count += 1

        except Exception as e:
            error_message = str(e)
            # Try to extract more specific error information
            if "duplicate" in error_message.lower():
                error_message = "Duplicate URL detected"
            elif "validation" in error_message.lower():
                error_message = f"Validation error: {error_message}"
            
            errors.append({
                "line": line_number,
                "url": link_data.url if hasattr(link_data, 'url') else "N/A",
                "title": link_data.title if hasattr(link_data, 'title') else "N/A",
                "error": error_message
            })

    return BulkImportResponse(success=success_count, errors=errors)


@router.post("/", response_model=URLWithTags, status_code=status.HTTP_201_CREATED)
def create_url(
    url: URLCreate,
    url_repo: URLRepository = Depends(get_url_repository),
    tag_repo: TagRepository = Depends(get_tag_repository),
    current_user: TokenData = Depends(get_current_active_user)
):
    """Create a new URL linked to the authenticated user"""
    # Override user_id with the authenticated user's ID
    url.user_id = current_user.user_id
    
    try:
        created_url = url_repo.create(url)
        
        # Return URL with tags
        url_with_tags = url_repo.get_with_tags(created_url.id)
        if not url_with_tags:
            return created_url  # Fallback to URL without tags
        
        return url_with_tags
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Failed to create URL: {str(e)}"
        )


@router.get("/", response_model=PaginatedURLResponse)
def get_urls(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    tag_ids: Optional[str] = Query(None, description="Comma-separated tag IDs to filter by"),
    match_mode: str = Query("OR", regex="^(OR|AND)$", description="Tag matching mode: OR or AND"),
    show_untagged: bool = Query(False, description="Show only untagged URLs"),
    repo: URLRepository = Depends(get_url_repository),
    current_user: TokenData = Depends(get_current_active_user)
):
    """
    Get URLs for the authenticated user with optional tag filtering.
    
    - **tag_ids**: Comma-separated tag IDs (e.g., "id1,id2,id3")
    - **match_mode**: "OR" (any tag) or "AND" (all tags) - default is "OR"
    - **show_untagged**: If true, only return URLs without any tags
    - **skip/limit**: Pagination parameters
    """
    # Parse tag_ids if provided
    tag_id_list = []
    if tag_ids and tag_ids.strip():
        tag_id_list = [tid.strip() for tid in tag_ids.split(",") if tid.strip()]
    
    # If filtering by tags or untagged
    if tag_id_list or show_untagged:
        items, total = repo.filter_by_tags(
            user_id=current_user.user_id,
            tag_ids=tag_id_list,
            match_mode=match_mode,
            skip=skip,
            limit=limit,
            show_untagged=show_untagged
        )
    else:
        # No filtering - get all URLs
        items = repo.get_by_user_with_tags(user_id=current_user.user_id, skip=skip, limit=limit)
        total = repo.count_by_user(user_id=current_user.user_id)
    
    has_more = (skip + limit) < total
    
    return PaginatedURLResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit,
        has_more=has_more
    )


@router.get("/ids", response_model=URLIdsResponse)
def get_url_ids(
    tag_ids: Optional[str] = Query(None, description="Comma-separated tag IDs to filter by"),
    match_mode: str = Query("OR", regex="^(OR|AND)$", description="Tag matching mode: OR or AND"),
    show_untagged: bool = Query(False, description="Show only untagged URLs"),
    search_term: Optional[str] = Query(None, description="Search term for filtering URLs"),
    repo: URLRepository = Depends(get_url_repository),
    current_user: TokenData = Depends(get_current_active_user)
):
    """
    Get only the IDs of URLs matching the filters.
    Useful for bulk operations like "select all".
    
    - **tag_ids**: Comma-separated tag IDs (e.g., "id1,id2,id3")
    - **match_mode**: "OR" (any tag) or "AND" (all tags) - default is "OR"
    - **show_untagged**: If true, only return URLs without any tags
    - **search_term**: Optional search term to filter URLs
    """
    # Parse tag_ids if provided
    tag_id_list = []
    if tag_ids and tag_ids.strip():
        tag_id_list = [tid.strip() for tid in tag_ids.split(",") if tid.strip()]
    
    # Get IDs based on filters
    if search_term and search_term.strip():
        # If there's a search term, get all matching URLs first
        if tag_id_list or show_untagged:
            urls, _ = repo.filter_by_tags(
                user_id=current_user.user_id,
                tag_ids=tag_id_list,
                match_mode=match_mode,
                skip=0,
                limit=10000,  # Get all matching
                show_untagged=show_untagged
            )
        else:
            urls = repo.get_by_user_with_tags(user_id=current_user.user_id, skip=0, limit=10000)
        
        # Filter by search term using Levenshtein
        filtered_urls = search_by_similarity(urls, search_term, threshold=0.3)
        url_ids = [url.id for url in filtered_urls]
        total = len(url_ids)
    elif tag_id_list or show_untagged:
        # Get all IDs matching the tag filter
        urls, total = repo.filter_by_tags(
            user_id=current_user.user_id,
            tag_ids=tag_id_list,
            match_mode=match_mode,
            skip=0,
            limit=10000,  # Get all matching IDs
            show_untagged=show_untagged
        )
        url_ids = [url.id for url in urls]
    else:
        # No filtering - get all URL IDs
        urls = repo.get_by_user_with_tags(user_id=current_user.user_id, skip=0, limit=10000)
        total = repo.count_by_user(user_id=current_user.user_id)
        url_ids = [url.id for url in urls]
    
    return URLIdsResponse(
        ids=url_ids,
        total=total
    )


@router.get("/search/", response_model=List[URLWithTags])
def search_urls(
    q: str = Query(..., min_length=1, description="Search query"),
    threshold: float = Query(0.3, ge=0.0, le=1.0, description="Minimum similarity threshold (0.0 to 1.0)"),
    limit: int = Query(1000, ge=1, le=10000),
    repo: URLRepository = Depends(get_url_repository),
    current_user: TokenData = Depends(get_current_active_user)
):
    """
    Search URLs by title, description, or URL using Levenshtein distance for fuzzy matching.
    Prioritizes matches in the title over matches in description or URL.
    
    Returns URLs sorted by similarity to the query (most similar first).
    """
    from src.services.levenshtein_service import levenshtein_similarity
    
    # Get all user's URLs
    all_urls = repo.get_by_user_with_tags(user_id=current_user.user_id, skip=0, limit=10000)
    
    # Calculate weighted similarity for each URL
    results = []
    for url in all_urls:
        # Calculate similarity for title (weight: 3x)
        title_similarity = levenshtein_similarity(q, url.title)
        
        # Calculate similarity for full text (title + description + URL)
        full_text = f"{url.title} {url.description or ''} {url.url}".strip()
        full_similarity = levenshtein_similarity(q, full_text)
        
        # Weighted score: prioritize title matches heavily
        # If title matches well (>0.5), boost the score significantly
        if title_similarity > 0.5:
            weighted_similarity = title_similarity * 0.7 + full_similarity * 0.3
        else:
            weighted_similarity = title_similarity * 0.4 + full_similarity * 0.6
        
        if weighted_similarity >= threshold:
            results.append((url, weighted_similarity))
    
    # Sort by weighted similarity (highest first)
    results.sort(key=lambda x: x[1], reverse=True)
    
    # Extract URLs and apply limit
    matching_urls = [url for url, similarity in results[:limit]]
    
    return matching_urls


@router.get("/by-user/{user_id}", response_model=List[URL])
def get_urls_by_user(
    user_id: str,
    repo: URLRepository = Depends(get_url_repository)
):
    """Get all URLs owned by a user"""
    return repo.get_by_user(user_id)


@router.get("/by-tag/{tag_id}", response_model=List[URL])
def get_urls_by_tag(
    tag_id: str,
    repo: URLRepository = Depends(get_url_repository)
):
    """Get all URLs with a specific tag"""
    return repo.get_by_tag(tag_id)


@router.get("/{url_id}", response_model=URL)
def get_url(
    url_id: str,
    repo: URLRepository = Depends(get_url_repository)
):
    """Get a URL by ID"""
    url = repo.get_by_id(url_id)
    if not url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"URL with id {url_id} not found"
        )
    return url


@router.get("/{url_id}/tags", response_model=URLWithTags)
def get_url_with_tags(
    url_id: str,
    repo: URLRepository = Depends(get_url_repository)
):
    """Get a URL with all its tags"""
    url = repo.get_with_tags(url_id)
    if not url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"URL with id {url_id} not found"
        )
    return url


@router.put("/{url_id}", response_model=URLWithTags)
def update_url(
    url_id: str,
    url: URLUpdate,
    url_repo: URLRepository = Depends(get_url_repository),
    tag_repo: TagRepository = Depends(get_tag_repository),
    current_user: TokenData = Depends(get_current_active_user)
):
    """Update a URL"""
    # Get the old URL to verify it exists
    old_url = url_repo.get_by_id(url_id)
    if not old_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"URL with id {url_id} not found"
        )
    
    # Update the URL
    updated_url = url_repo.update(url_id, url)
    if not updated_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"URL with id {url_id} not found"
        )
    
    # Return URL with tags
    url_with_tags = url_repo.get_with_tags(url_id)
    if not url_with_tags:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"URL with id {url_id} not found"
        )
    
    return url_with_tags


@router.delete("/{url_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_url(
    url_id: str,
    repo: URLRepository = Depends(get_url_repository)
):
    """Delete a URL"""
    if not repo.delete(url_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"URL with id {url_id} not found"
        )


class BulkDeleteRequest(BaseModel):
    url_ids: List[str]


class BulkDeleteResponse(BaseModel):
    deleted: int
    errors: List[dict]


@router.post("/bulk-delete", response_model=BulkDeleteResponse)
def bulk_delete_urls(
    request: BulkDeleteRequest,
    repo: URLRepository = Depends(get_url_repository),
    current_user: TokenData = Depends(get_current_active_user)
):
    """Delete multiple URLs at once"""
    deleted_count = 0
    errors = []

    for url_id in request.url_ids:
        try:
            # Verify the URL belongs to the current user before deleting
            url = repo.get_by_id(url_id)
            if not url:
                errors.append({
                    "url_id": url_id,
                    "error": "URL not found"
                })
                continue
            
            if url.user_id != current_user.user_id:
                errors.append({
                    "url_id": url_id,
                    "error": "Unauthorized - URL belongs to another user"
                })
                continue
            
            # Delete the URL
            if repo.delete(url_id):
                deleted_count += 1
            else:
                errors.append({
                    "url_id": url_id,
                    "error": "Failed to delete"
                })
        except Exception as e:
            errors.append({
                "url_id": url_id,
                "error": str(e)
            })

    return BulkDeleteResponse(deleted=deleted_count, errors=errors)


@router.post("/{url_id}/tags/{tag_id}", status_code=status.HTTP_201_CREATED)
def add_tag_to_url(
    url_id: str,
    tag_id: str,
    repo: URLRepository = Depends(get_url_repository)
):
    """Add a tag to a URL"""
    if not repo.add_tag(url_id, tag_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="URL or Tag not found"
        )
    return {"message": "Tag added to URL successfully"}


@router.delete("/{url_id}/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_tag_from_url(
    url_id: str,
    tag_id: str,
    repo: URLRepository = Depends(get_url_repository)
):
    """Remove a tag from a URL"""
    if not repo.remove_tag(url_id, tag_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found on this URL"
        )
