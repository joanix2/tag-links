"""
Repository for API Token operations
"""
from typing import List, Optional
from datetime import datetime
from neo4j import Driver
from src.models.api_token import APIToken, APITokenCreate
import secrets
import hashlib


class APITokenRepository:
    def __init__(self, driver: Driver):
        self.driver = driver

    def _hash_token(self, token: str) -> str:
        """Hash a token for secure storage"""
        return hashlib.sha256(token.encode()).hexdigest()

    def _generate_token(self) -> str:
        """Generate a secure random token"""
        return secrets.token_urlsafe(32)

    def create(self, token_data: APITokenCreate) -> tuple[APIToken, str]:
        """
        Create a new API token
        Returns: (APIToken with masked token, actual plain token)
        """
        token = self._generate_token()
        hashed_token = self._hash_token(token)
        
        query = """
        CREATE (t:APIToken {
            id: randomUUID(),
            name: $name,
            user_id: $user_id,
            hashed_token: $hashed_token,
            created_at: datetime(),
            last_used_at: null
        })
        RETURN t
        """
        
        with self.driver.session() as session:
            result = session.run(
                query,
                name=token_data.name,
                user_id=token_data.user_id,
                hashed_token=hashed_token
            )
            record = result.single()
            
            if record:
                node = record["t"]
                api_token = APIToken(
                    id=node["id"],
                    name=node["name"],
                    user_id=node["user_id"],
                    token=token,  # Return plain token only once
                    created_at=node["created_at"].to_native(),
                    last_used_at=node["last_used_at"].to_native() if node["last_used_at"] else None
                )
                return api_token, token
            
            raise Exception("Failed to create API token")

    def get_all_by_user(self, user_id: str) -> List[APIToken]:
        """Get all API tokens for a user (tokens will be masked)"""
        query = """
        MATCH (t:APIToken {user_id: $user_id})
        RETURN t
        ORDER BY t.created_at DESC
        """
        
        with self.driver.session() as session:
            result = session.run(query, user_id=user_id)
            tokens = []
            
            for record in result:
                node = record["t"]
                # Mask the token - only show last 8 characters
                masked_token = "..." + node["hashed_token"][-8:]
                tokens.append(APIToken(
                    id=node["id"],
                    name=node["name"],
                    user_id=node["user_id"],
                    token=masked_token,
                    created_at=node["created_at"].to_native(),
                    last_used_at=node["last_used_at"].to_native() if node["last_used_at"] else None
                ))
            
            return tokens

    def verify_token(self, token: str) -> Optional[str]:
        """
        Verify a token and return the user_id if valid
        Also updates last_used_at
        """
        hashed_token = self._hash_token(token)
        
        query = """
        MATCH (t:APIToken {hashed_token: $hashed_token})
        SET t.last_used_at = datetime()
        RETURN t.user_id as user_id
        """
        
        with self.driver.session() as session:
            result = session.run(query, hashed_token=hashed_token)
            record = result.single()
            
            if record:
                return record["user_id"]
            
            return None

    def delete(self, token_id: str, user_id: str) -> bool:
        """Delete an API token (user can only delete their own tokens)"""
        query = """
        MATCH (t:APIToken {id: $token_id, user_id: $user_id})
        DELETE t
        RETURN count(t) as deleted
        """
        
        with self.driver.session() as session:
            result = session.run(query, token_id=token_id, user_id=user_id)
            record = result.single()
            
            return record["deleted"] > 0 if record else False
