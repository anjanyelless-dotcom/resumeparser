"""
Unit tests for ParsedDataValidator class.
Tests each validation method with multiple test cases.
"""

import unittest
import sys
import os

# Add the parent directory to the path to import the validator
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from parsers.validator import ParsedDataValidator


class TestParsedDataValidator(unittest.TestCase):
    """Test cases for ParsedDataValidator class."""
    
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.validator = ParsedDataValidator()
    
    def test_fix_name_email_misclassification(self):
        """Test fixing when name field contains an email."""
        data = {'personal_info': {'name': 'john.doe@example.com'}}
        result, warnings = self.validator.validate_and_fix(data)
        
        self.assertIsNone(result['personal_info']['name'])
        self.assertIn('Name field contained email address', warnings[0])
    
    def test_fix_name_too_long(self):
        """Test fixing when name field is too long."""
        long_name = 'A' * 61  # Over 60 characters
        data = {'personal_info': {'name': long_name}}
        result, warnings = self.validator.validate_and_fix(data)
        
        self.assertIsNone(result['personal_info']['name'])
        self.assertIn('Name too long, likely parsing error', warnings[0])
    
    def test_fix_name_with_numbers(self):
        """Test fixing when name field contains numbers."""
        data = {'personal_info': {'name': 'John123 Smith'}}
        result, warnings = self.validator.validate_and_fix(data)
        
        self.assertIsNone(result['personal_info']['name'])
        self.assertIn('Name contains numbers', warnings[0])
    
    def test_fix_name_valid(self):
        """Test that valid names are not changed."""
        data = {'personal_info': {'name': 'John Smith'}}
        result, warnings = self.validator.validate_and_fix(data)
        
        self.assertEqual(result['personal_info']['name'], 'John Smith')
        self.assertEqual(len(warnings), 0)
    
    def test_fix_name_alternative_structure(self):
        """Test fixing name with alternative data structure."""
        data = {'name': 'john.doe@example.com'}
        result, warnings = self.validator.validate_and_fix(data)
        
        self.assertIsNone(result['name'])
        self.assertIn('Name field contained email address', warnings[0])
    
    def test_fix_email_invalid_format(self):
        """Test fixing invalid email format."""
        data = {'personal_info': {'email': 'invalid-email'}}
        result, warnings = self.validator.validate_and_fix(data)
        
        self.assertIsNone(result['personal_info']['email'])
        self.assertIn('Invalid email format', warnings[0])
    
    def test_fix_email_disposable(self):
        """Test detecting disposable email addresses."""
        data = {'personal_info': {'email': 'test@mailinator.com'}}
        result, warnings = self.validator.validate_and_fix(data)
        
        # Should keep the email but warn
        self.assertEqual(result['personal_info']['email'], 'test@mailinator.com')
        self.assertIn('Disposable email address detected', warnings[0])
    
    def test_fix_email_valid(self):
        """Test that valid emails are not changed."""
        data = {'personal_info': {'email': 'john.doe@example.com'}}
        result, warnings = self.validator.validate_and_fix(data)
        
        self.assertEqual(result['personal_info']['email'], 'john.doe@example.com')
        self.assertEqual(len(warnings), 0)
    
    def test_fix_phone_too_short(self):
        """Test fixing phone number with too few digits."""
        data = {'personal_info': {'phone': '123456'}}
        result, warnings = self.validator.validate_and_fix(data)
        
        self.assertIsNone(result['personal_info']['phone'])
        self.assertIn('Phone digit count out of range', warnings[0])
    
    def test_fix_phone_too_long(self):
        """Test fixing phone number with too many digits."""
        data = {'personal_info': {'phone': '12345678901234567890'}}
        result, warnings = self.validator.validate_and_fix(data)
        
        self.assertIsNone(result['personal_info']['phone'])
        self.assertIn('Phone digit count out of range', warnings[0])
    
    def test_fix_phone_fake_repeated(self):
        """Test fixing phone number with repeated digits."""
        data = {'personal_info': {'phone': '111-111-1111'}}
        result, warnings = self.validator.validate_and_fix(data)
        
        self.assertIsNone(result['personal_info']['phone'])
        self.assertIn('Phone number appears fake', warnings[0])
    
    def test_fix_phone_valid(self):
        """Test that valid phone numbers are not changed."""
        data = {'personal_info': {'phone': '+1-555-123-4567'}}
        result, warnings = self.validator.validate_and_fix(data)
        
        self.assertEqual(result['personal_info']['phone'], '+1-555-123-4567')
        self.assertEqual(len(warnings), 0)
    
    def test_fix_years_experience_negative(self):
        """Test fixing negative years of experience."""
        data = {'years_experience': -5}
        result, warnings = self.validator.validate_and_fix(data)
        
        self.assertIsNone(result['years_experience'])
        self.assertIn('Years of experience out of range', warnings[0])
    
    def test_fix_years_experience_too_high(self):
        """Test fixing too high years of experience."""
        data = {'years_experience': 60}
        result, warnings = self.validator.validate_and_fix(data)
        
        self.assertIsNone(result['years_experience'])
        self.assertIn('Years of experience out of range', warnings[0])
    
    def test_fix_years_experience_seems_high(self):
        """Test warning for high but plausible years of experience."""
        data = {'years_experience': 35}
        result, warnings = self.validator.validate_and_fix(data)
        
        self.assertEqual(result['years_experience'], 35)
        self.assertIn('Years of experience seems high', warnings[0])
    
    def test_fix_years_experience_valid(self):
        """Test that valid years of experience are not changed."""
        data = {'years_experience': 5}
        result, warnings = self.validator.validate_and_fix(data)
        
        self.assertEqual(result['years_experience'], 5)
        self.assertEqual(len(warnings), 0)
    
    def test_fix_years_experience_invalid_format(self):
        """Test fixing invalid years of experience format."""
        data = {'years_experience': 'not_a_number'}
        result, warnings = self.validator.validate_and_fix(data)
        
        self.assertIsNone(result['years_experience'])
        self.assertIn('Invalid years of experience format', warnings[0])
    
    def test_fix_skills_invalid_length(self):
        """Test fixing skills with invalid length."""
        data = {'skills': ['Python', 'A', 'This is a very long skill name that exceeds the fifty character limit']}
        result, warnings = self.validator.validate_and_fix(data)
        
        expected_skills = ['Python']
        self.assertEqual(result['skills'], expected_skills)
        self.assertIn('Removed 2 invalid skill entries', warnings[1])
    
    def test_fix_skills_invalid_content(self):
        """Test fixing skills with invalid content."""
        data = {'skills': ['Python', 'http://example.com', 'email: test@example.com', 'resume summary']}
        result, warnings = self.validator.validate_and_fix(data)
        
        expected_skills = ['Python']
        self.assertEqual(result['skills'], expected_skills)
        self.assertTrue(any('Removed invalid skill entry' in w for w in warnings))
    
    def test_fix_skills_duplicates_and_order(self):
        """Test removing duplicates while preserving order."""
        data = {'skills': ['Python', 'Java', 'Python', 'JavaScript', 'Java']}
        result, warnings = self.validator.validate_and_fix(data)
        
        expected_skills = ['Python', 'Java', 'JavaScript']
        self.assertEqual(result['skills'], expected_skills)
    
    def test_fix_skills_valid(self):
        """Test that valid skills are not changed."""
        data = {'skills': ['Python', 'Java', 'JavaScript']}
        result, warnings = self.validator.validate_and_fix(data)
        
        self.assertEqual(result['skills'], ['Python', 'Java', 'JavaScript'])
        self.assertEqual(len(warnings), 0)
    
    def test_fix_dates_future_dates(self):
        """Test fixing future dates in experience."""
        future_year = str(self.validator.current_year + 10)
        data = {'experience': [{'start_date': f'Jan {future_year}', 'end_date': 'Present'}]}
        result, warnings = self.validator.validate_and_fix(data)
        
        self.assertIsNone(result['experience'][0]['start_date'])
        self.assertIn('Future date detected in experience', warnings[0])
    
    def test_fix_dates_very_old_dates(self):
        """Test fixing very old dates in experience."""
        data = {'experience': [{'start_date': 'Jan 1940', 'end_date': 'Dec 1945'}]}
        result, warnings = self.validator.validate_and_fix(data)
        
        self.assertIsNone(result['experience'][0]['start_date'])
        self.assertIn('Very old date detected in experience', warnings[0])
    
    def test_fix_dates_invalid_format(self):
        """Test fixing invalid date formats."""
        data = {'experience': [{'start_date': 'invalid_date', 'end_date': 'Present'}]}
        result, warnings = self.validator.validate_and_fix(data)
        
        self.assertIsNone(result['experience'][0]['start_date'])
        self.assertIn('Invalid date format in experience', warnings[0])
    
    def test_fix_dates_valid(self):
        """Test that valid dates are not changed."""
        data = {'experience': [{'start_date': 'Jan 2020', 'end_date': 'Present'}]}
        result, warnings = self.validator.validate_and_fix(data)
        
        self.assertEqual(result['experience'][0]['start_date'], 'Jan 2020')
        self.assertEqual(result['experience'][0]['end_date'], 'Present')
        self.assertEqual(len(warnings), 0)
    
    def test_fix_dates_education(self):
        """Test fixing dates in education section."""
        future_year = str(self.validator.current_year + 5)
        data = {'education': [{'graduation_date': f'May {future_year}'}]}
        result, warnings = self.validator.validate_and_fix(data)
        
        self.assertIsNone(result['education'][0]['graduation_date'])
        self.assertIn('Invalid date format in education', warnings[0])
    
    def test_validate_and_fix_comprehensive(self):
        """Test the complete validation pipeline with multiple issues."""
        data = {
            'personal_info': {
                'name': 'john.doe@example.com',
                'email': 'invalid-email',
                'phone': '123456'
            },
            'years_experience': -5,
            'skills': ['Python', 'A', 'http://example.com'],
            'experience': [{'start_date': 'Jan 2030', 'end_date': 'Present'}],
            'education': [{'graduation_date': 'invalid_date'}]
        }
        
        result, warnings = self.validator.validate_and_fix(data)
        
        # Check that warnings were generated
        self.assertGreater(len(warnings), 5)
        
        # Check that warnings are stored in result
        self.assertIn('_validation_warnings', result)
        self.assertEqual(result['_validation_warnings'], warnings)
        
        # Check that invalid data was cleared
        self.assertIsNone(result['personal_info']['name'])
        self.assertIsNone(result['personal_info']['email'])
        self.assertIsNone(result['personal_info']['phone'])
        self.assertIsNone(result['years_experience'])
        self.assertEqual(result['skills'], ['Python'])
        self.assertIsNone(result['experience'][0]['start_date'])
        self.assertIsNone(result['education'][0]['graduation_date'])
    
    def test_get_validation_summary(self):
        """Test validation summary generation."""
        data = {
            '_validation_warnings': ['Warning 1', 'Warning 2', 'Warning 3']
        }
        
        summary = self.validator.get_validation_summary(data)
        
        self.assertEqual(summary['validation_warnings_count'], 3)
        self.assertEqual(summary['validation_warnings'], ['Warning 1', 'Warning 2', 'Warning 3'])
        self.assertEqual(summary['data_quality_score'], 85)  # 100 - (3 * 5)
        self.assertIn('fields_validated', summary)
    
    def test_get_validation_summary_no_warnings(self):
        """Test validation summary with no warnings."""
        data = {'_validation_warnings': []}
        
        summary = self.validator.get_validation_summary(data)
        
        self.assertEqual(summary['validation_warnings_count'], 0)
        self.assertEqual(summary['data_quality_score'], 100)


class TestParsedDataValidatorEdgeCases(unittest.TestCase):
    """Test edge cases and error handling."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.validator = ParsedDataValidator()
    
    def test_validate_empty_data(self):
        """Test validation with empty data."""
        result, warnings = self.validator.validate_and_fix({})
        
        self.assertIsInstance(result, dict)
        self.assertIn('_validation_warnings', result)
        self.assertEqual(len(warnings), 0)
    
    def test_validate_missing_fields(self):
        """Test validation with missing expected fields."""
        data = {'some_other_field': 'value'}
        result, warnings = self.validator.validate_and_fix(data)
        
        self.assertIsInstance(result, dict)
        self.assertEqual(len(warnings), 0)
    
    def test_validate_none_values(self):
        """Test validation with None values."""
        data = {
            'personal_info': {'name': None, 'email': None},
            'years_experience': None,
            'skills': None
        }
        result, warnings = self.validator.validate_and_fix(data)
        
        self.assertIsInstance(result, dict)
        self.assertEqual(len(warnings), 0)
    
    def test_validate_non_list_skills(self):
        """Test validation when skills is not a list."""
        data = {'skills': 'not_a_list'}
        result, warnings = self.validator.validate_and_fix(data)
        
        # Should handle gracefully without changing the field
        self.assertEqual(result['skills'], 'not_a_list')
    
    def test_validate_non_dict_experience(self):
        """Test validation when experience contains non-dict items."""
        data = {'experience': ['not_a_dict', {'start_date': 'Jan 2020'}]}
        result, warnings = self.validator.validate_and_fix(data)
        
        # Should handle gracefully
        self.assertIsInstance(result['experience'], list)
        self.assertEqual(len(result['experience']), 2)


if __name__ == '__main__':
    # Run the tests
    unittest.main(verbosity=2)
