from neo4j import GraphDatabase
from src.config import get_settings
from typing import Optional

settings = get_settings()


class Neo4jConnection:
    def __init__(self):
        self._driver: Optional[GraphDatabase.driver] = None
    
    def connect(self):
        """Establish connection to Neo4j database"""
        self._driver = GraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
        )
        return self._driver
    
    def close(self):
        """Close the Neo4j connection"""
        if self._driver:
            self._driver.close()
    
    def get_driver(self):
        """Get the Neo4j driver instance"""
        if not self._driver:
            self.connect()
        return self._driver
    
    def verify_connectivity(self):
        """Verify that we can connect to Neo4j"""
        try:
            self._driver.verify_connectivity()
            return True
        except Exception as e:
            print(f"Failed to connect to Neo4j: {e}")
            return False


# Global database connection instance
neo4j_connection = Neo4jConnection()


def get_db():
    """Dependency for getting database connection"""
    return neo4j_connection.get_driver()


def get_driver():
    """Get the Neo4j driver instance"""
    return neo4j_connection.get_driver()


def init_constraints():
    """Initialize database constraints and indexes"""
    driver = neo4j_connection.get_driver()
    
    with driver.session() as session:
        # Tag constraints
        session.run("""
            CREATE CONSTRAINT tag_id_unique IF NOT EXISTS
            FOR (t:Tag) REQUIRE t.id IS UNIQUE
        """)
        session.run("""
            CREATE INDEX tag_name_index IF NOT EXISTS
            FOR (t:Tag) ON (t.name)
        """)
        
        # User constraints
        session.run("""
            CREATE CONSTRAINT user_id_unique IF NOT EXISTS
            FOR (u:User) REQUIRE u.id IS UNIQUE
        """)
        session.run("""
            CREATE CONSTRAINT user_username_unique IF NOT EXISTS
            FOR (u:User) REQUIRE u.username IS UNIQUE
        """)
        
        # URL constraints
        session.run("""
            CREATE CONSTRAINT url_id_unique IF NOT EXISTS
            FOR (u:URL) REQUIRE u.id IS UNIQUE
        """)
        session.run("""
            CREATE INDEX url_url_index IF NOT EXISTS
            FOR (u:URL) ON (u.url)
        """)
        
        # File constraints
        session.run("""
            CREATE CONSTRAINT file_id_unique IF NOT EXISTS
            FOR (f:File) REQUIRE f.id IS UNIQUE
        """)
        
        print("Database constraints and indexes initialized successfully")
