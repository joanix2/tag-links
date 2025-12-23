from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from src.config import get_settings
from src.database import neo4j_connection, init_constraints
from src.controllers import tag_router, user_router, url_router, file_router
from src.controllers.auth_controller import router as auth_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting up...")
    neo4j_connection.connect()
    if neo4j_connection.verify_connectivity():
        print("✓ Connected to Neo4j successfully")
        init_constraints()
    else:
        print("✗ Failed to connect to Neo4j")
    
    yield
    
    # Shutdown
    print("Shutting down...")
    neo4j_connection.close()
    print("✓ Neo4j connection closed")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with /api prefix
app.include_router(auth_router, prefix="/api")
app.include_router(tag_router, prefix="/api")
app.include_router(user_router, prefix="/api")
app.include_router(url_router, prefix="/api")
app.include_router(file_router, prefix="/api")


@app.get("/")
def read_root():
    return {
        "message": "Welcome to TagLink API",
        "version": settings.APP_VERSION,
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    is_connected = neo4j_connection.verify_connectivity()
    return {
        "status": "healthy" if is_connected else "unhealthy",
        "neo4j": "connected" if is_connected else "disconnected"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
