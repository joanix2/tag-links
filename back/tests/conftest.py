import pytest
from fastapi.testclient import TestClient
from neo4j import GraphDatabase
from src.config import get_settings
from main import app
import os

settings = get_settings()


@pytest.fixture(scope="session")
def test_db():
    """Setup test database connection"""
    driver = GraphDatabase.driver(
        settings.NEO4J_URI,
        auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
    )
    
    yield driver
    
    # Cleanup after all tests
    with driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")
    
    driver.close()


@pytest.fixture(scope="function")
def client():
    """Create a test client"""
    return TestClient(app)


@pytest.fixture(scope="function", autouse=True)
def clean_db(test_db):
    """Clean database before each test"""
    with test_db.session() as session:
        session.run("MATCH (n) DETACH DELETE n")
    yield
    # Clean after test as well
    with test_db.session() as session:
        session.run("MATCH (n) DETACH DELETE n")
