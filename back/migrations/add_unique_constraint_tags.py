"""
Migration: Add unique constraint on Tag name per user

This script adds a unique constraint to ensure that a user cannot have
multiple tags with the same name.
"""

from src.database import get_driver


def add_unique_constraint():
    """Add unique constraint on Tag(user_id, name)"""
    driver = get_driver()
    
    with driver.session() as session:
        # Check if constraint already exists
        result = session.run("SHOW CONSTRAINTS")
        constraints = [record["name"] for record in result if "name" in record]
        
        constraint_name = "tag_user_name_unique"
        
        if constraint_name not in constraints:
            print(f"Creating constraint: {constraint_name}")
            session.run(f"""
                CREATE CONSTRAINT {constraint_name} IF NOT EXISTS
                FOR (t:Tag)
                REQUIRE (t.user_id, t.name) IS UNIQUE
            """)
            print(f"✅ Constraint {constraint_name} created successfully")
        else:
            print(f"ℹ️  Constraint {constraint_name} already exists")


def remove_duplicate_tags():
    """Remove duplicate tags (keep the oldest one)"""
    driver = get_driver()
    
    with driver.session() as session:
        # Find and remove duplicates
        result = session.run("""
            MATCH (u:User)-[:OWNS]->(t:Tag)
            WITH u, t.name as tag_name, collect(t) as tags
            WHERE size(tags) > 1
            WITH u, tag_name, tags, tags[0] as keep_tag, tail(tags) as delete_tags
            UNWIND delete_tags as dt
            OPTIONAL MATCH (url:URL)-[r:HAS_TAG]->(dt)
            WITH u, tag_name, keep_tag, dt, collect(url) as urls
            // Reconnect URLs to the tag we're keeping
            FOREACH (url IN urls | 
                MERGE (url)-[:HAS_TAG]->(keep_tag)
            )
            // Delete the old relationship and duplicate tag
            DETACH DELETE dt
            RETURN u.id as user_id, tag_name, count(dt) as deleted_count
        """)
        
        duplicates_removed = 0
        for record in result:
            print(f"🔧 User {record['user_id']}: Removed {record['deleted_count']} duplicate(s) of tag '{record['tag_name']}'")
            duplicates_removed += record['deleted_count']
        
        if duplicates_removed > 0:
            print(f"✅ Removed {duplicates_removed} duplicate tag(s)")
        else:
            print("ℹ️  No duplicate tags found")


if __name__ == "__main__":
    print("🚀 Starting migration: Add unique constraint on Tag(user_id, name)")
    print()
    
    print("Step 1: Removing duplicate tags...")
    remove_duplicate_tags()
    print()
    
    print("Step 2: Adding unique constraint...")
    add_unique_constraint()
    print()
    
    print("✅ Migration completed successfully!")
