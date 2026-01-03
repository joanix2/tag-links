"""
Migration to add customPrimary and customPrimaryForeground fields to User nodes
"""
from neo4j import GraphDatabase
import os
from dotenv import load_dotenv

load_dotenv()


def add_custom_color_fields():
    """Add customPrimary and customPrimaryForeground fields to all User nodes"""
    
    neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    neo4j_user = os.getenv("NEO4J_USER", "neo4j")
    neo4j_password = os.getenv("NEO4J_PASSWORD", "password")
    
    driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))
    
    try:
        with driver.session() as session:
            # Add customPrimary and customPrimaryForeground fields to all User nodes if they don't exist
            result = session.run("""
                MATCH (u:User)
                WHERE u.customPrimary IS NULL OR u.customPrimaryForeground IS NULL
                SET u.customPrimary = null,
                    u.customPrimaryForeground = null
                RETURN count(u) as updated
            """)
            
            record = result.single()
            count = record["updated"] if record else 0
            
            print(f"✅ Updated {count} user(s) with custom color fields")
            
            # Verify migration
            result = session.run("""
                MATCH (u:User)
                RETURN count(u) as total
            """)
            record = result.single()
            total = record["total"] if record else 0
            print(f"📊 Total users in database: {total}")
            
    finally:
        driver.close()


if __name__ == "__main__":
    print("🔄 Adding custom color fields to User nodes...")
    add_custom_color_fields()
    print("✨ Migration completed!")
