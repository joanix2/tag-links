from neo4j import Driver
from neo4j.time import DateTime as Neo4jDateTime
from typing import List, Optional
from datetime import datetime
import uuid
from src.models.user import User, UserCreate, UserUpdate, UserWithContent, UserInDB
from src.auth import get_password_hash


class UserRepository:
    def __init__(self, driver: Driver):
        self.driver = driver
    
    def create(self, user: UserCreate) -> User:
        """Create a new user with hashed password"""
        hashed_password = get_password_hash(user.password)
        
        with self.driver.session() as session:
            result = session.run("""
                CREATE (u:User {
                    id: $id,
                    username: $username,
                    email: $email,
                    full_name: $full_name,
                    hashed_password: $hashed_password,
                    is_active: true,
                    created_at: datetime(),
                    updated_at: datetime()
                })
                RETURN u
            """, 
                id=str(uuid.uuid4()),
                username=user.username,
                email=user.email,
                full_name=user.full_name,
                hashed_password=hashed_password
            )
            record = result.single()
            return self._node_to_user(record["u"])
    
    def get_by_id(self, user_id: str) -> Optional[User]:
        """Get a user by ID"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (u:User {id: $id})
                RETURN u
            """, id=user_id)
            record = result.single()
            if record:
                return self._node_to_user(record["u"])
            return None
    
    def get_by_username(self, username: str) -> Optional[User]:
        """Get a user by username"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (u:User {username: $username})
                RETURN u
            """, username=username)
            record = result.single()
            if record:
                return self._node_to_user(record["u"])
            return None
    
    def get_all(self, skip: int = 0, limit: int = 100) -> List[User]:
        """Get all users with pagination"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (u:User)
                RETURN u
                ORDER BY u.username
                SKIP $skip
                LIMIT $limit
            """, skip=skip, limit=limit)
            return [self._node_to_user(record["u"]) for record in result]
    
    def update(self, user_id: str, user: UserUpdate) -> Optional[User]:
        """Update a user"""
        updates = []
        params = {"id": user_id}
        
        if user.username is not None:
            updates.append("u.username = $username")
            params["username"] = user.username
        if user.email is not None:
            updates.append("u.email = $email")
            params["email"] = user.email
        if user.full_name is not None:
            updates.append("u.full_name = $full_name")
            params["full_name"] = user.full_name
        if user.password is not None:
            updates.append("u.password_hash = $password")
            params["password"] = user.password  # TODO: Hash in production!
        
        if not updates:
            return self.get_by_id(user_id)
        
        updates.append("u.updated_at = datetime()")
        
        with self.driver.session() as session:
            result = session.run(f"""
                MATCH (u:User {{id: $id}})
                SET {', '.join(updates)}
                RETURN u
            """, **params)
            record = result.single()
            if record:
                return self._node_to_user(record["u"])
            return None
    
    def delete(self, user_id: str) -> bool:
        """Delete a user and all their content"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (u:User {id: $id})
                DETACH DELETE u
                RETURN count(u) as deleted
            """, id=user_id)
            record = result.single()
            return record["deleted"] > 0
    
    def get_with_content(self, user_id: str) -> Optional[UserWithContent]:
        """Get a user with all their URLs and Files"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (u:User {id: $id})
                OPTIONAL MATCH (u)-[:OWNS]->(url:URL)
                OPTIONAL MATCH (u)-[:OWNS]->(file:File)
                RETURN u,
                    collect(DISTINCT url) as urls,
                    collect(DISTINCT file) as files
            """, id=user_id)
            
            record = result.single()
            if not record:
                return None
            
            user = self._node_to_user(record["u"])
            
            return UserWithContent(
                **user.model_dump(),
                urls=[self._node_to_url(url) for url in record["urls"] if url],
                files=[self._node_to_file(file) for file in record["files"] if file]
            )
    
    def get_user_with_password(self, username: str) -> Optional[UserInDB]:
        """Get user with hashed password for authentication"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (u:User {username: $username})
                RETURN u
            """, username=username)
            record = result.single()
            if record:
                return self._node_to_user_with_password(record["u"])
            return None
    
    @staticmethod
    def _node_to_user(node):
        """Convert Neo4j node to User model"""
        created_at = node["created_at"]
        if isinstance(created_at, Neo4jDateTime):
            created_at = created_at.to_native()
        
        updated_at = node["updated_at"]
        if isinstance(updated_at, Neo4jDateTime):
            updated_at = updated_at.to_native()
        
        return User(
            id=node["id"],
            username=node["username"],
            email=node.get("email"),
            full_name=node.get("full_name"),
            is_active=node.get("is_active", True),
            created_at=created_at,
            updated_at=updated_at
        )
    
    @staticmethod
    def _node_to_user_with_password(node):
        """Convert Neo4j node to UserInDB model (with password)"""
        created_at = node["created_at"]
        if isinstance(created_at, Neo4jDateTime):
            created_at = created_at.to_native()
        
        updated_at = node["updated_at"]
        if isinstance(updated_at, Neo4jDateTime):
            updated_at = updated_at.to_native()
        
        return UserInDB(
            id=node["id"],
            username=node["username"],
            email=node.get("email"),
            full_name=node.get("full_name"),
            is_active=node.get("is_active", True),
            hashed_password=node["hashed_password"],
            created_at=created_at,
            updated_at=updated_at
        )
    
    @staticmethod
    def _node_to_url(node):
        """Convert Neo4j node to URL model"""
        from src.models.url import URL
        
        created_at = node["created_at"]
        if isinstance(created_at, Neo4jDateTime):
            created_at = created_at.to_native()
        
        updated_at = node["updated_at"]
        if isinstance(updated_at, Neo4jDateTime):
            updated_at = updated_at.to_native()
        
        return URL(
            id=node["id"],
            user_id=node["user_id"],
            url=node["url"],
            title=node.get("title"),
            description=node.get("description"),
            created_at=created_at,
            updated_at=updated_at
        )
    
    @staticmethod
    def _node_to_file(node):
        """Convert Neo4j node to File model"""
        from src.models.file import File
        
        created_at = node["created_at"]
        if isinstance(created_at, Neo4jDateTime):
            created_at = created_at.to_native()
        
        updated_at = node["updated_at"]
        if isinstance(updated_at, Neo4jDateTime):
            updated_at = updated_at.to_native()
        
        return File(
            id=node["id"],
            user_id=node["user_id"],
            filename=node["filename"],
            file_path=node["file_path"],
            file_type=node.get("file_type"),
            file_size=node.get("file_size"),
            description=node.get("description"),
            created_at=created_at,
            updated_at=updated_at
        )
