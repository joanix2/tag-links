from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List
from src.models.url import URL, URLCreate, URLUpdate, URLWithTags
from src.repositories.url_repository import URLRepository
from src.repositories.tag_repository import TagRepository
from src.database import get_db
from src.auth import get_current_active_user, TokenData
from src.services.levenshtein_service import search_by_similarity
from neo4j import Driver
from pydantic import BaseModel

router = APIRouter(prefix="/urls", tags=["urls"])


def get_url_repository(driver: Driver = Depends(get_db)) -> URLRepository:
    return URLRepository(driver)


def get_tag_repository(driver: Driver = Depends(get_db)) -> TagRepository:
    return TagRepository(driver)


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
    """Import multiple URLs from CSV data"""
    success_count = 0
    errors = []

    # Get all user's tags once
    user_tags = tag_repo.get_all_by_user(current_user.user_id)
    tag_map = {tag.name.lower(): tag.id for tag in user_tags}

    for idx, link_data in enumerate(request.links):
        try:
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
                    new_tag = tag_repo.create(TagCreate(
                        name=tag_name,
                        color=random.choice(colors),
                        user_id=current_user.user_id
                    ))
                    tag_ids.append(new_tag.id)
                    tag_map[tag_name_lower] = new_tag.id

            # Parse created_at if provided
            created_at = None
            if link_data.created_at:
                try:
                    from datetime import datetime
                    # Try to parse ISO format date
                    created_at = datetime.fromisoformat(link_data.created_at.replace('Z', '+00:00'))
                except (ValueError, AttributeError):
                    # If parsing fails, use None (will use current datetime)
                    pass

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
            errors.append({
                "line": idx + 1,
                "error": str(e)
            })

    return BulkImportResponse(success=success_count, errors=errors)


@router.post("/", response_model=URL, status_code=status.HTTP_201_CREATED)
def create_url(
    url: URLCreate,
    repo: URLRepository = Depends(get_url_repository),
    current_user: TokenData = Depends(get_current_active_user)
):
    """Create a new URL linked to the authenticated user"""
    # Override user_id with the authenticated user's ID
    url.user_id = current_user.user_id
    try:
        return repo.create(url)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Failed to create URL: {str(e)}"
        )


@router.get("/", response_model=List[URLWithTags])
def get_urls(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    repo: URLRepository = Depends(get_url_repository),
    current_user: TokenData = Depends(get_current_active_user)
):
    """Get all URLs for the authenticated user with pagination"""
    return repo.get_by_user_with_tags(user_id=current_user.user_id, skip=skip, limit=limit)


@router.get("/search/", response_model=List[URLWithTags])
def search_urls(
    q: str = Query(..., min_length=1, description="Search query"),
    threshold: float = Query(0.3, ge=0.0, le=1.0, description="Minimum similarity threshold (0.0 to 1.0)"),
    limit: int = Query(100, ge=1, le=1000),
    repo: URLRepository = Depends(get_url_repository),
    current_user: TokenData = Depends(get_current_active_user)
):
    """
    Search URLs by title, description, or URL using Levenshtein distance for fuzzy matching.
    
    Returns URLs sorted by similarity to the query (most similar first).
    """
    # Get all user's URLs
    all_urls = repo.get_by_user_with_tags(user_id=current_user.user_id, skip=0, limit=1000)
    
    # Prepare items for similarity search: (searchable_text, url_object)
    items = []
    for url in all_urls:
        # Combine title, description, and URL for searching
        searchable_text = f"{url.title} {url.description or ''} {url.url}".strip()
        items.append((searchable_text, url))
    
    # Search using Levenshtein distance
    results = search_by_similarity(q, items, threshold=threshold)
    
    # Extract URLs from results and apply limit
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


@router.put("/{url_id}", response_model=URL)
def update_url(
    url_id: str,
    url: URLUpdate,
    repo: URLRepository = Depends(get_url_repository)
):
    """Update a URL"""
    updated_url = repo.update(url_id, url)
    if not updated_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"URL with id {url_id} not found"
        )
    return updated_url


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
