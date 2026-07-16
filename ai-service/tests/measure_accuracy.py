"""
Accuracy measurement script to compare rule-based vs AI+rules parsing.
Measures extraction accuracy against ground truth data with fuzzy matching.
"""

import os
import sys
import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Tuple, Optional
from difflib import SequenceMatcher
from collections import defaultdict

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from parsers.rule_parser import RuleBasedParser
from parsers.ai_ner_parser import AINamedEntityParser
from parsers.section_splitter import SectionSplitter
from parsers.experience_extractor import ExperienceExtractor
from parsers.education_extractor import EducationExtractor
from parsers.confidence_scorer import ConfidenceScorer

# Try to import fuzzy matching
try:
    from thefuzz import fuzz
    FUZZY_AVAILABLE = True
except ImportError:
    print("Warning: thefuzz not available. Install with: pip install thefuzz python-Levenshtein")
    FUZZY_AVAILABLE = False

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AccuracyMeasurement:
    """
    Measures and compares accuracy between rule-based and AI+rules parsing approaches.
    """
    
    def __init__(self):
        """Initialize parsers for accuracy testing."""
        self.rule_parser = RuleBasedParser()
        self.ai_parser = AINamedEntityParser()
        self.section_splitter = SectionSplitter()
        self.experience_extractor = ExperienceExtractor()
        self.education_extractor = EducationExtractor()
        
        # Ground truth data for sample resumes
        self.ground_truth = {
            'resume1.txt': {
                'name': 'John Michael Doe',
                'email': 'john.doe@email.com',
                'phone': '+1 (555) 123-4567',
                'linkedin': 'linkedin.com/in/johndoe',
                'github': 'github.com/johndoe',
                'skills': [
                    'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js',
                    'AWS', 'Docker', 'Kubernetes', 'PostgreSQL', 'MongoDB'
                ],
                'companies': ['TechCorp Solutions Inc.', 'StartupXYZ Technologies', 'Digital Innovations Lab'],
                'job_titles': ['Senior Software Engineer', 'Software Engineer', 'Junior Developer'],
                'education_institutions': ['Stanford University', 'University of California, Berkeley'],
                'degrees': ['Master of Science in Computer Science', 'Bachelor of Science in Software Engineering'],
                'locations': ['San Francisco, CA', 'Palo Alto, CA', 'Mountain View, CA', 'Stanford, CA', 'Berkeley, CA']
            },
            
            'resume2.txt': {
                'name': 'Jane Smith',
                'email': 'jane.smith@company.com',
                'phone': '(555) 987-6543',
                'linkedin': 'linkedin.com/in/janesmith',
                'skills': ['Python', 'TensorFlow', 'SQL', 'Tableau', 'Excel', 'R', 'Machine Learning', 'Data Analysis'],
                'companies': ['DataCorp', 'Analytics Inc'],
                'job_titles': ['Senior Data Scientist', 'Data Analyst'],
                'education_institutions': ['MIT', 'Harvard University'],
                'degrees': ['Master of Science in Data Science', 'Bachelor of Science in Statistics'],
                'locations': ['Cambridge, MA', 'Boston, MA']
            },
            
            'resume3.txt': {
                'name': 'Robert Johnson',
                'email': 'robert.johnson@email.com',
                'phone': '+1-555-456-7890',
                'github': 'github.com/robertj',
                'skills': [
                    'Linux', 'AWS', 'Docker', 'Kubernetes', 'Jenkins', 'Ansible',
                    'Terraform', 'DevOps', 'System Administration', 'Cloud Computing'
                ],
                'companies': ['CloudTech Solutions', 'TechCompany'],
                'job_titles': ['DevOps Engineer', 'System Administrator'],
                'education_institutions': ['State University'],
                'degrees': ['Bachelor of Science in Information Technology'],
                'locations': ['San Francisco, CA', 'Mountain View, CA']
            }
        }
        
        logger.info("Accuracy measurement initialized with ground truth data")
    
    def load_sample_resumes(self) -> Dict[str, str]:
        """
        Load sample resumes from test directory.
        
        Returns:
            Dictionary mapping filename to resume text
        """
        test_dir = Path(__file__).parent / "sample_resumes"
        resumes = {}
        
        if not test_dir.exists():
            logger.error(f"Sample resumes directory not found: {test_dir}")
            return resumes
        
        for resume_file in test_dir.glob("*.txt"):
            try:
                with open(resume_file, 'r', encoding='utf-8') as f:
                    resumes[resume_file.name] = f.read()
                    logger.info(f"Loaded resume: {resume_file.name}")
            except Exception as e:
                logger.error(f"Error loading {resume_file}: {e}")
        
        return resumes
    
    def extract_with_rules_only(self, text: str) -> Dict[str, Any]:
        """
        Extract information using rule-based parsing only.
        
        Args:
            text: Resume text to parse
            
        Returns:
            Dictionary with extracted information
        """
        try:
            # Extract sections
            sections = self.section_splitter.split_sections(text)
            
            # Rule-based extraction
            result = {
                'name': None,  # Rules can't extract names well
                'email': self.rule_parser.extract_email(text),
                'phone': self.rule_parser.extract_phone(text),
                'linkedin': self.rule_parser.extract_linkedin(text),
                'github': self.rule_parser.extract_github(text),
                'skills': [],
                'companies': [],
                'job_titles': [],
                'education_institutions': [],
                'degrees': [],
                'locations': []
            }
            
            # Extract skills from skills section
            if 'skills' in sections and sections['skills']:
                result['skills'] = self.section_splitter.extract_skills_from_section(sections['skills'])
            
            # Extract structured data from sections
            if 'experience' in sections and sections['experience']:
                work_experience = self.experience_extractor.extract_work_experience(sections['experience'])
                result['companies'] = [exp.get('company_name', '') for exp in work_experience if exp.get('company_name')]
                result['job_titles'] = [exp.get('job_title', '') for exp in work_experience if exp.get('job_title')]
            
            if 'education' in sections and sections['education']:
                education = self.education_extractor.extract_education(sections['education'])
                result['education_institutions'] = [edu.get('institution', '') for edu in education if edu.get('institution')]
                result['degrees'] = [edu.get('degree', '') for edu in education if edu.get('degree')]
            
            return result
            
        except Exception as e:
            logger.error(f"Error in rules-only extraction: {e}")
            return {}
    
    def extract_with_ai_and_rules(self, text: str) -> Dict[str, Any]:
        """
        Extract information using AI + rules hybrid approach.
        
        Args:
            text: Resume text to parse
            
        Returns:
            Dictionary with extracted information
        """
        try:
            # Extract sections
            sections = self.section_splitter.split_sections(text)
            
            # Rule-based extraction
            rule_results = {
                'email': self.rule_parser.extract_email(text),
                'phone': self.rule_parser.extract_phone(text),
                'linkedin': self.rule_parser.extract_linkedin(text),
                'github': self.rule_parser.extract_github(text),
            }
            
            # AI entity extraction
            ai_entities = self.ai_parser.extract_entities(text)
            
            result = {
                'name': self.ai_parser.get_top_person(ai_entities),
                'email': rule_results['email'],
                'phone': rule_results['phone'],
                'linkedin': rule_results['linkedin'],
                'github': rule_results['github'],
                'skills': [],
                'companies': self.ai_parser.get_organizations(ai_entities),
                'job_titles': [],
                'education_institutions': [],
                'degrees': [],
                'locations': self.ai_parser.get_locations(ai_entities)
            }
            
            # Extract skills from skills section
            if 'skills' in sections and sections['skills']:
                result['skills'] = self.section_splitter.extract_skills_from_section(sections['skills'])
            
            # Extract structured data from sections
            if 'experience' in sections and sections['experience']:
                work_experience = self.experience_extractor.extract_work_experience(sections['experience'])
                result['job_titles'] = [exp.get('job_title', '') for exp in work_experience if exp.get('job_title')]
            
            if 'education' in sections and sections['education']:
                education = self.education_extractor.extract_education(sections['education'])
                result['education_institutions'] = [edu.get('institution', '') for edu in education if edu.get('institution')]
                result['degrees'] = [edu.get('degree', '') for edu in education if edu.get('degree')]
            
            return result
            
        except Exception as e:
            logger.error(f"Error in AI+rules extraction: {e}")
            return {}
    
    def calculate_similarity(self, extracted: Any, ground_truth: Any) -> float:
        """
        Calculate similarity score between extracted and ground truth values.
        
        Args:
            extracted: Extracted value (string or list)
            ground_truth: Ground truth value (string or list)
            
        Returns:
            Similarity score between 0.0 and 1.0
        """
        if not extracted or not ground_truth:
            return 0.0 if ground_truth else 1.0  # Perfect if both empty, 0 if ground truth exists
        
        # Handle string values
        if isinstance(extracted, str) and isinstance(ground_truth, str):
            if extracted.lower().strip() == ground_truth.lower().strip():
                return 1.0
            elif FUZZY_AVAILABLE:
                return fuzz.ratio(extracted.lower(), ground_truth.lower()) / 100.0
            else:
                return SequenceMatcher(None, extracted.lower(), ground_truth.lower()).ratio()
        
        # Handle list values
        elif isinstance(extracted, list) and isinstance(ground_truth, list):
            if not extracted and not ground_truth:
                return 1.0
            
            # Calculate best match for each ground truth item
            total_score = 0.0
            for gt_item in ground_truth:
                best_match = 0.0
                for ext_item in extracted:
                    if FUZZY_AVAILABLE:
                        score = fuzz.ratio(ext_item.lower(), gt_item.lower()) / 100.0
                    else:
                        score = SequenceMatcher(None, ext_item.lower(), gt_item.lower()).ratio()
                    best_match = max(best_match, score)
                total_score += best_match
            
            # Normalize by number of ground truth items
            return total_score / len(ground_truth) if ground_truth else 0.0
        
        # Handle mixed types (convert to string)
        else:
            extracted_str = str(extracted).strip()
            ground_truth_str = str(ground_truth).strip()
            
            if not extracted_str and not ground_truth_str:
                return 1.0
            elif not extracted_str or not ground_truth_str:
                return 0.0
            
            if extracted_str.lower() == ground_truth_str.lower():
                return 1.0
            elif FUZZY_AVAILABLE:
                return fuzz.ratio(extracted_str.lower(), ground_truth_str.lower()) / 100.0
            else:
                return SequenceMatcher(None, extracted_str.lower(), ground_truth_str.lower()).ratio()
    
    def evaluate_single_resume(self, filename: str, text: str, ground_truth: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluate extraction accuracy for a single resume.
        
        Args:
            filename: Resume filename
            text: Resume text
            ground_truth: Ground truth data for this resume
            
        Returns:
            Dictionary with accuracy results
        """
        logger.info(f"Evaluating {filename}...")
        
        # Extract with both methods
        rules_only = self.extract_with_rules_only(text)
        ai_and_rules = self.extract_with_ai_and_rules(text)
        
        results = {
            'filename': filename,
            'field_scores': {},
            'rules_only_total': 0.0,
            'ai_and_rules_total': 0.0,
            'field_count': 0
        }
        
        # Evaluate each field
        all_fields = set(ground_truth.keys()) | set(rules_only.keys()) | set(ai_and_rules.keys())
        
        for field in all_fields:
            gt_value = ground_truth.get(field, [])
            rules_value = rules_only.get(field, [])
            ai_value = ai_and_rules.get(field, [])
            
            rules_score = self.calculate_similarity(rules_value, gt_value)
            ai_score = self.calculate_similarity(ai_value, gt_value)
            
            results['field_scores'][field] = {
                'ground_truth': gt_value,
                'rules_only': rules_value,
                'ai_and_rules': ai_value,
                'rules_score': rules_score,
                'ai_score': ai_score,
                'improvement': ai_score - rules_score
            }
            
            results['rules_only_total'] += rules_score
            results['ai_and_rules_total'] += ai_score
            results['field_count'] += 1
        
        # Calculate averages
        if results['field_count'] > 0:
            results['rules_only_avg'] = results['rules_only_total'] / results['field_count']
            results['ai_and_rules_avg'] = results['ai_and_rules_total'] / results['field_count']
            results['overall_improvement'] = results['ai_and_rules_avg'] - results['rules_only_avg']
        else:
            results['rules_only_avg'] = 0.0
            results['ai_and_rules_avg'] = 0.0
            results['overall_improvement'] = 0.0
        
        return results
    
    def run_accuracy_measurement(self) -> Dict[str, Any]:
        """
        Run complete accuracy measurement on all sample resumes.
        
        Returns:
            Dictionary with comprehensive accuracy results
        """
        logger.info("Starting accuracy measurement...")
        
        # Load sample resumes
        resumes = self.load_sample_resumes()
        
        if not resumes:
            logger.error("No sample resumes found")
            return {}
        
        # Evaluate each resume
        all_results = []
        field_totals = defaultdict(lambda: {'rules': 0.0, 'ai': 0.0, 'count': 0})
        
        for filename, text in resumes.items():
            if filename in self.ground_truth:
                result = self.evaluate_single_resume(filename, text, self.ground_truth[filename])
                all_results.append(result)
                
                # Aggregate field scores
                for field, scores in result['field_scores'].items():
                    field_totals[field]['rules'] += scores['rules_score']
                    field_totals[field]['ai'] += scores['ai_score']
                    field_totals[field]['count'] += 1
        
        # Calculate overall averages
        overall_results = {
            'individual_results': all_results,
            'field_averages': {},
            'overall_rules_avg': 0.0,
            'overall_ai_avg': 0.0,
            'overall_improvement': 0.0,
            'total_resumes': len(all_results)
        }
        
        total_rules = 0.0
        total_ai = 0.0
        total_fields = 0
        
        for field, totals in field_totals.items():
            if totals['count'] > 0:
                avg_rules = totals['rules'] / totals['count']
                avg_ai = totals['ai'] / totals['count']
                improvement = avg_ai - avg_rules
                
                overall_results['field_averages'][field] = {
                    'rules_only': round(avg_rules * 100, 1),
                    'ai_and_rules': round(avg_ai * 100, 1),
                    'improvement': round(improvement * 100, 1),
                    'sample_count': totals['count']
                }
                
                total_rules += avg_rules
                total_ai += avg_ai
                total_fields += 1
        
        if total_fields > 0:
            overall_results['overall_rules_avg'] = round((total_rules / total_fields) * 100, 1)
            overall_results['overall_ai_avg'] = round((total_ai / total_fields) * 100, 1)
            overall_results['overall_improvement'] = round(((total_ai / total_fields) - (total_rules / total_fields)) * 100, 1)
        
        return overall_results
    
    def print_comparison_table(self, results: Dict[str, Any]):
        """
        Print formatted comparison table of accuracy results.
        
        Args:
            results: Accuracy measurement results
        """
        print("\n" + "="*80)
        print("📊 ACCURACY COMPARISON: RULES ONLY vs RULES + AI")
        print("="*80)
        
        # Header
        print(f"{'Field':<25} | {'Rules Only':<12} | {'Rules + AI':<12} | {'Improvement':<12}")
        print("-" * 70)
        
        # Field averages
        field_averages = results.get('field_averages', {})
        
        # Sort by improvement (descending)
        sorted_fields = sorted(field_averages.items(), 
                             key=lambda x: x[1]['improvement'], 
                             reverse=True)
        
        for field, averages in sorted_fields:
            rules_pct = averages['rules_only']
            ai_pct = averages['ai_and_rules']
            improvement = averages['improvement']
            
            # Format improvement with + sign for positive
            improvement_str = f"+{improvement}%" if improvement > 0 else f"{improvement}%"
            
            print(f"{field:<25} | {rules_pct:>10}% | {ai_pct:>10}% | {improvement_str:>11}")
        
        print("-" * 70)
        
        # Overall averages
        overall_rules = results.get('overall_rules_avg', 0)
        overall_ai = results.get('overall_ai_avg', 0)
        overall_improvement = results.get('overall_improvement', 0)
        
        improvement_str = f"+{overall_improvement}%" if overall_improvement > 0 else f"{overall_improvement}%"
        
        print(f"{'OVERALL':<25} | {overall_rules:>10}% | {overall_ai:>10}% | {improvement_str:>11}")
        print("="*80)
    
    def print_detailed_results(self, results: Dict[str, Any]):
        """
        Print detailed results for each resume.
        
        Args:
            results: Accuracy measurement results
        """
        print("\n" + "="*80)
        print("📋 DETAILED RESULTS PER RESUME")
        print("="*80)
        
        for result in results.get('individual_results', []):
            filename = result['filename']
            print(f"\n📄 {filename}")
            print(f"   Rules Only: {result['rules_only_avg']*100:.1f}%")
            print(f"   Rules + AI: {result['ai_and_rules_avg']*100:.1f}%")
            print(f"   Improvement: {result['overall_improvement']*100:+.1f}%")
            
            # Show field breakdown for this resume
            print("   Field Breakdown:")
            for field, scores in result['field_scores'].items():
                rules_score = scores['rules_score'] * 100
                ai_score = scores['ai_score'] * 100
                improvement = (scores['ai_score'] - scores['rules_score']) * 100
                improvement_str = f"+{improvement:.1f}%" if improvement > 0 else f"{improvement:.1f}%"
                
                print(f"     {field:<18}: {rules_score:>5.1f}% → {ai_score:>5.1f}% ({improvement_str})")
    
    def save_results(self, results: Dict[str, Any], output_file: str = "accuracy_results.json"):
        """
        Save results to JSON file.
        
        Args:
            results: Accuracy measurement results
            output_file: Output filename
        """
        try:
            output_path = Path(__file__).parent / output_file
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(results, f, indent=2, ensure_ascii=False)
            logger.info(f"Results saved to {output_path}")
        except Exception as e:
            logger.error(f"Error saving results: {e}")


def main():
    """Main function to run accuracy measurement."""
    print("🧪 Starting Resume Parsing Accuracy Measurement")
    print("=" * 60)
    
    if not FUZZY_AVAILABLE:
        print("⚠️  Warning: thefuzz not available. Using basic string matching.")
        print("   Install with: pip install thefuzz python-Levenshtein")
        print()
    
    try:
        # Initialize accuracy measurement
        measurement = AccuracyMeasurement()
        
        # Run accuracy measurement
        results = measurement.run_accuracy_measurement()
        
        if not results:
            print("❌ No results to display. Check sample resumes directory.")
            return
        
        # Print comparison table
        measurement.print_comparison_table(results)
        
        # Print detailed results
        measurement.print_detailed_results(results)
        
        # Save results
        measurement.save_results(results)
        
        # Summary
        total_resumes = results.get('total_resumes', 0)
        overall_improvement = results.get('overall_improvement', 0)
        
        print(f"\n📈 SUMMARY:")
        print(f"   Resumes evaluated: {total_resumes}")
        print(f"   Overall improvement: {overall_improvement:+.1f}%")
        
        if overall_improvement > 10:
            print("   🎉 Significant improvement with AI+rules approach!")
        elif overall_improvement > 0:
            print("   ✅ Moderate improvement with AI+rules approach")
        else:
            print("   ⚠️  No significant improvement detected")
        
    except Exception as e:
        logger.error(f"Error in accuracy measurement: {e}")
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    main()
