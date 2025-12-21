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
from src.database import get_driver

router = APIRouter(prefix="/auth", tags=["Authentication"])


def get_user_repository():
    """Dependency to get user repository"""
    driver = get_driver()
    return UserRepository(driver)


@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
async def register(
    user: UserCreate,
    user_repo: UserRepository = Depends(get_user_repository)
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
    return new_user


@router.post("/login", response_model=Token)
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
