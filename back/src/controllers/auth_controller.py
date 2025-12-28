"""
Authentication controller for login and registration
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from src.auth import (
    verify_password,
    create_access_token,
    get_current_active_user,
    Token,
    TokenData,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from src.models.user import UserCreate, User
from src.repositories.user_repository import UserRepository
from src.repositories.tag_repository import TagRepository
from src.database import get_driver
from src.models.url import DOCUMENT_TYPES

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Color for document type tags
DOCUMENT_TYPE_TAG_COLOR = "#92400E"


def get_user_repository():
    """Dependency to get user repository"""
    driver = get_driver()
    return UserRepository(driver)


def get_tag_repository():
    """Dependency to get tag repository"""
    driver = get_driver()
    return TagRepository(driver)


def initialize_document_type_tags(user_id: str, tag_repo: TagRepository):
    """Create all document type tags for a new user"""
    from src.models.tag import TagCreate
    
    # Get existing tags to avoid duplicates
    existing_tags = tag_repo.get_all_by_user(user_id)
    existing_tag_names = {tag.name for tag in existing_tags}
    
    # Create missing document type tags
    for doc_type in DOCUMENT_TYPES:
        if doc_type not in existing_tag_names:
            tag_repo.create(TagCreate(
                name=doc_type,
                description=f"Type de document : {doc_type}",
                color=DOCUMENT_TYPE_TAG_COLOR,
                user_id=user_id
            ))


@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
async def register(
    user: UserCreate,
    user_repo: UserRepository = Depends(get_user_repository),
    tag_repo: TagRepository = Depends(get_tag_repository)
):
    """Register a new user"""
    # Check if username already exists
    existing_user = user_repo.get_by_username(user.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Create the user
    new_user = user_repo.create(user)
    
    # Initialize document type tags for the new user
    initialize_document_type_tags(new_user.id, tag_repo)
    
    return new_user


@router.post("/token", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    user_repo: UserRepository = Depends(get_user_repository)
):
    """Login and get JWT token"""
    # Get user with password
    user = user_repo.get_user_with_password(form_data.username)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=User)
async def read_users_me(
    current_user: TokenData = Depends(get_current_active_user),
    user_repo: UserRepository = Depends(get_user_repository)
):
    """Get current user information"""
    user = user_repo.get_by_id(current_user.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user
