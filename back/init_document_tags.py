#!/usr/bin/env python3
"""
Script to initialize document type tags for all existing users
Run this script once to add document type tags to all existing users
"""
from src.database import get_driver
from src.repositories.user_repository import UserRepository
from src.repositories.tag_repository import TagRepository
from src.models.tag import TagCreate
from src.models.url import DOCUMENT_TYPES

DOCUMENT_TYPE_TAG_COLOR = "#92400E"


def initialize_all_users_document_tags():
    """Initialize document type tags for all existing users"""
    driver = get_driver()
    user_repo = UserRepository(driver)
    tag_repo = TagRepository(driver)
    
    print("🚀 Starting document type tags initialization...")
    
    # Get all users (using a high limit to get all)
    all_users = user_repo.get_all(skip=0, limit=10000)
    print(f"Found {len(all_users)} users")
    
    for user in all_users:
        print(f"\n👤 Processing user: {user.username} (ID: {user.id})")
        
        # Get existing tags to avoid duplicates
        existing_tags = tag_repo.get_all_by_user(user.id, skip=0, limit=1000)
        existing_tag_names = {tag.name for tag in existing_tags}
        
        # Create missing document type tags
        created_count = 0
        for doc_type in DOCUMENT_TYPES:
            if doc_type not in existing_tag_names:
                tag_repo.create(TagCreate(
                    name=doc_type,
                    description=f"Type de document : {doc_type}",
                    color=DOCUMENT_TYPE_TAG_COLOR,
                    user_id=user.id
                ))
                created_count += 1
                print(f"  ✅ Created tag: {doc_type}")
        
        if created_count == 0:
            print(f"  ℹ️  All document type tags already exist")
        else:
            print(f"  ✨ Created {created_count} new tags")
    
    print(f"\n✅ Initialization complete!")
    print(f"📊 Total users processed: {len(all_users)}")
    
    driver.close()


if __name__ == "__main__":
    initialize_all_users_document_tags()
