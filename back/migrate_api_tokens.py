"""
Migration script to convert APIToken from property-based to relation-based
This script adds OWNS relationships between Users and APITokens
"""
import os
import sys
from neo4j import GraphDatabase

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.config import get_settings

def migrate_api_tokens():
    """
    Migrate APIToken nodes to use OWNS relationship instead of user_id property
    """
    settings = get_settings()
    driver = GraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_user, settings.neo4j_password)
    )
    
    print("🔄 Starting APIToken migration...")
    
    with driver.session() as session:
        # Step 1: Check if there are any APITokens with user_id property
        result = session.run("""
            MATCH (t:APIToken)
            WHERE t.user_id IS NOT NULL
            RETURN count(t) as count
        """)
        record = result.single()
        count = record["count"] if record else 0
        
        if count == 0:
            print("✅ No APITokens to migrate. All tokens already use relationships.")
            driver.close()
            return
        
        print(f"📋 Found {count} APITokens to migrate")
        
        # Step 2: Create OWNS relationships for existing tokens
        result = session.run("""
            MATCH (t:APIToken)
            WHERE t.user_id IS NOT NULL
            WITH t, t.user_id as uid
            MATCH (u:User {id: uid})
            MERGE (u)-[:OWNS]->(t)
            RETURN count(t) as migrated
        """)
        record = result.single()
        migrated = record["migrated"] if record else 0
        
        print(f"✅ Created OWNS relationships for {migrated} tokens")
        
        # Step 3: Remove user_id property from APIToken nodes
        result = session.run("""
            MATCH (t:APIToken)
            WHERE t.user_id IS NOT NULL
            REMOVE t.user_id
            RETURN count(t) as cleaned
        """)
        record = result.single()
        cleaned = record["cleaned"] if record else 0
        
        print(f"✅ Removed user_id property from {cleaned} tokens")
        
        # Step 4: Verify migration
        result = session.run("""
            MATCH (u:User)-[:OWNS]->(t:APIToken)
            RETURN count(t) as total
        """)
        record = result.single()
        total = record["total"] if record else 0
        
        print(f"✅ Migration complete! Total APITokens with OWNS relationship: {total}")
        
        # Check for orphaned tokens (no OWNS relationship)
        result = session.run("""
            MATCH (t:APIToken)
            WHERE NOT EXISTS((u:User)-[:OWNS]->(t))
            RETURN count(t) as orphaned
        """)
        record = result.single()
        orphaned = record["orphaned"] if record else 0
        
        if orphaned > 0:
            print(f"⚠️  Warning: Found {orphaned} orphaned APITokens (no owner)")
            print("   These tokens will be inaccessible and should be deleted manually")
        
    driver.close()
    print("✨ Migration finished successfully!")


if __name__ == "__main__":
    try:
        migrate_api_tokens()
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)
