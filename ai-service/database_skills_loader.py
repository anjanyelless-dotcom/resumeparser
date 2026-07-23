"""
Database Skills Loader for Resume Parser AI Service

This module provides functionality to load skills from the database taxonomy table
and cache them for use in the AI service. It supports configurable table names
via environment variables.
"""

import os
import psycopg2
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class DatabaseSkillsLoader:
    """
    Loads and caches skills from the database taxonomy table.
    
    Supports configurable table name via SKILLS_TAXONOMY_TABLE environment variable.
    Default: 'skills_taxonomy' (public schema in production)
    Local development: 'anjanyelle.skills_taxonomy'
    """
    
    def __init__(self):
        """Initialize the database skills loader."""
        self.db_host = os.getenv('DB_HOST', 'localhost')
        self.db_port = int(os.getenv('DB_PORT', '5432'))
        self.db_name = os.getenv('DB_NAME', 'resume_parser')
        self.db_user = os.getenv('DB_USER', 'resume_parser')
        self.db_password = os.getenv('DB_PASSWORD', '')
        
        # Skills taxonomy table name (default: skills_taxonomy in public schema)
        self.skills_table = os.getenv('SKILLS_TAXONOMY_TABLE', 'skills_taxonomy')
        
        self._cache: List[Dict[str, Any]] = []
        self._cache_by_domain: Dict[str, List[str]] = {}
        self._cache_by_sub_domain: Dict[str, List[str]] = {}
        self._last_refresh: Optional[datetime] = None
        
        logger.info(f"DatabaseSkillsLoader initialized with table: {self.skills_table}")
    
    def _get_connection(self):
        """Create a database connection."""
        return psycopg2.connect(
            host=self.db_host,
            port=self.db_port,
            database=self.db_name,
            user=self.db_user,
            password=self.db_password
        )
    
    def load_skills(self) -> List[Dict[str, Any]]:
        """
        Load skills from the database taxonomy table.
        
        Returns:
            List of skill dictionaries with name, normalized_name, domain, sub_domain, category
        """
        if not self._cache or self._is_cache_stale():
            self._refresh_cache()
        return self._cache
    
    def _refresh_cache(self):
        """Refresh the skills cache from the database."""
        logger.info(f"Refreshing skills cache from table: {self.skills_table}")
        
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            # Try to query with domain/sub_domain columns
            query = f"""
                SELECT name, normalized_name, domain, sub_domain, category
                FROM {self.skills_table}
                WHERE name IS NOT NULL AND normalized_name IS NOT NULL
                ORDER BY name
            """
            
            try:
                cursor.execute(query)
                rows = cursor.fetchall()
            except Exception as column_error:
                # Fallback for schemas without domain/sub_domain columns
                if 'domain' in str(column_error).lower() or 'sub_domain' in str(column_error).lower():
                    logger.warning("⚠️ domain/sub_domain columns not found, falling back to basic skill query")
                    fallback_query = f"""
                        SELECT name, normalized_name, category
                        FROM {self.skills_table}
                        WHERE name IS NOT NULL AND normalized_name IS NOT NULL
                        ORDER BY name
                    """
                    cursor.execute(fallback_query)
                    rows = cursor.fetchall()
                else:
                    raise
            
            # Process results
            self._cache = []
            self._cache_by_domain = {}
            self._cache_by_sub_domain = {}
            
            for row in rows:
                if len(row) == 5:
                    name, normalized_name, domain, sub_domain, category = row
                else:
                    # Fallback for rows without domain/sub_domain
                    name, normalized_name, category = row
                    domain = 'IT'  # Default domain
                    sub_domain = None
                
                skill = {
                    'name': name,
                    'normalized_name': normalized_name,
                    'domain': domain,
                    'sub_domain': sub_domain,
                    'category': category
                }
                
                self._cache.append(skill)
                
                # Build domain index
                if domain:
                    if domain not in self._cache_by_domain:
                        self._cache_by_domain[domain] = []
                    self._cache_by_domain[domain].append(name)
                
                # Build sub-domain index
                if sub_domain:
                    if sub_domain not in self._cache_by_sub_domain:
                        self._cache_by_sub_domain[sub_domain] = []
                    self._cache_by_sub_domain[sub_domain].append(name)
            
            self._last_refresh = datetime.now()
            
            cursor.close()
            conn.close()
            
            logger.info(f"✅ Successfully loaded {len(self._cache)} skills from database")
            logger.info(f"   Domains: {list(self._cache_by_domain.keys())}")
            logger.info(f"   Sub-domains: {list(self._cache_by_sub_domain.keys())}")
            
        except Exception as e:
            logger.error(f"❌ Failed to load skills from database: {e}")
            raise
    
    def _is_cache_stale(self) -> bool:
        """Check if the cache is stale (older than 1 hour)."""
        if not self._last_refresh:
            return True
        
        age = datetime.now() - self._last_refresh
        return age.total_seconds() > 3600  # 1 hour
    
    def refresh_cache(self):
        """Force refresh the skills cache."""
        self._refresh_cache()
    
    def get_cache_info(self) -> Dict[str, Any]:
        """
        Get information about the current skills cache.
        
        Returns:
            Dictionary with cache statistics
        """
        return {
            'total_skills': len(self._cache),
            'domains': list(self._cache_by_domain.keys()),
            'domains_count': len(self._cache_by_domain),
            'sub_domains': list(self._cache_by_sub_domain.keys()),
            'sub_domains_count': len(self._cache_by_sub_domain),
            'last_refresh': self._last_refresh.isoformat() if self._last_refresh else None,
            'table_name': self.skills_table,
            'cache_age_seconds': (datetime.now() - self._last_refresh).total_seconds() if self._last_refresh else None
        }
    
    def get_skills_by_domain(self, domain: str) -> List[str]:
        """
        Get skills by domain.
        
        Args:
            domain: The domain to filter by
            
        Returns:
            List of skill names in the domain
        """
        if not self._cache:
            self.load_skills()
        
        return self._cache_by_domain.get(domain, [])
    
    def get_skills_by_sub_domain(self, sub_domain: str) -> List[str]:
        """
        Get skills by sub-domain.
        
        Args:
            sub_domain: The sub-domain to filter by
            
        Returns:
            List of skill names in the sub-domain
        """
        if not self._cache:
            self.load_skills()
        
        return self._cache_by_sub_domain.get(sub_domain, [])
    
    def search_skills(self, keyword: str) -> List[Dict[str, Any]]:
        """
        Search skills by keyword.
        
        Args:
            keyword: The keyword to search for
            
        Returns:
            List of matching skill dictionaries
        """
        if not self._cache:
            self.load_skills()
        
        keyword_lower = keyword.lower()
        return [
            skill for skill in self._cache
            if keyword_lower in skill['name'].lower() or 
               keyword_lower in skill['normalized_name'].lower()
        ]


# Global singleton instance
_loader_instance: Optional[DatabaseSkillsLoader] = None


def get_database_skills_loader() -> DatabaseSkillsLoader:
    """
    Get the global database skills loader instance.
    
    Returns:
        DatabaseSkillsLoader singleton instance
    """
    global _loader_instance
    
    if _loader_instance is None:
        _loader_instance = DatabaseSkillsLoader()
    
    return _loader_instance


if __name__ == '__main__':
    # Test the loader
    logging.basicConfig(level=logging.INFO)
    
    loader = get_database_skills_loader()
    loader.load_skills()
    
    print("\n=== Cache Info ===")
    import json
    print(json.dumps(loader.get_cache_info(), indent=2, default=str))
    
    print("\n=== Search Test ===")
    results = loader.search_skills('python')
    print(f"Found {len(results)} skills matching 'python'")
    for skill in results[:5]:
        print(f"  - {skill['name']} (Domain: {skill.get('domain', 'N/A')})")
