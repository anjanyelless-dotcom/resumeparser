"""
Hybrid merger engine that intelligently combines rule-based and AI parsing results.
Implements field-specific merging strategies with confidence-based conflict resolution.
"""

import logging
from typing import Dict, List, Any, Optional, Tuple, Union
from collections import Counter, defaultdict
import re

# Configure logging
logger = logging.getLogger(__name__)


class HybridMerger:
    """
    Intelligent merger that combines rule-based and AI parsing results.
    Uses field-specific strategies and confidence-based conflict resolution.
    """
    
    # Field priority configuration
    RULE_PRIORITY_FIELDS = ['email', 'phone', 'linkedin', 'github', 'dates', 'websites', 'name']
    AI_PRIORITY_FIELDS = ['companies', 'locations', 'organizations']
    UNION_FIELDS = ['skills', 'job_titles', 'education_institutions', 'degrees']
    LIST_MERGE_FIELDS = ['work_experience', 'education']
    
    # Confidence thresholds
    AI_HIGH_CONFIDENCE = 0.85
    AI_MEDIUM_CONFIDENCE = 0.70
    AI_LOW_CONFIDENCE = 0.50
    
    # Field-specific confidence thresholds
    FIELD_THRESHOLDS = {
        'name': 0.60,           # Name needs medium confidence
        'companies': 0.75,      # Companies need medium-high confidence
        'locations': 0.70,      # Locations can be lower confidence
        'skills': 0.60,         # Skills can be lower confidence (union approach)
        'job_titles': 0.75,     # Job titles need medium-high confidence
        'email': 0.90,          # Email needs very high confidence (but rules are perfect)
        'phone': 0.90,          # Phone needs very high confidence (but rules are perfect)
    }
    
    def __init__(self):
        """Initialize the hybrid merger."""
        self.logger = logging.getLogger(__name__)
        
        # Compile patterns for validation
        self._compile_validation_patterns()
        
        # Field importance weights for sorting
        self.field_importance = {
            'skills': {
                'high': ['python', 'javascript', 'java', 'react', 'node.js', 'aws', 'docker'],
                'medium': ['sql', 'git', 'linux', 'html', 'css', 'typescript'],
                'low': ['microsoft office', 'excel', 'word', 'powerpoint']
            },
            'job_titles': {
                'high': ['senior', 'lead', 'principal', 'director', 'manager', 'head'],
                'medium': ['engineer', 'developer', 'analyst', 'specialist'],
                'low': ['intern', 'junior', 'assistant', 'coordinator']
            }
        }
    
    def _compile_validation_patterns(self):
        """Compile regex patterns for field validation."""
        
        # Email validation pattern
        self.email_pattern = re.compile(
            r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        )
        
        # Phone validation pattern
        self.phone_pattern = re.compile(
            r'^\+?[\d\s\-\(\)]{10,}$'
        )
        
        # LinkedIn URL pattern
        self.linkedin_pattern = re.compile(
            r'(linkedin\.com/in/|linkedin\.com/profile/)[\w\-]+'
        )
        
        # GitHub URL pattern
        self.github_pattern = re.compile(
            r'github\.com/[\w\-]+'
        )
    
    def resolve_conflicts(self, ner: dict, rules: dict, llm: dict) -> dict:
        """
        Resolve conflicts between different parsing sources with explicit priority logic.
        
        Args:
            ner: Results from NER model parsing
            rules: Results from rule-based parsing
            llm: Results from LLM parsing
            
        Returns:
            Dictionary with resolved entities
        """
        resolved = {}

        # Email: regex is most reliable — trust rules first
        resolved['email'] = rules.get('email') or ner.get('email') or llm.get('email')

        # Phone: regex wins
        resolved['phone'] = rules.get('phone') or ner.get('phone') or llm.get('phone')

        # Name: NER understands context better than regex
        resolved['name'] = ner.get('name') or llm.get('name') or rules.get('name')

        # Skills: union all sources, lowercase + deduplicate
        all_skills = (
            ner.get('skills', []) +
            rules.get('skills', []) +
            llm.get('skills', [])
        )
        resolved['skills'] = list({s.lower().strip() for s in all_skills if s.strip()})

        # Experience + Education: prefer NER, fall back to LLM
        resolved['experience'] = ner.get('experience') or llm.get('experience') or []
        resolved['education'] = ner.get('education') or llm.get('education') or []

        # Companies: NER is better at entity recognition
        resolved['companies'] = ner.get('companies') or llm.get('companies') or rules.get('companies', [])

        # Locations: NER understands geographical entities
        resolved['locations'] = ner.get('locations') or llm.get('locations') or rules.get('locations', [])

        # Titles: NER understands job titles better
        resolved['titles'] = ner.get('titles') or llm.get('titles') or rules.get('titles', [])

        # Certifications: Union of all sources
        all_certs = (
            ner.get('certifications', []) +
            rules.get('certifications', []) +
            llm.get('certifications', [])
        )
        resolved['certifications'] = list({c.strip() for c in all_certs if c.strip()})

        return resolved

    def merge(self, rule_result: Dict[str, Any], ai_result: Dict[str, Any], llm_result: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Merge parsing results using explicit conflict resolution.
        
        Args:
            rule_result: Results from rule-based parsing
            ai_result: Results from AI/NER parsing
            llm_result: Results from LLM parsing (optional)
            
        Returns:
            Merged dictionary with resolved conflicts
        """
        try:
            self.logger.info("Starting hybrid merge with explicit conflict resolution")
            
            # Prepare inputs for conflict resolution
            ner_data = ai_result if ai_result else {}
            rules_data = rule_result if rule_result else {}
            llm_data = llm_result if llm_result else {}
            
            # Use the new resolve_conflicts method
            resolved_result = self.resolve_conflicts(ner_data, rules_data, llm_data)
            
            # Add any missing fields from original results that weren't handled by resolve_conflicts
            all_fields = set(rule_result.keys()) | set(ai_result.keys()) | set(llm_result.keys() if llm_result else set())
            
            for field in all_fields:
                if field not in resolved_result:
                    # Handle fields not covered by resolve_conflicts
                    rule_value = rule_result.get(field)
                    ai_value = ai_result.get(field)
                    llm_value = llm_result.get(field) if llm_result else None
                    
                    # Default priority: rules > ai > llm
                    if rule_value:
                        resolved_result[field] = rule_value
                    elif ai_value:
                        resolved_result[field] = ai_value
                    elif llm_value:
                        resolved_result[field] = llm_value
                    else:
                        # Empty default
                        if field in ['work_experience', 'education', 'skills', 'job_titles', 'companies', 'locations', 'websites', 'certifications']:
                            resolved_result[field] = []
                        elif field in ['confidence', 'processing_metrics', '_merge_metadata']:
                            resolved_result[field] = {}
                        else:
                            resolved_result[field] = None
            
            # Add merge metadata
            resolved_result['_merge_metadata'] = {
                'conflict_resolution_used': True,
                'sources_available': {
                    'rules': bool(rule_result),
                    'ner': bool(ai_result),
                    'llm': bool(llm_result)
                },
                'total_fields_merged': len([k for k in resolved_result.keys() if not k.startswith('_')])
            }
            
            self.logger.info(f"Hybrid merge completed with conflict resolution")
            return resolved_result
            
        except Exception as e:
            self.logger.error(f"Error during hybrid merge: {e}")
            # Return rule result as fallback
            return rule_result
    
    def merge_with_deberta(self, rule_result: Dict[str, Any], ai_result: Dict[str, Any], 
                          deberta_result: Dict[str, Any], llm_result: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Merge parsing results using DeBERTa NER with priority for entity extraction.
        
        Args:
            rule_result: Results from rule-based parsing
            ai_result: Results from AI/NER parsing
            deberta_result: Results from DeBERTa NER model
            llm_result: Results from LLM parsing (optional)
            
        Returns:
            Merged dictionary with resolved conflicts, DeBERTa prioritized for entities
        """
        try:
            self.logger.info("Starting hybrid merge with DeBERTa NER priority")
            
            # Prepare inputs for conflict resolution
            ner_data = ai_result if ai_result else {}
            rules_data = rule_result if rule_result else {}
            deberta_data = deberta_result if deberta_result else {}
            llm_data = llm_result if llm_result else {}
            
            # Enhanced merge with DeBERTa priority for entities
            resolved_result = self._resolve_conflicts_with_deberta(ner_data, rules_data, deberta_data, llm_data)
            
            # Add any missing fields from original results
            all_fields = set(rule_result.keys()) | set(ai_result.keys()) | set(deberta_result.keys()) | set(llm_result.keys() if llm_result else set())
            
            for field in all_fields:
                if field not in resolved_result:
                    # Priority: DeBERTa > Rules > AI > LLM for entity fields
                    deberta_value = deberta_result.get(field)
                    rule_value = rule_result.get(field)
                    ai_value = ai_result.get(field)
                    llm_value = llm_result.get(field) if llm_result else None
                    
                    # Entity fields where DeBERTa gets priority
                    deberta_priority_fields = ['companies', 'locations', 'job_titles', 'work_experience', 'education', 
                                             'degrees', 'institutions', 'fields_of_study', 'dates']
                    
                    if field in deberta_priority_fields:
                        if deberta_value:
                            resolved_result[field] = deberta_value
                        elif rule_value:
                            resolved_result[field] = rule_value
                        elif ai_value:
                            resolved_result[field] = ai_value
                        elif llm_value:
                            resolved_result[field] = llm_value
                    else:
                        # Default priority: rules > ai > llm > deberta
                        if rule_value:
                            resolved_result[field] = rule_value
                        elif ai_value:
                            resolved_result[field] = ai_value
                        elif llm_value:
                            resolved_result[field] = llm_value
                        elif deberta_value:
                            resolved_result[field] = deberta_value
                        else:
                            # Empty default
                            if field in ['work_experience', 'education', 'skills', 'job_titles', 'companies', 'locations', 'websites', 'certifications']:
                                resolved_result[field] = []
                            elif field in ['confidence', 'processing_metrics', '_merge_metadata']:
                                resolved_result[field] = {}
                            else:
                                resolved_result[field] = None
            
            # Add merge metadata
            resolved_result['_merge_metadata'] = {
                'conflict_resolution_used': True,
                'sources_available': {
                    'rules': bool(rule_result),
                    'ner': bool(ai_result),
                    'deberta': bool(deberta_result),
                    'llm': bool(llm_result)
                },
                'deberta_entities_found': deberta_result.get('confidence', {}).get('entities_found', 0),
                'total_fields_merged': len([k for k in resolved_result.keys() if not k.startswith('_')])
            }
            
            self.logger.info(f"Hybrid merge with DeBERTa completed")
            return resolved_result
            
        except Exception as e:
            self.logger.error(f"Error during DeBERTa hybrid merge: {e}")
            # Return rule result as fallback
            return rule_result
    
    def _resolve_conflicts_with_deberta(self, ner_data: Dict[str, Any], rules_data: Dict[str, Any], 
                                       deberta_data: Dict[str, Any], llm_data: Dict[str, Any]) -> Dict[str, Any]:
        """Resolve conflicts with DeBERTa priority for entities."""
        resolved = {}
        
        # Entity fields where DeBERTa gets highest priority
        entity_fields = ['companies', 'locations', 'job_titles', 'work_experience', 'education']
        
        for field in entity_fields:
            deberta_value = deberta_data.get(field)
            rules_value = rules_data.get(field)
            ner_value = ner_data.get(field)
            llm_value = llm_data.get(field)
            
            if deberta_value and len(deberta_value) > 0:
                resolved[field] = deberta_value
            elif rules_value and len(rules_value) > 0:
                resolved[field] = rules_value
            elif ner_value and len(ner_value) > 0:
                resolved[field] = ner_value
            elif llm_value and len(llm_value) > 0:
                resolved[field] = llm_value
            else:
                resolved[field] = []
        
        # Non-entity fields use regular priority
        non_entity_fields = ['name', 'email', 'phone', 'linkedin', 'github', 'skills', 'websites', 'dates']
        
        for field in non_entity_fields:
            rules_value = rules_data.get(field)
            ner_value = ner_data.get(field)
            deberta_value = deberta_data.get(field)
            llm_value = llm_data.get(field)
            
            if field in ['name', 'email', 'phone', 'linkedin', 'github']:
                # Rules priority for contact info
                if rules_value:
                    resolved[field] = rules_value
                elif ner_value:
                    resolved[field] = ner_value
                elif deberta_value:
                    resolved[field] = deberta_value
                elif llm_value:
                    resolved[field] = llm_value
                else:
                    resolved[field] = None
            else:
                # Union for list fields
                all_values = []
                if rules_value:
                    all_values.extend(rules_value if isinstance(rules_value, list) else [rules_value])
                if ner_value:
                    all_values.extend(ner_value if isinstance(ner_value, list) else [ner_value])
                if deberta_value:
                    all_values.extend(deberta_value if isinstance(deberta_value, list) else [deberta_value])
                if llm_value:
                    all_values.extend(llm_value if isinstance(llm_value, list) else [llm_value])
                
                # Remove duplicates while preserving order
                seen = set()
                resolved[field] = [x for x in all_values if x and x not in seen and not seen.add(x)]
        
        return resolved
    
    def _merge_rule_priority(self, field: str, rule_value: Any, ai_value: Any, stats: Dict[str, int]) -> tuple:
        """
        Merge rule priority fields - always prefer rule results.
        
        Args:
            field: Field name
            rule_value: Rule-based result
            ai_value: AI result
            stats: Merge statistics
            
        Returns:
            Tuple of (merged_value, source)
        """
        stats['rule_priority_used'] += 1
        
        # For rule priority fields, always use rule result if valid
        if self._validate_field(field, rule_value):
            self.logger.debug(f"Using rule result for {field}: {rule_value}")
            return rule_value, 'rule'
        elif ai_value and self._validate_field(field, ai_value):
            self.logger.debug(f"Rule result invalid, using AI result for {field}: {ai_value}")
            return ai_value, 'ai'
        else:
            self.logger.debug(f"Both results invalid for {field}, using rule result")
            return rule_value, 'rule'
    
    def _merge_ai_priority(self, field: str, rule_value: Any, ai_value: Any, stats: Dict[str, int]) -> tuple:
        """
        Merge AI priority fields - prefer AI if confidence is high enough.
        
        Args:
            field: Field name
            rule_value: Rule-based result
            ai_value: AI result
            stats: Merge statistics
            
        Returns:
            Tuple of (merged_value, source)
        """
        # Get AI confidence score
        ai_confidence = self._extract_ai_confidence(ai_value)
        threshold = self.FIELD_THRESHOLDS.get(field, self.AI_HIGH_CONFIDENCE)
        
        if ai_value and ai_confidence >= threshold:
            stats['ai_priority_used'] += 1
            self.logger.debug(f"Using AI result for {field} (confidence: {ai_confidence:.3f}): {ai_value}")
            return ai_value, 'ai'
        
        elif rule_value:
            stats['rule_priority_used'] += 1
            self.logger.debug(f"AI confidence too low ({ai_confidence:.3f}), using rule result for {field}: {rule_value}")
            return rule_value, 'rule'
        
        else:
            # Use AI result even with low confidence as last resort
            stats['ai_priority_used'] += 1
            self.logger.debug(f"No rule result, using low-confidence AI result for {field}: {ai_value}")
            return ai_value, 'ai'
    
    def _merge_union_fields(self, field: str, rule_value: Any, ai_value: Any, stats: Dict[str, int]) -> tuple:
        """
        Merge union fields - combine and deduplicate results from both sources.
        
        Args:
            field: Field name
            rule_value: Rule-based result
            ai_value: AI result
            stats: Merge statistics
            
        Returns:
            Tuple of (combined_list, source)
        """
        stats['union_fields_used'] += 1
        
        # Ensure both are lists
        rule_list = rule_value if isinstance(rule_value, list) else ([] if not rule_value else [rule_value])
        ai_list = ai_value if isinstance(ai_value, list) else ([] if not ai_value else [ai_value])
        
        # Combine and deduplicate (case-insensitive for strings)
        combined = []
        seen_lower = set()
        
        for item in rule_list + ai_list:
            if isinstance(item, str):
                item_lower = item.lower().strip()
                if item_lower and item_lower not in seen_lower:
                    seen_lower.add(item_lower)
                    combined.append(item.strip())
            elif item and item not in combined:
                combined.append(item)
        
        # Determine source
        if len(rule_list) > 0 and len(ai_list) > 0:
            source = 'rule+ai'
        elif len(rule_list) > 0:
            source = 'rule'
        else:
            source = 'ai'
        
        self.logger.debug(f"Union merge for {field}: {len(rule_list)} rule + {len(ai_list)} AI = {len(combined)} combined")
        return combined, source
    
    def _resolve_conflict(self, field: str, rule_value: Any, ai_value: Any, stats: Dict[str, int]) -> tuple:
        """
        Resolve conflicts between rule and AI results.
        
        Args:
            field: Field name
            rule_value: Rule-based result
            ai_value: AI result
            stats: Merge statistics
            
        Returns:
            Tuple of (resolved_value, source)
        """
        stats['conflicts_resolved'] += 1
        
        # If only one has a value, use it
        if rule_value and not ai_value:
            return rule_value, 'rule'
        elif ai_value and not rule_value:
            return ai_value, 'ai'
        elif not rule_value and not ai_value:
            return None, 'none'
        
        # Both have values - use heuristics
        # For strings, prefer longer/more detailed
        if isinstance(rule_value, str) and isinstance(ai_value, str):
            if len(rule_value) > len(ai_value):
                self.logger.debug(f"Conflict resolved for {field}: using rule (longer)")
                return rule_value, 'rule'
            else:
                self.logger.debug(f"Conflict resolved for {field}: using AI (longer)")
                return ai_value, 'ai'
        
        # For lists, prefer longer list
        if isinstance(rule_value, list) and isinstance(ai_value, list):
            if len(rule_value) > len(ai_value):
                self.logger.debug(f"Conflict resolved for {field}: using rule (more items)")
                return rule_value, 'rule'
            else:
                self.logger.debug(f"Conflict resolved for {field}: using AI (more items)")
                return ai_value, 'ai'
        
        # Default: prefer rule result
        self.logger.debug(f"Conflict resolved for {field}: defaulting to rule")
        return rule_value, 'rule'
    
    def resolve_conflict(self, rule_val: Any, ai_val: Any, field: str, stats: Dict[str, int]) -> Any:
        """
        Resolve conflict between rule and AI values for a specific field.
        
        Args:
            rule_val: Rule-based value
            ai_val: AI value
            field: Field name for context
            stats: Merge statistics
            
        Returns:
            Best value based on confidence and validation
        """
        # Extract AI confidence
        ai_confidence = self._extract_ai_confidence(ai_val)
        threshold = self.FIELD_THRESHOLDS.get(field, self.AI_HIGH_CONFIDENCE)
        
        # Special handling for name field
        if field == 'name':
            return self._resolve_name_conflict(rule_val, ai_val, ai_confidence)
        
        # Validate both results
        rule_valid = self._validate_field(field, rule_val)
        ai_valid = self._validate_field(field, ai_val)
        
        # Decision matrix
        if ai_valid and ai_confidence >= threshold:
            return ai_val
        elif rule_valid and (not ai_valid or ai_confidence < threshold):
            return rule_val
        elif ai_valid and not rule_valid:
            return ai_val
        elif rule_valid and not ai_valid:
            return rule_val
        else:
            # Both invalid - prefer AI if confidence is reasonable
            return ai_val if ai_confidence > self.AI_LOW_CONFIDENCE else rule_val
    
    def _resolve_name_conflict(self, rule_val: Any, ai_val: Any, ai_confidence: float) -> Any:
        """
        Special conflict resolution for name field.
        
        Args:
            rule_val: Rule-based name result
            ai_val: AI name result
            ai_confidence: AI confidence score
            
        Returns:
            Best name result
        """
        # AI needs high confidence for names
        name_threshold = self.FIELD_THRESHOLDS['name']
        
        if ai_val and ai_confidence >= name_threshold:
            # Validate AI name format
            if self._validate_name_format(str(ai_val)):
                return ai_val
        
        # Fall back to rule result
        if rule_val and self._validate_name_format(str(rule_val)):
            return rule_val
        
        # Last resort: use AI result if available
        return ai_val if ai_val else rule_val

    def _validate_field(self, field: str, value: Any) -> bool:
        """
        Validate a field value based on field-specific rules.
        
        Args:
            field: Field name
            value: Value to validate
            
        Returns:
            True if value is valid for the field
        """
        if not value:
            return False
        
        value_str = str(value).strip()
        
        if field == 'email':
            return bool(self.email_pattern.match(value_str))
        
        elif field == 'phone':
            return bool(self.phone_pattern.match(value_str))
        
        elif field == 'linkedin':
            return bool(self.linkedin_pattern.search(value_str))
        
        elif field == 'github':
            return bool(self.github_pattern.search(value_str))
        
        elif field == 'name':
            return self._validate_name_format(value_str)
        
        elif field in ['companies', 'locations', 'organizations']:
            return len(value_str) > 2 and not value_str.isdigit()
        
        elif field in ['skills', 'job_titles']:
            return len(value_str) > 1
        
        else:
            return len(value_str) > 0
    
    def _validate_name_format(self, name: str) -> bool:
        """Validate that a name looks like a proper name."""
        if not name or len(name.strip()) < 2:
            return False
        name_words = name.strip().split()
        if not (1 <= len(name_words) <= 5):
            return False
        for word in name_words:
            cleaned = word.strip("'-.")
            if not cleaned or not cleaned.replace('-', '').replace("'", '').isalpha():
                return False
        return True
    
    def _extract_ai_confidence(self, ai_value: Any) -> float:
        """
        Extract confidence score from AI result.
        
        Args:
            ai_value: AI result (may include confidence)
            
        Returns:
            Confidence score between 0.0 and 1.0
        """
        if not ai_value:
            return 0.0
        
        # If AI value is a dict with confidence
        if isinstance(ai_value, dict) and 'confidence' in ai_value:
            try:
                return float(ai_value['confidence'])
            except (ValueError, TypeError):
                pass
        
        # If AI value is a list of entities with scores
        if isinstance(ai_value, list) and ai_value:
            # Average confidence of all entities
            confidences = []
            for item in ai_value:
                if isinstance(item, dict) and 'score' in item:
                    try:
                        confidences.append(float(item['score']))
                    except (ValueError, TypeError):
                        pass
            if confidences:
                return sum(confidences) / len(confidences)
        
        # Default medium confidence
        return self.AI_MEDIUM_CONFIDENCE
    
    def _ensure_list(self, value: Any) -> List[str]:
        """
        Ensure value is a list of strings.
        
        Args:
            value: Value to convert to list
            
        Returns:
            List of strings
        """
        if not value:
            return []
        
        if isinstance(value, list):
            return [str(item).strip() for item in value if item and str(item).strip()]
        
        if isinstance(value, str):
            # Split by common separators
            items = re.split(r'[,;•\n|]', value)
            return [item.strip() for item in items if item.strip()]
        
        return [str(value).strip()]
    
    def deduplicate_list(self, items: List[str]) -> List[str]:
        """
        Remove duplicates from list case-insensitively.
        Keeps the most common capitalization.
        
        Args:
            items: List of items to deduplicate
            
        Returns:
            Deduplicated list
        """
        if not items:
            return []
        
        # Count occurrences of each case-insensitive variant
        variant_counts = defaultdict(list)
        
        for item in items:
            normalized = item.lower().strip()
            if normalized:
                variant_counts[normalized].append(item.strip())
        
        # For each normalized item, pick the most common variant
        deduplicated = []
        for normalized, variants in variant_counts.items():
            if len(variants) == 1:
                deduplicated.append(variants[0])
            else:
                # Count occurrences of each variant
                variant_counter = Counter(variants)
                most_common = variant_counter.most_common(1)[0][0]
                deduplicated.append(most_common)
        
        return deduplicated
    
    def _sort_by_importance(self, field: str, items: List[str]) -> List[str]:
        """
        Sort items by importance/frequency for a specific field.
        
        Args:
            field: Field name
            items: List of items to sort
            
        Returns:
            Sorted list
        """
        if not items:
            return []
        
        # Get importance rules for this field
        importance_rules = self.field_importance.get(field, {})
        
        # Calculate importance score for each item
        scored_items = []
        for item in items:
            score = 0
            item_lower = item.lower()
            
            # High importance items
            for high_item in importance_rules.get('high', []):
                if high_item in item_lower:
                    score += 3
                    break
            
            # Medium importance items
            for medium_item in importance_rules.get('medium', []):
                if medium_item in item_lower:
                    score += 2
                    break
            
            # Low importance items
            for low_item in importance_rules.get('low', []):
                if low_item in item_lower:
                    score += 1
                    break
            
            # Length bonus (shorter items might be more specific)
            if len(item) <= 10:
                score += 0.5
            
            scored_items.append((item, score))
        
        # Sort by score (descending), then by original order
        scored_items.sort(key=lambda x: (-x[1], items.index(x[0])))
        
        return [item for item, score in scored_items]
    
    def get_merge_summary(self, merged_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get summary of merge decisions and statistics.
        
        Args:
            merged_result: Merged result dictionary
            
        Returns:
            Merge summary statistics
        """
        metadata = merged_result.get('_merge_metadata', {})
        strategy_used = metadata.get('strategy_used', {})
        
        summary = {
            'total_fields_processed': metadata.get('total_fields', 0),
            'rule_priority_fields_used': strategy_used.get('rule_priority_used', 0),
            'ai_priority_fields_used': strategy_used.get('ai_priority_used', 0),
            'union_fields_used': strategy_used.get('union_fields_used', 0),
            'conflicts_resolved': strategy_used.get('conflicts_resolved', 0),
            'merge_strategy_distribution': {
                'rule_priority': strategy_used.get('rule_priority_used', 0),
                'ai_priority': strategy_used.get('ai_priority_used', 0),
                'union_merge': strategy_used.get('union_fields_used', 0),
                'conflict_resolution': strategy_used.get('conflicts_resolved', 0)
            }
        }
        
        # Add field-specific statistics
        field_stats = {}
        for field in merged_result.keys():
            if field != '_merge_metadata':
                value = merged_result[field]
                if isinstance(value, list):
                    field_stats[field] = {
                        'type': 'list',
                        'count': len(value),
                        'sample': value[:3] if value else []
                    }
                else:
                    field_stats[field] = {
                        'type': 'scalar',
                        'value': value,
                        'is_empty': not bool(value)
                    }
        
        summary['field_statistics'] = field_stats
        
        return summary


# Example usage and testing
if __name__ == "__main__":
    # Sample rule-based and AI results for testing
    rule_result = {
        'name': None,  # Rules can't extract names well
        'email': 'john.doe@email.com',
        'phone': '+1 (555) 123-4567',
        'linkedin': 'linkedin.com/in/johndoe',
        'github': 'github.com/johndoe',
        'skills': ['Python', 'JavaScript', 'React'],
        'companies': [],  # Rules can't extract companies well
        'locations': [],  # Rules can't extract locations well
        'job_titles': ['Software Engineer', 'Senior Developer']
    }
    
    ai_result = {
        'name': 'John Doe',  # AI can extract names
        'email': 'john.doe@different.com',  # AI might get wrong email
        'phone': None,
        'linkedin': 'linkedin.com/in/johndoe',
        'github': None,
        'skills': ['python', 'react', 'node.js', 'aws'],  # AI might find more skills
        'companies': ['Tech Corp', 'StartupXYZ'],  # AI can extract companies
        'locations': ['San Francisco', 'CA'],  # AI can extract locations
        'job_titles': ['Senior Software Engineer']
    }
    
    # Test the merger
    merger = HybridMerger()
    
    print("🔀 Testing Hybrid Merger")
    print("=" * 50)
    
    # Merge results
    merged = merger.merge(rule_result, ai_result)
    
    print("📊 Merged Results:")
    for field, value in merged.items():
        if field != '_merge_metadata':
            print(f"  {field}: {value}")
    
    # Get merge summary
    summary = merger.get_merge_summary(merged)
    
    print("\n📈 Merge Summary:")
    print(f"  Total fields: {summary['total_fields_processed']}")
    print(f"  Rule priority used: {summary['rule_priority_fields_used']}")
    print(f"  AI priority used: {summary['ai_priority_fields_used']}")
    print(f"  Union fields used: {summary['union_fields_used']}")
    print(f"  Conflicts resolved: {summary['conflicts_resolved']}")
    
    print("\n🎯 Field Statistics:")
    for field, stats in summary['field_statistics'].items():
        if stats['type'] == 'list':
            print(f"  {field}: {stats['count']} items")
        else:
            print(f"  {field}: {stats['value']} ({'empty' if stats['is_empty'] else 'filled'})")
    
    print("\n✅ Hybrid merger test completed!")
