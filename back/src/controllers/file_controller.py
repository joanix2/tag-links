from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List
from src.models.file import File, FileCreate, FileUpdate, FileWithTags
from src.repositories.file_repository import FileRepository
from src.database import get_db
from neo4j import Driver

router = APIRouter(prefix="/files", tags=["files"])


def get_file_repository(driver: Driver = Depends(get_db)) -> FileRepository:
    return FileRepository(driver)


@router.post("/", response_model=File, status_code=status.HTTP_201_CREATED)
def create_file(
    file: FileCreate,
    repo: FileRepository = Depends(get_file_repository)
):
    """Create a new file"""
    try:
        return repo.create(file)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User not found: {str(e)}"
        )


@router.get("/", response_model=List[File])
def get_files(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    repo: FileRepository = Depends(get_file_repository)
):
    """Get all files with pagination"""
    return repo.get_all(skip=skip, limit=limit)


@router.get("/by-user/{user_id}", response_model=List[File])
def get_files_by_user(
    user_id: str,
    repo: FileRepository = Depends(get_file_repository)
):
    """Get all files owned by a user"""
    return repo.get_by_user(user_id)


@router.get("/by-tag/{tag_id}", response_model=List[File])
def get_files_by_tag(
    tag_id: str,
    repo: FileRepository = Depends(get_file_repository)
):
    """Get all files with a specific tag"""
    return repo.get_by_tag(tag_id)


@router.get("/{file_id}", response_model=File)
def get_file(
    file_id: str,
    repo: FileRepository = Depends(get_file_repository)
):
    """Get a file by ID"""
    file = repo.get_by_id(file_id)
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File with id {file_id} not found"
        )
    return file


@router.get("/{file_id}/tags", response_model=FileWithTags)
def get_file_with_tags(
    file_id: str,
    repo: FileRepository = Depends(get_file_repository)
):
    """Get a file with all its tags"""
    file = repo.get_with_tags(file_id)
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File with id {file_id} not found"
        )
    return file


@router.put("/{file_id}", response_model=File)
def update_file(
    file_id: str,
    file: FileUpdate,
    repo: FileRepository = Depends(get_file_repository)
):
    """Update a file"""
    updated_file = repo.update(file_id, file)
    if not updated_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File with id {file_id} not found"
        )
    return updated_file


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(
    file_id: str,
    repo: FileRepository = Depends(get_file_repository)
):
    """Delete a file"""
    if not repo.delete(file_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File with id {file_id} not found"
        )


@router.post("/{file_id}/tags/{tag_id}", status_code=status.HTTP_201_CREATED)
def add_tag_to_file(
    file_id: str,
    tag_id: str,
    repo: FileRepository = Depends(get_file_repository)
):
    """Add a tag to a file"""
    if not repo.add_tag(file_id, tag_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File or Tag not found"
        )
    return {"message": "Tag added to file successfully"}


@router.delete("/{file_id}/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_tag_from_file(
    file_id: str,
    tag_id: str,
    repo: FileRepository = Depends(get_file_repository)
):
    """Remove a tag from a file"""
    if not repo.remove_tag(file_id, tag_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found on this file"
        )
