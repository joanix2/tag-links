import pytest
from src.models.tag import Tag, TagCreate, TagUpdate, TagWithRelations


class TestTagModels:
    """Test Tag Pydantic models"""
    
    def test_tag_create_minimal(self):
        """Test creating a tag with minimal data"""
        tag = TagCreate(name="Test Tag")
        assert tag.name == "Test Tag"
        assert tag.description is None
        assert tag.color is None
        assert tag.url is None
    
    def test_tag_create_full(self):
        """Test creating a tag with all fields"""
        tag = TagCreate(
            name="Full Tag",
            description="A complete tag",
            color="#ff0000",
            url="https://example.com",
            url_title="Example"
        )
        assert tag.name == "Full Tag"
        assert tag.description == "A complete tag"
        assert tag.color == "#ff0000"
        assert tag.url == "https://example.com"
        assert tag.url_title == "Example"
    
    def test_tag_create_validation_error(self):
        """Test that empty name raises validation error"""
        with pytest.raises(Exception):
            TagCreate(name="")
    
    def test_tag_update_partial(self):
        """Test partial update"""
        tag_update = TagUpdate(name="Updated Name")
        assert tag_update.name == "Updated Name"
        assert tag_update.description is None
    
    def test_tag_with_relations(self):
        """Test TagWithRelations model"""
        from datetime import datetime
        
        tag = TagWithRelations(
            id="test-id",
            name="Test",
            created_at=datetime.now(),
            updated_at=datetime.now(),
            parents=[],
            children=[],
            composed_of=[],
            part_of=[],
            related_to=[]
        )
        assert isinstance(tag.parents, list)
        assert isinstance(tag.children, list)
        assert isinstance(tag.composed_of, list)
        assert isinstance(tag.part_of, list)
        assert isinstance(tag.related_to, list)
