"""
Public API controller - endpoints accessible with API token
"""
from fastapi import APIRouter, Depends, HTTPException, status, Header
from typing import List, Optional
from src.models.url import URL, URLWithTags
from src.repositories.url_repository import URLRepository
from src.repositories.tag_repository import TagRepository
from src.database import get_driver
from src.auth import get_user_from_api_token

router = APIRouter(prefix="/public", tags=["Public API"])


def get_url_repository():
    driver = get_driver()
    return URLRepository(driver)


def get_tag_repository():
    driver = get_driver()
    return TagRepository(driver)


async def verify_api_token(authorization: Optional[str] = Header(None)) -> str:
    """Dependency to verify API token and get user_id"""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = await get_user_from_api_token(authorization)
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user_id


@router.get("/links", response_model=List[URLWithTags])
async def get_links_by_tag(
    tags: Optional[str] = None,
    user_id: str = Depends(verify_api_token),
    url_repo: URLRepository = Depends(get_url_repository),
    tag_repo: TagRepository = Depends(get_tag_repository)
):
    """
    Get all links for the authenticated user, optionally filtered by tag names
    
    Authentication: Bearer token (API token)
    
    Query parameters:
    - tags: Filter by tag names, comma-separated for multiple tags (e.g., "Partage" or "Favoris,Development")
            When multiple tags are provided, returns links that have ALL specified tags (AND logic)
    
    Examples:
    ```
    # Get all links
    curl -H "Authorization: Bearer YOUR_API_TOKEN" \
         "http://localhost:8000/api/public/links"
    
    # Get links with "Partage" tag
    curl -H "Authorization: Bearer YOUR_API_TOKEN" \
         "http://localhost:8000/api/public/links?tags=Partage"
    
    # Get links with both "Partage" AND "Development" tags
    curl -H "Authorization: Bearer YOUR_API_TOKEN" \
         "http://localhost:8000/api/public/links?tags=Partage,Development"
    ```
    """
    if tags:
        # Split tags by comma and strip whitespace
        tag_list = [t.strip() for t in tags.split(',') if t.strip()]
        
        if len(tag_list) == 1:
            # Single tag filter
            return url_repo.get_by_user_and_tag_name(user_id, tag_list[0])
        else:
            # Multiple tags filter (AND logic)
            return url_repo.get_by_user_and_tag_names(user_id, tag_list)
    else:
        # Return all URLs for the user
        return url_repo.get_by_user_with_tags(user_id)


@router.get("/links/{link_id}", response_model=URLWithTags)
async def get_link(
    link_id: str,
    user_id: str = Depends(verify_api_token),
    url_repo: URLRepository = Depends(get_url_repository)
):
    """
    Get a specific link by ID
    
    Authentication: Bearer token (API token)
    """
    url = url_repo.get_with_tags(link_id)
    
    if not url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Link not found"
        )
    
    # Verify the link belongs to the authenticated user
    if url.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return url
