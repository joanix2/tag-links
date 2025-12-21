from neo4j import Driver
from neo4j.time import DateTime as Neo4jDateTime
from typing import List, Optional
from datetime import datetime
import uuid
from src.models.file import File, FileCreate, FileUpdate, FileWithTags, FileWithUser


class FileRepository:
    def __init__(self, driver: Driver):
        self.driver = driver
    
    def create(self, file: FileCreate) -> File:
        """Create a new file"""
        with self.driver.session() as session:
            # Create file and link to user
            result = session.run("""
                MATCH (u:User {id: $user_id})
                CREATE (f:File {
                    id: $id,
                    user_id: $user_id,
                    filename: $filename,
                    file_path: $file_path,
                    file_type: $file_type,
                    file_size: $file_size,
                    description: $description,
                    created_at: datetime(),
                    updated_at: datetime()
                })
                CREATE (u)-[:OWNS]->(f)
                RETURN f
            """, 
                id=str(uuid.uuid4()),
                user_id=file.user_id,
                filename=file.filename,
                file_path=file.file_path,
                file_type=file.file_type,
                file_size=file.file_size,
                description=file.description
            )
            record = result.single()
            if record:
                return self._node_to_file(record["f"])
            raise Exception("Failed to create File - user not found")
    
    def get_by_id(self, file_id: str) -> Optional[File]:
        """Get a file by ID"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (f:File {id: $id})
                RETURN f
            """, id=file_id)
            record = result.single()
            if record:
                return self._node_to_file(record["f"])
            return None
    
    def get_all(self, skip: int = 0, limit: int = 100) -> List[File]:
        """Get all files with pagination"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (f:File)
                RETURN f
                ORDER BY f.created_at DESC
                SKIP $skip
                LIMIT $limit
            """, skip=skip, limit=limit)
            return [self._node_to_file(record["f"]) for record in result]
    
    def get_by_user(self, user_id: str) -> List[File]:
        """Get all files owned by a user"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (u:User {id: $user_id})-[:OWNS]->(f:File)
                RETURN f
                ORDER BY f.created_at DESC
            """, user_id=user_id)
            return [self._node_to_file(record["f"]) for record in result]
    
    def update(self, file_id: str, file: FileUpdate) -> Optional[File]:
        """Update a file"""
        updates = []
        params = {"id": file_id}
        
        if file.filename is not None:
            updates.append("f.filename = $filename")
            params["filename"] = file.filename
        if file.description is not None:
            updates.append("f.description = $description")
            params["description"] = file.description
        
        if not updates:
            return self.get_by_id(file_id)
        
        updates.append("f.updated_at = datetime()")
        
        with self.driver.session() as session:
            result = session.run(f"""
                MATCH (f:File {{id: $id}})
                SET {', '.join(updates)}
                RETURN f
            """, **params)
            record = result.single()
            if record:
                return self._node_to_file(record["f"])
            return None
    
    def delete(self, file_id: str) -> bool:
        """Delete a file"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (f:File {id: $id})
                DETACH DELETE f
                RETURN count(f) as deleted
            """, id=file_id)
            record = result.single()
            return record["deleted"] > 0
    
    def add_tag(self, file_id: str, tag_id: str) -> bool:
        """Add a tag to a file"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (f:File {id: $file_id})
                MATCH (tag:Tag {id: $tag_id})
                MERGE (f)-[:HAS_TAG]->(tag)
                RETURN f
            """, file_id=file_id, tag_id=tag_id)
            return result.single() is not None
    
    def remove_tag(self, file_id: str, tag_id: str) -> bool:
        """Remove a tag from a file"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (f:File {id: $file_id})-[r:HAS_TAG]->(tag:Tag {id: $tag_id})
                DELETE r
                RETURN count(r) as deleted
            """, file_id=file_id, tag_id=tag_id)
            record = result.single()
            return record["deleted"] > 0
    
    def get_with_tags(self, file_id: str) -> Optional[FileWithTags]:
        """Get a file with all its tags"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (f:File {id: $id})
                OPTIONAL MATCH (f)-[:HAS_TAG]->(tag:Tag)
                RETURN f, collect(tag) as tags
            """, id=file_id)
            
            record = result.single()
            if not record:
                return None
            
            file = self._node_to_file(record["f"])
            
            return FileWithTags(
                **file.model_dump(),
                tags=[self._node_to_tag(t) for t in record["tags"] if t]
            )
    
    def get_by_tag(self, tag_id: str) -> List[File]:
        """Get all files with a specific tag"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (f:File)-[:HAS_TAG]->(tag:Tag {id: $tag_id})
                RETURN f
                ORDER BY f.created_at DESC
            """, tag_id=tag_id)
            return [self._node_to_file(record["f"]) for record in result]
    
    @staticmethod
    def _node_to_file(node) -> File:
        """Convert Neo4j node to File model"""
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
    
    @staticmethod
    def _node_to_tag(node):
        """Convert Neo4j node to Tag model"""
        from src.models.tag import Tag
        
        created_at = node["created_at"]
        if isinstance(created_at, Neo4jDateTime):
            created_at = created_at.to_native()
        
        updated_at = node["updated_at"]
        if isinstance(updated_at, Neo4jDateTime):
            updated_at = updated_at.to_native()
        
        return Tag(
            id=node["id"],
            name=node["name"],
            description=node.get("description"),
            color=node.get("color"),
            created_at=created_at,
            updated_at=updated_at
        )
