# Migrations

This folder contains database migration scripts for the tag-link application.

## Available Migrations

### 1. Cleanup Tags (`cleanup_tags.py`)

This script prepares the database for the unique constraint by:

- Marking existing Favoris, Partage, and document type tags as system tags
- Removing duplicate tags and merging their URL relationships

**Run this first:**

```bash
cd /home/joan/Documents/tag-link
source .venv/bin/activate
python -m back.migrations.cleanup_tags
```

### 2. Add Unique Constraint (`add_unique_constraint_tags.py`)

This script adds a unique constraint to ensure that a user cannot have multiple tags with the same name.

**Run this after cleanup:**

```bash
python -m back.migrations.add_unique_constraint_tags
```

## Migration Order

Always run migrations in this order:

1. `cleanup_tags.py` - Clean up existing data
2. `add_unique_constraint_tags.py` - Add database constraints

## Troubleshooting

If you get an error about existing duplicates when adding the constraint, run the cleanup script again to ensure all duplicates are removed.
