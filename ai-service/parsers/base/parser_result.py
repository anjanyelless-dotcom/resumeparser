"""Standardized result structures for all parsers."""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import date


@dataclass
class ContactInfo:
    """Contact information extracted from resume."""
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    website: Optional[str] = None
    location: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'email': self.email,
            'phone': self.phone,
            'linkedin': self.linkedin,
            'github': self.github,
            'website': self.website,
            'location': self.location,
        }


@dataclass
class WorkExperience:
    """Single work experience entry."""
    job_title: str
    company_name: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    duration_months: int = 0
    location: Optional[str] = None
    description: str = ""
    skills: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'job_title': self.job_title,
            'company_name': self.company_name,
            'start_date': self.start_date,
            'end_date': self.end_date,
            'duration_months': self.duration_months,
            'location': self.location,
            'description': self.description,
            'skills': self.skills,
        }


@dataclass
class Education:
    """Single education entry."""
    degree: str
    institution: str
    field_of_study: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    gpa: Optional[float] = None
    location: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'degree': self.degree,
            'institution': self.institution,
            'field_of_study': self.field_of_study,
            'start_date': self.start_date,
            'end_date': self.end_date,
            'gpa': self.gpa,
            'location': self.location,
        }


@dataclass
class ParserResult:
    """Standardized result from any parser."""
    
    # Basic info
    name: Optional[str] = None
    summary: Optional[str] = None
    
    # Contact
    contact: ContactInfo = field(default_factory=ContactInfo)
    
    # Experience & Education
    work_experience: List[WorkExperience] = field(default_factory=list)
    education: List[Education] = field(default_factory=list)
    
    # Skills
    skills: List[str] = field(default_factory=list)
    
    # Metadata
    total_experience_years: float = 0.0
    confidence_scores: Dict[str, float] = field(default_factory=dict)
    source: str = "unknown"  # Which parser produced this
    
    # Raw data (for debugging)
    raw_data: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            'name': self.name,
            'summary': self.summary,
            'email': self.contact.email,
            'phone': self.contact.phone,
            'linkedin': self.contact.linkedin,
            'github': self.contact.github,
            'website': self.contact.website,
            'location': self.contact.location,
            'work_experience': [exp.to_dict() for exp in self.work_experience],
            'education': [edu.to_dict() for edu in self.education],
            'skills': self.skills,
            'total_experience_years': self.total_experience_years,
            'confidence_scores': self.confidence_scores,
            'source': self.source,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ParserResult':
        """Create ParserResult from dictionary (legacy format)."""
        result = cls()
        
        # Basic info
        result.name = data.get('name')
        result.summary = data.get('summary')
        
        # Contact info
        result.contact = ContactInfo(
            email=data.get('email'),
            phone=data.get('phone'),
            linkedin=data.get('linkedin'),
            github=data.get('github'),
            website=data.get('website'),
            location=data.get('location'),
        )
        
        # Work experience
        if 'work_experience' in data and isinstance(data['work_experience'], list):
            result.work_experience = [
                WorkExperience(**exp) if isinstance(exp, dict) else exp
                for exp in data['work_experience']
            ]
        
        # Education
        if 'education' in data and isinstance(data['education'], list):
            result.education = [
                Education(**edu) if isinstance(edu, dict) else edu
                for edu in data['education']
            ]
        
        # Skills
        result.skills = data.get('skills', [])
        
        # Metadata
        result.total_experience_years = data.get('total_experience_years', 0.0)
        result.confidence_scores = data.get('confidence_scores', {})
        result.source = data.get('source', 'unknown')
        
        return result
