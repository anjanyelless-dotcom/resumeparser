#!/usr/bin/env python3
"""
DeBERTa Experience Builder - Converts DeBERTa NER entities into structured work experiences.

This module takes the raw entities extracted by the trained DeBERTa model and groups them
into structured work experience entries with proper company-role-date associations.
"""

import logging
from typing import Dict, List, Any,Optional
from collections import defaultdict
import re

logger = logging.getLogger(__name__)


class DeBERTaExperienceBuilder:
    """
    Builds structured work experience entries from DeBERTa NER entities.
    
    The DeBERTa model extracts:
    - COMPANY: Company names
    - ROLE: Job titles
    - DATE_START: Start dates
    - DATE_END: End dates
    - LOCATION: Work locations
    - CLIENT: Client names (for consulting roles)
    
    This class groups these entities into complete work experience entries.
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Common technology names that should NOT be treated as companies or roles
        self.tech_keywords = {
            # Mobile
            'android', 'ios', 'swift', 'kotlin', 'flutter', 'react native', 'react-native', 'xamarin',
            # Cloud & Infrastructure
            'aws', 'azure', 'gcp', 'google cloud', 'cloud', 'docker', 'kubernetes', 'k8s', 'ecs', 'eks',
            's3', 'ec2', 'lambda', 'amplify', 'firebase', 'firestore', 'supabase', 'heroku', 'netlify', 'vercel',
            # Databases
            'sql', 'mysql', 'postgresql', 'postgres', 'mongodb', 'redis', 'cassandra', 'dynamodb', 'snowflake',
            'sqlite', 'oracle', 'mssql', 'sql server', 'sqlserver', 'db2', 'neo4j',
            # Programming Languages
            'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'ruby', 'go', 'rust', 'scala',
            'php', 'perl', 'bash', 'powershell', 'html', 'css', 'sass', 'less',
            # Frameworks & Libraries
            'react', 'angular', 'vue', 'node', 'nodejs', 'express', 'django', 'flask', 'spring',
            'spring boot', 'springboot', 'hibernate', 'fastapi', 'nextjs', 'next.js', 'gatsby', 'nuxt',
            'svelte', 'laravel', 'symfony', 'rails', 'asp.net', 'dotnet', '.net', 'jquery', 'bootstrap',
            'tailwind', 'tailwindcss', 'material ui', 'mui',
            # ML/AI
            'tensorflow', 'pytorch', 'keras', 'pandas', 'numpy', 'spark', 'hadoop', 'nlp', 'llm',
            'langchain', 'huggingface', 'openai', 'scikit-learn',
            # Data Tools
            'tableau', 'power bi', 'looker', 'dbt', 'airflow', 'kafka', 'etl', 'elt',
            'apache', 'databricks', 'redshift', 'bigquery', 'olap',
            # DevOps & Tools
            'jenkins', 'gitlab', 'github', 'github actions', 'gitlab ci', 'jira', 'confluence', 'terraform', 'ansible',
            'git', 'ci/cd', 'cicd', 'maven', 'gradle', 'npm', 'yarn', 'pnpm', 'webpack', 'vite',
            # Testing
            'selenium', 'cypress', 'playwright', 'jest', 'mocha', 'junit', 'testng', 'nunit', 'pytest',
            # Other / Concepts
            'api', 'rest', 'graphql', 'microservices', 'agile', 'scrum', 'ml', 'ai',
            'data', 'analytics', 'bi', 'pipeline', 'workflow', 'automation',
            'pwa', 'progressive web app', 'spa', 'single page application',
            'jwt', 'oauth', 'oauth2', 'saml', 'sso', 'soap', 'restful', 'grpc',
            # Generic/Noise keywords that get misidentified
            'platform', 'system', 'framework', 'library', 'integration', 'authentication', 'authorization',
            # Additional technologies/skills to reject
            'backend development', 'frontend development', 'full stack development',
            'api development', 'api engineering', 'microservices', 'release cycle',
            'production support', 'monitoring', 'migration time', '3 developer',
            'development team', 'engineering team', 'software development',
            'application development', 'system development', 'platform development',
            'cloud development', 'data development', 'test development',
            'qa development', 'devops development', 'security development',
            'mobile development', 'web development', 'database development',
            'infrastructure development', 'network development',
            'backend engineering', 'frontend engineering', 'full stack engineering',
            'api engineering', 'microservices engineering', 'release engineering',
            'production engineering', 'monitoring engineering', 'migration engineering',
            'development engineering', 'engineering engineering', 'software engineering',
            'application engineering', 'system engineering', 'platform engineering',
            'cloud engineering', 'data engineering', 'test engineering',
            'qa engineering', 'devops engineering', 'security engineering',
            'mobile engineering', 'web engineering', 'database engineering',
            'infrastructure engineering', 'network engineering',
            'release cycle', 'production support', 'monitoring',
            'migration time', '3 developer', 'python softtestlab',
            # ── STEP 15: Reject impossible companies (specific list from requirements) ──
            'power bi embedded', 'machine learning', 'analysis services', 'catalog',
            'analytics', 'chain', 'sonar', 'ssr', 'factory', 'dax', 'models',
            'pipelines', 'documentation', 'integration', 'architecture', 'provider',
            'processing', 'security', 'compliance', 'services', 'builder',
            'management'
        }
        
        # ── REQUIREMENT 17: Soft Validation - Valid companies with tech words ─────────
        # These are legitimate companies that contain technology words but should NOT be rejected
        # Instead, reduce confidence score
        self.valid_tech_companies = {
            'amazon web services', 'aws', 'oracle cloud', 'google cloud', 'google cloud platform',
            'microsoft azure', 'azure', 'ibm cloud', 'alibaba cloud', 'salesforce',
            'adobe', 'sap', 'oracle', 'microsoft', 'google', 'amazon', 'meta', 'apple'
        }
    
    def build_experiences_from_entities(self, entities: Dict[str, List[str]], text: str) -> List[Dict[str, Any]]:
        """
        Build structured work experiences from DeBERTa extracted entities.
        
        Strategy: Use COMPANY names as anchors. Each company = one experience.
        Match roles, dates, and locations to the nearest company using position-based clustering.
        
        ── REQUIREMENT 17: NO REGRESSION ─────────────────────────────────────────────
        Do not change any existing working behavior
        Reuse existing implementation
        Extend existing semantic logic only
        Maintain API compatibility
        Maintain JSON compatibility
        Maintain DB compatibility
        Maintain UI compatibility
        
        Args:
            entities: Dictionary of entity types to lists of extracted values
                     e.g., {'COMPANY': ['Google', 'Amazon'], 'ROLE': ['Engineer', 'Developer']}
                     Also includes '_positions': list of {type, text, start, end} for proximity grouping
            text: Original text for context and ordering
            
        Returns:
            List of structured work experience dictionaries
        """
        # Check if we have position data from the new extraction method
        positions_data = entities.get('_positions', [])
        # ── FIX 4: Extract block boundaries from the outer entities dict ───────────
        # _block_boundaries lives in the top-level entities dict (injected by
        # deberta_ner_parser.py).  It must be extracted here, before we hand
        # only the _positions list to _build_experiences_by_position.
        block_boundaries = entities.get('_block_boundaries', [])
        
        if positions_data:
            # Use position-based clustering (NEW METHOD)
            self.logger.info(f"🎯 Using position-based entity clustering with {len(positions_data)} entities")
            experiences = self._build_experiences_by_position(positions_data, text, block_boundaries=block_boundaries)
        else:
            # Fallback to old method using text.find()
            self.logger.info("⚠️ No position data, using fallback text.find() method")
            companies = entities.get('COMPANY', []) or entities.get('companies', [])
            roles = entities.get('ROLE', []) or entities.get('job_titles', [])
            start_dates = entities.get('DATE_START', []) or entities.get('START_DATE', []) or []
            end_dates = entities.get('DATE_END', []) or entities.get('END_DATE', []) or []
            locations = entities.get('LOCATION', []) or entities.get('locations', [])
            clients = entities.get('CLIENT', []) or entities.get('clients', [])
            
            self.logger.info(f"📊 DeBERTa entities: {len(companies)} companies, {len(roles)} roles, {len(start_dates)} start dates, {len(end_dates)} end dates")
            
            # If no companies or roles found, return empty
            if not companies and not roles:
                self.logger.warning("No companies or roles found in DeBERTa entities")
                return []
            
            # Strategy: Use companies as anchors - each company is a separate experience
            experiences = self._build_experiences_by_company(
                text, companies, roles, start_dates, end_dates, locations, clients
            )
        
        self.logger.info(f"✅ Built {len(experiences)} work experiences from DeBERTa entities")
        return experiences

    def _build_experiences_by_position(self, positions_data: List[Dict], text: str,
                                        block_boundaries: list = None) -> List[Dict]:
        """
        Build experiences using position-based clustering.

        Groups entities by proximity (or by exact block boundaries when supplied)
        to form individual work experience records.

        Args:
            positions_data:   List of {type, text, start, end} entity dicts.
            text:             Original experience section text for context.
            block_boundaries: Optional list of (start, end) tuples, one per split
                              record, injected by deberta_ner_parser.py.  When
                              supplied, entity lookup is scoped per block instead
                              of using the fixed proximity window.
        Returns:
            List of structured work experience dictionaries.
        """
        # Separate entities by type with positions
        companies_raw = [e for e in positions_data if e['type'] == 'COMPANY']
        roles_raw = [e for e in positions_data if e['type'] == 'ROLE']
        locations = [e for e in positions_data if e['type'] == 'LOCATION']
        start_dates = [e for e in positions_data if e['type'] in ['START_DATE', 'DATE_START']]
        end_dates = [e for e in positions_data if e['type'] in ['END_DATE', 'DATE_END']]
        clients_raw = [e for e in positions_data if e['type'] == 'CLIENT']
        
        # Filter out technology keywords and generic descriptors from roles
        roles = []
        filtered_roles_count = 0
        for role in roles_raw:
            role_text = role['text'].lower().strip()
            
            # Check if it's an exact match with tech keywords
            if role_text in self.tech_keywords:
                filtered_roles_count += 1
                self.logger.debug(f"🔧 Filtered tech keyword from roles: '{role['text']}'")
                continue
                
            # Check if all words are tech keywords
            words = re.split(r'[\s/,\-\&]+', role_text)
            words = [w.strip() for w in words if w.strip()]
            if words:
                ignore_words = {'and', 'or', 'with', 'in', 'on', 'at', 'using', 'from', 'to'}
                all_tech = True
                for word in words:
                    word_clean = re.sub(r'\.js$', '', word)
                    if word_clean not in self.tech_keywords and word not in self.tech_keywords and word not in ignore_words:
                        all_tech = False
                        break
                if all_tech:
                    filtered_roles_count += 1
                    self.logger.debug(f"🔧 Filtered technology list from roles: '{role['text']}'")
                    continue
            
            roles.append(role)
        
        # ── REQUIREMENT 3: Multi-line Role Reconstruction - Preserve Complete Titles ─────
        # Merge adjacent ROLE entities that are close together (within 50 chars)
        # Example: "POWER BI" + "DEVELOPER" + "DATA MODELER" → "POWER BI DEVELOPER DATA MODELER"
        # Do NOT truncate multi-line roles
        # Do NOT merge roles belonging to different jobs
        
        # ── STEP 6: ROLE RECONSTRUCTION DEBUG LOGGING ─────────────────────────────
        logger.info("=" * 80)
        logger.info("STEP 6: ROLE RECONSTRUCTION - Multi-line Role Merging")
        logger.info("=" * 80)
        logger.info(f"Original ROLE entities: {len(roles_raw)}")
        for i, role in enumerate(roles_raw):
            logger.info(f"  ROLE {i + 1}: \"{role['text']}\" (pos: {role['start']}-{role['end']})")
        logger.info("-" * 80)
        # ── END STEP 6 START ───────────────────────────────────────────────────────
        
        if len(roles) > 1:
            merged_roles = []
            i = 0
            while i < len(roles):
                current_role = roles[i]
                merged_text = current_role['text']
                merged_start = current_role['start']
                merged_end = current_role['end']
                
                # Check if next role is adjacent (within 50 characters)
                j = i + 1
                while j < len(roles):
                    next_role = roles[j]
                    distance = next_role['start'] - merged_end
                    if distance <= 50:  # Adjacent roles
                        merged_text += ' ' + next_role['text']
                        merged_end = next_role['end']
                        j += 1
                    else:
                        break
                
                if j > i + 1:
                    # Merged multiple roles
                    self.logger.debug(f"🔀 Merged {j-i} adjacent roles: '{merged_text}'")
                    merged_roles.append({
                        'type': 'ROLE',
                        'text': merged_text,
                        'start': merged_start,
                        'end': merged_end
                    })
                    i = j
                else:
                    # No merge needed
                    merged_roles.append(current_role)
                    i += 1
            
            roles = merged_roles
            self.logger.info(f"🔀 Multi-line role reconstruction: {len(roles_raw)} → {len(roles)} roles")
            
            # ── STEP 6: LOG MERGED ROLES ─────────────────────────────────────────────
            logger.info("Merged ROLE entities:")
            for i, role in enumerate(roles):
                logger.info(f"  ROLE {i + 1}: \"{role['text']}\" (pos: {role['start']}-{role['end']})")
            logger.info("-" * 40)
            # ── END STEP 6 MERGES ────────────────────────────────────────────────────
        
        logger.info("=" * 80)
        # ── END STEP 6 ───────────────────────────────────────────────────────────
            
        if filtered_roles_count > 0:
            self.logger.info(f"🔧 Filtered {filtered_roles_count} technology keywords from {len(roles_raw)} roles")
        
        # Filter out technology keywords from companies
        companies = []
        filtered_count = 0
        for company in companies_raw:
            company_text = company['text'].lower().strip()
            
            # ── FIX 6: Prevent Project/Assignment from being treated as Company ─────
            # Only treat as company if NER predicts COMPANY or CLIENT OR matches organization dictionary
            # Otherwise, store as project_name or assignment_name (not implemented here, just filter)
            project_assignment_keywords = ['project', 'assignment']
            if any(keyword in company_text for keyword in project_assignment_keywords):
                # Check if it's actually a company name containing "project" or "assignment"
                # (e.g., "Project Management Inc." would be valid, but "Project: Claims Portal" would not)
                # For now, filter out pure Project/Assignment headers
                if company_text in project_assignment_keywords or company_text.startswith('project:') or company_text.startswith('assignment:'):
                    filtered_count += 1
                    self.logger.debug(f"🔧 Filtered Project/Assignment header: '{company['text']}'")
                    continue
            
            # ── FIX 22: Prevent Environment/Technologies from being treated as Company ───
            # Environment headers like "Environment:", "Technologies:", "Tech Stack:" should not be companies
            env_headers = ['environment:', 'technologies:', 'technology stack:', 'tech stack:', 'tools used:', 'frameworks:', 'platforms:', 'libraries:']
            if any(company_text.startswith(header) for header in env_headers):
                filtered_count += 1
                self.logger.debug(f"🔧 Filtered Environment/Technologies header: '{company['text']}'")
                continue
            
            # Check if it's an exact match with tech keywords
            if company_text in self.tech_keywords:
                filtered_count += 1
                self.logger.debug(f"🔧 Filtered tech keyword: '{company['text']}'")
                continue
            
            # Check if all words are tech keywords (representing a tech list rather than a company)
            # Split by spaces, slashes, commas, ampersands, and hyphens
            words = re.split(r'[\s/,\-\&]+', company_text)
            words = [w.strip() for w in words if w.strip()]
            
            if words:
                ignore_words = {'and', 'or', 'with', 'in', 'on', 'at', 'using', 'from', 'to'}
                all_tech = True
                for word in words:
                    # Clean the word from version/JS extensions (e.g. node.js -> node)
                    word_clean = re.sub(r'\.js$', '', word)
                    if word_clean not in self.tech_keywords and word not in self.tech_keywords and word not in ignore_words:
                        all_tech = False
                        break
                if all_tech:
                    filtered_count += 1
                    self.logger.debug(f"🔧 Filtered technology list: '{company['text']}'")
                    continue
            
            # Check if it's a very short name (likely an acronym for a tech)
            if len(company_text) <= 2 and company_text not in ['ge', 'hp', 'at&t']:
                filtered_count += 1
                self.logger.debug(f"🔧 Filtered short name: '{company['text']}'")
                continue
            
            companies.append(company)
        
        if filtered_count > 0:
            self.logger.info(f"🔧 Filtered {filtered_count} technology keywords from {len(companies_raw)} companies")
            
        # Treat standalone CLIENT entities as fallback COMPANY anchors if they are:
        # 1. Far from any company (min_company_dist > 150 chars) or no companies exist, AND
        # 2. Closer to a nearby role/date than any company is.
        client_fallback_added = 0
        for client in clients_raw:
            client_pos = client['start']
            
            # Compute distance to closest company
            min_company_dist = float('inf')
            for company in companies:
                min_company_dist = min(min_company_dist, abs(company['start'] - client_pos))
            
            # If there is a company close to this client, it is not a standalone anchor
            if min_company_dist <= 150:
                continue
                
            is_anchor = False
            
            # Look at nearby roles and dates
            nearby_entities = [e for e in positions_data if e['type'] in ['ROLE', 'START_DATE', 'DATE_START', 'END_DATE', 'DATE_END']]
            
            for entity in nearby_entities:
                ent_pos = entity['start']
                dist_to_client = abs(ent_pos - client_pos)
                
                if dist_to_client <= 150:  # Reasonably close
                    # Check if any company is closer to this entity
                    company_closer = False
                    for company in companies:
                        dist_to_company = abs(ent_pos - company['start'])
                        if dist_to_company < dist_to_client:
                            company_closer = True
                            break
                    
                    if not company_closer:
                        is_anchor = True
                        break
            
            if not companies:
                is_anchor = True
                
            if is_anchor:
                # Check if this client text is already added to companies to prevent duplicates
                if not any(c['text'] == client['text'] and abs(c['start'] - client['start']) < 10 for c in companies):
                    companies.append({
                        'type': 'COMPANY',
                        'text': client['text'],
                        'start': client['start'],
                        'end': client['end'],
                        'is_fallback_client': True
                    })
                    client_fallback_added += 1
                
        if client_fallback_added > 0:
            self.logger.info(f"💼 Treated {client_fallback_added} standalone CLIENT entities as company anchors")
        
        self.logger.info(f" Position-based entities: {len(companies)} companies (after filtering), {len(roles)} roles, {len(locations)} locations")
        
        # Fallback: If no companies but we have roles, try to extract companies from text using regex
        if not companies and roles:
            self.logger.warning("⚠️ No companies extracted by DeBERTa, attempting regex fallback...")
            companies = self._extract_companies_regex(text, positions_data)
            self.logger.info(f"📝 Regex fallback found {len(companies)} companies")
        
        if not companies:
            self.logger.warning("No companies found - cannot build experiences")
            return []
        
        # Sort companies by position
        companies.sort(key=lambda x: x['start'])
        
        experiences = []
        proximity_window = 250  # Fallback when no block boundaries are available

        # Ensure block_boundaries is always a list (never None)
        if block_boundaries is None:
            block_boundaries = []

        # ── Entity consumption tracking ───────────────────────────────────────
        used_entity_positions: set = set()
        
        # ── Validation logging ───────────────────────────────────────────────
        company_count = len(companies)
        ner_call_count = company_count  # One NER call per company
        
        # ── STEP 4: EXPERIENCE GROUPING DEBUG LOGGING ─────────────────────────
        logger.info("=" * 80)
        logger.info("STEP 4: EXPERIENCE GROUPING - Entity Clustering")
        logger.info("=" * 80)
        logger.info(f"Total Companies to Process: {len(companies)}")
        logger.info(f"Proximity Window: {proximity_window} characters")
        logger.info("-" * 80)
        # ── END STEP 4 START ───────────────────────────────────────────────────
        
        for i, company in enumerate(companies):
            company_pos = company['start']

            # ── FIX 4: Use block-scoped window when boundaries are available ──
            # When block_boundaries is populated (by the NER parser), each company
            # belongs to exactly one block.  Use that block's [start, end] as the
            # search window so entities from adjacent records can never bleed in.
            window_start = None
            window_end = None
            for b_start, b_end in block_boundaries:
                if b_start <= company_pos <= b_end:
                    window_start = b_start
                    window_end = b_end
                    break
            if window_start is None:
                # Fallback: classic proximity window
                window_start = max(0, company_pos - proximity_window)
                window_end = company_pos + proximity_window
            
            # Find entities within proximity window — skipping already-consumed ones
            # ── REQUIREMENT 8: LOCATION OWNERSHIP ─────────────────────────────────────
            # Assign nearest location to owning experience
            # Prevent location bleeding
            # Support: City, City, State, City, Country, City, State, Country
            nearby_role = self._find_entity_in_window(
                roles, window_start, window_end, company_pos,
                exclude_positions=used_entity_positions
            )
            nearby_location = self._find_entity_in_window(
                locations, window_start, window_end, company_pos,
                exclude_positions=used_entity_positions
            )
            
            # ── STEP 8: LOCATION ASSOCIATION DEBUG LOGGING (deferred until company_text is set) ─
            # ── REQUIREMENT 9: DATE OWNERSHIP ─────────────────────────────────────────
            # Associate nearest start/end dates
            # Prevent date bleeding
            # Normalize: Jan 2023, January 2023, 01/2023, 2023-01, Present, Current, Now, Till Date
            nearby_start_date = self._find_entity_in_window(
                start_dates, window_start, window_end, company_pos,
                exclude_positions=used_entity_positions
            )
            nearby_end_date = self._find_entity_in_window(
                end_dates, window_start, window_end, company_pos,
                exclude_positions=used_entity_positions
            )
            nearby_client = self._find_entity_in_window(
                clients_raw, window_start, window_end, company_pos,
                exclude_positions=used_entity_positions
            )

            # ── FIX 1: Initialize company_text and client_name before use ─────────────
            company_text = company['text']

            # ── STEP 8: LOCATION ASSOCIATION DEBUG LOGGING ─────────────────────────────
            logger.info(f"Experience {i + 1} - Location Association:")
            logger.info(f"  Detected LOCATION: {nearby_location['text'] if nearby_location else 'None'}")
            logger.info(f"  ↓")
            logger.info(f"  Assigned to: Experience {i + 1} ({company_text})")
            logger.info(f"  Reason: Proximity window search (within {proximity_window} chars of company)")
            logger.info("-" * 40)
            # ── END STEP 8 ───────────────────────────────────────────────────────────
            
            # ── REQUIREMENT 3: COMPANY RECONSTRUCTION - Preserve Complete Names ─────────
            # Preserve complete multi-word company names
            # Never split: Wells Fargo, Tech Mahindra, Amazon Web Services, Microsoft Azure, Oracle Cloud, Google Cloud Platform
            # Use semantic grouping from DeBERTa entities
            # Company text is already complete from DeBERTa extraction
            
            # ── REQUIREMENT 2: COMPANY/CLIENT RESOLUTION - Enhanced Header Support ─────────
            # Support: Company, Employer, Organization, Worked For, Vendor, Consulting Company
            # Treat these headers as COMPANY anchors
            # If the text contains these headers, extract the actual company name
            company_headers = ['company:', 'employer:', 'organization:', 'worked for:', 'vendor:', 'consulting company:']
            for header in company_headers:
                if company_text.lower().startswith(header):
                    # Extract the actual company name after the header
                    company_text = company_text[len(header):].strip()
                    self.logger.debug(f"  🏢 Expanded company header '{header}': '{company_text}'")
                    break
            
            client_name = ''
            
            # ── NEW LOGIC: Create experience record whenever Company exists OR Client exists ──
            # Skip ONLY when both Company and Client are missing
            # This preserves all valid employment records even when Role/Location/Date are missing
            # ── REQUIREMENT 12: PARTIAL RECORD PRESERVATION ─────────────────────────────
            # Never discard an experience because one field is missing
            # Return partial records with null fields
            if not company_text and not client_name:
                self.logger.warning(f"  ⚠️ Skipping block {i+1}: no company or client found")
                continue
            
            # Check if end date indicates current position
            is_current = False
            end_date_text = nearby_end_date['text'] if nearby_end_date else None
            if end_date_text:
                end_date_lower = end_date_text.lower()
                if 'present' in end_date_lower or 'current' in end_date_lower:
                    is_current = True
                    end_date_text = None
            
            # ── STEP 7: DATE ASSOCIATION DEBUG LOGGING ───────────────────────────────
            logger.info(f"Experience {i + 1} - Date Association:")
            logger.info(f"  Detected START_DATE: {nearby_start_date['text'] if nearby_start_date else 'None'}")
            logger.info(f"  Detected END_DATE: {end_date_text if end_date_text else ('None (is_current=' + str(is_current) + ')' if is_current else 'None')}")
            logger.info(f"  ↓")
            logger.info(f"  Assigned to: Experience {i + 1} ({company_text})")
            logger.info(f"  Reason: Proximity window search (within {proximity_window} chars of company)")
            logger.info("-" * 40)
            # ── END STEP 7 ───────────────────────────────────────────────────────────
            
            role_text = nearby_role['text'] if nearby_role else ''
            
            # ── FIX 12: Remove Present/Current from Role ───────────────────────────
            # Example: "DevOps Engineer Present" → "DevOps Engineer" with is_current=true
            if role_text:
                role_lower = role_text.lower()
                current_indicators = ['present', 'current', 'now', 'till date', 'presently']
                for indicator in current_indicators:
                    if indicator in role_lower:
                        # Remove the indicator from role text
                        role_text = re.sub(r'\s*(' + '|'.join(current_indicators) + r')\s*$', '', role_text, flags=re.IGNORECASE)
                        role_text = role_text.strip()
                        # Set is_current flag (will be checked later)
                        self.logger.debug(f"  🔀 Removed '{indicator}' from role: '{role_text}'")
                        break
            
            # Check if they're swapped (company looks like role, role looks like company)
            if role_text and self._looks_like_company(role_text) and self._looks_like_role(company_text):
                # Swap them
                self.logger.info(f"  🔄 Swapped: '{company_text}' (was company) ↔ '{role_text}' (was role)")
                company_text, role_text = role_text, company_text
            
            # ── Company / Client Mapping Rules ───────────────────────────────────
            # CASE 1: Company exists, Client missing → company_name = Company, client_name = null
            # CASE 2: Client exists, Company missing → company_name = Client, client_name = Client
            # CASE 3: Both exist → company_name = Company, client_name = Client
            # client_name already initialized above
            
            if nearby_client:
                client_text = nearby_client['text']
                # Phase 15: Client Validation
                if not self._validate_client(client_text):
                    self.logger.warning(f"  ⚠️ Client validation rejected: '{client_text}'")
                    nearby_client = None
                else:
                    # CASE 3: Both Company and Client exist
                    if company_text and client_text != company_text:
                        client_name = client_text
                        self.logger.info(f"  👤 Client detected: '{client_name}' (Employer: '{company_text}')")
                    # CASE 2: Only Client exists (no Company)
                    elif not company_text:
                        company_text = client_text  # Set company_name to client_name
                        client_name = client_text
                        self.logger.info(f"  👤 Client-only: Using '{client_text}' as both company and client")
            # CASE 1: Only Company exists (no Client) - already handled by default
            
            # ── REQUIREMENT 17: Soft Validation - Reduce confidence instead of rejecting ─────
            # Check if company is a valid tech company (e.g., Amazon Web Services, Oracle Cloud)
            # If so, reduce confidence instead of rejecting
            confidence_penalty = 0.0
            if company_text:
                company_lower = company_text.lower().strip()
                if company_lower in self.valid_tech_companies:
                    # Valid tech company - reduce confidence slightly
                    confidence_penalty = 0.05
                    self.logger.debug(f"  📊 Valid tech company detected: '{company_text}' (confidence penalty: -{confidence_penalty})")
                elif self._reject_technology_companies(company_text):
                    # Invalid tech company - reject
                    self.logger.warning(f"  ⚠️ Company rejected as technology: '{company_text}'")
                    company_text = None
            
            # ── Role normalization (Problem 8 fix) ───────────────────────────
            # Normalize role text with confidence threshold
            if role_text:
                role_text = self._normalize_role(role_text)
                # Phase 16: Role Validation
                if not self._validate_role(role_text):
                    self.logger.warning(f"  ⚠️ Role validation rejected: '{role_text}'")
                    role_text = None  # Reject invalid role
            
            # ── Phase 25: Original + Normalized Values ─────────────────────────────
            # Preserve original values for ATS matching
            company_original = company['text'] if company else None
            role_original = nearby_role['text'] if nearby_role else None
            location_original = nearby_location['text'] if nearby_location else None
            location_normalized = None
            if nearby_location:
                location_normalized = self._normalize_location(nearby_location['text'])
            
            # ── REQUIREMENT 3: Role Reconstruction - Preserve Complete Titles ─────────────
            # Preserve complete role titles including:
            # - Power BI Developer / Data Modeler
            # - Data Engineer & Architect
            # - Java Developer | Tech Lead
            # - Cloud Engineer / DevOps Engineer
            # Do NOT truncate multi-line roles
            # Do NOT merge roles belonging to different jobs
            # Handle multiple separators: /, |, &
            if role_text:
                # Preserve complete role with multiple titles separated by /, |, or &
                # Don't split - keep as-is for ATS matching
                # Only remove Present/Current (already done above)
                self.logger.debug(f"  � Role preserved: '{role_text}'")
            
            # ── Phase 19: Entity Repair - Merge adjacent compatible entities ───────
            # This is handled by DeBERTa's aggregation strategy, but we can add post-processing
            # if needed for specific cases like "Morgan + Stanley"
            
            # ── Phase 20: Company Preservation - Ensure company names remain intact ───
            # This is handled by the position-based clustering which preserves full company names
            
            # ── REQUIREMENT 13: Dynamic Confidence Scoring ─────────────────────────────
            # Compute confidence dynamically from entity completeness
            # Base confidence: 0.95
            # Penalty for missing fields: -0.05 each
            # Penalty for valid tech company: -0.05
            # Range: 0.0 to 1.0
            # ── ISSUE 15: SOFT VALIDATION ─────────────────────────────────────────────
            # Do not reject organization names containing technology words
            # Examples: Amazon Web Services, Google Cloud Platform, Oracle Cloud, Microsoft Azure
            # Technology words should reduce confidence slightly instead of rejecting the company
            # This is handled by confidence_penalty for tech companies
            base_confidence = 0.95
            missing_field_penalty = 0.0
            
            if not company_text:
                missing_field_penalty += 0.15
            if not role_text:
                missing_field_penalty += 0.15
            if not nearby_location:
                missing_field_penalty += 0.10
            if not nearby_start_date:
                missing_field_penalty += 0.10
            if not nearby_end_date and not is_current:
                missing_field_penalty += 0.10
            if not client_name:
                missing_field_penalty += 0.05  # Optional field, smaller penalty
            
            dynamic_confidence = base_confidence - missing_field_penalty - confidence_penalty
            dynamic_confidence = max(0.0, min(1.0, dynamic_confidence))  # Clamp to [0.0, 1.0]
            
            # ── REQUIREMENT 6 & 7: Description and Environment Reconstruction ─────────────
            # Extract description and environment from text within the proximity window
            # Attach responsibilities bullets to the nearest experience
            # Stop description when another experience anchor begins
            # ── REQUIREMENT 6: DESCRIPTION OWNERSHIP ─────────────────────────────────────
            # Responsibilities must belong only to nearest semantic experience
            # Never bleed descriptions across jobs
            # Never truncate because of proximity window
            # Stop only at next semantic anchor
            # ── ISSUE 6: DESCRIPTION CONTINUITY ─────────────────────────────────────────
            # Preserve complete responsibility blocks
            # Do not truncate descriptions because of fixed character limits
            # Description should continue until: next semantic experience, next section, next education block, next certification block, next project block
            # Preserve multiline bullets
            # ── ISSUE 17: MULTI-PAGE SUPPORT ─────────────────────────────────────────────
            # Descriptions continuing across pages must remain attached to same experience
            # Do not split because of page breaks
            # Semantic anchor-based approach handles page boundaries correctly
            # ── ISSUE 18: MULTI-COLUMN SUPPORT ─────────────────────────────────────────────
            # Support two-column resumes
            # Do not merge adjacent columns
            # Use semantic anchors instead of OCR order alone
            # Position-based clustering with semantic anchors handles multi-column layouts
            description_text = None
            environment_text = None
            
            if text and window_start < window_end:
                # Extract text within the proximity window
                window_text = text[max(0, window_start):min(len(text), window_end)]
                
                # Extract description (responsibilities, achievements, etc.)
                # ── STEP 9: DESCRIPTION RECONSTRUCTION DEBUG LOGGING ───────────────────
                logger.info(f"Experience {i + 1} - Description Reconstruction:")
                logger.info(f"  Window: {window_start} - {window_end}")
                logger.info(f"  Window text preview: {window_text[:100]}...")
                # ── END STEP 9 START ─────────────────────────────────────────────────────
                
                description_keywords = ['responsibilities', 'responsibility', 'duties', 'achievements', 'highlights', 'key highlights', 'description']
                for keyword in description_keywords:
                    if keyword.lower() in window_text.lower():
                        # Extract text after the keyword
                        keyword_pos = window_text.lower().find(keyword.lower())
                        if keyword_pos != -1:
                            description_text = window_text[keyword_pos + len(keyword):].strip()
                            # Stop at next company anchor or section header
                            for next_anchor in ['company:', 'employer:', 'organization:', 'worked for:', 'vendor:', 'consulting company:', 'client:', 'skills:', 'education:', 'certifications:', 'projects:']:
                                if next_anchor in description_text.lower():
                                    anchor_pos = description_text.lower().find(next_anchor)
                                    if anchor_pos != -1:
                                        description_text = description_text[:anchor_pos].strip()
                                        break
                            
                            # ── STEP 9: LOG DESCRIPTION EXTRACTION ───────────────────────────
                            logger.info(f"  Description keyword found: '{keyword}'")
                            logger.info(f"  Description start position: {keyword_pos}")
                            logger.info(f"  Description text: {description_text[:100]}...")
                            logger.info(f"  Stop reason: Next semantic anchor or section header")
                            logger.info("-" * 40)
                            # ── END STEP 9 ───────────────────────────────────────────────────
                            break
                
                # Extract environment (tech stack, tools, frameworks)
                # ── REQUIREMENT 7: ENVIRONMENT EXTRACTION ─────────────────────────────────
                # Extract: Environment, Technologies, Tech Stack, Tools, Frameworks, Libraries, Platforms
                # into environment and technologies_used fields
                # Do not merge into company
                # Do not merge into description
                
                # ── STEP 10: ENVIRONMENT EXTRACTION DEBUG LOGGING ───────────────────────
                logger.info(f"Experience {i + 1} - Environment Extraction:")
                logger.info(f"  Window text preview: {window_text[:100]}...")
                # ── END STEP 10 START ───────────────────────────────────────────────────────
                
                environment_keywords = ['environment', 'technologies', 'technology stack', 'tech stack', 'tools used', 'frameworks', 'platforms', 'libraries', 'cloud services', 'software used', 'development tools']
                for keyword in environment_keywords:
                    if keyword.lower() in window_text.lower():
                        # Extract text after the keyword
                        keyword_pos = window_text.lower().find(keyword.lower())
                        if keyword_pos != -1:
                            environment_text = window_text[keyword_pos + len(keyword):].strip()
                            # Stop at next company anchor or section header
                            for next_anchor in ['company:', 'employer:', 'organization:', 'worked for:', 'vendor:', 'consulting company:', 'client:', 'skills:', 'education:', 'certifications:', 'projects:']:
                                if next_anchor in environment_text.lower():
                                    anchor_pos = environment_text.lower().find(next_anchor)
                                    if anchor_pos != -1:
                                        environment_text = environment_text[:anchor_pos].strip()
                                        break
                            
                            # ── STEP 10: LOG ENVIRONMENT EXTRACTION ─────────────────────────
                            logger.info(f"  Environment keyword found: '{keyword}'")
                            logger.info(f"  Environment start position: {keyword_pos}")
                            logger.info(f"  Environment text: {environment_text[:100]}...")
                            logger.info(f"  Stop reason: Next semantic anchor or section header")
                            logger.info(f"  Stored in: environment and technologies_used fields")
                            logger.info("-" * 40)
                            # ── END STEP 10 ───────────────────────────────────────────────────
                            break
            
            # ── Partial Record Preservation: Populate every extracted entity independently ──
            # Missing values must be null (not empty string)
            # Never omit keys, never remove keys
            exp = {
                'job_title': role_text if role_text else None,
                'job_title_original': role_original,  # Phase 25
                'company_name': company_text if company_text else None,
                'company_name_original': company_original,  # Phase 25
                'location': nearby_location['text'] if nearby_location else None,
                'location_original': location_original,  # Phase 25
                'location_normalized': location_normalized,  # Feature 5
                'start_date': self._parse_date(nearby_start_date['text']) if nearby_start_date else None,
                'end_date': self._parse_date(end_date_text) if end_date_text and not is_current else None,
                'is_current': is_current,
                'client': client_name if client_name else None,
                'clients': [client_name] if client_name else [],
                'description': description_text if description_text else None,  # REQUIREMENT 6: Description reconstruction
                'environment': environment_text if environment_text else None,  # REQUIREMENT 7: Environment extraction
                'technologies_used': environment_text if environment_text else None,  # REQUIREMENT 7: Technologies extraction
                'confidence': dynamic_confidence,  # REQUIREMENT 13: Dynamic confidence
                'quality_score': None,  # Feature 16: Will be calculated after full exp is built
                'source': 'deberta_ner',  # REQUIREMENT 15: SOURCE PRESERVATION
                'builder': 'position_based',  # Phase 24
                'validator': 'validated',  # Phase 24
                'anchor_type': 'company_client'  # Phase 24
            }
            
            experiences.append(exp)
            
            # ── FIX 16: Entity Consumption AFTER successful experience creation ───────
            # Mark claimed entities as consumed ONLY AFTER successful experience creation
            
            # ── STEP 16: ENTITY CONSUMPTION DEBUG LOGGING ─────────────────────────────
            logger.info(f"Experience {i + 1} - Entity Consumption:")
            consumed_entities = []
            for matched in [nearby_role, nearby_location, nearby_start_date,
                            nearby_end_date, nearby_client]:
                if matched:
                    consumed_entities.append(f"{matched['type']}: {matched['text']} (pos: {matched['start']})")
            if consumed_entities:
                logger.info(f"  Entities consumed: {', '.join(consumed_entities)}")
            else:
                logger.info(f"  Entities consumed: None")
            logger.info(f"  Reason: Proximity window search (within {proximity_window} chars)")
            logger.info("-" * 40)
            # ── END STEP 16 ───────────────────────────────────────────────────────────
            
            for matched in [nearby_role, nearby_location, nearby_start_date,
                            nearby_end_date, nearby_client]:
                if matched:
                    used_entity_positions.add(matched['start'])
            
            # Safeguard 9: Experience Source Lock - Validate source
            if not self._validate_experience_source(exp):
                self.logger.warning(f"  ⚠️ Experience source validation failed, removing record")
                experiences.pop()  # Remove invalid experience
            
            # Safeguard 14: Experience Builder Contract - Validate contract
            if not self._validate_experience_contract(exp):
                self.logger.warning(f"  ⚠️ Experience contract validation failed, removing record")
                experiences.pop()  # Remove invalid experience
            
            # ── STEP 12: VALIDATION DEBUG LOGGING ───────────────────────────────────
            logger.info(f"Experience {i + 1} - Validation:")
            logger.info(f"  Company validation: PASSED" if company_text else "  Company validation: FAILED (missing)")
            logger.info(f"  Role validation: PASSED" if role_text else "  Role validation: FAILED (missing)")
            logger.info(f"  Client validation: PASSED" if client_name else "  Client validation: N/A (optional)")
            logger.info(f"  Confidence: {dynamic_confidence:.2f}")
            logger.info(f"  Corrections: None (no corrections applied)")
            logger.info("-" * 40)
            # ── END STEP 12 ───────────────────────────────────────────────────────────
            
            # Log for debugging
            role_text_log = nearby_role['text'] if nearby_role else 'No role'
            start_text = nearby_start_date['text'] if nearby_start_date else 'No start'
            end_text = end_date_text or ('Present' if is_current else 'No end')
            self.logger.info(f"  ✓ Job {i+1}: {role_text_log} at {company['text']} ({start_text} - {end_text})")
            
            # ── STEP 4: LOG EXPERIENCE GROUP DETAILS ─────────────────────────────
            logger.info(f"Experience Group {i + 1}:")
            logger.info(f"  COMPANY: {company_text if company_text else 'None'}")
            logger.info(f"  CLIENT: {client_name if client_name else 'None'}")
            logger.info(f"  ROLE: {role_text if role_text else 'None'}")
            logger.info(f"  LOCATION: {nearby_location['text'] if nearby_location else 'None'}")
            logger.info(f"  START: {start_text}")
            logger.info(f"  END: {end_text}")
            logger.info(f"  IS_CURRENT: {is_current}")
            logger.info(f"  CONFIDENCE: {dynamic_confidence:.2f}")
            logger.info(f"  WINDOW: {window_start} - {window_end} (proximity: {proximity_window})")
            logger.info("-" * 40)
            # ── END STEP 4 GROUP DETAILS ────────────────────────────────────────
        
        # ── FIX 3: ROLE-anchor fallback sweep ──────────────────────────────────
        # If any ROLE entity was never consumed by the COMPANY loop, it means the
        # company name was missing from DeBERTa output for that job.
        # We still produce an experience record anchored on the ROLE.
        #
        # IMPORTANT: Do NOT filter by role text — two different jobs can share
        # the same title (e.g. "Java Developer" at American Airlines AND at HCL).
        # Only skip a role if its exact position was already consumed.
        if block_boundaries:
            # Track (block_start, role_start) pairs to avoid producing two records
            # for literally the same role token appearing twice in one block.
            seen_role_positions = set()

            for role in roles:
                role_pos = role['start']
                if role_pos in used_entity_positions:
                    continue  # Already claimed by a company-anchored record

                # Resolve block boundaries for this role
                r_block_start, r_block_end = None, None
                for b_start, b_end in block_boundaries:
                    if b_start <= role_pos <= b_end:
                        r_block_start, r_block_end = b_start, b_end
                        break

                if r_block_start is None:
                    continue  # Cannot determine block scope — skip

                # Guard against the same role token position being processed twice
                dedup_key = (r_block_start, role_pos)
                if dedup_key in seen_role_positions:
                    continue
                seen_role_positions.add(dedup_key)

                nearby_r_location = self._find_entity_in_window(
                    locations, r_block_start, r_block_end, role_pos,
                    exclude_positions=used_entity_positions
                )
                nearby_r_start = self._find_entity_in_window(
                    start_dates, r_block_start, r_block_end, role_pos,
                    exclude_positions=used_entity_positions
                )
                nearby_r_end = self._find_entity_in_window(
                    end_dates, r_block_start, r_block_end, role_pos,
                    exclude_positions=used_entity_positions
                )

                r_end_date_text = nearby_r_end['text'] if nearby_r_end else None
                r_is_current = False
                if r_end_date_text:
                    if 'present' in r_end_date_text.lower() or 'current' in r_end_date_text.lower():
                        r_is_current = True
                        r_end_date_text = None

                r_role_text = self._normalize_role(role['text'])
                if r_role_text and not self._validate_role(r_role_text):
                    r_role_text = None

                # Attempt to recover company name from the raw text around the block
                r_company_text = None
                if text and r_block_start is not None:
                    block_raw = text[r_block_start:min(r_block_end, r_block_start + 300)]
                    company_from_text = self._extract_companies_regex(block_raw, [
                        {'type': 'ROLE', 'text': role['text'],
                         'start': role_pos - r_block_start,
                         'end': role_pos - r_block_start + len(role['text'])}
                    ])
                    if company_from_text:
                        r_company_text = company_from_text[0]['text']

                fallback_exp = {
                    'job_title': r_role_text,
                    'job_title_original': role['text'],
                    'company_name': r_company_text,
                    'company_name_original': r_company_text,
                    'location': nearby_r_location['text'] if nearby_r_location else None,
                    'location_original': nearby_r_location['text'] if nearby_r_location else None,
                    'location_normalized': self._normalize_location(nearby_r_location['text']) if nearby_r_location else None,
                    'start_date': self._parse_date(nearby_r_start['text']) if nearby_r_start else None,
                    'end_date': self._parse_date(r_end_date_text) if r_end_date_text and not r_is_current else None,
                    'is_current': r_is_current,
                    'client': None,
                    'clients': [],
                    'description': None,
                    'environment': None,
                    'technologies_used': None,
                    'confidence': 0.65,  # Lower confidence — no COMPANY entity found
                    'quality_score': None,
                    'source': 'deberta_ner',
                    'builder': 'role_anchor_fallback',
                    'validator': 'validated',
                    'anchor_type': 'role_date'
                }

                logger.info(
                    f"[ROLE-FALLBACK] Creating record anchored on ROLE '{role['text']}' "
                    f"(pos={role_pos}, block={r_block_start}-{r_block_end})"
                )
                experiences.append(fallback_exp)

                # Mark consumed entities so they cannot be reused
                for matched in [role, nearby_r_location, nearby_r_start, nearby_r_end]:
                    if matched:
                        used_entity_positions.add(matched['start'])
        # ── END FIX 3 ────────────────────────────────────────────────────────


        # ── Phase 21: Duplicate Removal ───────────────────────────────────────
        experiences = self._remove_duplicates(experiences)

        # ── Phase 22: Experience Ordering ─────────────────────────────────────
        experiences = self._order_experiences(experiences)

        # ── Feature 16: Calculate Quality Scores ──────────────────────────────
        for exp in experiences:
            exp['quality_score'] = self._calculate_quality_score(exp)

        # ── Final count logging ───────────────────────────────────────────────
        experience_count = len(experiences)
        logger.info("=" * 80)
        logger.info("STEP 17: EXPERIENCE COUNT - Final Count")
        logger.info("=" * 80)
        logger.info(f"Total Companies Detected: {company_count}")
        logger.info(f"Total Experiences Built: {experience_count}")
        logger.info(f"Block boundaries used: {len(block_boundaries)}")
        logger.info(f"Role-anchor fallbacks applied: {'yes' if block_boundaries else 'no'}")
        logger.info("=" * 80)
        self.logger.info(f"📊 VALIDATION SUMMARY: {experience_count} experiences from "
                         f"{company_count} companies / {len(roles)} roles")

        if company_count != experience_count:
            self.logger.warning(
                f"⚠️ COUNT MISMATCH: {company_count} companies → {experience_count} experiences "
                f"(role-fallback may have added or removed records)"
            )

        return experiences


    def _find_entity_in_window(self, entities: List[Dict], window_start: int, window_end: int, 
                                anchor_pos: int,
                                exclude_positions: set = None) -> Dict:
        """
        Find the entity closest to anchor_pos within the given window.

        Args:
            entities:          List of entity dictionaries with 'start', 'end', 'text', 'type'
            window_start:      Start of search window (character position)
            window_end:        End of search window (character position)
            anchor_pos:        Anchor position (e.g., company position) to measure distance from
            exclude_positions: Set of entity 'start' positions already consumed by another company.
                               Entities whose start is in this set are skipped.
                               (Improves Problem 5: prevents cross-record entity sharing)
            
        Returns:
            Entity dictionary if found, None otherwise
        """
        if exclude_positions is None:
            exclude_positions = set()

        candidates = []
        
        for entity in entities:
            entity_pos = entity['start']
            # Skip entities already consumed by a closer company
            if entity_pos in exclude_positions:
                continue
            # Check if entity is within window
            if window_start <= entity_pos <= window_end:
                # Calculate distance from anchor
                distance = abs(entity_pos - anchor_pos)
                candidates.append((distance, entity))
        
        if not candidates:
            return None
        
        # Return the closest entity
        candidates.sort(key=lambda x: x[0])
        return candidates[0][1]
    
    def _build_experiences_by_company(self, text: str, companies: List[str], roles: List[str],
                                      start_dates: List[str], end_dates: List[str],
                                      locations: List[str], clients: List[str]) -> List[Dict[str, Any]]:
        """
        Build experiences using COMPANY names as anchors.
        Each company represents a separate work experience.
        
        Strategy:
        1. For each company, find its position in text
        2. Find the closest role, dates, and location AFTER that company
        3. Create one experience per company
        """
        experiences = []
        
        # Find positions of all entities
        company_positions = [(text.find(c), c) for c in companies if text.find(c) != -1]
        role_positions = [(text.find(r), r) for r in roles if text.find(r) != -1]
        start_date_positions = [(text.find(d), d) for d in start_dates if text.find(d) != -1]
        end_date_positions = [(text.find(d), d) for d in end_dates if text.find(d) != -1]
        location_positions = [(text.find(l), l) for l in locations if text.find(l) != -1]
        
        # Sort companies by position
        company_positions.sort(key=lambda x: x[0])
        
        self.logger.info(f"🏢 Found {len(company_positions)} companies in text at positions: {[pos for pos, _ in company_positions]}")
        
        # For each company, find the nearest entities
        for i, (company_pos, company_name) in enumerate(company_positions):
            # Define search windows
            prev_company_pos = company_positions[i - 1][0] if i > 0 else 0
            next_company_pos = company_positions[i + 1][0] if i + 1 < len(company_positions) else len(text)
            
            # Smart role detection - handle multiple formats:
            # Format 1: "Job Title\nCompany Name\nDates" (most common)
            # Format 2: "Company Name\nJob Title\nDates"
            # Format 3: "Job Title - Company Name" (same line)
            
            # Search BEFORE company (within 200 chars)
            role_search_start = max(prev_company_pos, company_pos - 200)
            role_before = self._find_nearest_entity_before(role_positions, role_search_start, company_pos)
            
            # Search AFTER company (within 200 chars)
            role_search_end = min(next_company_pos, company_pos + 200)
            role_after = self._find_nearest_entity(role_positions, company_pos, role_search_end)
            
            # Determine which role to use based on proximity
            role = self._choose_best_role(role_before, role_after, company_pos, role_positions, text)
            
            # Search for dates and location AFTER the company
            start_date = self._find_nearest_entity(start_date_positions, company_pos, next_company_pos)
            end_date = self._find_nearest_entity(end_date_positions, company_pos, next_company_pos)
            location = self._find_nearest_entity(location_positions, company_pos, next_company_pos)
            
            # Find the nearest client after the company
            client_positions = [(text.find(c), c) for c in clients if text.find(c) != -1]
            nearby_client = self._find_nearest_entity(client_positions, company_pos, next_company_pos)
            
            # Check if end date indicates current position
            is_current = False
            if end_date:
                end_date_lower = end_date.lower()
                if 'present' in end_date_lower or 'current' in end_date_lower:
                    is_current = True
                    end_date = None
            
            # ── Company / Client Mapping Rules (same as position-based method) ────
            # CASE 1: Company exists, Client missing → company_name = Company, client_name = null
            # CASE 2: Client exists, Company missing → company_name = Client, client_name = Client
            # CASE 3: Both exist → company_name = Company, client_name = Client
            client_name = None
            if nearby_client and nearby_client != company_name:
                client_name = nearby_client
            elif nearby_client and not company_name:
                # CASE 2: Only Client exists (no Company)
                company_name = nearby_client  # Set company_name to client_name
                client_name = nearby_client
            
            # ── Phase 25: Original + Normalized Values ─────────────────────────────
            # Preserve original values for ATS matching
            company_original = company_name
            role_original = role
            location_original = location
            location_normalized = None
            if location:
                location_normalized = self._normalize_location(location)
            
            # ── Phase 18: Multi Role Handling ───────────────────────────────────
            # Handle Data Engineer / Data Analyst format
            if role and '/' in role:
                # Split by / and take primary role (first one)
                roles_split = [r.strip() for r in role.split('/')]
                if roles_split:
                    role = roles_split[0]  # Use primary role
                    self.logger.info(f"  🔀 Multi-role detected: '{role_original}' → Primary: '{role}'")
            
            # ── Partial Record Preservation: Populate every extracted entity independently ──
            # Missing values must be null (not empty string)
            # Never omit keys, never remove keys
            exp = {
                'job_title': role if role else None,
                'job_title_original': role_original,  # Phase 25
                'company_name': company_name if company_name else None,
                'company_name_original': company_original,  # Phase 25
                'location': location if location else None,
                'location_original': location_original,  # Phase 25
                'location_normalized': location_normalized,  # Feature 5
                'start_date': self._parse_date(start_date) if start_date else None,
                'end_date': self._parse_date(end_date) if end_date and not is_current else None,
                'is_current': is_current,
                'client': client_name if client_name else None,
                'clients': [client_name] if client_name else [],
                'description': None,  # Description extraction not implemented in current flow
                'environment': None,  # Phase 10
                'technologies_used': None,  # Phase 10
                'confidence': 0.95,  # Phase 23: Default confidence
                'quality_score': None,  # Feature 16: Will be calculated after full exp is built
                'source': 'deberta_ner',  # Phase 24
                'builder': 'company_based',  # Phase 24
                'validator': 'validated',  # Phase 24
                'anchor_type': 'company_client'  # Phase 24
            }
            
            experiences.append(exp)
            
            # Safeguard 9: Experience Source Lock - Validate source
            if not self._validate_experience_source(exp):
                self.logger.warning(f"  ⚠️ Experience source validation failed, removing record")
                experiences.pop()  # Remove invalid experience
            
            # Safeguard 14: Experience Builder Contract - Validate contract
            if not self._validate_experience_contract(exp):
                self.logger.warning(f"  ⚠️ Experience contract validation failed, removing record")
                experiences.pop()  # Remove invalid experience
            
            self.logger.info(f"  ✓ Experience {i+1}: {role or 'No role'} at {company_name} ({start_date or 'No start'} - {end_date or 'Present' if is_current else 'No end'})")
        
        return experiences
    
    def _validate_client(self, client_text: str) -> bool:
        """
        Phase 15: Client Validation
        
        Accept only organizations. Reject:
        - Pipeline
        - Workflow
        - Storage
        - Metrics
        - Verb
        - Technology
        - Action sentence
        
        Args:
            client_text: Client name to validate
            
        Returns:
            True if valid client, False otherwise
        """
        if not client_text or not client_text.strip():
            return False
        
        client_lower = client_text.lower().strip()
        
        # Reject technology keywords
        if client_lower in self.tech_keywords:
            self.logger.debug(f"🔧 Client validation rejected (tech keyword): '{client_text}'")
            return False
        
        # Reject action verbs and workflow-related terms
        action_verbs = ['pipeline', 'workflow', 'storage', 'metrics', 'monitoring', 
                        'deployment', 'integration', 'migration', 'implementation',
                        'architecture', 'design', 'development', 'engineering']
        
        if client_lower in action_verbs:
            self.logger.debug(f"🔧 Client validation rejected (action verb): '{client_text}'")
            return False
        
        # Reject if it's a sentence (contains verbs like 'developed', 'implemented', etc.)
        sentence_patterns = ['developed', 'implemented', 'designed', 'created', 'managed',
                           'built', 'enhanced', 'optimized', 'maintained', 'supported']
        
        if any(pattern in client_lower for pattern in sentence_patterns):
            self.logger.debug(f"🔧 Client validation rejected (sentence): '{client_text}'")
            return False
        
        # Accept if it looks like an organization (capitalized, multiple words, or known company pattern)
        # This is a basic heuristic - could be enhanced with a company dictionary
        if client_lower[0].isupper() or ' ' in client_text or len(client_text.split()) > 1:
            return True
        
        return True
    
    def _validate_role(self, role_text: str) -> bool:
        """
        Phase 16: Role Validation
        
        Validate against role taxonomy. Reject:
        - Pipeline
        - Migration
        - Storage
        - Workflow
        - API
        - Deployment
        - Backend Development
        - Monitoring
        - Description sentence
        - Environment sentence
        
        Args:
            role_text: Role name to validate
            
        Returns:
            True if valid role, False otherwise
        """
        if not role_text or not role_text.strip():
            return False
        
        role_lower = role_text.lower().strip()
        
        # Reject technology keywords
        if role_lower in self.tech_keywords:
            self.logger.debug(f"🔧 Role validation rejected (tech keyword): '{role_text}'")
            return False
        
        # Reject workflow/infrastructure terms
        workflow_terms = ['pipeline', 'migration', 'storage', 'workflow', 'api',
                        'deployment', 'monitoring', 'architecture', 'integration',
                        'backend development', 'frontend development', 'full stack development']
        
        if any(term in role_lower for term in workflow_terms):
            self.logger.debug(f"🔧 Role validation rejected (workflow term): '{role_text}'")
            return False
        
        # Reject if it's a description sentence
        sentence_patterns = ['developed', 'implemented', 'designed', 'created', 'managed',
                           'built', 'enhanced', 'optimized', 'maintained', 'supported',
                           'responsible for', 'worked on', 'involved in']
        
        if any(pattern in role_lower for pattern in sentence_patterns):
            self.logger.debug(f"🔧 Role validation rejected (sentence): '{role_text}'")
            return False
        
        # Accept if it contains job title keywords
        job_keywords = ['developer', 'engineer', 'manager', 'architect', 'analyst',
                       'designer', 'consultant', 'specialist', 'lead', 'senior',
                       'junior', 'trainee', 'intern', 'director', 'coordinator',
                       'programmer', 'administrator', 'technician', 'principal',
                       'vp', 'president', 'founder', 'ceo', 'cto', 'cfo']
        
        if any(keyword in role_lower for keyword in job_keywords):
            return True
        
        # Accept multi-word titles (likely legitimate)
        if len(role_text.split()) >= 2:
            return True
        
        # Accept single-word professional titles
        professional_titles = ['ceo', 'cto', 'cfo', 'vp', 'president', 'founder']
        if role_lower in professional_titles:
            return True
        
        return False
    
    def _remove_duplicates(self, experiences: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Phase 21: Duplicate Removal
        
        Merge duplicate Company, Role, Date, Location, Client.
        
        Args:
            experiences: List of experience dictionaries
            
        Returns:
            List with duplicates removed
        """
        seen = set()
        unique_experiences = []
        
        for exp in experiences:
            # Create a signature for duplicate detection
            signature = (
                exp.get('company_name', ''),
                exp.get('job_title', ''),
                exp.get('start_date', ''),
                exp.get('end_date', ''),
                exp.get('location', ''),
                exp.get('client', '')
            )
            
            if signature not in seen:
                seen.add(signature)
                unique_experiences.append(exp)
            else:
                self.logger.debug(f"🔧 Duplicate removed: {exp.get('company_name')} - {exp.get('job_title')}")
        
        return unique_experiences
    
    def _order_experiences(self, experiences: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Phase 22: Experience Ordering
        
        Sort final experience newest to oldest. Maintain resume chronology.
        
        Args:
            experiences: List of experience dictionaries
            
        Returns:
            List sorted by date (newest first)
        """
        def get_sort_key(exp):
            # Sort by start_date (descending), with current positions first
            start_date = exp.get('start_date')
            is_current = exp.get('is_current', False)
            
            if is_current:
                return (0, '')  # Current positions first
            elif start_date:
                return (1, start_date)  # Then by start date
            else:
                return (2, '')  # No date last
        
        return sorted(experiences, key=get_sort_key)
    
    def _normalize_location(self, location_text: str) -> str:
        """
        Feature 5: Location Normalization
        Feature 18: International Resume Support
        
        Normalize location formats:
        Dallas TX → Dallas, TX
        Dallas,TX → Dallas, TX
        Dallas Texas → Dallas, TX
        
        International formats:
        London, UK → London, UK
        Toronto, Ontario → Toronto, ON
        Berlin, Germany → Berlin, Germany
        Mumbai, India → Mumbai, India
        
        Args:
            location_text: Raw location text
            
        Returns:
            Normalized location in "City, State/Province/Country" format
        """
        import re
        
        if not location_text or not location_text.strip():
            return location_text
        
        location = location_text.strip()
        
        # US State abbreviations mapping
        us_states = {
            'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
            'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
            'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
            'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
            'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
            'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
            'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
            'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
            'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
            'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
            'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
            'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
            'wisconsin': 'WI', 'wyoming': 'WY'
        }
        
        # Canadian provinces mapping
        ca_provinces = {
            'alberta': 'AB', 'british columbia': 'BC', 'manitoba': 'MB',
            'new brunswick': 'NB', 'newfoundland': 'NL', 'nova scotia': 'NS',
            'ontario': 'ON', 'prince edward island': 'PE', 'quebec': 'QC',
            'saskatchewan': 'SK', 'northwest territories': 'NT', 'nunavut': 'NU',
            'yukon': 'YT'
        }
        
        # Pattern 1: "City State" (space separated) → "City, State"
        # Match: Dallas TX, Dallas Texas
        pattern1 = re.compile(r'^([A-Za-z\s]+?)\s+([A-Za-z]+)$')
        match1 = pattern1.match(location)
        if match1:
            city = match1.group(1).strip()
            state = match1.group(2).strip()
            
            # Convert full state name to abbreviation
            state_lower = state.lower()
            if state_lower in us_states:
                state = us_states[state_lower]
            elif state_lower in ca_provinces:
                state = ca_provinces[state_lower]
            
            return f"{city}, {state}"
        
        # Pattern 2: "City,State" (no space after comma) → "City, State"
        pattern2 = re.compile(r'^([A-Za-z\s]+),([A-Za-z]+)$')
        match2 = pattern2.match(location)
        if match2:
            city = match2.group(1).strip()
            state = match2.group(2).strip()
            
            # Convert full state name to abbreviation
            state_lower = state.lower()
            if state_lower in us_states:
                state = us_states[state_lower]
            elif state_lower in ca_provinces:
                state = ca_provinces[state_lower]
            
            return f"{city}, {state}"
        
        # Pattern 3: "City, State" (already normalized) - return as-is
        pattern3 = re.compile(r'^[A-Za-z\s]+,\s*[A-Za-z]{2}$')
        if pattern3.match(location):
            return location
        
        # Feature 18: International formats
        # Pattern 4: "City, Country" (e.g., "London, UK", "Berlin, Germany")
        pattern4 = re.compile(r'^([A-Za-z\s]+),\s*([A-Za-z]+)$')
        match4 = pattern4.match(location)
        if match4:
            city = match4.group(1).strip()
            country = match4.group(2).strip()
            return f"{city}, {country}"
        
        # Pattern 5: "City, Province, Country" (e.g., "Toronto, Ontario, Canada")
        pattern5 = re.compile(r'^([A-Za-z\s]+),\s*([A-Za-z\s]+),\s*([A-Za-z]+)$')
        match5 = pattern5.match(location)
        if match5:
            city = match5.group(1).strip()
            province = match5.group(2).strip()
            country = match5.group(3).strip()
            
            # Convert province to abbreviation if applicable
            province_lower = province.lower()
            if province_lower in ca_provinces:
                province = ca_provinces[province_lower]
            
            return f"{city}, {province}, {country}"
        
        # Pattern 6: "City, State, Country" (e.g., "Dallas, TX, USA")
        pattern6 = re.compile(r'^([A-Za-z\s]+),\s*([A-Za-z]{2}),\s*([A-Za-z]+)$')
        match6 = pattern6.match(location)
        if match6:
            city = match6.group(1).strip()
            state = match6.group(2).strip()
            country = match6.group(3).strip()
            return f"{city}, {state}, {country}"
        
        return location
    
    def _calculate_quality_score(self, exp: Dict[str, Any]) -> float:
        """
        Feature 16: Experience Quality Score
        
        Calculate completeness score based on:
        - Company
        - Role
        - Location
        - Start Date
        - End Date
        - Description
        
        Returns:
            Quality score as percentage (0-100)
        """
        required_fields = ['company_name', 'job_title', 'location', 'start_date', 'end_date']
        optional_fields = ['description', 'environment', 'technologies_used']
        
        # Score for required fields (each worth 15%)
        required_score = 0
        for field in required_fields:
            if exp.get(field):
                required_score += 15
        
        # Score for optional fields (each worth 12.5%)
        optional_score = 0
        for field in optional_fields:
            if exp.get(field):
                optional_score += 12.5
        
        total_score = required_score + optional_score
        
        # Cap at 100%
        return min(total_score, 100.0)
    
    def _validate_experience_source(self, exp: Dict[str, Any]) -> bool:
        """
        Safeguard 9: Experience Source Lock
        
        Validate that every experience record has source="deberta_ner".
        Never allow source to be overwritten with rule_parser, legacy_parser, or heuristic.
        
        Args:
            exp: Experience record to validate
            
        Returns:
            True if source is valid, False otherwise
        """
        source = exp.get('source')
        if source != 'deberta_ner':
            self.logger.error(f"❌ CRITICAL: Experience source validation failed. Expected 'deberta_ner', got '{source}'")
            self.logger.error(f"Experience record: {exp}")
            return False
        return True
    
    def _validate_education_source(self, edu: Dict[str, Any]) -> bool:
        """
        Safeguard 10: Education Source Lock
        
        Validate that every education record has source="deberta_ner".
        Always preserve source.
        
        Args:
            edu: Education record to validate
            
        Returns:
            True if source is valid, False otherwise
        """
        source = edu.get('source')
        if source != 'deberta_ner':
            self.logger.error(f"❌ CRITICAL: Education source validation failed. Expected 'deberta_ner', got '{source}'")
            self.logger.error(f"Education record: {edu}")
            return False
        return True
    
    def _validate_experience_contract(self, exp: Dict[str, Any]) -> bool:
        """
        Safeguard 14: Experience Builder Contract validation
        
        Builder must always return all required keys.
        Missing fields must be null.
        Never omit keys.
        
        Required keys:
        - company_name
        - client
        - job_title
        - location
        - start_date
        - end_date
        - is_current
        - description
        - environment
        - technologies_used
        - source
        
        Args:
            exp: Experience record to validate
            
        Returns:
            True if contract is valid, False otherwise
        """
        required_keys = [
            'company_name', 'client', 'job_title', 'location',
            'start_date', 'end_date', 'is_current', 'description',
            'environment', 'technologies_used', 'source'
        ]
        
        for key in required_keys:
            if key not in exp:
                self.logger.error(f"❌ CRITICAL: Experience contract validation failed. Missing key: '{key}'")
                self.logger.error(f"Experience record: {exp}")
                return False
        
        return True
    
    def _validate_education_contract(self, edu: Dict[str, Any]) -> bool:
        """
        Safeguard 15: Education Builder Contract validation
        
        Always return all required keys.
        Missing values must be null.
        
        Required keys:
        - institution
        - degree
        - field_of_study
        - start_year
        - end_year
        - grade
        - source
        
        Args:
            edu: Education record to validate
            
        Returns:
            True if contract is valid, False otherwise
        """
        required_keys = [
            'institution', 'degree', 'field_of_study',
            'start_year', 'end_year', 'grade', 'source'
        ]
        
        for key in required_keys:
            if key not in edu:
                self.logger.error(f"❌ CRITICAL: Education contract validation failed. Missing key: '{key}'")
                self.logger.error(f"Education record: {edu}")
                return False
        
        return True
    
    def _reject_education_in_experience(self, entity_text: str) -> bool:
        """
        Safeguard 16: Reject Parser Corruption (education in experience)
        
        Reject if Education entities appear inside Experience builder:
        - University
        - Bachelor
        - Masters
        - Computer Science
        - CGPA
        
        Never convert education into experience.
        
        Args:
            entity_text: Entity text to validate
            
        Returns:
            True if entity should be rejected (is education-related), False otherwise
        """
        education_keywords = [
            'university', 'college', 'institute', 'school',
            'bachelor', 'masters', 'phd', 'doctorate', 'mba',
            'computer science', 'engineering', 'arts', 'science',
            'cgpa', 'gpa', 'grade', 'degree', 'diploma',
            'graduation', 'graduated', 'thesis', 'dissertation'
        ]
        
        entity_lower = entity_text.lower()
        for keyword in education_keywords:
            if keyword in entity_lower:
                self.logger.warning(f"  ⚠️ Rejecting education entity in experience: '{entity_text}'")
                return True
        
        return False
    
    def _reject_technology_companies(self, entity_text: str) -> bool:
        """
        Safeguard 17: Reject Technology Companies
        
        Never classify as COMPANY:
        - Docker
        - Python
        - Java
        - Spark
        - Pipeline
        - Storage
        - Monitoring
        - Workflow
        - Metrics
        - File System
        - Kubernetes
        - Terraform
        - LangChain
        - SageMaker
        - Airflow
        - Power BI
        - Snowflake
        - Grafana
        - Splunk
        - Databricks
        
        Args:
            entity_text: Entity text to validate
            
        Returns:
            True if entity should be rejected (is technology), False otherwise
        """
        technology_keywords = [
            'docker', 'python', 'java', 'spark', 'kafka',
            'terraform', 'langchain', 'sagemaker', 'airflow',
            'power bi', 'snowflake', 'grafana', 'splunk',
            'databricks', 'kubernetes', 'k8s',
            'pipeline', 'storage', 'monitoring', 'workflow',
            'metrics', 'file system', 'filesystem',
            'react', 'angular', 'vue', 'node', 'npm',
            'mysql', 'postgresql', 'mongodb', 'redis',
            'aws', 'azure', 'gcp', 'cloud'
        ]
        
        entity_lower = entity_text.lower()
        for keyword in technology_keywords:
            if keyword in entity_lower:
                self.logger.warning(f"  ⚠️ Rejecting technology entity as company: '{entity_text}'")
                return True
        
        return False
    
    def _parse_date(self, date_text: str) -> Optional[str]:
        """
        Feature 6: Date Normalization
        Feature 18: International Resume Support
        
        Normalize various date formats to DD/MM/YYYY:
        - Jan 2023 → 01/01/2023 (default day=01)
        - January 2023 → 01/01/2023 (default day=01)
        - 01/2023 → 01/01/2023 (default day=01)
        - 2023-01 → 01/01/2023 (default day=01)
        - 2023-Jan → 01/01/2023 (default day=01)
        - 01/01/2023 → 01/01/2023
        - 01-01-2023 → 01/01/2023
        - 01.01.2023 → 01/01/2023
        
        Also supports:
        - Present, Current, Till Date, Now, Presently → sets is_current flag
        
        Args:
            date_text: Raw date text
            
        Returns:
            Normalized date in DD/MM/YYYY format, or None if parsing fails
        """
        import re
        from datetime import datetime
        
        if not date_text or not date_text.strip():
            return None
        
        date_str = date_text.strip().lower()
        
        # Check for current/present indicators
        current_indicators = ['present', 'current', 'till date', 'now', 'presently']
        if any(indicator in date_str for indicator in current_indicators):
            return None  # Caller will set is_current=True
        
        # Month name to number mapping
        month_names = {
            'jan': '01', 'january': '01',
            'feb': '02', 'february': '02',
            'mar': '03', 'march': '03',
            'apr': '04', 'april': '04',
            'may': '05',
            'jun': '06', 'june': '06',
            'jul': '07', 'july': '07',
            'aug': '08', 'august': '08',
            'sep': '09', 'september': '09',
            'oct': '10', 'october': '10',
            'nov': '11', 'november': '11',
            'dec': '12', 'december': '12'
        }
        
        # Pattern 1: "Month Year" (e.g., "Jan 2023", "January 2023") → 01/01/2023
        pattern1 = re.compile(r'^([A-Za-z]+)\s+(\d{4})$')
        match1 = pattern1.match(date_str)
        if match1:
            month_name = match1.group(1).lower()
            year = match1.group(2)
            if month_name in month_names:
                return f"01/{month_names[month_name]}/{year}"
        
        # Pattern 2: "MM/YYYY" or "M/YYYY" (e.g., "01/2023", "1/2023") → 01/01/2023
        pattern2 = re.compile(r'^(\d{1,2})/(\d{4})$')
        match2 = pattern2.match(date_str)
        if match2:
            month = match2.group(1).zfill(2)
            year = match2.group(2)
            return f"01/{month}/{year}"
        
        # Pattern 3: "YYYY-MM" or "YYYY-M" (e.g., "2023-01", "2023-1") → 01/01/2023
        pattern3 = re.compile(r'^(\d{4})-(\d{1,2})$')
        match3 = pattern3.match(date_str)
        if match3:
            year = match3.group(1)
            month = match3.group(2).zfill(2)
            return f"01/{month}/{year}"
        
        # Pattern 4: "YYYY-Month" (e.g., "2023-Jan", "2023-January") → 01/01/2023
        pattern4 = re.compile(r'^(\d{4})-([A-Za-z]+)$')
        match4 = pattern4.match(date_str)
        if match4:
            year = match4.group(1)
            month_name = match4.group(2).lower()
            if month_name in month_names:
                return f"01/{month_names[month_name]}/{year}"
        
        # Pattern 5: "Month/YYYY" (e.g., "Jan/2023", "January/2023") → 01/01/2023
        pattern5 = re.compile(r'^([A-Za-z]+)/(\d{4})$')
        match5 = pattern5.match(date_str)
        if match5:
            month_name = match5.group(1).lower()
            year = match5.group(2)
            if month_name in month_names:
                return f"01/{month_names[month_name]}/{year}"
        
        # Pattern 6: "YYYY Month" (e.g., "2023 Jan", "2023 January") → 01/01/2023
        pattern6 = re.compile(r'^(\d{4})\s+([A-Za-z]+)$')
        match6 = pattern6.match(date_str)
        if match6:
            year = match6.group(1)
            month_name = match6.group(2).lower()
            if month_name in month_names:
                return f"01/{month_names[month_name]}/{year}"
        
        # Feature 18: International Date Formats
        # Pattern 7: DD/MM/YYYY or DD-MM-YYYY (UK/Europe/India/Australia) → DD/MM/YYYY
        pattern7 = re.compile(r'^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$')
        match7 = pattern7.match(date_str)
        if match7:
            day = match7.group(1).zfill(2)
            month = match7.group(2).zfill(2)
            year = match7.group(3)
            # Assume DD/MM/YYYY format (international)
            return f"{day}/{month}/{year}"
        
        # Pattern 8: DD.MM.YYYY (Europe) → DD/MM/YYYY
        pattern8 = re.compile(r'^(\d{1,2})\.(\d{1,2})\.(\d{4})$')
        match8 = pattern8.match(date_str)
        if match8:
            day = match8.group(1).zfill(2)
            month = match8.group(2).zfill(2)
            year = match8.group(3)
            return f"{day}/{month}/{year}"
        
        # Pattern 9: MM/DD/YYYY or MM-DD-YYYY (US) → DD/MM/YYYY (swap day/month)
        pattern9 = re.compile(r'^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$')
        match9 = pattern9.match(date_str)
        if match9:
            month = match9.group(1).zfill(2)
            day = match9.group(2).zfill(2)
            year = match9.group(3)
            # Assume MM/DD/YYYY format (US), swap to DD/MM/YYYY
            return f"{day}/{month}/{year}"
        
        # If no pattern matches, return None
        return None
    
    def _find_nearest_entity(self, entity_positions: List[tuple], window_start: int, window_end: int) -> str:
        """
        Find the nearest entity within the given window.
        
        Args:
            entity_positions: List of (position, value) tuples
            window_start: Start of search window
            window_end: End of search window
            
        Returns:
            Entity value if found within window, None otherwise
        """
        for pos, value in entity_positions:
            if window_start <= pos < window_end:
                return value
        return None
    
    def _find_nearest_entity_before(self, entity_positions: List[tuple], window_start: int, window_end: int) -> str:
        """
        Find the nearest entity BEFORE the window_end position (for job titles before company).
        
        Args:
            entity_positions: List of (position, value) tuples
            window_start: Start of search window
            window_end: End of search window (typically company position)
            
        Returns:
            Entity value if found within window, None otherwise
        """
        # Find all entities in the window, return the one closest to window_end
        candidates = [(pos, value) for pos, value in entity_positions if window_start <= pos < window_end]
        if candidates:
            # Sort by position descending (closest to company first)
            candidates.sort(key=lambda x: x[0], reverse=True)
            return candidates[0][1]
        return None
    
    def _choose_best_role(self, role_before: str, role_after: str, company_pos: int, 
                         role_positions: List[tuple], text: str) -> str:
        """
        Intelligently choose the best role based on resume format detection.
        
        Handles multiple formats:
        - Format 1: "Job Title\nCompany Name\nDates" (role before company)
        - Format 2: "Company Name\nJob Title\nDates" (role after company)
        - Format 3: "Job Title - Company Name" (same line)
        
        Args:
            role_before: Role found before company (if any)
            role_after: Role found after company (if any)
            company_pos: Position of company in text
            role_positions: All role positions for distance calculation
            text: Full text for context analysis
            
        Returns:
            Best matching role or empty string
        """
        # If only one exists, use it
        if role_before and not role_after:
            return role_before
        if role_after and not role_before:
            return role_after
        if not role_before and not role_after:
            return ''
        
        # Both exist - need to determine which is correct
        # Strategy: Check which one is closer and analyze the text structure
        
        # Find positions
        role_before_pos = None
        role_after_pos = None
        for pos, value in role_positions:
            if value == role_before and pos < company_pos:
                role_before_pos = pos
            if value == role_after and pos > company_pos:
                role_after_pos = pos
                break
        
        # Calculate distances
        dist_before = company_pos - role_before_pos if role_before_pos is not None else float('inf')
        dist_after = role_after_pos - company_pos if role_after_pos is not None else float('inf')
        
        # Prefer the closer one, but with some heuristics:
        # 1. If role is within 100 chars before company, likely Format 1 (most common)
        # 2. If role is within 50 chars after company, likely Format 2
        # 3. If distances are similar, prefer before (more common format)
        
        if dist_before <= 100:
            # Very close before - likely correct (Format 1)
            return role_before
        elif dist_after <= 50:
            # Very close after - likely Format 2
            return role_after
        elif dist_before < dist_after:
            # Closer before
            return role_before
        else:
            # Closer after or equal - prefer before for tie-breaking
            return role_before if dist_before == dist_after else role_after
    
    
    def _extract_companies_regex(self, text: str, positions_data: List[Dict]) -> List[Dict]:
        """
        Regex fallback to extract company names when DeBERTa misses them.
        Looks for capitalized multi-word phrases near roles.
        """
        import re
        
        companies = []
        
        # Pattern: Capitalized words (2-5 words) that look like company names
        # e.g., "VMware", "Capgemini Technologies", "LLT Overseas"
        pattern = r'\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,4})\b'
        
        for match in re.finditer(pattern, text):
            company_text = match.group(1).strip()
            
            # Skip if it's a tech keyword
            if company_text.lower() in self.tech_keywords:
                continue
            
            # Skip single words unless they look like companies
            words = company_text.split()
            if len(words) == 1 and not self._looks_like_company(company_text):
                continue
            
            # Skip if it looks like a role
            if self._looks_like_role(company_text):
                continue
            
            # Add as company
            companies.append({
                'type': 'COMPANY',
                'text': company_text,
                'start': match.start(),
                'end': match.end()
            })
        
        return companies
    
    def _looks_like_company(self, text: str) -> bool:
        """Check if text looks like a company name."""
        if not text:
            return False
        
        text_lower = text.lower()
        
        # Company indicators
        company_keywords = ['inc', 'llc', 'ltd', 'pvt', 'corp', 'corporation', 'limited',
                           'technologies', 'solutions', 'systems', 'services', 'consulting',
                           'group', 'labs', 'software', 'enterprises']
        
        return any(keyword in text_lower for keyword in company_keywords)
    
    def _looks_like_role(self, text: str) -> bool:
        """Check if text looks like a job title."""
        if not text:
            return False
        
        text_lower = text.lower()
        
        # Job title keywords
        role_keywords = ['developer', 'engineer', 'manager', 'architect', 'analyst',
                        'designer', 'consultant', 'specialist', 'lead', 'senior',
                        'junior', 'director', 'coordinator', 'programmer', 'administrator',
                        'technician', 'principal', 'associate', 'assistant', 'intern',
                        'trainee', 'head', 'chief', 'vp', 'president', 'officer']
        
        return any(keyword in text_lower for keyword in role_keywords)
    
    def _normalize_role(self, role_text: str) -> str:
        """
        Normalize role text with confidence threshold.
        
        - Normalize "DATA ENGINEER" to "Data Engineer"
        - Normalize "backend development" to "Backend Developer" only if confidence exceeds threshold
        - Do not create invalid roles from sentence fragments
        
        Args:
            role_text: Raw role text to normalize
            
        Returns:
            Normalized role text or original if normalization fails
        """
        if not role_text:
            return role_text
        
        # Convert to title case for proper capitalization
        normalized = role_text.title()
        
        # Common role mappings
        role_mappings = {
            'Data Engineer': 'Data Engineer',
            'Software Engineer': 'Software Engineer',
            'Full Stack Developer': 'Full Stack Developer',
            'Backend Developer': 'Backend Developer',
            'Frontend Developer': 'Frontend Developer',
            'DevOps Engineer': 'DevOps Engineer',
            'Machine Learning Engineer': 'Machine Learning Engineer',
            'Data Scientist': 'Data Scientist',
            'Product Manager': 'Product Manager',
            'Project Manager': 'Project Manager',
            'Technical Lead': 'Technical Lead',
            'Senior Software Engineer': 'Senior Software Engineer',
            'Junior Software Engineer': 'Junior Software Engineer',
        }
        
        # Check if normalized role matches a known mapping
        if normalized in role_mappings:
            return role_mappings[normalized]
        
        # Check if it's a tech keyword masquerading as a role
        if normalized.lower() in self.tech_keywords:
            self.logger.warning(f"  ⚠️ Rejected tech keyword as role: '{role_text}'")
            return role_text  # Return original, don't normalize
        
        # Check if it's a development/engineering phrase that should be converted
        # Only convert if it has proper role indicators
        role_indicators = ['developer', 'engineer', 'manager', 'architect', 'analyst',
                          'consultant', 'designer', 'specialist', 'lead', 'director']
        
        has_role_indicator = any(ind in normalized.lower() for ind in role_indicators)
        
        if not has_role_indicator:
            # No role indicator - might be a sentence fragment or tech keyword
            # Return original to avoid creating invalid roles
            self.logger.warning(f"  ⚠️ No role indicator in: '{role_text}', keeping original")
            return role_text
        
        # If it has role indicators, return the normalized version
        return normalized
    
    def _parse_date(self, date_str: str) -> str:
        """Parse date string to DD/MM/YYYY format (default day=01 if not specified)."""
        if not date_str:
            return None
        
        import re
        
        # Remove common noise
        cleaned = date_str.strip().replace('|', '').replace('–', '-').replace('—', '-')
        
        # Pattern 1: Full date with month name (e.g., "April 2022", "Apr 2022", "Apr '22")
        month_patterns = [
            (r'(Jan|January)\s*[\'"]?(\d{2,4})', 1),
            (r'(Feb|February)\s*[\'"]?(\d{2,4})', 2),
            (r'(Mar|March)\s*[\'"]?(\d{2,4})', 3),
            (r'(Apr|April)\s*[\'"]?(\d{2,4})', 4),
            (r'(May)\s*[\'"]?(\d{2,4})', 5),
            (r'(Jun|June)\s*[\'"]?(\d{2,4})', 6),
            (r'(Jul|July)\s*[\'"]?(\d{2,4})', 7),
            (r'(Aug|August)\s*[\'"]?(\d{2,4})', 8),
            (r'(Sep|Sept|September)\s*[\'"]?(\d{2,4})', 9),
            (r'(Oct|October)\s*[\'"]?(\d{2,4})', 10),
            (r'(Nov|November)\s*[\'"]?(\d{2,4})', 11),
            (r'(Dec|December)\s*[\'"]?(\d{2,4})', 12)
        ]
        
        for pattern, month_num in month_patterns:
            match = re.search(pattern, cleaned, re.IGNORECASE)
            if match:
                year_str = match.group(2)
                # Handle 2-digit years (e.g., '22 -> 2022)
                if len(year_str) == 2:
                    year = 2000 + int(year_str) if int(year_str) < 50 else 1900 + int(year_str)
                else:
                    year = int(year_str)
                # Return DD/MM/YYYY format (default day=01)
                return f"01/{month_num:02d}/{year}"
        
        # Pattern 2: Year only (e.g., "2022", "'22") - return as-is since no month
        year_match = re.search(r'[\'"]?(\d{2,4})', cleaned)
        if year_match:
            year_str = year_match.group(1)
            if len(year_str) == 2:
                year = 2000 + int(year_str) if int(year_str) < 50 else 1900 + int(year_str)
            else:
                year = int(year_str)
            # Return year only (no fake month/day)
            return str(year)
        
        return None
    
    def _extract_years_from_date_range(self, date_text: str) -> tuple:
        """
        Extract start and end years from date range strings.
        
        Handles patterns like:
        - "2011–2013", "2011-2013", "2011 - 2013"
        - "(2010-2014)", "2010 to 2014"
        - "2013" (single year)
        
        Returns:
            (start_year, end_year) as integers, or (None, None) if not found
        """
        if not date_text:
            return None, None
        
        # Remove parentheses and common separators
        cleaned = date_text.replace('(', '').replace(')', '')
        
        # Pattern 1: Year range with dash/en-dash (2011–2013, 2011-2013, 2011 - 2013)
        match = re.search(r'(\d{4})\s*[–\-—to]\s*(\d{4})', cleaned)
        if match:
            return int(match.group(1)), int(match.group(2))
        
        # Pattern 2: Single year (2013)
        match = re.search(r'(\d{4})', cleaned)
        if match:
            year = int(match.group(1))
            return year, year
        
        return None, None
