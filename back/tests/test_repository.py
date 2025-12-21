import pytest
from neo4j import GraphDatabase
from src.repositories.tag_repository import TagRepository
from src.models.tag import TagCreate, TagUpdate
from src.config import get_settings

settings = get_settings()


@pytest.fixture
def repo():
    """Create a repository instance for testing"""
    driver = GraphDatabase.driver(
        settings.NEO4J_URI,
        auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
    )
    
    # Clean database before test
    with driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")
    
    repository = TagRepository(driver)
    
    yield repository
    
    # Clean database after test
    with driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")
    
    driver.close()


class TestTagRepository:
    """Test TagRepository database operations"""
    
    def test_create_tag(self, repo: TagRepository):
        """Test creating a tag in database"""
        tag_data = TagCreate(name="Test Tag", description="Test")
        tag = repo.create(tag_data)
        
        assert tag.id is not None
        assert tag.name == "Test Tag"
        assert tag.description == "Test"
        assert tag.created_at is not None
        assert tag.updated_at is not None
    
    def test_get_by_id(self, repo: TagRepository):
        """Test getting a tag by ID"""
        tag_data = TagCreate(name="Test Tag")
        created_tag = repo.create(tag_data)
        
        retrieved_tag = repo.get_by_id(created_tag.id)
        assert retrieved_tag is not None
        assert retrieved_tag.id == created_tag.id
        assert retrieved_tag.name == created_tag.name
    
    def test_get_by_id_not_found(self, repo: TagRepository):
        """Test getting a non-existent tag"""
        tag = repo.get_by_id("non-existent-id")
        assert tag is None
    
    def test_get_all(self, repo: TagRepository):
        """Test getting all tags"""
        # Create multiple tags
        for i in range(5):
            repo.create(TagCreate(name=f"Tag {i}"))
        
        tags = repo.get_all()
        assert len(tags) == 5
    
    def test_get_all_with_pagination(self, repo: TagRepository):
        """Test pagination"""
        # Create 10 tags
        for i in range(10):
            repo.create(TagCreate(name=f"Tag {i:02d}"))
        
        # Get first page
        page1 = repo.get_all(skip=0, limit=5)
        assert len(page1) == 5
        
        # Get second page
        page2 = repo.get_all(skip=5, limit=5)
        assert len(page2) == 5
        
        # Ensure different results
        page1_ids = {tag.id for tag in page1}
        page2_ids = {tag.id for tag in page2}
        assert page1_ids.isdisjoint(page2_ids)
    
    def test_update_tag(self, repo: TagRepository):
        """Test updating a tag"""
        tag = repo.create(TagCreate(name="Original"))
        
        update_data = TagUpdate(name="Updated", description="New desc")
        updated_tag = repo.update(tag.id, update_data)
        
        assert updated_tag is not None
        assert updated_tag.name == "Updated"
        assert updated_tag.description == "New desc"
    
    def test_delete_tag(self, repo: TagRepository):
        """Test deleting a tag"""
        tag = repo.create(TagCreate(name="To Delete"))
        
        result = repo.delete(tag.id)
        assert result is True
        
        # Verify deletion
        deleted_tag = repo.get_by_id(tag.id)
        assert deleted_tag is None
    
    def test_get_by_url(self, repo: TagRepository):
        """Test getting a tag by URL"""
        tag = repo.create(TagCreate(
            name="URL Tag",
            url="https://example.com"
        ))
        
        found_tag = repo.get_by_url("https://example.com")
        assert found_tag is not None
        assert found_tag.id == tag.id
    
    def test_get_all_with_url(self, repo: TagRepository):
        """Test getting only tags with URLs"""
        repo.create(TagCreate(name="No URL"))
        repo.create(TagCreate(name="With URL", url="https://example.com"))
        
        tags_with_url = repo.get_all_with_url()
        assert len(tags_with_url) == 1
        assert tags_with_url[0].url == "https://example.com"
    
    def test_create_parent_of_relation(self, repo: TagRepository):
        """Test creating PARENT_OF relationship"""
        parent = repo.create(TagCreate(name="Parent"))
        child = repo.create(TagCreate(name="Child"))
        
        result = repo.create_parent_of_relation(parent.id, child.id)
        assert result is True
        
        # Verify relationship
        child_with_relations = repo.get_with_relations(child.id)
        assert len(child_with_relations.parents) == 1
        assert child_with_relations.parents[0].id == parent.id
    
    def test_create_composed_of_relation(self, repo: TagRepository):
        """Test creating COMPOSED_OF relationship"""
        whole = repo.create(TagCreate(name="Whole"))
        part = repo.create(TagCreate(name="Part"))
        
        result = repo.create_composed_of_relation(whole.id, part.id)
        assert result is True
        
        # Verify relationship
        whole_with_relations = repo.get_with_relations(whole.id)
        assert len(whole_with_relations.composed_of) == 1
        assert whole_with_relations.composed_of[0].id == part.id
    
    def test_create_related_to_relation(self, repo: TagRepository):
        """Test creating RELATED_TO relationship"""
        tag1 = repo.create(TagCreate(name="Tag1"))
        tag2 = repo.create(TagCreate(name="Tag2"))
        
        result = repo.create_related_to_relation(tag1.id, tag2.id)
        assert result is True
        
        # Verify relationship
        tag1_with_relations = repo.get_with_relations(tag1.id)
        assert len(tag1_with_relations.related_to) == 1
        assert tag1_with_relations.related_to[0].id == tag2.id
    
    def test_delete_relation(self, repo: TagRepository):
        """Test deleting a relationship"""
        tag1 = repo.create(TagCreate(name="Tag1"))
        tag2 = repo.create(TagCreate(name="Tag2"))
        
        # Create relationship
        repo.create_parent_of_relation(tag1.id, tag2.id)
        
        # Delete relationship
        result = repo.delete_relation(tag1.id, tag2.id, "PARENT_OF")
        assert result is True
        
        # Verify deletion
        tag2_with_relations = repo.get_with_relations(tag2.id)
        assert len(tag2_with_relations.parents) == 0
