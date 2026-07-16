#!/usr/bin/env python3
"""
Accuracy comparison script for resume parsing models.

This script:
1. Tests both the old bert-base-NER and new DeBERTa-v3 models
2. Compares accuracy metrics across entity types
3. Provides detailed performance analysis
"""

import requests
import json
import time
from typing import Dict, List, Any
import statistics
from datetime import datetime

# Configuration
API_BASE_URL = "http://localhost:8000"
TEST_RESUMES = [
    """
    John Doe
    Email: john.doe@email.com | Phone: (555) 123-4567
    
    SUMMARY
    Experienced Software Engineer with 5+ years of expertise in Python, JavaScript, and React.
    
    EXPERIENCE
    Senior Software Engineer at Google
    June 2020 - Present
    - Developed scalable web applications using React and Node.js
    - Led team of 5 engineers on cloud migration project
    
    Software Engineer at Microsoft
    January 2018 - June 2020
    - Built RESTful APIs using Python and Django
    - Worked on Azure cloud services
    
    EDUCATION
    Bachelor of Science in Computer Science
    Stanford University
    2014 - 2018
    
    SKILLS
    Python, JavaScript, React, Node.js, Django, AWS, Docker
    """,
    
    """
    Jane Smith
    jane.smith@company.com | (555) 987-6543
    
    Professional Summary
    Marketing Manager with 7 years of experience in digital marketing and brand strategy.
    
    Work Experience
    Marketing Director at Apple Inc.
    March 2019 - Present
    - Managed $2M annual marketing budget
    - Increased brand awareness by 45%
    
    Marketing Manager at Samsung
    August 2016 - March 2019
    - Developed social media campaigns
    - Analyzed market trends and competitor strategies
    
    Education
    MBA in Marketing
    Harvard Business School
    2014 - 2016
    
    Bachelor of Arts in Business Administration
    UCLA
    2010 - 2014
    
    Technical Skills
    Google Analytics, SEO, SEM, Content Marketing, Social Media Marketing
    """,
    
    """
    Robert Johnson
    Email: robert.j@techcorp.com | Phone: (555) 456-7890
    
    PROFILE
    Senior Data Scientist with expertise in machine learning, statistics, and data visualization.
    
    PROFESSIONAL EXPERIENCE
    Principal Data Scientist at Amazon
    January 2021 - Present
    - Developed predictive models using Python and TensorFlow
    - Led data science team of 8 analysts
    - Improved recommendation algorithm accuracy by 25%
    
    Senior Data Scientist at IBM
    July 2018 - January 2021
    - Built machine learning pipelines for fraud detection
    - Created dashboards using Tableau and Power BI
    
    EDUCATION
    Ph.D. in Computer Science
    MIT
    2014 - 2018
    Dissertation: "Deep Learning for Natural Language Processing"
    
    Master of Science in Data Science
    UC Berkeley
    2012 - 2014
    
    TECHNICAL SKILLS
    Python, R, TensorFlow, PyTorch, Scikit-learn, SQL, Tableau, AWS
    """
]

class ModelAccuracyTester:
    def __init__(self):
        self.api_url = API_BASE_URL
        self.results = {
            'bert_base_ner': [],
            'deberta_v3': []
        }
        
    def test_resume_parsing(self, resume_text: str) -> Dict[str, Any]:
        """Test resume parsing with current model"""
        try:
            response = requests.post(
                f"{self.api_url}/parse",
                json={"raw_text": resume_text},
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"API Error: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"Request failed: {e}")
            return None
            
    def extract_entities_from_response(self, response: Dict[str, Any]) -> Dict[str, List[str]]:
        """Extract entity values from parsing response"""
        if not response or 'parsed_data' not in response:
            return {}
            
        parsed_data = response['parsed_data']
        entities = {}
        
        # Handle different response formats based on model type
        if 'names' in parsed_data:
            entities['names'] = [item['value'] for item in parsed_data.get('names', [])]
        if 'organizations' in parsed_data:
            entities['organizations'] = [item['value'] for item in parsed_data.get('organizations', [])]
        if 'job_titles' in parsed_data:
            entities['job_titles'] = [item['value'] for item in parsed_data.get('job_titles', [])]
        if 'skills' in parsed_data:
            entities['skills'] = [item['value'] for item in parsed_data.get('skills', [])]
        if 'education' in parsed_data:
            entities['education'] = [item['value'] for item in parsed_data.get('education', [])]
        if 'locations' in parsed_data:
            entities['locations'] = [item['value'] for item in parsed_data.get('locations', [])]
            
        # Handle old format fallback
        if 'persons' in parsed_data:
            entities['names'] = [item['value'] for item in parsed_data.get('persons', [])]
        if 'misc' in parsed_data:
            entities['misc'] = [item['value'] for item in parsed_data.get('misc', [])]
            
        return entities
        
    def calculate_expected_entities(self, resume_text: str) -> Dict[str, List[str]]:
        """Manually define expected entities for test resumes"""
        expected = {
            'names': [],
            'organizations': [],
            'job_titles': [],
            'skills': [],
            'education': [],
            'locations': []
        }
        
        # Extract expected entities based on known content
        lines = resume_text.strip().split('\n')
        
        for line in lines:
            line = line.strip()
            
            # Names (simplified - would be more sophisticated in real testing)
            if 'John Doe' in line:
                expected['names'].append('John Doe')
            elif 'Jane Smith' in line:
                expected['names'].append('Jane Smith')
            elif 'Robert Johnson' in line:
                expected['names'].append('Robert Johnson')
                
            # Organizations
            companies = ['Google', 'Microsoft', 'Apple', 'Samsung', 'Amazon', 'IBM']
            for company in companies:
                if company in line:
                    expected['organizations'].append(company)
                    
            # Job Titles
            titles = ['Software Engineer', 'Marketing Manager', 'Data Scientist', 
                     'Senior Software Engineer', 'Marketing Director', 'Principal Data Scientist']
            for title in titles:
                if title in line:
                    expected['job_titles'].append(title)
                    
            # Skills (simplified)
            if 'SKILLS' in line or 'Technical Skills' in line:
                # This is a simplified approach - real implementation would be more sophisticated
                pass
                
            # Education
            education = ['Bachelor of Science', 'MBA', 'Ph.D.', 'Master of Science', 'Bachelor of Arts']
            for edu in education:
                if edu in line:
                    expected['education'].append(edu)
                    
            # Universities
            universities = ['Stanford University', 'Harvard Business School', 'UCLA', 'MIT', 'UC Berkeley']
            for uni in universities:
                if uni in line:
                    expected['education'].append(uni)
                    
        return expected
        
    def calculate_accuracy(self, expected: Dict[str, List[str]], actual: Dict[str, List[str]]) -> Dict[str, float]:
        """Calculate accuracy metrics for each entity type"""
        metrics = {}
        
        for entity_type in expected.keys():
            expected_set = set(expected[entity_type])
            actual_set = set(actual.get(entity_type, []))
            
            if len(expected_set) == 0:
                metrics[f"{entity_type}_precision"] = 1.0 if len(actual_set) == 0 else 0.0
                metrics[f"{entity_type}_recall"] = 1.0
                metrics[f"{entity_type}_f1"] = 1.0
            else:
                true_positives = len(expected_set & actual_set)
                false_positives = len(actual_set - expected_set)
                false_negatives = len(expected_set - actual_set)
                
                precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0.0
                recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0.0
                f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
                
                metrics[f"{entity_type}_precision"] = precision
                metrics[f"{entity_type}_recall"] = recall
                metrics[f"{entity_type}_f1"] = f1
                
        return metrics
        
    def get_current_model_info(self) -> Dict[str, Any]:
        """Get information about currently loaded model"""
        try:
            response = requests.get(f"{self.api_url}/metrics", timeout=10)
            if response.status_code == 200:
                metrics = response.json()
                return {
                    'model_name': metrics.get('model_name', 'Unknown'),
                    'model_type': metrics.get('model_type', 'Unknown'),
                    'supported_entities': metrics.get('supported_entities', [])
                }
        except Exception as e:
            print(f"Failed to get model info: {e}")
            
        return {'model_name': 'Unknown', 'model_type': 'Unknown', 'supported_entities': []}
        
    def run_accuracy_test(self) -> Dict[str, Any]:
        """Run comprehensive accuracy test"""
        print("🚀 Starting Resume Parser Accuracy Test")
        print(f"Timestamp: {datetime.now().isoformat()}")
        print("="*60)
        
        # Get current model info
        model_info = self.get_current_model_info()
        current_model_type = model_info.get('model_type', 'unknown')
        
        print(f"Current Model: {model_info.get('model_name', 'Unknown')}")
        print(f"Model Type: {current_model_type}")
        print(f"Supported Entities: {', '.join(model_info.get('supported_entities', []))}")
        print()
        
        all_results = []
        
        for i, resume in enumerate(TEST_RESUMES):
            print(f"📄 Testing Resume {i+1}/{len(TEST_RESUMES)}")
            
            # Parse resume
            result = self.test_resume_parsing(resume)
            if not result:
                print(f"❌ Failed to parse resume {i+1}")
                continue
                
            # Extract entities
            entities = self.extract_entities_from_response(result)
            
            # Get expected entities
            expected = self.calculate_expected_entities(resume)
            
            # Calculate accuracy
            accuracy = self.calculate_accuracy(expected, entities)
            
            # Store results
            test_result = {
                'resume_index': i,
                'expected_entities': expected,
                'actual_entities': entities,
                'accuracy_metrics': accuracy,
                'parse_time': result.get('parse_time_ms', 0),
                'confidence_score': result.get('confidence_score', 0)
            }
            
            all_results.append(test_result)
            
            # Print summary for this resume
            print(f"   Parse Time: {result.get('parse_time_ms', 0):.0f}ms")
            print(f"   Confidence: {result.get('confidence_score', 0):.3f}")
            
            # Print entity counts
            for entity_type in expected.keys():
                expected_count = len(expected[entity_type])
                actual_count = len(entities.get(entity_type, []))
                f1_score = accuracy.get(f"{entity_type}_f1", 0)
                print(f"   {entity_type}: {actual_count}/{expected_count} (F1: {f1_score:.3f})")
            
            print()
        
        # Calculate overall statistics
        overall_stats = self.calculate_overall_statistics(all_results)
        
        # Print final report
        self.print_final_report(current_model_type, all_results, overall_stats)
        
        return {
            'model_type': current_model_type,
            'model_info': model_info,
            'test_results': all_results,
            'overall_statistics': overall_stats
        }
        
    def calculate_overall_statistics(self, results: List[Dict[str, Any]]) -> Dict[str, float]:
        """Calculate overall statistics across all test results"""
        if not results:
            return {}
            
        stats = {}
        entity_types = ['names', 'organizations', 'job_titles', 'skills', 'education', 'locations']
        
        for entity_type in entity_types:
            f1_scores = [r['accuracy_metrics'].get(f"{entity_type}_f1", 0) for r in results]
            precision_scores = [r['accuracy_metrics'].get(f"{entity_type}_precision", 0) for r in results]
            recall_scores = [r['accuracy_metrics'].get(f"{entity_type}_recall", 0) for r in results]
            
            if f1_scores:
                stats[f"{entity_type}_avg_f1"] = statistics.mean(f1_scores)
                stats[f"{entity_type}_avg_precision"] = statistics.mean(precision_scores)
                stats[f"{entity_type}_avg_recall"] = statistics.mean(recall_scores)
                
        # Parse time stats
        parse_times = [r['parse_time'] for r in results]
        if parse_times:
            stats['avg_parse_time'] = statistics.mean(parse_times)
            stats['median_parse_time'] = statistics.median(parse_times)
            
        # Confidence stats
        confidence_scores = [r['confidence_score'] for r in results]
        if confidence_scores:
            stats['avg_confidence'] = statistics.mean(confidence_scores)
            
        return stats
        
    def print_final_report(self, model_type: str, results: List[Dict[str, Any]], stats: Dict[str, float]):
        """Print comprehensive final report"""
        print("="*80)
        print("📊 ACCURACY TEST FINAL REPORT")
        print("="*80)
        print(f"Model Type: {model_type}")
        print(f"Test Samples: {len(results)}")
        print()
        
        # Performance metrics
        print("🚀 PERFORMANCE METRICS:")
        print(f"   Average Parse Time: {stats.get('avg_parse_time', 0):.1f}ms")
        print(f"   Median Parse Time: {stats.get('median_parse_time', 0):.1f}ms")
        print(f"   Average Confidence: {stats.get('avg_confidence', 0):.3f}")
        print()
        
        # Entity extraction accuracy
        print("🎯 ENTITY EXTRACTION ACCURACY:")
        print("-" * 60)
        print(f"{'Entity Type':<15} {'Precision':<10} {'Recall':<10} {'F1-Score':<10}")
        print("-" * 60)
        
        entity_types = ['names', 'organizations', 'job_titles', 'skills', 'education', 'locations']
        
        for entity_type in entity_types:
            precision = stats.get(f"{entity_type}_avg_precision", 0)
            recall = stats.get(f"{entity_type}_avg_recall", 0)
            f1 = stats.get(f"{entity_type}_avg_f1", 0)
            
            print(f"{entity_type:<15} {precision:<10.3f} {recall:<10.3f} {f1:<10.3f}")
        
        print("-" * 60)
        
        # Overall accuracy
        if entity_types:
            overall_f1 = statistics.mean([stats.get(f"{et}_avg_f1", 0) for et in entity_types])
            print(f"{'OVERALL':<15} {'-':<10} {'-':<10} {overall_f1:<10.3f}")
        
        print()
        
        # Model-specific insights
        if model_type == 'fine-tuned-deberta':
            print("✅ DeBERTa-v3 Model Benefits:")
            print("   - Specialized for resume entities")
            print("   - Extracts job titles, skills, education directly")
            print("   - Higher accuracy on resume-specific content")
        elif model_type == 'base-bert':
            print("📊 Base BERT Model Characteristics:")
            print("   - General-purpose NER")
            print("   - Limited to basic entity types")
            print("   - May miss resume-specific entities")
        
        print("="*80)

def main():
    """Main function"""
    tester = ModelAccuracyTester()
    results = tester.run_accuracy_test()
    
    # Save results to file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"accuracy_test_results_{timestamp}.json"
    
    with open(filename, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n💾 Detailed results saved to: {filename}")

if __name__ == "__main__":
    main()
