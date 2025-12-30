"""Service for handling image uploads and processing"""
import os
import uuid
from pathlib import Path
from typing import Optional
from PIL import Image
from fastapi import UploadFile, HTTPException
import io

class ImageService:
    def __init__(self, base_path: str = "assets/profile_pictures"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
        
        # Image constraints
        self.output_size = (256, 256)  # Output dimensions (square)
        self.allowed_extensions = {'.jpg', '.jpeg', '.png', '.webp'}
        self.max_file_size = 5 * 1024 * 1024  # 5MB
    
    def validate_image(self, file: UploadFile) -> None:
        """Validate uploaded image file"""
        # Check file extension
        ext = Path(file.filename or "").suffix.lower()
        if ext not in self.allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed types: {', '.join(self.allowed_extensions)}"
            )
    
    async def save_profile_picture(self, file: UploadFile, user_id: str) -> str:
        """
        Save and resize profile picture
        Returns the filename (relative path)
        """
        self.validate_image(file)
        
        # Read file content
        content = await file.read()
        
        # Check file size
        if len(content) > self.max_file_size:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Max size: {self.max_file_size // (1024*1024)}MB"
            )
        
        # Generate unique filename
        ext = Path(file.filename or "").suffix.lower()
        filename = f"{user_id}_{uuid.uuid4().hex[:8]}{ext}"
        filepath = self.base_path / filename
        
        try:
            # Open and resize image
            image = Image.open(io.BytesIO(content))
            
            # Convert to RGB if necessary (for PNG with transparency)
            if image.mode in ('RGBA', 'LA', 'P'):
                # Create white background
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = background
            
            # Crop to square (center crop)
            width, height = image.size
            min_dimension = min(width, height)
            
            # Calculate crop box to get center square
            left = (width - min_dimension) // 2
            top = (height - min_dimension) // 2
            right = left + min_dimension
            bottom = top + min_dimension
            
            image = image.crop((left, top, right, bottom))
            
            # Resize to output size
            image = image.resize(self.output_size, Image.Resampling.LANCZOS)
            
            # Save as JPEG for consistency
            output_filename = f"{user_id}_{uuid.uuid4().hex[:8]}.jpg"
            output_filepath = self.base_path / output_filename
            image.save(output_filepath, 'JPEG', quality=85, optimize=True)
            
            return f"profile_pictures/{output_filename}"
            
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to process image: {str(e)}"
            )
    
    def delete_profile_picture(self, filename: Optional[str]) -> bool:
        """Delete a profile picture file"""
        if not filename:
            return False
        
        try:
            # Remove 'profile_pictures/' prefix if present
            if filename.startswith('profile_pictures/'):
                filename = filename.replace('profile_pictures/', '')
            
            filepath = self.base_path / filename
            if filepath.exists():
                filepath.unlink()
                return True
        except Exception as e:
            print(f"Error deleting profile picture: {e}")
        
        return False
    
    def get_profile_picture_path(self, filename: Optional[str]) -> Optional[Path]:
        """Get full path to profile picture"""
        if not filename:
            return None
        
        # Remove 'profile_pictures/' prefix if present
        if filename.startswith('profile_pictures/'):
            filename = filename.replace('profile_pictures/', '')
        
        filepath = self.base_path / filename
        if filepath.exists():
            return filepath
        
        return None


# Singleton instance
_image_service = ImageService()

def get_image_service() -> ImageService:
    """Get the image service instance"""
    return _image_service
