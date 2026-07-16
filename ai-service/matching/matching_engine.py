"""
Core matching engine that scores candidate-job fit.
Calculates compatibility across skills, experience, education, and provides recommendations.
Enhanced with semantic skill similarity using sentence transformers.
"""

import logging
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
import re
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

# Configure logging
logger = logging.getLogger(__name__)

try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    logger.warning("sentence_transformers not available. Semantic matching disabled.")


@dataclass
class MatchResult:
    """Data class for matching results."""
    overall_score: float
    skill_score: float
    experience_score: float
    education_score: float
    matching_skills: List[str]
    missing_skills: List[str]
    extra_skills: List[str]
    experience_gap_years: float
    recommendation: str
    reason: str


class MatchingEngine:
    """
    Core matching engine that evaluates candidate-job compatibility.
    Provides detailed scoring across multiple dimensions with recommendations.
    Enhanced with semantic skill similarity using sentence transformers.
    """
    
    def __init__(self):
        """Initialize the matching engine with scoring weights and semantic model."""
        self.logger = logging.getLogger(__name__)
        
        # Scoring weights
        self.weights = {
            'skills': 0.50,
            'experience': 0.30,
            'education': 0.20
        }
        
        # Score thresholds for recommendations
        self.thresholds = {
            'strong_match': 80.0,
            'good_match': 65.0,
            'partial_match': 50.0
        }
        
        # Education level mapping
        self.education_levels = {
            'phd': 5,
            'doctorate': 5,
            'doctoral': 5,
            'master': 4,
            'msc': 4,
            'm.s.': 4,
            'master\'s': 4,
            'graduate': 4,
            'bachelor': 3,
            'bsc': 3,
            'b.s.': 3,
            'bachelor\'s': 3,
            'undergraduate': 3,
            'ba': 3,
            'b.a.': 3,
            'associate': 2,
            'diploma': 2,
            'technical': 2,
            'high school': 1,
            'ged': 1,
            'none': 0,
            'any': 0
        }
        
        # Common skill synonyms for exact matching
        # 🔧 MANUAL WORK: Customize this dictionary for your specific industry
        # Add domain-specific abbreviations and variations to improve matching accuracy
        self.SKILL_SYNONYMS = {
            # Programming Languages & Frameworks
            'JS': 'JavaScript', 'TS': 'TypeScript', 
            'Postgres': 'PostgreSQL', 'Mongo': 'MongoDB',
            'K8s': 'Kubernetes', 'K8S': 'Kubernetes',
            'ML': 'Machine Learning', 'DL': 'Deep Learning',
            'NLP': 'Natural Language Processing', 'CV': 'Computer Vision',
            'AI': 'Artificial Intelligence', 'GenAI': 'Generative AI',
            
            # Web Technologies
            'HTML5': 'HTML', 'CSS3': 'CSS', 'ES6': 'JavaScript',
            'ES2015': 'JavaScript', 'ES2020': 'JavaScript',
            'Node': 'Node.js', 'NodeJS': 'Node.js',
            'React': 'React.js', 'ReactJS': 'React.js',
            'Vue': 'Vue.js', 'VueJS': 'Vue.js',
            'Angular': 'Angular.js', 'AngularJS': 'Angular.js',
            'Next': 'Next.js', 'NextJS': 'Next.js',
            'Nuxt': 'Nuxt.js', 'NuxtJS': 'Nuxt.js',
            
            # Cloud & DevOps
            'AWS': 'Amazon Web Services', 'Azure': 'Microsoft Azure',
            'GCP': 'Google Cloud Platform', 'GKE': 'Google Kubernetes Engine',
            'EKS': 'Amazon EKS', 'AKS': 'Azure Kubernetes Service',
            'EC2': 'Amazon EC2', 'S3': 'Amazon S3', 'Lambda': 'AWS Lambda',
            'Terraform': 'Terraform', 'Terragrunt': 'Terragrunt',
            'Ansible': 'Ansible', 'Puppet': 'Puppet', 'Chef': 'Chef',
            'Jenkins': 'Jenkins', 'GitLab CI': 'GitLab CI',
            'GitHub Actions': 'GitHub Actions', 'CircleCI': 'CircleCI',
            'Travis': 'Travis CI', 'Bamboo': 'Bamboo',
            
            # Databases & Storage
            'MySQL': 'MySQL', 'PostgreSQL': 'PostgreSQL', 'SQLite': 'SQLite',
            'Oracle': 'Oracle DB', 'MSSQL': 'Microsoft SQL Server',
            'Redis': 'Redis', 'Elasticsearch': 'Elasticsearch',
            'Cassandra': 'Apache Cassandra', 'DynamoDB': 'Amazon DynamoDB',
            'Couchbase': 'Couchbase', 'Neo4j': 'Neo4j',
            
            # Mobile Development
            'iOS': 'iOS Development', 'Android': 'Android Development',
            'Swift': 'Swift', 'Kotlin': 'Kotlin', 'Flutter': 'Flutter',
            'React Native': 'React Native', 'Xamarin': 'Xamarin',
            'Ionic': 'Ionic', 'Cordova': 'Apache Cordova',
            
            # Testing & Quality
            'Jest': 'Jest', 'Mocha': 'Mocha', 'Chai': 'Chai',
            'Selenium': 'Selenium', 'Cypress': 'Cypress',
            'Playwright': 'Playwright', 'Puppeteer': 'Puppeteer',
            'JMeter': 'JMeter', 'K6': 'K6', 'Gatling': 'Gatling',
            
            # Business & Finance (🔧 CUSTOMIZE FOR YOUR INDUSTRY)
            'Excel': 'Microsoft Excel', 'PPT': 'PowerPoint', 'PP': 'PowerPoint',
            'Word': 'Microsoft Word', 'Outlook': 'Microsoft Outlook',
            'Sheets': 'Google Sheets', 'Slides': 'Google Slides',
            'Docs': 'Google Docs', 'Analytics': 'Google Analytics',
            'GA': 'Google Analytics', 'GTM': 'Google Tag Manager',
            'SEO': 'Search Engine Optimization', 'SEM': 'Search Engine Marketing',
            'PPC': 'Pay Per Click', 'CPC': 'Cost Per Click',
            'CPA': 'Cost Per Acquisition', 'ROI': 'Return on Investment',
            'KPI': 'Key Performance Indicator', 'OKR': 'Objectives and Key Results',
            'CRM': 'Customer Relationship Management', 'ERP': 'Enterprise Resource Planning',
            'SAP': 'SAP', 'Salesforce': 'Salesforce', 'HubSpot': 'HubSpot',
            'Marketo': 'Marketo', 'Pardot': 'Pardot', 'Mailchimp': 'Mailchimp',
            'QuickBooks': 'QuickBooks', 'Xero': 'Xero', 'Sage': 'Sage',
            'Stripe': 'Stripe', 'PayPal': 'PayPal', 'Square': 'Square',
            'Plaid': 'Plaid', 'Brex': 'Brex', 'Ramp': 'Ramp',
            
            # Healthcare (🔧 CUSTOMIZE FOR HEALTHCARE INDUSTRY)
            'EHR': 'Electronic Health Record', 'EMR': 'Electronic Medical Record',
            'HIPAA': 'HIPAA Compliance', 'HL7': 'HL7', 'FHIR': 'FHIR',
            'DICOM': 'DICOM', 'PACS': 'Picture Archiving and Communication System',
            'Epic': 'Epic Systems', 'Cerner': 'Cerner', 'Allscripts': 'Allscripts',
            'Athena': 'Athenahealth', 'Meditech': 'MEDITECH',
            
            # Data Science & Analytics
            'Tableau': 'Tableau', 'PowerBI': 'Power BI', 'Looker': 'Looker',
            'Qlik': 'Qlik', 'Domo': 'Domo', 'Sisense': 'Sisense',
            'SPSS': 'SPSS', 'SAS': 'SAS', 'Stata': 'Stata',
            'R': 'R Language', 'MATLAB': 'MATLAB', 'Julia': 'Julia',
            'Spark': 'Apache Spark', 'Hadoop': 'Apache Hadoop',
            'Kafka': 'Apache Kafka', 'Airflow': 'Apache Airflow',
            'DBT': 'DBT', 'Fivetran': 'Fivetran', 'Segment': 'Segment',
            
            # Cybersecurity
            'SIEM': 'Security Information and Event Management',
            'SOC': 'Security Operations Center', 'IDS': 'Intrusion Detection System',
            'IPS': 'Intrusion Prevention System', 'WAF': 'Web Application Firewall',
            'EDR': 'Endpoint Detection and Response', 'MDR': 'Managed Detection and Response',
            'XDR': 'Extended Detection and Response', 'SOAR': 'Security Orchestration Automation Response',
            'IAM': 'Identity and Access Management', 'SSO': 'Single Sign-On',
            'MFA': 'Multi-Factor Authentication', '2FA': 'Two-Factor Authentication',
            'PKI': 'Public Key Infrastructure', 'SSL': 'SSL/TLS', 'TLS': 'SSL/TLS',
            
            # Design & Creative
            'Figma': 'Figma', 'Sketch': 'Sketch', 'Adobe XD': 'Adobe XD',
            'Photoshop': 'Adobe Photoshop', 'Illustrator': 'Adobe Illustrator',
            'InDesign': 'Adobe InDesign', 'Premiere': 'Adobe Premiere Pro',
            'After Effects': 'Adobe After Effects', 'XD': 'Adobe XD',
            'Canva': 'Canva', 'GIMP': 'GIMP', 'Inkscape': 'Inkscape',
            
            # Project Management & Collaboration
            'JIRA': 'JIRA', 'Confluence': 'Confluence', 'Trello': 'Trello',
            'Asana': 'Asana', 'Monday': 'Monday.com', 'ClickUp': 'ClickUp',
            'Notion': 'Notion', 'Slack': 'Slack', 'Teams': 'Microsoft Teams',
            'Zoom': 'Zoom', 'Webex': 'Cisco Webex', 'Meet': 'Google Meet',
            'Discord': 'Discord', 'Basecamp': 'Basecamp', 'Wrike': 'Wrike',
            
            # Marketing & Sales
            'HubSpot': 'HubSpot', 'Marketo': 'Marketo', 'Pardot': 'Pardot',
            'Mailchimp': 'Mailchimp', 'Constant Contact': 'Constant Contact',
            'Campaign Monitor': 'Campaign Monitor', 'AWeber': 'AWeber',
            'GetResponse': 'GetResponse', 'ConvertKit': 'ConvertKit',
            'Klaviyo': 'Klaviyo', 'Omnisend': 'Omnisend',
            'Salesforce': 'Salesforce', 'HubSpot Sales': 'HubSpot Sales',
            'Outreach': 'Outreach', 'Salesloft': 'Salesloft',
            'Yesware': 'Yesware', 'Mixmax': 'Mixmax',
            
            # E-commerce
            'Shopify': 'Shopify', 'BigCommerce': 'BigCommerce', 'Magento': 'Magento',
            'WooCommerce': 'WooCommerce', 'OpenCart': 'OpenCart',
            'PrestaShop': 'PrestaShop', 'Zen Cart': 'Zen Cart',
            'osCommerce': 'osCommerce', 'CubeCart': 'CubeCart',
            'X-Cart': 'X-Cart', 'Volusion': 'Volusion',
            'BigCartel': 'BigCartel', 'Squarespace': 'Squarespace',
            'Wix': 'Wix', 'Weebly': 'Weebly',
            
            # Common Acronyms & Terms
            'API': 'Application Programming Interface', 'SDK': 'Software Development Kit',
            'CLI': 'Command Line Interface', 'GUI': 'Graphical User Interface',
            'UI': 'User Interface', 'UX': 'User Experience', 'QA': 'Quality Assurance',
            'QC': 'Quality Control', 'PM': 'Project Manager', 'PO': 'Product Owner',
            'Scrum': 'Scrum', 'Agile': 'Agile', 'Kanban': 'Kanban',
            'Waterfall': 'Waterfall', 'IT': 'Information Technology', 'HR': 'Human Resources',
            'CEO': 'Chief Executive Officer', 'CTO': 'Chief Technology Officer',
            'CFO': 'Chief Financial Officer', 'COO': 'Chief Operating Officer',
            'VP': 'Vice President', 'SVP': 'Senior Vice President', 'AVP': 'Assistant Vice President',
            'R&D': 'Research and Development', 'P&L': 'Profit and Loss',
            'SLA': 'Service Level Agreement', 'SLO': 'Service Level Objective',
            'SRE': 'Site Reliability Engineering', 'MVP': 'Minimum Viable Product',
            'POC': 'Proof of Concept', 'RFP': 'Request for Proposal',
            'RFQ': 'Request for Quotation', 'SOW': 'Statement of Work',
            'MoU': 'Memorandum of Understanding', 'NDAs': 'Non-Disclosure Agreement',
            'SLAs': 'Service Level Agreements', 'OKRs': 'Objectives and Key Results',
            'KPIs': 'Key Performance Indicators', 'PMP': 'Project Management Professional',
            'CSM': 'Certified Scrum Master', 'CSPO': 'Certified Scrum Product Owner',
            'SAFe': 'Scaled Agile Framework', 'LeSS': 'Large-Scale Scrum',
            'SoS': 'Scrum of Scrums', 'TFS': 'Team Foundation Server',
            'VCS': 'Version Control System', 'DVCS': 'Distributed Version Control System',
            'CI': 'Continuous Integration', 'CD': 'Continuous Deployment',
            'CD': 'Continuous Delivery', 'IaC': 'Infrastructure as Code',
            'GitOps': 'GitOps', 'AIOps': 'AI for Operations',
            'MLOps': 'Machine Learning Operations', 'DataOps': 'Data Operations',
            'DevSecOps': 'Development Security Operations', 'FinOps': 'Financial Operations',
            'ChatOps': 'Chat Operations', 'NoOps': 'No Operations',
            'Git': 'Git', 'SVN': 'Subversion', 'Mercurial': 'Mercurial',
            'Perforce': 'Perforce', 'Bazaar': 'Bazaar', 'CVS': 'Concurrent Versions System',
            'RCS': 'Revision Control System', 'SCCS': 'Source Code Control System',
            'PVCS': 'Polytron Version Control System', 'VSS': 'Visual SourceSafe',
            'VSTS': 'Visual Studio Team Services', 'Azure DevOps': 'Azure DevOps',
            'GitHub': 'GitHub', 'GitLab': 'GitLab', 'Bitbucket': 'Bitbucket',
            'SourceForge': 'SourceForge', 'CodePlex': 'CodePlex',
            'Google Code': 'Google Code', 'Launchpad': 'Launchpad',
            'Gitorious': 'Gitorious', 'Assembla': 'Assembla',
            'Beanstalk': 'Beanstalk', 'Codebase': 'Codebase',
            'FogBugz': 'FogBugz'
        }
        
        # Initialize semantic model if available
        self.semantic_model = None
        if SENTENCE_TRANSFORMERS_AVAILABLE:
            try:
                self.logger.info("Loading sentence transformer model for semantic skill matching...")
                self.semantic_model = SentenceTransformer('all-MiniLM-L6-v2')
                self.logger.info("Semantic model loaded successfully")
            except Exception as e:
                self.logger.error(f"Failed to load semantic model: {e}")
                self.semantic_model = None
        else:
            self.logger.warning("Semantic skill matching disabled - sentence_transformers not available")
    
    def _extract_candidate_skills(self, candidate: Dict[str, Any]) -> List[str]:
        """Extract skills from candidate data with fallbacks."""
        skills = candidate.get('skills', [])
        if skills:
            return self._normalize_skills(skills)
            
        parsed = candidate.get('parsed_data') or {}
        if isinstance(parsed, str):
            import json
            try: parsed = json.loads(parsed)
            except: parsed = {}
            
        if 'skills' in parsed and parsed['skills']:
            return self._normalize_skills(parsed['skills'])
        if 'technical_skills' in parsed and parsed['technical_skills']:
            return self._normalize_skills(parsed['technical_skills'])
        if 'core_skills' in parsed and parsed['core_skills']:
            return self._normalize_skills(parsed['core_skills'])
            
        return []

    def calculate_match_score(self, candidate: Dict[str, Any], job: Dict[str, Any], embeddings_map: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Calculate comprehensive match score between candidate and job.
        
        Args:
            candidate: Candidate data from resume parsing
            job: Job description data from JD parsing
            embeddings_map: Optional pre-computed embeddings dictionary
            
        Returns:
            Dictionary with detailed scoring and recommendations
        """
        try:
            self.logger.info("Calculating candidate-job match score")
            
            # Extract relevant data
            candidate_skills = self._extract_candidate_skills(candidate)
            required_skills = self._normalize_skills(job.get('required_skills', []))
            preferred_skills = self._normalize_skills(job.get('preferred_skills', []))
            
            candidate_experience = self._extract_candidate_experience(candidate)
            min_experience = job.get('min_experience_years', 0)
            max_experience = job.get('max_experience_years')
            
            candidate_education = self._extract_candidate_education(candidate)
            required_education = job.get('education_requirement', 'Any')
            
            # Calculate individual scores
            skill_score = self.calculate_skill_score(
                candidate_skills, required_skills, preferred_skills, embeddings_map=embeddings_map
            )
            
            experience_score = self.calculate_experience_score(
                candidate_experience, min_experience, max_experience
            )
            
            education_score = self.calculate_education_score(
                candidate_education, required_education
            )
            
            # Calculate overall score
            overall_score = self.calculate_overall_score(
                skill_score, experience_score, education_score
            )
            
            # Analyze skill matches
            skill_analysis = self._analyze_skill_matches(
                candidate_skills, required_skills, preferred_skills
            )
            
            # Calculate experience gap
            experience_gap = self._calculate_experience_gap(
                candidate_experience, min_experience, max_experience
            )
            
            # Generate recommendation and reason
            recommendation = self.generate_recommendation(overall_score)
            reason = self._generate_reason(
                skill_score, experience_score, education_score,
                skill_analysis, experience_gap, candidate, job
            )
            
            # Create result
            result = MatchResult(
                overall_score=round(overall_score, 1),
                skill_score=round(skill_score, 1),
                experience_score=round(experience_score, 1),
                education_score=round(education_score, 1),
                matching_skills=skill_analysis['matching'],
                missing_skills=skill_analysis['missing'],
                extra_skills=skill_analysis['extra'],
                experience_gap_years=experience_gap,
                recommendation=recommendation,
                reason=reason
            )
            
            self.logger.info(f"Match calculation completed: {recommendation} ({overall_score:.1f})")
            
            return self._result_to_dict(result)
            
        except Exception as e:
            self.logger.error(f"Error calculating match score: {e}")
            return self._create_empty_result()
    
    def calculate_match_score_batch(self, candidates: List[Dict[str, Any]], job: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Calculate compatibility scores for a batch of candidates against a single job description.
        Optimized by sharing and pre-computing skill embeddings in a shared embeddings map.
        """
        self.logger.info(f"Calculating batch match score for {len(candidates)} candidates")
        embeddings_map = {}
        
        # Pre-populate required and preferred job skills to map in one go for optimization
        required_skills = self._normalize_skills(job.get('required_skills', []))
        preferred_skills = self._normalize_skills(job.get('preferred_skills', []))
        normalized_required = self._normalize_skills_with_synonyms(required_skills)
        normalized_preferred = self._normalize_skills_with_synonyms(preferred_skills)
        
        all_job_skills = list(set(normalized_required + normalized_preferred))
        if all_job_skills and self.semantic_model:
            try:
                computed_embeddings = self.semantic_model.encode(all_job_skills)
                for i, skill in enumerate(all_job_skills):
                    embeddings_map[skill] = computed_embeddings[i]
            except Exception as e:
                self.logger.error(f"Failed to pre-compute job skill embeddings: {e}")
                
        results = []
        for cand in candidates:
            res = self.calculate_match_score(cand, job, embeddings_map=embeddings_map)
            # Ensure candidate_id is included
            res['candidate_id'] = cand.get('id')
            results.append(res)
            
        return results
    
    def semantic_skill_match(self, candidate_skills: List[str], required_skills: List[str], embeddings_map: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Perform semantic skill matching using sentence transformers.
        
        Args:
            candidate_skills: List of candidate's skills
            required_skills: List of required job skills
            embeddings_map: Optional pre-computed embeddings dictionary
            
        Returns:
            Dictionary with matched pairs and unmatched skills
        """
        if not self.semantic_model or not candidate_skills or not required_skills:
            return {'matched_pairs': [], 'unmatched': required_skills}
        
        try:
            # Helper to get embeddings from map or compute them
            def get_embeddings(skills_list):
                embeddings = []
                missing_skills = []
                missing_indices = []
                
                for idx, skill in enumerate(skills_list):
                    if embeddings_map and skill in embeddings_map:
                        embeddings.append(embeddings_map[skill])
                    else:
                        embeddings.append(None)
                        missing_skills.append(skill)
                        missing_indices.append(idx)
                
                if missing_skills:
                    computed_embeddings = self.semantic_model.encode(missing_skills)
                    for i, idx in enumerate(missing_indices):
                        embeddings[idx] = computed_embeddings[i]
                        if embeddings_map is not None:
                            embeddings_map[skills_list[idx]] = computed_embeddings[i]
                
                return np.array(embeddings)

            # Encode both skill lists using helper
            candidate_embeddings = get_embeddings(candidate_skills)
            required_embeddings = get_embeddings(required_skills)
            
            # Compute cosine similarity matrix
            similarity_matrix = cosine_similarity(required_embeddings, candidate_embeddings)
            
            matched_pairs = []
            used_candidate_indices = set()
            unmatched = []
            
            # For each required skill, find the best matching candidate skill
            for req_idx, required_skill in enumerate(required_skills):
                best_match_idx = -1
                best_score = 0.0
                
                # Find best candidate skill match
                for cand_idx in range(len(candidate_skills)):
                    if cand_idx not in used_candidate_indices:
                        similarity = similarity_matrix[req_idx][cand_idx]
                        if similarity > best_score:
                            best_score = similarity
                            best_match_idx = cand_idx
                
                # Check if similarity exceeds threshold (lowered to 0.65 to catch partial matches)
                if best_score > 0.65 and best_match_idx != -1:
                    matched_pairs.append((
                        required_skill,
                        candidate_skills[best_match_idx],
                        round(best_score, 3)
                    ))
                    used_candidate_indices.add(best_match_idx)
                else:
                    unmatched.append(required_skill)
            
            return {
                'matched_pairs': matched_pairs,
                'unmatched': unmatched
            }
            
        except Exception as e:
            self.logger.error(f"Error in semantic skill matching: {e}")
            return {'matched_pairs': [], 'unmatched': required_skills}
    
    def calculate_skill_score(self, candidate_skills: List[str], required_skills: List[str], 
                            preferred_skills: List[str], embeddings_map: Optional[Dict[str, Any]] = None) -> float:
        """
        Calculate skill compatibility score with semantic matching.
        
        Args:
            candidate_skills: List of candidate's skills
            required_skills: List of required job skills
            preferred_skills: List of preferred job skills
            embeddings_map: Optional pre-computed embeddings dictionary
            
        Returns:
            Skill score (0-100)
        """
        if not required_skills and not preferred_skills:
            return 100.0  # No skill requirements
        
        # Normalize skills using synonyms
        normalized_candidate = self._normalize_skills_with_synonyms(candidate_skills)
        normalized_required = self._normalize_skills_with_synonyms(required_skills)
        normalized_preferred = self._normalize_skills_with_synonyms(preferred_skills)
        
        # Calculate required skills match with semantic matching
        if normalized_required:
            # Exact matches (weight 1.0)
            exact_matches = set(normalized_candidate) & set(normalized_required)
            exact_score = len(exact_matches) / len(normalized_required)
            
            # Semantic matches (weight 0.85)
            semantic_result = self.semantic_skill_match(normalized_candidate, normalized_required, embeddings_map=embeddings_map)
            semantic_matches_count = len(semantic_result['matched_pairs'])
            semantic_score = semantic_matches_count / len(normalized_required)
            
            # Combine exact and semantic matches
            # Exact matches get full weight, semantic matches get 0.85 weight
            combined_score = (exact_score * 1.0 + (semantic_score - exact_score) * 0.85)
            required_match_ratio = max(0.0, min(1.0, combined_score))
        else:
            required_match_ratio = 1.0  # No required skills, full credit
        
        # Calculate preferred skills match with semantic matching
        if normalized_preferred:
            # Exact matches
            exact_preferred_matches = set(normalized_candidate) & set(normalized_preferred)
            exact_preferred_score = len(exact_preferred_matches) / len(normalized_preferred)
            
            # Semantic matches
            semantic_preferred_result = self.semantic_skill_match(normalized_candidate, normalized_preferred, embeddings_map=embeddings_map)
            semantic_preferred_matches_count = len(semantic_preferred_result['matched_pairs'])
            semantic_preferred_score = semantic_preferred_matches_count / len(normalized_preferred)
            
            # Combine exact and semantic matches
            combined_preferred_score = (exact_preferred_score * 1.0 + (semantic_preferred_score - exact_preferred_score) * 0.85)
            preferred_match_ratio = max(0.0, min(1.0, combined_preferred_score))
        else:
            preferred_match_ratio = 0.5  # No preferred skills, neutral credit
        
        # Weighted combination (70% required, 30% preferred)
        skill_score = (required_match_ratio * 0.70 + preferred_match_ratio * 0.30) * 100
        
        return max(0.0, min(100.0, skill_score))
    
    def _normalize_skills(self, skills: Any) -> List[str]:
        """Normalize skill names for better matching."""
        if not skills:
            return []
            
        # Parse JSON string if needed
        import json
        if isinstance(skills, str):
            try:
                parsed = json.loads(skills)
                if isinstance(parsed, list):
                    skills = parsed
                else:
                    skills = [skills]
            except:
                skills = [skills]
        
        normalized = []
        for skill in skills:
            if isinstance(skill, dict) and 'skill_name' in skill:
                skill = skill['skill_name']
            if isinstance(skill, str):
                normalized_skill = skill.lower().strip()
                normalized_skill = re.sub(r'\s+', ' ', normalized_skill)
                
                maps = {
                    'java': 'java',
                    'js': 'javascript',
                    'javascript': 'javascript',
                    'react.js': 'react',
                    'reactjs': 'react',
                    'react': 'react',
                    'node': 'node.js',
                    'nodejs': 'node.js',
                    'node.js': 'node.js',
                    'springboot': 'spring boot',
                    'spring boot': 'spring boot',
                    'type script': 'typescript',
                    'typescript': 'typescript',
                }
                if normalized_skill in maps:
                    normalized_skill = maps[normalized_skill]
                
                if normalized_skill:
                    normalized.append(normalized_skill)
        
        return list(set(normalized))
        
    def _normalize_skills_with_synonyms(self, skills: List[str]) -> List[str]:
        """Normalize skills using synonym mapping."""
        if not skills:
            return []
        
        normalized = []
        for skill in skills:
            if isinstance(skill, str):
                normalized_skill = skill.lower().strip()
                normalized_skill = re.sub(r'\s+', ' ', normalized_skill)
                
                maps = {
                    'java': 'java',
                    'js': 'javascript',
                    'javascript': 'javascript',
                    'react.js': 'react',
                    'reactjs': 'react',
                    'react': 'react',
                    'node': 'node.js',
                    'nodejs': 'node.js',
                    'node.js': 'node.js',
                    'springboot': 'spring boot',
                    'spring boot': 'spring boot',
                    'type script': 'typescript',
                    'typescript': 'typescript',
                }
                
                if normalized_skill in maps:
                    normalized_skill = maps[normalized_skill]
                else:
                    for key, val in self.SKILL_SYNONYMS.items():
                        if normalized_skill == key.lower():
                            normalized_skill = val.lower()
                            break
                
                if normalized_skill:
                    normalized.append(normalized_skill)
        
        return list(set(normalized))  # Remove duplicates
    
    def calculate_experience_score(self, candidate_years: float, min_required: float, 
                                 max_required: Optional[float]) -> float:
        """
        Calculate experience compatibility score.
        
        Args:
            candidate_years: Candidate's years of experience
            min_required: Minimum required experience
            max_required: Maximum required experience (if any)
            
        Returns:
            Experience score (0-100)
        """
        if min_required == 0:
            return 100.0  # No experience requirement
        
        # Below minimum: linear decrease
        if candidate_years < min_required:
            gap = min_required - candidate_years
            penalty = min(gap * 20, 80)  # 20 points per year gap, max 80 points
            return max(20.0, 100.0 - penalty)
        
        # Within range: perfect score
        if max_required is None or candidate_years <= max_required:
            return 100.0
        
        # Above maximum: slight penalty for over-qualification
        excess = candidate_years - max_required
        penalty = min(excess * 5, 25)  # 5 points per year excess, max 25 points
        return max(75.0, 100.0 - penalty)
    
    def calculate_education_score(self, candidate_education: str, required_education: str) -> float:
        """
        Calculate education compatibility score.
        
        Args:
            candidate_education: Candidate's highest education level
            required_education: Required education level
            
        Returns:
            Education score (0-100)
        """
        # Normalize education levels
        candidate_level = self.education_levels.get(candidate_education.lower(), 1)
        required_level = self.education_levels.get(required_education.lower(), 0)
        
        # No requirement or candidate exceeds requirement
        if required_level == 0 or candidate_level >= required_level:
            return 100.0
            
        if candidate_education.lower() == 'unknown':
            return 50.0  # Partial score if missing instead of 0
        
        # Below requirement: 25 points penalty per level
        level_gap = required_level - candidate_level
        penalty = level_gap * 25
        return max(25.0, 100.0 - penalty)
    
    def calculate_overall_score(self, skill_score: float, experience_score: float, 
                              education_score: float) -> float:
        """
        Calculate weighted overall score.
        
        Args:
            skill_score: Skill compatibility score
            experience_score: Experience compatibility score
            education_score: Education compatibility score
            
        Returns:
            Overall score (0-100)
        """
        overall = (
            skill_score * self.weights['skills'] +
            experience_score * self.weights['experience'] +
            education_score * self.weights['education']
        )
        
        return round(overall, 1)
    
    def generate_recommendation(self, overall_score: float) -> str:
        """
        Generate recommendation based on overall score.
        
        Args:
            overall_score: Overall compatibility score
            
        Returns:
            Recommendation string
        """
        if overall_score >= self.thresholds['strong_match']:
            return 'Strong Match'
        elif overall_score >= self.thresholds['good_match']:
            return 'Good Match'
        elif overall_score >= self.thresholds['partial_match']:
            return 'Partial Match'
        else:
            return 'Not Recommended'
    
    def _extract_candidate_experience(self, candidate: Dict[str, Any]) -> float:
        """Extract total years of experience from candidate data."""
        if 'years_of_experience' in candidate and candidate['years_of_experience'] is not None:
            try: return float(candidate['years_of_experience'])
            except: pass
            
        parsed = candidate.get('parsed_data') or {}
        if isinstance(parsed, str):
            import json
            try: parsed = json.loads(parsed)
            except: parsed = {}
            
        for key in ['total_experience_years', 'experience_years', 'total_experience']:
            if key in parsed and parsed[key] is not None:
                try: return float(parsed[key])
                except: pass
        
        # Calculate from work experience
        work_experience = candidate.get('work_experience', [])
        if not work_experience:
            return 0.0
        
        total_years = 0.0
        for exp in work_experience:
            if isinstance(exp, dict):
                # Try to extract duration from work experience
                duration_months = exp.get('duration_months')
                if duration_months:
                    total_years += float(duration_months) / 12.0
                else:
                    # Estimate from start/end dates (simplified)
                    total_years += 2.0  # Default estimate per job
        
        return total_years
    
    def _extract_candidate_education(self, candidate: Dict[str, Any]) -> str:
        education = candidate.get('education', [])
        if education and isinstance(education, list) and len(education) > 0:
            return self._normalize_education(education)
            
        parsed = candidate.get('parsed_data') or {}
        if isinstance(parsed, str):
            import json
            try: parsed = json.loads(parsed)
            except: parsed = {}
            
        if 'education' in parsed and parsed['education']:
            return self._normalize_education(parsed['education'])
            
        return 'Unknown'
        
    def _normalize_education(self, education_list: List[Dict[str, Any]]) -> str:
        """Extract highest education level from education list."""
        if not education_list:
            return 'Unknown'
        
        highest_level = 0
        highest_degree = 'Unknown'
        
        for edu in education_list:
            if isinstance(edu, dict):
                degree = (edu.get('degree', '') or edu.get('degree_name', '')).lower()
                if degree:
                    for key, val in self.education_levels.items():
                        if key in degree and val > highest_level:
                            highest_level = val
                            highest_degree = edu.get('degree', '') or edu.get('degree_name', '')
            elif isinstance(edu, str):
                degree = edu.lower()
                for key, val in self.education_levels.items():
                    if key in degree and val > highest_level:
                        highest_level = val
                        highest_degree = edu
        
        return highest_degree
    
    def _analyze_skill_matches(self, candidate_skills: List[str], required_skills: List[str], 
                             preferred_skills: List[str]) -> Dict[str, List[str]]:
        """Analyze skill matches, gaps, and extras."""
        candidate_set = set(candidate_skills)
        required_set = set(required_skills)
        preferred_set = set(preferred_skills)
        
        # Matching skills (intersection)
        matching_required = list(candidate_set & required_set)
        matching_preferred = list(candidate_set & preferred_set)
        matching_skills = list(set(matching_required + matching_preferred))
        
        # Missing required skills
        missing_skills = list(required_set - candidate_set)
        
        # Extra skills (candidate has but not required/preferred)
        all_job_skills = required_set | preferred_set
        extra_skills = list(candidate_set - all_job_skills)
        
        return {
            'matching': sorted(matching_skills),
            'missing': sorted(missing_skills),
            'extra': sorted(extra_skills)
        }
    
    def _calculate_experience_gap(self, candidate_years: float, min_required: float, 
                                max_required: Optional[float]) -> float:
        """Calculate experience gap in years (negative = over-qualified)."""
        if min_required == 0:
            return 0.0
        
        if candidate_years < min_required:
            return min_required - candidate_years  # Positive gap = under-qualified
        elif max_required and candidate_years > max_required:
            return max_required - candidate_years  # Negative gap = over-qualified
        else:
            return 0.0  # Perfect match
    
    def _generate_reason(self, skill_score: float, experience_score: float, education_score: float,
                        skill_analysis: Dict[str, List[str]], experience_gap: float,
                        candidate: Dict[str, Any], job: Dict[str, Any]) -> str:
        """Generate human-readable explanation for the recommendation."""
        req_count = len(self._normalize_skills(job.get('required_skills', [])))
        match_count = len(skill_analysis['matching'])
        
        reason = ""
        if req_count > 0:
            matched_str = ", ".join(skill_analysis['matching']) if skill_analysis['matching'] else "None"
            reason += f"Matched {match_count} of {req_count} skills: {matched_str}. "
            if skill_analysis['missing']:
                reason += f"Missing: {', '.join(skill_analysis['missing'])}. "
        else:
            reason += "No specific skills required. "
            
        cand_exp = self._extract_candidate_experience(candidate)
        min_exp = job.get('min_experience_years', 0)
        max_exp = job.get('max_experience_years')
        
        exp_req = f"{min_exp}"
        if max_exp:
            exp_req += f"-{max_exp}"
        exp_req += " years"
        
        reason += f"Candidate has {cand_exp:.1f} years experience; required {exp_req}."
        
        return reason.strip()
    
    def _result_to_dict(self, result: MatchResult) -> Dict[str, Any]:
        """Convert MatchResult to dictionary."""
        return {
            'overall_score': result.overall_score,
            'skill_score': result.skill_score,
            'experience_score': result.experience_score,
            'education_score': result.education_score,
            'matching_skills': result.matching_skills,
            'missing_skills': result.missing_skills,
            'extra_skills': result.extra_skills,
            'experience_gap_years': result.experience_gap_years,
            'recommendation': result.recommendation,
            'reason': result.reason
        }
    
    def _create_empty_result(self) -> Dict[str, Any]:
        """Create empty result for error cases."""
        return {
            'overall_score': 0.0,
            'skill_score': 0.0,
            'experience_score': 0.0,
            'education_score': 0.0,
            'matching_skills': [],
            'missing_skills': [],
            'extra_skills': [],
            'experience_gap_years': 0.0,
            'recommendation': 'Not Recommended',
            'reason': 'Unable to calculate match due to error'
        }


# Example usage and testing
if __name__ == "__main__":
    # Sample candidate data with semantic variations
    candidate = {
        'skills': ['Python', 'JavaScript', 'ReactJS', 'AWS', 'Docker', 'TypeScript', 'Postgres'],
        'years_of_experience': 5,
        'work_experience': [
            {'job_title': 'Software Engineer', 'duration_months': 36},
            {'job_title': 'Senior Developer', 'duration_months': 24}
        ],
        'education': [
            {'degree': 'Bachelor of Science in Computer Science'}
        ]
    }
    
    # Sample job data with semantic variations
    job = {
        'required_skills': ['Python', 'React', 'Amazon Web Services', 'PostgreSQL'],
        'preferred_skills': ['Docker', 'TS', 'K8s'],
        'min_experience_years': 3,
        'max_experience_years': 7,
        'education_requirement': 'Bachelor'
    }
    
    try:
        # Initialize matching engine
        engine = MatchingEngine()
        
        print("🎯 Testing Enhanced Matching Engine with Semantic Skill Similarity")
        print("=" * 70)
        
        # Test semantic skill matching
        print("\n🧠 Semantic Skill Matching Test:")
        semantic_result = engine.semantic_skill_match(
            candidate['skills'], 
            job['required_skills']
        )
        
        print(f"  Matched Pairs:")
        for req_skill, cand_skill, score in semantic_result['matched_pairs']:
            print(f"    {req_skill} ↔ {cand_skill} (similarity: {score})")
        
        print(f"  Unmatched: {semantic_result['unmatched']}")
        
        # Calculate match score
        result = engine.calculate_match_score(candidate, job)
        
        print("\n📊 Enhanced Matching Results:")
        print(f"  Overall Score: {result['overall_score']}/100")
        print(f"  Recommendation: {result['recommendation']}")
        print(f"  Skill Score: {result['skill_score']}/100 (enhanced with semantic matching)")
        print(f"  Experience Score: {result['experience_score']}/100")
        print(f"  Education Score: {result['education_score']}/100")
        
        print(f"\n🎯 Enhanced Skill Analysis:")
        print(f"  Matching Skills: {', '.join(result['matching_skills'])}")
        print(f"  Missing Skills: {', '.join(result['missing_skills'])}")
        print(f"  Extra Skills: {', '.join(result['extra_skills'])}")
        
        print(f"\n💼 Experience Analysis:")
        print(f"  Experience Gap: {result['experience_gap_years']} years")
        
        print(f"\n📝 Enhanced Reason:")
        print(f"  {result['reason']}")
        
        # Test synonym mapping
        print(f"\n🔄 Skill Synonym Mapping Test:")
        test_skills = ['JS', 'TS', 'Postgres', 'Mongo', 'K8s', 'ML', 'AI', 'DevOps']
        normalized = engine._normalize_skills_with_synonyms(test_skills)
        print(f"  Original: {test_skills}")
        print(f"  Normalized: {normalized}")
        
        print("\n✅ Enhanced matching engine test completed!")
        
    except Exception as e:
        print(f"❌ Error testing enhanced matching engine: {e}")
