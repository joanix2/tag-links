import pytest
from fastapi.testclient import TestClient


class TestTagCRUD:
    """Test Tag CRUD operations"""
    
    def test_create_tag(self, client: TestClient):
        """Test creating a tag"""
        tag_data = {
            "name": "Python",
            "description": "Programming language",
            "color": "#3776ab"
        }
        response = client.post("/tags/", json=tag_data)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == tag_data["name"]
        assert data["description"] == tag_data["description"]
        assert data["color"] == tag_data["color"]
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data
    
    def test_create_tag_with_url(self, client: TestClient):
        """Test creating a tag with URL"""
        tag_data = {
            "name": "Python Official",
            "description": "Official Python website",
            "color": "#3776ab",
            "url": "https://python.org",
            "url_title": "Python.org"
        }
        response = client.post("/tags/", json=tag_data)
        assert response.status_code == 201
        data = response.json()
        assert data["url"] == tag_data["url"]
        assert data["url_title"] == tag_data["url_title"]
    
    def test_get_tags(self, client: TestClient):
        """Test getting all tags"""
        # Create some tags
        for i in range(3):
            client.post("/tags/", json={"name": f"Tag {i}"})
        
        response = client.get("/tags/")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
    
    def test_get_tag_by_id(self, client: TestClient):
        """Test getting a tag by ID"""
        # Create a tag
        create_response = client.post("/tags/", json={"name": "Test Tag"})
        tag_id = create_response.json()["id"]
        
        # Get the tag
        response = client.get(f"/tags/{tag_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == tag_id
        assert data["name"] == "Test Tag"
    
    def test_get_tag_not_found(self, client: TestClient):
        """Test getting a non-existent tag"""
        response = client.get("/tags/non-existent-id")
        assert response.status_code == 404
    
    def test_update_tag(self, client: TestClient):
        """Test updating a tag"""
        # Create a tag
        create_response = client.post("/tags/", json={"name": "Original Name"})
        tag_id = create_response.json()["id"]
        
        # Update the tag
        update_data = {
            "name": "Updated Name",
            "description": "New description"
        }
        response = client.put(f"/tags/{tag_id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"
        assert data["description"] == "New description"
    
    def test_delete_tag(self, client: TestClient):
        """Test deleting a tag"""
        # Create a tag
        create_response = client.post("/tags/", json={"name": "To Delete"})
        tag_id = create_response.json()["id"]
        
        # Delete the tag
        response = client.delete(f"/tags/{tag_id}")
        assert response.status_code == 204
        
        # Verify it's deleted
        get_response = client.get(f"/tags/{tag_id}")
        assert get_response.status_code == 404


class TestTagWithURL:
    """Test Tag operations with URLs"""
    
    def test_get_tags_with_url(self, client: TestClient):
        """Test getting only tags with URLs"""
        # Create tags with and without URLs
        client.post("/tags/", json={"name": "Tag without URL"})
        client.post("/tags/", json={
            "name": "Tag with URL",
            "url": "https://example.com"
        })
        
        response = client.get("/tags/with-url")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["url"] == "https://example.com"
    
    def test_get_tag_by_url(self, client: TestClient):
        """Test finding a tag by URL"""
        # Create a tag with URL
        client.post("/tags/", json={
            "name": "Test Tag",
            "url": "https://test.com"
        })
        
        # Find by URL
        response = client.get("/tags/by-url?url=https://test.com")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test Tag"
        assert data["url"] == "https://test.com"
    
    def test_get_tag_by_url_not_found(self, client: TestClient):
        """Test finding a non-existent URL"""
        response = client.get("/tags/by-url?url=https://nonexistent.com")
        assert response.status_code == 404


class TestTagRelations:
    """Test Tag relationship operations"""
    
    def test_create_parent_of_relation(self, client: TestClient):
        """Test creating PARENT_OF relationship"""
        # Create two tags
        parent_response = client.post("/tags/", json={"name": "Parent"})
        child_response = client.post("/tags/", json={"name": "Child"})
        
        parent_id = parent_response.json()["id"]
        child_id = child_response.json()["id"]
        
        # Create relationship
        response = client.post(f"/tags/{parent_id}/parent-of/{child_id}")
        assert response.status_code == 201
        
        # Verify relationship
        relations_response = client.get(f"/tags/{child_id}/relations")
        assert relations_response.status_code == 200
        data = relations_response.json()
        assert len(data["parents"]) == 1
        assert data["parents"][0]["id"] == parent_id
    
    def test_create_composed_of_relation(self, client: TestClient):
        """Test creating COMPOSED_OF relationship"""
        # Create two tags
        whole_response = client.post("/tags/", json={"name": "Whole"})
        part_response = client.post("/tags/", json={"name": "Part"})
        
        whole_id = whole_response.json()["id"]
        part_id = part_response.json()["id"]
        
        # Create relationship
        response = client.post(f"/tags/{whole_id}/composed-of/{part_id}")
        assert response.status_code == 201
        
        # Verify relationship
        relations_response = client.get(f"/tags/{whole_id}/relations")
        assert relations_response.status_code == 200
        data = relations_response.json()
        assert len(data["composed_of"]) == 1
        assert data["composed_of"][0]["id"] == part_id
    
    def test_create_related_to_relation(self, client: TestClient):
        """Test creating RELATED_TO relationship"""
        # Create two tags
        tag1_response = client.post("/tags/", json={"name": "Tag1"})
        tag2_response = client.post("/tags/", json={"name": "Tag2"})
        
        tag1_id = tag1_response.json()["id"]
        tag2_id = tag2_response.json()["id"]
        
        # Create relationship
        response = client.post(f"/tags/{tag1_id}/related-to/{tag2_id}")
        assert response.status_code == 201
        
        # Verify relationship
        relations_response = client.get(f"/tags/{tag1_id}/relations")
        assert relations_response.status_code == 200
        data = relations_response.json()
        assert len(data["related_to"]) == 1
        assert data["related_to"][0]["id"] == tag2_id
    
    def test_prevent_self_relation(self, client: TestClient):
        """Test that a tag cannot be related to itself"""
        # Create a tag
        tag_response = client.post("/tags/", json={"name": "Self Tag"})
        tag_id = tag_response.json()["id"]
        
        # Try to create self-relationship
        response = client.post(f"/tags/{tag_id}/parent-of/{tag_id}")
        assert response.status_code == 400
    
    def test_delete_relation(self, client: TestClient):
        """Test deleting a relationship"""
        # Create two tags
        tag1_response = client.post("/tags/", json={"name": "Tag1"})
        tag2_response = client.post("/tags/", json={"name": "Tag2"})
        
        tag1_id = tag1_response.json()["id"]
        tag2_id = tag2_response.json()["id"]
        
        # Create relationship
        client.post(f"/tags/{tag1_id}/parent-of/{tag2_id}")
        
        # Delete relationship
        response = client.delete(f"/tags/{tag1_id}/PARENT_OF/{tag2_id}")
        assert response.status_code == 204
        
        # Verify relationship is deleted
        relations_response = client.get(f"/tags/{tag2_id}/relations")
        data = relations_response.json()
        assert len(data["parents"]) == 0
    
    def test_get_tag_with_relations(self, client: TestClient):
        """Test getting a tag with all its relationships"""
        # Create a central tag
        central_response = client.post("/tags/", json={"name": "Central"})
        central_id = central_response.json()["id"]
        
        # Create related tags
        parent_response = client.post("/tags/", json={"name": "Parent"})
        child_response = client.post("/tags/", json={"name": "Child"})
        part_response = client.post("/tags/", json={"name": "Part"})
        related_response = client.post("/tags/", json={"name": "Related"})
        
        parent_id = parent_response.json()["id"]
        child_id = child_response.json()["id"]
        part_id = part_response.json()["id"]
        related_id = related_response.json()["id"]
        
        # Create relationships
        client.post(f"/tags/{parent_id}/parent-of/{central_id}")
        client.post(f"/tags/{central_id}/parent-of/{child_id}")
        client.post(f"/tags/{central_id}/composed-of/{part_id}")
        client.post(f"/tags/{central_id}/related-to/{related_id}")
        
        # Get tag with all relations
        response = client.get(f"/tags/{central_id}/relations")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["parents"]) == 1
        assert len(data["children"]) == 1
        assert len(data["composed_of"]) == 1
        assert len(data["related_to"]) == 1


class TestTagPagination:
    """Test pagination"""
    
    def test_pagination(self, client: TestClient):
        """Test pagination with skip and limit"""
        # Create 10 tags
        for i in range(10):
            client.post("/tags/", json={"name": f"Tag {i:02d}"})
        
        # Get first page
        response = client.get("/tags/?skip=0&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 5
        
        # Get second page
        response = client.get("/tags/?skip=5&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 5
