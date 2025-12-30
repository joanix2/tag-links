from neo4j import Driver
from neo4j.time import DateTime as Neo4jDateTime
from typing import List, Optional
from datetime import datetime
import uuid
from src.models.tag import Tag, TagCreate, TagUpdate, TagWithRelations


class TagRepository:
    def __init__(self, driver: Driver):
        self.driver = driver
    
    def get_by_name_and_user(self, name: str, user_id: str) -> Optional[Tag]:
        """Get a tag by name and user ID"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (u:User {id: $user_id})-[:OWNS]->(t:Tag)
                WHERE t.name = $name
                RETURN t
            """, name=name, user_id=user_id)
            record = result.single()
            if record:
                return self._node_to_tag(record["t"])
            return None
    
    def create(self, tag: TagCreate) -> Tag:
        """Create a new tag and link it to the user. If tag with same name exists, return it."""
        # Check if tag with same name already exists for this user
        existing_tag = self.get_by_name_and_user(tag.name, tag.user_id)
        if existing_tag:
            return existing_tag
        
        with self.driver.session() as session:
            result = session.run("""
                MATCH (u:User {id: $user_id})
                CREATE (t:Tag {
                    id: $id,
                    name: $name,
                    description: $description,
                    color: $color,
                    user_id: $user_id,
                    is_system: $is_system,
                    created_at: datetime(),
                    updated_at: datetime()
                })
                CREATE (u)-[:OWNS]->(t)
                RETURN t
            """, 
                id=str(uuid.uuid4()),
                name=tag.name,
                description=tag.description,
                color=tag.color,
                user_id=tag.user_id,
                is_system=tag.is_system or False
            )
            record = result.single()
            if not record:
                raise ValueError(f"User with id {tag.user_id} not found")
            return self._node_to_tag(record["t"])
    
    def get_by_id(self, tag_id: str) -> Optional[Tag]:
        """Get a tag by ID"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (t:Tag {id: $id})
                RETURN t
            """, id=tag_id)
            record = result.single()
            if record:
                return self._node_to_tag(record["t"])
            return None
    
    def get_all(self, skip: int = 0, limit: int = 100) -> List[Tag]:
        """Get all tags with pagination"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (t:Tag)
                RETURN t
                ORDER BY t.name
                SKIP $skip
                LIMIT $limit
            """, skip=skip, limit=limit)
            return [self._node_to_tag(record["t"]) for record in result]
    
    def get_all_by_user(self, user_id: str, skip: int = 0, limit: int = 100) -> List[Tag]:
        """Get all tags for a specific user with pagination"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (u:User {id: $user_id})-[:OWNS]->(t:Tag)
                RETURN t
                ORDER BY t.name
                SKIP $skip
                LIMIT $limit
            """, user_id=user_id, skip=skip, limit=limit)
            return [self._node_to_tag(record["t"]) for record in result]
    
    def get_all_by_user_non_system(self, user_id: str, skip: int = 0, limit: int = 100) -> List[Tag]:
        """Get all non-system tags for a specific user with pagination"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (u:User {id: $user_id})-[:OWNS]->(t:Tag)
                WHERE NOT COALESCE(t.is_system, false)
                RETURN t
                ORDER BY t.name
                SKIP $skip
                LIMIT $limit
            """, user_id=user_id, skip=skip, limit=limit)
            return [self._node_to_tag(record["t"]) for record in result]
    
    def count_by_user(self, user_id: str) -> int:
        """Count total tags owned by a user"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (u:User {id: $user_id})-[:OWNS]->(t:Tag)
                RETURN count(t) as total
            """, user_id=user_id)
            record = result.single()
            return record["total"] if record else 0
    
    def update(self, tag_id: str, tag: TagUpdate) -> Optional[Tag]:
        """Update a tag"""
        updates = []
        params = {"id": tag_id, "updated_at": datetime.now()}
        
        if tag.name is not None:
            updates.append("t.name = $name")
            params["name"] = tag.name
        if tag.description is not None:
            updates.append("t.description = $description")
            params["description"] = tag.description
        if tag.color is not None:
            updates.append("t.color = $color")
            params["color"] = tag.color
        
        if not updates:
            return self.get_by_id(tag_id)
        
        updates.append("t.updated_at = datetime()")
        
        with self.driver.session() as session:
            result = session.run(f"""
                MATCH (t:Tag {{id: $id}})
                SET {', '.join(updates)}
                RETURN t
            """, **params)
            record = result.single()
            if record:
                return self._node_to_tag(record["t"])
            return None
    
    def delete(self, tag_id: str) -> bool:
        """Delete a tag and all its relationships"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (t:Tag {id: $id})
                DETACH DELETE t
                RETURN count(t) as deleted
            """, id=tag_id)
            record = result.single()
            return record["deleted"] > 0
    
    def create_parent_of_relation(self, parent_id: str, child_id: str) -> bool:
        """Create PARENT_OF relationship between tags"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (parent:Tag {id: $parent_id})
                MATCH (child:Tag {id: $child_id})
                MERGE (parent)-[r:PARENT_OF]->(child)
                RETURN r
            """, parent_id=parent_id, child_id=child_id)
            return result.single() is not None
    
    def create_composed_of_relation(self, whole_id: str, part_id: str) -> bool:
        """Create COMPOSED_OF relationship between tags"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (whole:Tag {id: $whole_id})
                MATCH (part:Tag {id: $part_id})
                MERGE (whole)-[r:COMPOSED_OF]->(part)
                RETURN r
            """, whole_id=whole_id, part_id=part_id)
            return result.single() is not None
    
    def create_related_to_relation(self, tag1_id: str, tag2_id: str) -> bool:
        """Create RELATED_TO relationship between tags"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (tag1:Tag {id: $tag1_id})
                MATCH (tag2:Tag {id: $tag2_id})
                MERGE (tag1)-[r:RELATED_TO]->(tag2)
                RETURN r
            """, tag1_id=tag1_id, tag2_id=tag2_id)
            return result.single() is not None
    
    def delete_relation(self, from_id: str, to_id: str, relation_type: str) -> bool:
        """Delete a specific relationship between tags"""
        with self.driver.session() as session:
            result = session.run(f"""
                MATCH (from:Tag {{id: $from_id}})-[r:{relation_type}]->(to:Tag {{id: $to_id}})
                DELETE r
                RETURN count(r) as deleted
            """, from_id=from_id, to_id=to_id)
            record = result.single()
            return record["deleted"] > 0
    
    def get_with_relations(self, tag_id: str) -> Optional[TagWithRelations]:
        """Get a tag with all its relationships"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (t:Tag {id: $id})
                OPTIONAL MATCH (t)<-[:PARENT_OF]-(parent:Tag)
                OPTIONAL MATCH (t)-[:PARENT_OF]->(child:Tag)
                OPTIONAL MATCH (t)-[:COMPOSED_OF]->(part:Tag)
                OPTIONAL MATCH (t)<-[:COMPOSED_OF]-(whole:Tag)
                OPTIONAL MATCH (t)-[:RELATED_TO]-(related:Tag)
                RETURN t,
                    collect(DISTINCT parent) as parents,
                    collect(DISTINCT child) as children,
                    collect(DISTINCT part) as composed_of,
                    collect(DISTINCT whole) as part_of,
                    collect(DISTINCT related) as related_to
            """, id=tag_id)
            
            record = result.single()
            if not record:
                return None
            
            tag = self._node_to_tag(record["t"])
            
            return TagWithRelations(
                **tag.model_dump(),
                parents=[self._node_to_tag(p) for p in record["parents"] if p],
                children=[self._node_to_tag(c) for c in record["children"] if c],
                composed_of=[self._node_to_tag(p) for p in record["composed_of"] if p],
                part_of=[self._node_to_tag(w) for w in record["part_of"] if w],
                related_to=[self._node_to_tag(r) for r in record["related_to"] if r]
            )
    
    @staticmethod
    def _node_to_tag(node) -> Tag:
        """Convert Neo4j node to Tag model"""
        # Convert Neo4j DateTime to Python datetime
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
            user_id=node["user_id"],
            created_at=created_at,
            updated_at=updated_at,
            is_system=node.get("is_system", False)
        )
    
    def merge_tags(self, source_tag_ids: List[str], target_tag_id: str, new_name: str, new_color: str) -> dict:
        """
        Merge multiple source tags into one target tag (the first source tag).
        All URLs linked to source tags will be linked to the target tag.
        The target tag will be renamed and recolored.
        Other source tags will be deleted.
        Returns a dict with the number of URLs updated and tags merged.
        """
        with self.driver.session() as session:
            # Remove the target tag from the source list to avoid self-merge
            other_source_ids = [tag_id for tag_id in source_tag_ids if tag_id != target_tag_id]
            
            result = session.run("""
                // Step 1: Get the target tag and update its properties
                MATCH (targetTag:Tag {id: $target_tag_id})
                SET targetTag.name = $new_name,
                    targetTag.color = $new_color
                
                // Step 2: Find all URLs that have any source tag (including target)
                WITH targetTag
                OPTIONAL MATCH (url:URL)-[:HAS_TAG]->(sourceTag:Tag)
                WHERE sourceTag.id IN $all_source_ids
                
                // Step 3: Create relationship to target tag for each URL (if not exists)
                WITH DISTINCT url, targetTag, collect(DISTINCT sourceTag) as allSourceTags
                WHERE url IS NOT NULL
                MERGE (url)-[:HAS_TAG]->(targetTag)
                
                // Step 4: Delete old relationships from URL to other source tags
                WITH url, targetTag, allSourceTags
                UNWIND allSourceTags as sourceTag
                WITH url, targetTag, sourceTag
                WHERE sourceTag.id <> targetTag.id AND sourceTag.id IN $other_source_ids
                OPTIONAL MATCH (url)-[oldRel:HAS_TAG]->(sourceTag)
                DELETE oldRel
                
                // Step 5: Count and collect info
                WITH DISTINCT url, targetTag, sourceTag
                WITH targetTag, count(DISTINCT url) as urls_updated, collect(DISTINCT sourceTag) as sourceTags
                
                // Step 6: Delete the source tags (not the target)
                UNWIND sourceTags as st
                WITH targetTag, urls_updated, st
                WHERE st.id IN $other_source_ids
                DETACH DELETE st
                
                WITH targetTag, urls_updated, count(DISTINCT st) as tags_merged
                RETURN tags_merged, urls_updated
            """, 
                target_tag_id=target_tag_id,
                all_source_ids=source_tag_ids,  # All tags including target
                other_source_ids=other_source_ids,  # Only tags to delete
                new_name=new_name,
                new_color=new_color
            )
            
            record = result.single()
            return {
                "tags_merged": record["tags_merged"] if record else 0,
                "urls_updated": record["urls_updated"] if record else 0
            }

