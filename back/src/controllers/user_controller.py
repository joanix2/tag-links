from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List
from src.models.user import User, UserCreate, UserUpdate, UserWithContent
from src.repositories.user_repository import UserRepository
from src.database import get_db
from neo4j import Driver

router = APIRouter(prefix="/users", tags=["users"])


def get_user_repository(driver: Driver = Depends(get_db)) -> UserRepository:
    return UserRepository(driver)


@router.post("/", response_model=User, status_code=status.HTTP_201_CREATED)
def create_user(
    user: UserCreate,
    repo: UserRepository = Depends(get_user_repository)
):
    """Create a new user"""
    # Check if username already exists
    existing = repo.get_by_username(user.username)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Username '{user.username}' already exists"
        )
    return repo.create(user)


@router.get("/", response_model=List[User])
def get_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    repo: UserRepository = Depends(get_user_repository)
):
    """Get all users with pagination"""
    return repo.get_all(skip=skip, limit=limit)


@router.get("/{user_id}", response_model=User)
def get_user(
    user_id: str,
    repo: UserRepository = Depends(get_user_repository)
):
    """Get a user by ID"""
    user = repo.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )
    return user


@router.get("/{user_id}/content", response_model=UserWithContent)
def get_user_with_content(
    user_id: str,
    repo: UserRepository = Depends(get_user_repository)
):
    """Get a user with all their URLs and Files"""
    user = repo.get_with_content(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )
    return user


@router.put("/{user_id}", response_model=User)
def update_user(
    user_id: str,
    user: UserUpdate,
    repo: UserRepository = Depends(get_user_repository)
):
    """Update a user"""
    updated_user = repo.update(user_id, user)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )
    return updated_user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: str,
    repo: UserRepository = Depends(get_user_repository)
):
    """Delete a user and all their content"""
    if not repo.delete(user_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )
