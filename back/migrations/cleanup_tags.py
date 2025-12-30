"""
Cleanup script: Mark system tags and remove duplicates

This script:
1. Marks existing Favoris, Partage, and document type tags as system tags
2. Removes duplicate tags and merges their relationships
"""

from src.database import get_driver
from src.models.url import DOCUMENT_TYPES


SYSTEM_TAG_NAMES = {"Favoris", "Partage"} | set(DOCUMENT_TYPES)


def mark_system_tags():
    """Mark tags as system if they match system tag names"""
    driver = get_driver()
    
    with driver.session() as session:
        result = session.run("""
            MATCH (t:Tag)
            WHERE t.name IN $system_names AND NOT COALESCE(t.is_system, false)
            SET t.is_system = true
            RETURN t.name as name, count(t) as count
        """, system_names=list(SYSTEM_TAG_NAMES))
        
        total = 0
        for record in result:
            print(f"✅ Marked {record['count']} tag(s) '{record['name']}' as system")
            total += record['count']
        
        if total > 0:
            print(f"✅ Total: {total} tag(s) marked as system")
        else:
            print("ℹ️  No tags to mark as system")


def remove_duplicate_tags():
    """Remove duplicate tags (keep the oldest one with is_system if exists)"""
    driver = get_driver()
    
    with driver.session() as session:
        # Find and remove duplicates, keeping system tags if they exist
        result = session.run("""
            MATCH (t:Tag)
            WITH t.user_id as user_id, t.name as tag_name, collect(t) as tags
            WHERE size(tags) > 1
            UNWIND tags as tag
            WITH user_id, tag_name, tags, tag
            ORDER BY COALESCE(tag.is_system, false) DESC, tag.created_at ASC
            WITH user_id, tag_name, tags, collect(tag) as sorted_tags
            WITH user_id, tag_name, head(sorted_tags) as keep_tag, tail(sorted_tags) as delete_tags
            UNWIND delete_tags as dt
            OPTIONAL MATCH (url:URL)-[r:HAS_TAG]->(dt)
            WITH user_id, tag_name, keep_tag, dt, collect(DISTINCT url) as urls
            // Reconnect URLs to the tag we're keeping
            FOREACH (url IN urls | 
                MERGE (url)-[:HAS_TAG]->(keep_tag)
            )
            // Delete old relationships
            WITH user_id, tag_name, keep_tag, dt
            // Delete the duplicate tag
            DETACH DELETE dt
            RETURN user_id, tag_name, count(DISTINCT dt) as deleted_count
        """)
        
        duplicates_removed = 0
        for record in result:
            print(f"🔧 User '{record['user_id']}': Removed {record['deleted_count']} duplicate(s) of tag '{record['tag_name']}'")
            duplicates_removed += record['deleted_count']
        
        if duplicates_removed > 0:
            print(f"✅ Removed {duplicates_removed} duplicate tag(s)")
        else:
            print("ℹ️  No duplicate tags found")


if __name__ == "__main__":
    print("🚀 Starting cleanup...")
    print()
    
    print("Step 1: Marking system tags...")
    mark_system_tags()
    print()
    
    print("Step 2: Removing duplicate tags...")
    remove_duplicate_tags()
    print()
    
    print("✅ Cleanup completed successfully!")
    print()
    print("💡 Next step: Run the migration to add unique constraint:")
    print("   python -m back.migrations.add_unique_constraint_tags")
