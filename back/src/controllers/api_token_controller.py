"""
API Token controller for managing user API tokens
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from src.models.api_token import APIToken, APITokenCreate
from src.repositories.api_token_repository import APITokenRepository
from src.database import get_driver
from src.auth import get_current_active_user, TokenData

router = APIRouter(prefix="/api-tokens", tags=["API Tokens"])


def get_token_repository():
    """Dependency to get token repository"""
    driver = get_driver()
    return APITokenRepository(driver)


@router.post("/", response_model=APIToken, status_code=status.HTTP_201_CREATED)
async def create_api_token(
    token_data: APITokenCreate,
    current_user: TokenData = Depends(get_current_active_user),
    token_repo: APITokenRepository = Depends(get_token_repository)
):
    """
    Create a new API token for the current user
    The token is only shown once - save it securely!
    """
    # Set user_id from current user
    token_data.user_id = current_user.user_id
    
    api_token, plain_token = token_repo.create(token_data)
    
    # Return the token with the plain value (only time it's shown)
    api_token.token = plain_token
    
    return api_token


@router.get("/", response_model=List[APIToken])
async def list_api_tokens(
    current_user: TokenData = Depends(get_current_active_user),
    token_repo: APITokenRepository = Depends(get_token_repository)
):
    """Get all API tokens for the current user (tokens are masked)"""
    return token_repo.get_all_by_user(current_user.user_id)


@router.delete("/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_token(
    token_id: str,
    current_user: TokenData = Depends(get_current_active_user),
    token_repo: APITokenRepository = Depends(get_token_repository)
):
    """Delete an API token"""
    deleted = token_repo.delete(token_id, current_user.user_id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API token not found"
        )
    
    return None
