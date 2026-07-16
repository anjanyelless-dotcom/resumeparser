"""
Confidence scoring module for parsed resume data.
Evaluates the quality and completeness of extracted information with weighted scoring.
"""

import re
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime

# Configure logging
logger = logging.getLogger(__name__)


class ConfidenceScorer:
    """
    Confidence scorer for parsed resume data.
    Calculates confidence scores for individual fields and overall resume quality.
    """
    
    # Field weights for overall score calculation
    FIELD_WEIGHTS = {
        'email': 0.15,
        'phone': 0.10,
        'name': 0.20,
        'skills': 0.25,
        'experience': 0.20,
        'education': 0.10
    }
    
    # Critical fields that must be present for a quality resume
    CRITICAL_FIELDS = ['email', 'name', 'skills']
    
    # Minimum thresholds for different quality levels
    QUALITY_THRESHOLDS = {
        'excellent': 0.85,
        'good': 0.70,
        'fair': 0.60,
        'poor': 0.40
    }
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Pre-compile validation patterns
        self._compile_patterns()
    
    def _compile_patterns(self):
        """Pre-compile regex patterns for validation."""
        
        # Email validation pattern
        self.email_pattern = re.compile(
            r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        )
        
        # Phone validation pattern (basic)
        self.phone_pattern = re.compile(
            r'^\+?[\d\s\-\(\)]{10,}$'
        )
        
        # Name pattern (basic validation)
        self.name_pattern = re.compile(
            r'^[A-Za-z\s\-\.\']{2,50}$'
        )
    
    def score_parsed_resume(self, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate confidence score for each field and overall resume quality.
        
        Args:
            parsed_data: Dictionary containing parsed resume data
            
        Returns:
            Dictionary with confidence scores and recommendations:
            {
                'overall': float,
                'fields': { 'email': float, 'phone': float, ... },
                'needs_review': bool,
                'missing_critical': list[str],
                'quality_level': str,
                'recommendations': list[str]
            }
        """
        try:
            self.logger.info("Calculating confidence scores for parsed resume")
            
            # Calculate individual field scores
            field_scores = {}
            
            field_scores['email'] = self._score_email(parsed_data.get('email'))
            field_scores['phone'] = self._score_phone(parsed_data.get('phone'))
            field_scores['name'] = self._score_name(parsed_data.get('name'), parsed_data.get('name_confidence'))
            field_scores['skills'] = self._score_skills(parsed_data.get('skills', []))
            field_scores['experience'] = self._score_experience(parsed_data.get('work_experience', []))
            field_scores['education'] = self._score_education(parsed_data.get('education', []))
            
            # Calculate overall weighted score
            overall_score = self._calculate_overall_score(field_scores)
            
            # Determine quality level
            quality_level = self._get_quality_level(overall_score)
            
            # Calculate completeness quality score
            quality_score = self._calculate_quality_score(parsed_data)
            
            # Identify missing critical fields
            missing_critical = self._identify_missing_critical_fields(parsed_data, field_scores)
            
            # Determine if review is needed
            needs_review = overall_score < 0.60 or len(missing_critical) > 0
            
            # Generate recommendations
            recommendations = self._generate_recommendations(field_scores, parsed_data)
            
            result = {
                'overall': round(overall_score, 3),
                'fields': {k: round(v, 3) for k, v in field_scores.items()},
                'needs_review': needs_review,
                'missing_critical': missing_critical,
                'quality_level': quality_level,
                'quality_score': quality_score,
                'recommendations': recommendations,
                'field_weights': self.FIELD_WEIGHTS.copy()
            }
            
            self.logger.info(f"Confidence scoring completed: overall={overall_score:.3f}, quality={quality_level}, quality_score={quality_score}")
            return result
            
        except Exception as e:
            self.logger.error(f"Error calculating confidence scores: {e}")
            return self._get_default_result()

    def _calculate_quality_score(self, parsed_data: Dict[str, Any]) -> float:
        """
        Calculate an overall completeness and quality score (0.0 to 1.0).
        Evaluates presence and richness of candidate data fields.
        """
        score = 0.0
        
        # 1. Contact info (Name, Email, Phone) - 30%
        if parsed_data.get("name"):
            score += 0.10
        if parsed_data.get("email"):
            score += 0.10
        if parsed_data.get("phone"):
            score += 0.10
            
        # 2. Summary - 10%
        summary = parsed_data.get("summary")
        if summary and len(str(summary).strip()) > 30:
            score += 0.10
            
        # 3. Skills count - 20%
        skills = parsed_data.get("skills", [])
        if isinstance(skills, list) and len(skills) >= 5:
            score += 0.20
        elif isinstance(skills, list) and len(skills) >= 1:
            score += 0.10
            
        # 4. Work Experience - 20%
        work_exp = parsed_data.get("work_experience") or parsed_data.get("experience") or []
        if isinstance(work_exp, list) and len(work_exp) >= 2:
            score += 0.20
        elif isinstance(work_exp, list) and len(work_exp) >= 1:
            score += 0.10
            
        # 5. Education - 10%
        edu = parsed_data.get("education") or []
        if isinstance(edu, list) and len(edu) >= 1:
            score += 0.10
            
        # 6. Certifications / Achievements / Projects - 10%
        certs = parsed_data.get("certifications") or []
        achievements = parsed_data.get("achievements") or []
        projects = parsed_data.get("projects") or []
        if (isinstance(certs, list) and len(certs) > 0) or \
           (isinstance(achievements, list) and len(achievements) > 0) or \
           (isinstance(projects, list) and len(projects) > 0):
            score += 0.10
            
        return round(min(1.0, score), 2)
    
    def _score_email(self, email: Any) -> float:
        """
        Score email field based on validity and presence.
        
        Args:
            email: Email value to score
            
        Returns:
            Confidence score between 0.0 and 1.0
        """
        try:
            if not email:
                return 0.0
            
            email_str = str(email).strip()
            
            # Check if it matches email pattern
            if self.email_pattern.match(email_str):
                # Additional checks for quality
                domain_score = self._score_email_domain(email_str)
                return min(1.0, 0.8 + domain_score)
            else:
                return 0.0
                
        except Exception as e:
            self.logger.error(f"Error scoring email: {e}")
            return 0.0
    
    def _score_email_domain(self, email: str) -> float:
        """
        Score email domain for quality (professional vs personal).
        
        Args:
            email: Email address to evaluate
            
        Returns:
            Domain quality score between 0.0 and 0.2
        """
        try:
            domain = email.split('@')[-1].lower()
            
            # Professional domains
            professional_domains = [
                'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
                'company.com', 'corporate.com', 'business.com'
            ]
            
            # Check for common professional providers
            if any(prof in domain for prof in professional_domains):
                return 0.1
            
            # Check for company domains (no common providers)
            if not any(provider in domain for provider in ['gmail', 'yahoo', 'outlook', 'hotmail']):
                return 0.2
            
            return 0.05
            
        except Exception:
            return 0.0
    
    def _score_phone(self, phone: Any) -> float:
        """
        Score phone field based on validity and format.
        
        Args:
            phone: Phone value to score
            
        Returns:
            Confidence score between 0.0 and 1.0
        """
        try:
            if not phone:
                return 0.0
            
            phone_str = str(phone).strip()
            
            # Remove common formatting
            clean_phone = re.sub(r'[^\d+]', '', phone_str)
            
            # Check if it has enough digits and matches pattern
            if len(clean_phone) >= 10 and self.phone_pattern.match(phone_str):
                # Bonus for international format
                if phone_str.startswith('+'):
                    return 1.0
                else:
                    return 0.9
            else:
                return 0.0
                
        except Exception as e:
            self.logger.error(f"Error scoring phone: {e}")
            return 0.0
    
    def _score_name(self, name: Any, confidence: Any = None) -> float:
        """
        Score name field based on presence, format, and AI confidence.
        
        Args:
            name: Name value to score
            confidence: AI confidence score if available
            
        Returns:
            Confidence score between 0.0 and 1.0
        """
        try:
            if not name:
                return 0.0
            
            name_str = str(name).strip()
            
            # Basic format validation
            if not self.name_pattern.match(name_str):
                return 0.3
            
            # Check word count (should be 2-4 words typically)
            word_count = len(name_str.split())
            if word_count < 2 or word_count > 4:
                return 0.5
            
            # Use AI confidence if available
            if confidence is not None:
                try:
                    ai_confidence = float(confidence)
                    if ai_confidence > 0.8:  # High confidence AI extraction
                        return min(1.0, ai_confidence)
                    else:  # Lower confidence AI
                        return max(0.6, ai_confidence)
                except (ValueError, TypeError):
                    pass
            
            # Rule-based extraction gets 0.7
            return 0.7
            
        except Exception as e:
            self.logger.error(f"Error scoring name: {e}")
            return 0.0
    
    def _score_skills(self, skills: Any) -> float:
        """
        Score skills field based on quantity and quality.
        
        Args:
            skills: List of skills or skills data
            
        Returns:
            Confidence score between 0.0 and 1.0
        """
        try:
            if not skills:
                return 0.0
            
            # Handle different skill formats
            if isinstance(skills, list):
                skills_count = len(skills)
            elif isinstance(skills, dict):
                skills_count = len(skills.get('skills', []))
            elif isinstance(skills, str):
                # Split string by common separators
                skills_list = re.split(r'[,;•\n]', str(skills))
                skills_count = len([s.strip() for s in skills_list if s.strip()])
            else:
                return 0.0
            
            # Score based on count (more skills = higher confidence)
            # Minimum 5 skills for full confidence
            score = min(1.0, skills_count / 5.0)
            
            # Bonus for diverse skill categories
            if skills_count >= 10:
                score = min(1.0, score + 0.1)
            
            return round(score, 3)
            
        except Exception as e:
            self.logger.error(f"Error scoring skills: {e}")
            return 0.0
    
    def _score_experience(self, experience: Any) -> float:
        """
        Score experience field based on completeness and data quality.
        
        Args:
            experience: List of experience entries or experience data
            
        Returns:
            Confidence score between 0.0 and 1.0
        """
        try:
            if not experience:
                return 0.0
            
            # Handle different experience formats
            if isinstance(experience, list):
                experience_list = experience
            elif isinstance(experience, dict):
                experience_list = experience.get('work_experience', [])
            else:
                return 0.0
            
            if not experience_list:
                return 0.0
            
            # Experience confidence — based on work_experience list
            exp_list = experience_list
            if not isinstance(exp_list, list):
                exp_list = []
            
            valid_jobs = [
                e for e in exp_list 
                if e.get('title') or e.get('job_title')
            ]
            
            if len(valid_jobs) >= 3:
                exp_score = 1.0
            elif len(valid_jobs) == 2:
                exp_score = 0.8
            elif len(valid_jobs) == 1:
                exp_score = 0.6
            else:
                exp_score = 0.0
            
            return exp_score
            
        except Exception as e:
            self.logger.error(f"Error scoring experience: {e}")
            return 0.0
    
    def _score_education(self, education: Any) -> float:
        """
        Score education field based on completeness and data quality.
        
        Args:
            education: List of education entries or education data
            
        Returns:
            Confidence score between 0.0 and 1.0
        """
        try:
            if not education:
                return 0.0
            
            # Handle different education formats
            if isinstance(education, list):
                education_list = education
            elif isinstance(education, dict):
                education_list = education.get('education', [])
            else:
                return 0.0
            
            if not education_list:
                return 0.0
            
            # Score based on data completeness
            total_score = 0.0
            
            for edu in education_list:
                exp_score = 0.0
                
                # Check for required fields
                if edu.get('degree'):
                    exp_score += 0.5
                if edu.get('institution'):
                    exp_score += 0.5
                
                # Bonus fields
                if edu.get('field_of_study'):
                    exp_score += 0.2
                if edu.get('end_year'):
                    exp_score += 0.2
                if edu.get('gpa'):
                    exp_score += 0.1
                
                total_score += min(1.0, exp_score)
            
            # Average score across all education entries
            avg_score = total_score / len(education_list)
            
            return round(avg_score, 3)
            
        except Exception as e:
            self.logger.error(f"Error scoring education: {e}")
            return 0.0
    
    def _calculate_overall_score(self, field_scores: Dict[str, float]) -> float:
        """
        Calculate overall weighted score from field scores.
        
        Args:
            field_scores: Dictionary of field scores
            
        Returns:
            Overall weighted score
        """
        try:
            total_score = 0.0
            total_weight = 0.0
            
            for field, score in field_scores.items():
                if field in self.FIELD_WEIGHTS:
                    weight = self.FIELD_WEIGHTS[field]
                    total_score += score * weight
                    total_weight += weight
            
            return total_score / total_weight if total_weight > 0 else 0.0
            
        except Exception as e:
            self.logger.error(f"Error calculating overall score: {e}")
            return 0.0
    
    def _get_quality_level(self, score: float) -> str:
        """
        Determine quality level based on score.
        
        Args:
            score: Overall confidence score
            
        Returns:
            Quality level string
        """
        if score >= self.QUALITY_THRESHOLDS['excellent']:
            return 'excellent'
        elif score >= self.QUALITY_THRESHOLDS['good']:
            return 'good'
        elif score >= self.QUALITY_THRESHOLDS['fair']:
            return 'fair'
        elif score >= self.QUALITY_THRESHOLDS['poor']:
            return 'poor'
        else:
            return 'very_poor'
    
    def _identify_missing_critical_fields(self, parsed_data: Dict[str, Any], field_scores: Dict[str, float]) -> List[str]:
        """
        Identify critical fields that are missing or have low scores.
        
        Args:
            parsed_data: Parsed resume data
            field_scores: Field confidence scores
            
        Returns:
            List of missing critical fields
        """
        missing = []
        
        for field in self.CRITICAL_FIELDS:
            score = field_scores.get(field, 0.0)
            if score < 0.5:  # Low score threshold for critical fields
                missing.append(field)
        
        return missing
    
    def _generate_recommendations(self, field_scores: Dict[str, float], parsed_data: Dict[str, Any]) -> List[str]:
        """
        Generate recommendations for improving resume quality.
        
        Args:
            field_scores: Field confidence scores
            parsed_data: Parsed resume data
            
        Returns:
            List of recommendations
        """
        recommendations = []
        
        # Email recommendations
        if field_scores.get('email', 0) < 0.5:
            recommendations.append("Add a valid email address")
        
        # Phone recommendations
        if field_scores.get('phone', 0) < 0.5:
            recommendations.append("Add a valid phone number")
        
        # Name recommendations
        if field_scores.get('name', 0) < 0.7:
            recommendations.append("Ensure full name is clearly visible")
        
        # Skills recommendations
        skills_score = field_scores.get('skills', 0)
        if skills_score < 0.6:
            recommendations.append("Add more technical skills (minimum 5 recommended)")
        elif skills_score < 0.8:
            recommendations.append("Consider adding more diverse skills")
        
        # Experience recommendations
        exp_score = field_scores.get('experience', 0)
        if exp_score < 0.5:
            recommendations.append("Add work experience with job titles and companies")
        elif exp_score < 0.8:
            recommendations.append("Include dates for work experience entries")
        
        # Education recommendations
        edu_score = field_scores.get('education', 0)
        if edu_score < 0.5:
            recommendations.append("Add education information with degree and institution")
        elif edu_score < 0.8:
            recommendations.append("Include graduation years for education entries")
        
        return recommendations
    
    def _get_default_result(self) -> Dict[str, Any]:
        """
        Get default result for error cases.
        
        Returns:
            Default confidence scoring result
        """
        return {
            'overall': 0.0,
            'fields': {
                'email': 0.0,
                'phone': 0.0,
                'name': 0.0,
                'skills': 0.0,
                'experience': 0.0,
                'education': 0.0
            },
            'needs_review': True,
            'missing_critical': ['email', 'name', 'skills'],
            'quality_level': 'very_poor',
            'recommendations': ['Resume data is missing or invalid'],
            'field_weights': self.FIELD_WEIGHTS.copy()
        }
    
    def get_field_breakdown(self, parsed_data: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        """
        Get detailed breakdown of each field's scoring.
        
        Args:
            parsed_data: Parsed resume data
            
        Returns:
            Detailed field breakdown with scoring details
        """
        try:
            breakdown = {}
            
            # Email breakdown
            email = parsed_data.get('email')
            email_score = self._score_email(email)
            breakdown['email'] = {
                'score': email_score,
                'value': email,
                'valid': bool(email and self.email_pattern.match(str(email))),
                'reason': 'Valid email format' if email_score > 0 else 'Missing or invalid email'
            }
            
            # Phone breakdown
            phone = parsed_data.get('phone')
            phone_score = self._score_phone(phone)
            breakdown['phone'] = {
                'score': phone_score,
                'value': phone,
                'valid': bool(phone and self.phone_pattern.match(str(phone))),
                'reason': 'Valid phone format' if phone_score > 0 else 'Missing or invalid phone'
            }
            
            # Name breakdown
            name = parsed_data.get('name')
            name_confidence = parsed_data.get('name_confidence')
            name_score = self._score_name(name, name_confidence)
            breakdown['name'] = {
                'score': name_score,
                'value': name,
                'confidence': name_confidence,
                'reason': f"Score: {name_score:.3f}" + (f" (AI: {name_confidence})" if name_confidence else " (Rule-based)")
            }
            
            # Skills breakdown
            skills = parsed_data.get('skills', [])
            skills_score = self._score_skills(skills)
            skills_count = len(skills) if isinstance(skills, list) else 0
            breakdown['skills'] = {
                'score': skills_score,
                'count': skills_count,
                'value': skills,
                'reason': f"{skills_count} skills found" if skills_count > 0 else "No skills found"
            }
            
            # Experience breakdown
            experience = parsed_data.get('experience', [])
            exp_score = self._score_experience(experience)
            exp_count = len(experience) if isinstance(experience, list) else 0
            breakdown['experience'] = {
                'score': exp_score,
                'count': exp_count,
                'value': experience,
                'reason': f"{exp_count} experience entries" if exp_count > 0 else "No experience found"
            }
            
            # Education breakdown
            education = parsed_data.get('education', [])
            edu_score = self._score_education(education)
            edu_count = len(education) if isinstance(education, list) else 0
            breakdown['education'] = {
                'score': edu_score,
                'count': edu_count,
                'value': education,
                'reason': f"{edu_count} education entries" if edu_count > 0 else "No education found"
            }
            
            return breakdown
            
        except Exception as e:
            self.logger.error(f"Error generating field breakdown: {e}")
            return {}
    
    def compare_resumes(self, resume1_data: Dict[str, Any], resume2_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compare confidence scores between two resumes.
        
        Args:
            resume1_data: First resume data
            resume2_data: Second resume data
            
        Returns:
            Comparison results
        """
        try:
            score1 = self.score_parsed_resume(resume1_data)
            score2 = self.score_parsed_resume(resume2_data)
            
            comparison = {
                'resume1': {
                    'overall': score1['overall'],
                    'quality_level': score1['quality_level']
                },
                'resume2': {
                    'overall': score2['overall'],
                    'quality_level': score2['quality_level']
                },
                'difference': round(score2['overall'] - score1['overall'], 3),
                'winner': 'resume2' if score2['overall'] > score1['overall'] else 'resume1',
                'field_comparison': {}
            }
            
            # Compare individual fields
            for field in self.FIELD_WEIGHTS.keys():
                field_diff = score2['fields'][field] - score1['fields'][field]
                comparison['field_comparison'][field] = {
                    'resume1': score1['fields'][field],
                    'resume2': score2['fields'][field],
                    'difference': round(field_diff, 3),
                    'improved': field_diff > 0
                }
            
            return comparison
            
        except Exception as e:
            self.logger.error(f"Error comparing resumes: {e}")
            return {}


# Example usage and testing
if __name__ == "__main__":
    # Sample parsed resume data for testing
    sample_parsed_data = {
        'email': 'john.doe@email.com',
        'phone': '+1-555-123-4567',
        'name': 'John Doe',
        'name_confidence': 0.95,  # AI confidence
        'skills': ['Python', 'JavaScript', 'React', 'Node.js', 'AWS', 'Docker'],
        'experience': [
            {
                'job_title': 'Senior Software Engineer',
                'company_name': 'Tech Corp',
                'start_date': 'January 2020',
                'end_date': 'Present'
            },
            {
                'job_title': 'Software Developer',
                'company_name': 'StartupXYZ',
                'start_date': 'June 2018',
                'end_date': 'December 2019'
            }
        ],
        'education': [
            {
                'degree': 'Master of Science',
                'institution': 'Stanford University',
                'end_year': 2018,
                'gpa': 3.8
            }
        ]
    }
    
    scorer = ConfidenceScorer()
    
    # Test confidence scoring
    scores = scorer.score_parsed_resume(sample_parsed_data)
    
    print("📊 Confidence Scoring Results:")
    print(f"Overall Score: {scores['overall']:.3f} ({scores['quality_level']})")
    print(f"Needs Review: {scores['needs_review']}")
    print(f"Missing Critical: {scores['missing_critical']}")
    
    print("\n📈 Field Scores:")
    for field, score in scores['fields'].items():
        weight = scores['field_weights'][field]
        weighted = score * weight
        print(f"  {field}: {score:.3f} (weight: {weight:.2f}, weighted: {weighted:.3f})")
    
    print("\n💡 Recommendations:")
    for rec in scores['recommendations']:
        print(f"  • {rec}")
    
    # Test field breakdown
    print("\n🔍 Field Breakdown:")
    breakdown = scorer.get_field_breakdown(sample_parsed_data)
    for field, details in breakdown.items():
        print(f"  {field}: {details['score']:.3f} - {details['reason']}")
    
    # Test resume comparison
    print("\n⚖️  Resume Comparison:")
    resume2_data = sample_parsed_data.copy()
    resume2_data['skills'] = ['Python']  # Fewer skills
    resume2_data['phone'] = None  # Missing phone
    
    comparison = scorer.compare_resumes(sample_parsed_data, resume2_data)
    print(f"Winner: {comparison['winner']}")
    print(f"Score difference: {comparison['difference']:.3f}")
    print(f"Resume 1: {comparison['resume1']['overall']:.3f} ({comparison['resume1']['quality_level']})")
    print(f"Resume 2: {comparison['resume2']['overall']:.3f} ({comparison['resume2']['quality_level']})")
