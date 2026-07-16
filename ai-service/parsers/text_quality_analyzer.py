import re
import logging
from typing import Dict, List, Any, Set
from difflib import SequenceMatcher

logger = logging.getLogger(__name__)


class TextQualityAnalyzer:
    """
    Analyzes text extraction quality by comparing original extracted text
    with processed/parsed output to detect data loss.
    """
    
    def __init__(self):
        self.common_sections = [
            'experience', 'education', 'skills', 'summary', 'objective',
            'projects', 'certifications', 'awards', 'publications',
            'professional experience', 'work experience', 'employment history',
            'academic background', 'qualifications', 'technical skills'
        ]
    
    def analyze_extraction_quality(
        self,
        original_text: str,
        parsed_data: Dict[str, Any],
        sections: Dict[str, str]
    ) -> Dict[str, Any]:
        """
        Compare original extracted text with parsed output to calculate quality metrics.
        
        Args:
            original_text: Raw text extracted from resume file
            parsed_data: Parsed structured data (work_experience, education, skills, etc.)
            sections: Detected sections from text
            
        Returns:
            Quality report with metrics and recommendations
        """
        try:
            # Reconstruct text from parsed data
            reconstructed_text = self._reconstruct_text_from_parsed_data(parsed_data)
            
            # Calculate text similarity
            text_similarity = self._calculate_text_similarity(original_text, reconstructed_text)
            
            # Detect missing keywords
            missing_keywords = self._detect_missing_keywords(original_text, reconstructed_text)
            
            # Detect missing sections
            missing_sections = self._detect_missing_sections(original_text, sections)
            
            # Detect structure loss
            structure_loss = self._detect_structure_loss(original_text, reconstructed_text)
            
            # Calculate text loss percentage
            text_loss_percentage = round((1 - text_similarity) * 100, 2)
            
            # Calculate overall extraction quality
            extraction_quality = self._calculate_extraction_quality(
                text_similarity,
                missing_keywords,
                missing_sections,
                structure_loss
            )
            
            # Generate recommendation
            recommendation = self._generate_recommendation(
                extraction_quality,
                text_loss_percentage,
                missing_sections,
                structure_loss
            )
            
            return {
                "extraction_quality_percentage": round(extraction_quality * 100, 2),
                "text_similarity_percentage": round(text_similarity * 100, 2),
                "missing_keywords": missing_keywords[:20],  # Top 20 missing keywords
                "missing_sections": missing_sections,
                "structure_loss": structure_loss,
                "text_loss_percentage": text_loss_percentage,
                "recommendation": recommendation,
                "metrics": {
                    "original_text_length": len(original_text),
                    "reconstructed_text_length": len(reconstructed_text),
                    "original_word_count": len(original_text.split()),
                    "reconstructed_word_count": len(reconstructed_text.split()),
                    "missing_word_count": len(missing_keywords)
                }
            }
            
        except Exception as e:
            logger.error(f"Error analyzing extraction quality: {e}", exc_info=True)
            return {
                "extraction_quality_percentage": 0,
                "text_similarity_percentage": 0,
                "missing_keywords": [],
                "missing_sections": [],
                "structure_loss": [],
                "text_loss_percentage": 100,
                "recommendation": "Quality analysis failed",
                "metrics": {}
            }
    
    def _reconstruct_text_from_parsed_data(self, parsed_data: Dict[str, Any]) -> str:
        """Reconstruct text from parsed structured data."""
        reconstructed_parts = []
        
        # Add name, email, phone
        if parsed_data.get('name'):
            reconstructed_parts.append(parsed_data['name'])
        if parsed_data.get('email'):
            reconstructed_parts.append(parsed_data['email'])
        if parsed_data.get('phone'):
            reconstructed_parts.append(parsed_data['phone'])
        
        # Add summary
        if parsed_data.get('summary'):
            reconstructed_parts.append(parsed_data['summary'])
        
        # Add skills
        if parsed_data.get('skills'):
            reconstructed_parts.append(' '.join(parsed_data['skills']))
        
        # Add work experience
        for exp in parsed_data.get('work_experience', []):
            if exp.get('job_title'):
                reconstructed_parts.append(exp['job_title'])
            if exp.get('company_name'):
                reconstructed_parts.append(exp['company_name'])
            if exp.get('description'):
                reconstructed_parts.append(exp['description'])
            if exp.get('location'):
                reconstructed_parts.append(exp['location'])
        
        # Add education
        for edu in parsed_data.get('education', []):
            if edu.get('degree'):
                reconstructed_parts.append(edu['degree'])
            if edu.get('institution'):
                reconstructed_parts.append(edu['institution'])
            if edu.get('field_of_study'):
                reconstructed_parts.append(edu['field_of_study'])
        
        return ' '.join(reconstructed_parts)
    
    def _calculate_text_similarity(self, text1: str, text2: str) -> float:
        """Calculate similarity between two texts using SequenceMatcher."""
        # Normalize texts
        text1_normalized = re.sub(r'\s+', ' ', text1.lower()).strip()
        text2_normalized = re.sub(r'\s+', ' ', text2.lower()).strip()
        
        # Calculate similarity ratio
        similarity = SequenceMatcher(None, text1_normalized, text2_normalized).ratio()
        
        return similarity
    
    def _detect_missing_keywords(self, original_text: str, reconstructed_text: str) -> List[str]:
        """Detect important keywords missing from reconstructed text."""
        # Extract words from both texts
        original_words = set(re.findall(r'\b[a-zA-Z]{3,}\b', original_text.lower()))
        reconstructed_words = set(re.findall(r'\b[a-zA-Z]{3,}\b', reconstructed_text.lower()))
        
        # Find missing words
        missing_words = original_words - reconstructed_words
        
        # Filter out common stop words
        stop_words = {
            'the', 'and', 'for', 'with', 'this', 'that', 'from', 'have',
            'has', 'had', 'was', 'were', 'been', 'are', 'will', 'would',
            'could', 'should', 'may', 'might', 'can', 'must', 'shall'
        }
        
        missing_keywords = [word for word in missing_words if word not in stop_words]
        
        # Sort by length (longer words are likely more important)
        missing_keywords.sort(key=len, reverse=True)
        
        return missing_keywords
    
    def _detect_missing_sections(self, original_text: str, sections: Dict[str, str]) -> List[str]:
        """Detect resume sections that might be missing."""
        missing_sections = []
        original_lower = original_text.lower()
        
        for section_name in self.common_sections:
            # Check if section keyword exists in original text
            if section_name in original_lower:
                # Check if section was detected
                section_found = False
                for detected_section in sections.keys():
                    if section_name in detected_section.lower():
                        section_found = True
                        break
                
                if not section_found:
                    missing_sections.append(section_name)
        
        return missing_sections
    
    def _detect_structure_loss(self, original_text: str, reconstructed_text: str) -> List[str]:
        """Detect structural elements that were lost during extraction."""
        structure_loss = []
        
        # Check for bullet points
        bullet_count_original = len(re.findall(r'[•\-\*\+►▸▶→]', original_text))
        bullet_count_reconstructed = len(re.findall(r'[•\-\*\+►▸▶→]', reconstructed_text))
        
        if bullet_count_original > bullet_count_reconstructed + 5:
            structure_loss.append(f"Bullet points lost: {bullet_count_original - bullet_count_reconstructed}")
        
        # Check for tables (multiple consecutive tabs or pipes)
        table_indicators_original = len(re.findall(r'\t{2,}|\|{2,}', original_text))
        table_indicators_reconstructed = len(re.findall(r'\t{2,}|\|{2,}', reconstructed_text))
        
        if table_indicators_original > table_indicators_reconstructed:
            structure_loss.append("Table structure lost")
        
        # Check for line breaks (paragraph structure)
        line_breaks_original = original_text.count('\n')
        line_breaks_reconstructed = reconstructed_text.count('\n')
        
        if line_breaks_original > line_breaks_reconstructed * 2:
            structure_loss.append("Paragraph structure simplified")
        
        # Check for dates
        date_pattern = r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}|\b\d{4}\s*[-–—]\s*(?:\d{4}|Present)\b'
        dates_original = len(re.findall(date_pattern, original_text, re.IGNORECASE))
        dates_reconstructed = len(re.findall(date_pattern, reconstructed_text, re.IGNORECASE))
        
        if dates_original > dates_reconstructed + 2:
            structure_loss.append(f"Date information lost: {dates_original - dates_reconstructed} dates missing")
        
        # Check for email addresses
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails_original = len(re.findall(email_pattern, original_text))
        emails_reconstructed = len(re.findall(email_pattern, reconstructed_text))
        
        if emails_original > emails_reconstructed:
            structure_loss.append("Contact information lost")
        
        # Check for phone numbers
        phone_pattern = r'\+?\d[\d\s\-\(\)]{7,}\d'
        phones_original = len(re.findall(phone_pattern, original_text))
        phones_reconstructed = len(re.findall(phone_pattern, reconstructed_text))
        
        if phones_original > phones_reconstructed:
            structure_loss.append("Phone number lost")
        
        return structure_loss
    
    def _calculate_extraction_quality(
        self,
        text_similarity: float,
        missing_keywords: List[str],
        missing_sections: List[str],
        structure_loss: List[str]
    ) -> float:
        """Calculate overall extraction quality score (0-1)."""
        # Start with text similarity as base score
        quality_score = text_similarity
        
        # Penalize for missing keywords (max 10% penalty)
        keyword_penalty = min(len(missing_keywords) * 0.002, 0.1)
        quality_score -= keyword_penalty
        
        # Penalize for missing sections (5% per section)
        section_penalty = len(missing_sections) * 0.05
        quality_score -= section_penalty
        
        # Penalize for structure loss (3% per issue)
        structure_penalty = len(structure_loss) * 0.03
        quality_score -= structure_penalty
        
        # Ensure score is between 0 and 1
        return max(0.0, min(1.0, quality_score))
    
    def _generate_recommendation(
        self,
        extraction_quality: float,
        text_loss_percentage: float,
        missing_sections: List[str],
        structure_loss: List[str]
    ) -> str:
        """Generate recommendation based on quality metrics."""
        if extraction_quality >= 0.9:
            return "Excellent extraction quality. No action needed."
        elif extraction_quality >= 0.75:
            recommendations = ["Good extraction quality."]
            if missing_sections:
                recommendations.append(f"Consider reviewing {', '.join(missing_sections[:2])} sections.")
            return " ".join(recommendations)
        elif extraction_quality >= 0.6:
            recommendations = ["Moderate extraction quality."]
            if text_loss_percentage > 30:
                recommendations.append("Significant text loss detected.")
            if structure_loss:
                recommendations.append("Structure loss detected - consider using better parser.")
            if missing_sections:
                recommendations.append(f"Missing sections: {', '.join(missing_sections[:3])}.")
            return " ".join(recommendations)
        else:
            recommendations = ["Poor extraction quality."]
            if text_loss_percentage > 50:
                recommendations.append("High text loss - use OCR for scanned documents.")
            else:
                recommendations.append("Use better parser or check file format compatibility.")
            if len(structure_loss) > 3:
                recommendations.append("Severe structure loss detected.")
            return " ".join(recommendations)
