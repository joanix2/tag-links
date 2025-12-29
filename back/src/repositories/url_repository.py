from neo4j import Driver
from neo4j.time import DateTime as Neo4jDateTime
from typing import List, Optional
from datetime import datetime
import uuid
from src.models.url import URL, URLCreate, URLUpdate, URLWithTags, URLWithUser


class URLRepository:
    def __init__(self, driver: Driver):
        self.driver = driver
    
    def create(self, url: URLCreate) -> URL:
        """Create a new URL and link it to tags"""
        with self.driver.session() as session:
            url_id = str(uuid.uuid4())
            
            # Prepare parameters with custom or current datetime
            params = {
                "id": url_id,
                "user_id": url.user_id,
                "url": url.url,
                "title": url.title,
                "description": url.description if url.description and url.description.strip() else None
            }
            
            # Use custom created_at if provided, otherwise use current datetime
            if url.created_at:
                params["created_at"] = url.created_at
                cypher_created_at = "$created_at"
            else:
                cypher_created_at = "datetime()"
            
            # Create URL and link to user
            result = session.run(f"""
                MATCH (u:User {{id: $user_id}})
                CREATE (url:URL {{
                    id: $id,
                    user_id: $user_id,
                    url: $url,
                    title: $title,
                    description: $description,
                    created_at: {cypher_created_at},
                    updated_at: datetime()
                }})
                CREATE (u)-[:OWNS]->(url)
                RETURN url
            """, **params)
            record = result.single()
            if not record:
                raise Exception("Failed to create URL - user not found")
            
            # Link URL to tags if provided
            if url.tag_ids:
                session.run("""
                    MATCH (url:URL {id: $url_id})
                    UNWIND $tag_ids AS tag_id
                    MATCH (t:Tag {id: tag_id})
                    CREATE (url)-[:HAS_TAG]->(t)
                """, url_id=url_id, tag_ids=url.tag_ids)
            
            return self._node_to_url(record["url"])
    
    def get_by_id(self, url_id: str) -> Optional[URL]:
        """Get a URL by ID"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (url:URL {id: $id})
                RETURN url
            """, id=url_id)
            record = result.single()
            if record:
                return self._node_to_url(record["url"])
            return None
    
    def get_all(self, skip: int = 0, limit: int = 100) -> List[URL]:
        """Get all URLs with pagination"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (url:URL)
                RETURN url
                ORDER BY url.created_at DESC
                SKIP $skip
                LIMIT $limit
            """, skip=skip, limit=limit)
            return [self._node_to_url(record["url"]) for record in result]
    
    def get_by_user(self, user_id: str, skip: int = 0, limit: int = 100) -> List[URL]:
        """Get all URLs owned by a user with pagination"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (u:User {id: $user_id})-[:OWNS]->(url:URL)
                RETURN url
                ORDER BY url.created_at DESC
                SKIP $skip
                LIMIT $limit
            """, user_id=user_id, skip=skip, limit=limit)
            return [self._node_to_url(record["url"]) for record in result]
    
    def get_by_url_and_user(self, url: str, user_id: str) -> Optional[URLWithTags]:
        """Get a URL by its URL string and user_id (to check for duplicates)"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (u:User {id: $user_id})-[:OWNS]->(url:URL {url: $url})
                OPTIONAL MATCH (url)-[:HAS_TAG]->(t:Tag)
                RETURN url, collect(t) as tags
            """, url=url, user_id=user_id)
            record = result.single()
            if record:
                url_obj = self._node_to_url(record["url"])
                tags = [self._node_to_tag(tag) for tag in record["tags"] if tag]
                return URLWithTags(**url_obj.model_dump(), tags=tags)
            return None
    
    def _node_to_tag(self, node):
        """Convert a Neo4j Tag node to Tag model"""
        from src.models.tag import Tag
        return Tag(
            id=node["id"],
            name=node["name"],
            color=node["color"],
            description=node.get("description"),
            user_id=node["user_id"]
        )
    
    def get_by_user_with_tags(self, user_id: str, skip: int = 0, limit: int = 100) -> List[URLWithTags]:
        """Get all URLs owned by a user with their tags"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (u:User {id: $user_id})-[:OWNS]->(url:URL)
                OPTIONAL MATCH (url)-[:HAS_TAG]->(tag:Tag)
                RETURN url, collect(tag) as tags
                ORDER BY url.created_at DESC
                SKIP $skip
                LIMIT $limit
            """, user_id=user_id, skip=skip, limit=limit)
            
            urls_with_tags = []
            for record in result:
                url = self._node_to_url(record["url"])
                tags = [self._node_to_tag(t) for t in record["tags"] if t]
                urls_with_tags.append(URLWithTags(**url.model_dump(), tags=tags))
            
            return urls_with_tags

    def count_by_user(self, user_id: str) -> int:
        """Count total URLs owned by a user"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (u:User {id: $user_id})-[:OWNS]->(url:URL)
                RETURN count(url) as total
            """, user_id=user_id)
            record = result.single()
            return record["total"] if record else 0

    
    def update(self, url_id: str, url: URLUpdate) -> Optional[URL]:
        """Update a URL"""
        updates = []
        params = {"id": url_id}
        
        if url.url is not None:
            updates.append("u.url = $url")
            params["url"] = url.url
        if url.title is not None:
            updates.append("u.title = $title")
            params["title"] = url.title
        if url.description is not None:
            updates.append("u.description = $description")
            # Convert empty string to None to clear the description
            params["description"] = url.description if url.description.strip() else None
        
        if not updates and url.tag_ids is None:
            return self.get_by_id(url_id)
        
        updates.append("u.updated_at = datetime()")
        
        with self.driver.session() as session:
            # Update URL properties
            result = session.run(f"""
                MATCH (u:URL {{id: $id}})
                SET {', '.join(updates)}
                RETURN u
            """, **params)
            record = result.single()
            if not record:
                return None
            
            # Update tags if provided
            if url.tag_ids is not None:
                # First, remove all existing tag relationships
                session.run("""
                    MATCH (u:URL {id: $url_id})-[r:HAS_TAG]->()
                    DELETE r
                """, url_id=url_id)
                
                # Then, create new tag relationships
                if url.tag_ids:
                    session.run("""
                        MATCH (u:URL {id: $url_id})
                        UNWIND $tag_ids AS tag_id
                        MATCH (t:Tag {id: tag_id})
                        CREATE (u)-[:HAS_TAG]->(t)
                    """, url_id=url_id, tag_ids=url.tag_ids)
            
            return self._node_to_url(record["u"])
    
    
    def delete(self, url_id: str) -> bool:
        """Delete a URL"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (url:URL {id: $id})
                DETACH DELETE url
                RETURN count(url) as deleted
            """, id=url_id)
            record = result.single()
            return record["deleted"] > 0
    
    def add_tag(self, url_id: str, tag_id: str) -> bool:
        """Add a tag to a URL"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (url:URL {id: $url_id})
                MATCH (tag:Tag {id: $tag_id})
                MERGE (url)-[:HAS_TAG]->(tag)
                RETURN url
            """, url_id=url_id, tag_id=tag_id)
            return result.single() is not None
    
    def remove_tag(self, url_id: str, tag_id: str) -> bool:
        """Remove a tag from a URL"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (url:URL {id: $url_id})-[r:HAS_TAG]->(tag:Tag {id: $tag_id})
                DELETE r
                RETURN count(r) as deleted
            """, url_id=url_id, tag_id=tag_id)
            record = result.single()
            return record["deleted"] > 0
    
    def get_with_tags(self, url_id: str) -> Optional[URLWithTags]:
        """Get a URL with all its tags"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (url:URL {id: $id})
                OPTIONAL MATCH (url)-[:HAS_TAG]->(tag:Tag)
                RETURN url, collect(tag) as tags
            """, id=url_id)
            
            record = result.single()
            if not record:
                return None
            
            url = self._node_to_url(record["url"])
            
            return URLWithTags(
                **url.model_dump(),
                tags=[self._node_to_tag(t) for t in record["tags"] if t]
            )
    
    def get_by_tag(self, tag_id: str) -> List[URL]:
        """Get all URLs with a specific tag"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (url:URL)-[:HAS_TAG]->(tag:Tag {id: $tag_id})
                RETURN url
                ORDER BY url.created_at DESC
            """, tag_id=tag_id)
            return [self._node_to_url(record["url"]) for record in result]
    
    def get_by_user_and_tag_name(self, user_id: str, tag_name: str, skip: int = 0, limit: int = 1000) -> List[URLWithTags]:
        """Get all URLs owned by a user with a specific tag name"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (u:User {id: $user_id})-[:OWNS]->(url:URL)-[:HAS_TAG]->(tag:Tag {name: $tag_name})
                OPTIONAL MATCH (url)-[:HAS_TAG]->(all_tags:Tag)
                WITH url, collect(DISTINCT all_tags) as tags
                RETURN url, tags
                ORDER BY url.created_at DESC
                SKIP $skip
                LIMIT $limit
            """, user_id=user_id, tag_name=tag_name, skip=skip, limit=limit)
            
            urls_with_tags = []
            for record in result:
                url = self._node_to_url(record["url"])
                tags = [self._node_to_tag(t) for t in record["tags"] if t]
                urls_with_tags.append(URLWithTags(**url.model_dump(), tags=tags))
            
            return urls_with_tags
    
    def get_by_user_and_tag_names(self, user_id: str, tag_names: List[str], skip: int = 0, limit: int = 1000) -> List[URLWithTags]:
        """Get all URLs owned by a user that have ALL specified tags (AND logic)"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (u:User {id: $user_id})-[:OWNS]->(url:URL)
                WHERE ALL(tag_name IN $tag_names 
                    WHERE EXISTS((url)-[:HAS_TAG]->(:Tag {name: tag_name})))
                OPTIONAL MATCH (url)-[:HAS_TAG]->(all_tags:Tag)
                WITH url, collect(DISTINCT all_tags) as tags
                RETURN url, tags
                ORDER BY url.created_at DESC
                SKIP $skip
                LIMIT $limit
            """, user_id=user_id, tag_names=tag_names, skip=skip, limit=limit)
            
            urls_with_tags = []
            for record in result:
                url = self._node_to_url(record["url"])
                tags = [self._node_to_tag(t) for t in record["tags"] if t]
                urls_with_tags.append(URLWithTags(**url.model_dump(), tags=tags))
            
            return urls_with_tags
    
    @staticmethod
    def _node_to_url(node) -> URL:
        """Convert Neo4j node to URL model"""
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
            user_id=node["user_id"],
            name=node["name"],
            description=node.get("description"),
            color=node.get("color"),
            created_at=created_at,
            updated_at=updated_at
        )
