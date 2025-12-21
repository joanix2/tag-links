from .tag_controller import router as tag_router
from .user_controller import router as user_router
from .url_controller import router as url_router
from .file_controller import router as file_router

__all__ = ["tag_router", "user_router", "url_router", "file_router"]
