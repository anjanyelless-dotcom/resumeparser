from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline
import torch
import logging
from pathlib import Path
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# Module-level model cache to avoid fragile @lru_cache
_MODEL_CACHE: dict = {}

def get_model(model_path: str):
    """
    Get cached model and tokenizer, or load and cache them if not present.
    Uses module-level dictionary cache for better reliability than @lru_cache.
    
    Args:
        model_path: Path to the model directory or HuggingFace model name
        
    Returns:
        Dictionary with 'tokenizer' and 'model' keys
    """
    if model_path not in _MODEL_CACHE:
        _MODEL_CACHE[model_path] = {
            'tokenizer': AutoTokenizer.from_pretrained(model_path),
            'model': AutoModelForTokenClassification.from_pretrained(model_path)
        }
    return _MODEL_CACHE[model_path]

class AINamedEntityParser:
    def __init__(self, use_custom_model=True):
        if use_custom_model:
            MODEL_PATH = Path(__file__).parent.parent / "models" / "resume-ner-deberta"
            if MODEL_PATH.exists():
                logger.info("[AIParser] Loading custom trained model from %s", MODEL_PATH)
                MODEL_NAME = str(MODEL_PATH)
            else:
                logger.warning("[AIParser] Custom model not found at %s, falling back to default", MODEL_PATH)
                MODEL_NAME = "jjzha/jobbert-base-cased"
        else:
            MODEL_NAME = "jjzha/jobbert-base-cased"
        
        # Use the new caching mechanism
        model_cache = get_model(MODEL_NAME)
        self.tokenizer = model_cache['tokenizer']
        self.model = model_cache['model']
        
        device = 0 if torch.cuda.is_available() else -1
        self.ner_pipeline = pipeline(
            "ner",
            model=self.model,
            tokenizer=self.tokenizer,
            aggregation_strategy="simple",
            device=device,
        )

    def chunk_text_with_overlap(self, text: str, tokenizer, max_len: int = 400, overlap: int = 50) -> List[str]:
        """
        Split text into overlapping chunks to prevent entities from being broken across boundaries.
        
        Overlap is needed because entities like "Software Engineer at Google" might be split
        across chunk boundaries, causing the entity to never be detected. With overlapping windows,
        the complete entity will appear in at least one chunk.
        """
        tokens = tokenizer.tokenize(text)
        chunks = []
        start = 0
        while start < len(tokens):
            end = min(start + max_len, len(tokens))
            chunk_tokens = tokens[start:end]
            chunk_text = tokenizer.convert_tokens_to_string(chunk_tokens)
            chunks.append(chunk_text)
            if end == len(tokens):
                break
            start += max_len - overlap
        return chunks

    def deduplicate_entities(self, entities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Remove duplicate entities that appear in overlap regions.
        Entities are considered duplicates if they have the same text and label.
        """
        seen = set()
        deduplicated = []
        
        for entity in entities:
            key = (entity.get('word', '').strip().lower(), entity.get('entity_group', '').upper())
            if key not in seen:
                seen.add(key)
                deduplicated.append(entity)
        
        return deduplicated

    def extract_entities(self, text: str) -> dict:
        if not text or len(text.strip()) < 10:
            return {'names': [], 'companies': [], 'locations': [], 'skills': [], 'titles': []}

        # Use overlapping chunking instead of simple word splitting
        chunks = self.chunk_text_with_overlap(text, self.tokenizer, max_len=400, overlap=50)

        all_entities = []
        for chunk in chunks:
            try:
                entities = self.ner_pipeline(chunk)
                all_entities.extend(entities)
            except Exception as e:
                print(f"NER chunk failed: {e}")
                continue

        # Deduplicate entities that appear in overlap regions
        all_entities = self.deduplicate_entities(all_entities)

        result = {
            'names': [], 
            'companies': [], 
            'locations': [], 
            'skills': [], 
            'titles': [],
            'emails': [],
            'phones': [],
            'education': [],
            'certifications': []
        }

        for ent in all_entities:
            word = ent.get('word', '').strip()
            label = ent.get('entity_group', ent.get('entity', '')).upper()
            score = ent.get('score', 0)
            if score < 0.50 or not word or len(word) < 2:
                continue
            
            # Custom model labels (your trained DeBERTa model)
            if 'NAME' in label:
                result['names'].append(word)
            elif 'EMAIL' in label:
                result['emails'].append(word)
            elif 'PHONE' in label:
                result['phones'].append(word)
            elif 'EDUCATION' in label or 'EDU' in label:
                result['education'].append(word)
            elif 'COMPANY' in label:
                result['companies'].append(word)
            elif 'CLIENT' in label:
                result['companies'].append(word)  # Add client as company for now
            elif 'ROLE' in label:
                result['titles'].append(word)
            elif 'LOCATION' in label:
                result['locations'].append(word)
            elif 'START_DATE' in label or 'END_DATE' in label:
                # Dates handled separately
                pass
            elif 'SKILL' in label:
                result['skills'].append(word)
            elif 'DEGREE' in label:
                result['education'].append(word)
            elif 'CERTIFICATION' in label or 'CERT' in label:
                result['certifications'].append(word)
            # Fallback to jobbert-base-cased labels for compatibility
            elif 'PER' in label:
                result['names'].append(word)
            elif 'ORG' in label:
                result['companies'].append(word)
            elif 'LOC' in label:
                result['locations'].append(word)
            elif 'MISC' in label:
                # Check if MISC might be a skill or title
                if any(tech in word.lower() for tech in ['engineer', 'developer', 'manager', 'director', 'lead', 'senior', 'junior']):
                    result['titles'].append(word)
                else:
                    result['skills'].append(word)
            elif 'TITLE' in label:
                result['titles'].append(word)
            # Handle generic labels from jobbert-base-cased model
            elif label == 'LABEL_0' or label == 'LABEL_1':
                # Use heuristics to classify generic entities
                word_lower = word.lower()
                
                # Job titles
                if any(title_word in word_lower for title_word in [
                    'engineer', 'developer', 'manager', 'director', 'lead', 
                    'senior', 'junior', 'architect', 'analyst', 'consultant',
                    'specialist', 'coordinator', 'head', 'chief', 'vp', 'president'
                ]):
                    result['titles'].append(word)
                # Companies
                elif any(company_word in word_lower for company_word in [
                    'depot', 'google', 'microsoft', 'amazon', 'apple', 'facebook',
                    'netflix', 'uber', 'airbnb', 'spotify', 'twitter', 'linkedin'
                ]):
                    result['companies'].append(word)
                # Skills/Technologies
                elif any(tech_word in word_lower for tech_word in [
                    'python', 'java', 'javascript', 'sql', 'hadoop', 'spark', 
                    'hive', 'docker', 'kubernetes', 'aws', 'azure', 'gcp',
                    'react', 'angular', 'node', 'django', 'flask', 'spring'
                ]):
                    result['skills'].append(word)
                # Locations
                elif any(loc_word in word_lower for loc_word in [
                    'atlanta', 'dallas', 'new york', 'san francisco', 'seattle',
                    'austin', 'boston', 'chicago', 'denver', 'portland'
                ]) or any(state in word for state in ['GA', 'TX', 'NY', 'CA', 'WA', 'CO']):
                    result['locations'].append(word)
                # Education
                elif any(edu_word in word_lower for edu_word in [
                    'university', 'college', 'school', 'institute', 'academy'
                ]):
                    result['education'].append(word)
                # Names (proper capitalized words)
                elif word.istitle() and len(word) > 2:
                    result['names'].append(word)

        for key in result:
            result[key] = list(dict.fromkeys(result[key]))

        return result
