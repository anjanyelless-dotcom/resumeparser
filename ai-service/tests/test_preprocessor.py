"""
Unit tests for ResumePreprocessor class.
Tests each preprocessing method with multiple test cases.
"""

import unittest
import sys
import os

# Add the parent directory to the path to import the preprocessor
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from parsers.preprocessor import ResumePreprocessor


class TestResumePreprocessor(unittest.TestCase):
    """Test cases for ResumePreprocessor class."""
    
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.preprocessor = ResumePreprocessor()
    
    def test_normalize_bullets_various_characters(self):
        """Test bullet normalization with various bullet characters."""
        input_text = """• First item
● Second item
◦ Third item
▪ Fourth item
▸ Fifth item
◆ Sixth item
■ Seventh item
◉ Eighth item
➤ Ninth item
→ Tenth item
- Eleventh item
– Twelfth item
— Thirteenth item"""
        
        expected = """- First item
- Second item
- Third item
- Fourth item
- Fifth item
- Sixth item
- Seventh item
- Eighth item
- Ninth item
- Tenth item
- Eleventh item
- Twelfth item
- Thirteenth item"""
        
        result = self.preprocessor._normalize_bullets(input_text)
        self.assertEqual(result, expected)
    
    def test_normalize_bullets_mixed_content(self):
        """Test bullet normalization with mixed content and spacing."""
        input_text = """Experience:
• Developed Python applications
  ● Managed team projects
Skills:
  ◦ JavaScript proficiency
▸ Database design"""
        
        expected = """Experience:
- Developed Python applications
  - Managed team projects
Skills:
  - JavaScript proficiency
- Database design"""
        
        result = self.preprocessor._normalize_bullets(input_text)
        self.assertEqual(result, expected)
    
    def test_fix_broken_lines_hyphenated_words(self):
        """Test fixing hyphenated words split across lines."""
        input_text = """This is a test of hyphen-
ated words that should be
joined together properly."""
        
        expected = """This is a test of hyphenated words that should be
joined together properly."""
        
        result = self.preprocessor._fix_broken_lines(input_text)
        self.assertEqual(result, expected)
    
    def test_fix_broken_lines_continuation_lines(self):
        """Test fixing continuation lines without punctuation."""
        input_text = """This is the first sentence
and this should be joined.
This has proper punctuation.
And this should also be joined."""
        
        expected = """This is the first sentence and this should be joined.
This has proper punctuation.
And this should also be joined."""
        
        result = self.preprocessor._fix_broken_lines(input_text)
        self.assertEqual(result, expected)
    
    def test_fix_broken_lines_complex_case(self):
        """Test complex broken line scenarios."""
        input_text = """Professional experi-
ence in software develop-
ment and team manage-
ment. This sentence is fine.
And this should be joined."""
        
        expected = """Professional experience in software development and team management.
This sentence is fine.
And this should be joined."""
        
        result = self.preprocessor._fix_broken_lines(input_text)
        self.assertEqual(result, expected)
    
    def test_normalize_section_headers_all_caps(self):
        """Test section header normalization for ALL CAPS headers."""
        input_text = """EXPERIENCE
This is my experience.
EDUCATION
This is my education.
SKILLS
These are my skills."""
        
        expected = """Experience
This is my experience.
Education
This is my education.
Skills
These are my skills."""
        
        result = self.preprocessor._normalize_section_headers(input_text)
        self.assertEqual(result, expected)
    
    def test_normalize_section_headers_mixed_case(self):
        """Test that non-header lines are not affected."""
        input_text = """EXPERIENCE
This is my experience.
IBM CORPORATION
Worked at IBM.
USA
Located in USA."""
        
        expected = """Experience
This is my experience.
Ibm Corporation
Worked at IBM.
Usa
Located in USA."""
        
        result = self.preprocessor._normalize_section_headers(input_text)
        self.assertEqual(result, expected)
    
    def test_normalize_section_headers_short_lines(self):
        """Test that short lines are not treated as headers."""
        input_text = """A
B
C
EXPERIENCE
This is experience."""
        
        expected = """A
B
C
Experience
This is experience."""
        
        result = self.preprocessor._normalize_section_headers(input_text)
        self.assertEqual(result, expected)
    
    def test_fix_encoding_artifacts_common_issues(self):
        """Test fixing common encoding artifacts."""
        input_text = """It's a test with "quotes" and other issues.
Café and résumé are important words.
Here's a dash — and another –."""
        
        expected = """It's a test with "quotes" and other issues.
Café and résumé are important words.
Here's a dash - and another -."""
        
        result = self.preprocessor._fix_encoding_artifacts(input_text)
        self.assertEqual(result, expected)
    
    def test_fix_encoding_artifacts_unicode_characters(self):
        """Test fixing unicode encoding artifacts."""
        input_text = """Smart quotes: "Hello" and 'world'
Em dash: — and en dash: –
Curly quotes: "test" and 'example'"""
        
        expected = """Smart quotes: "Hello" and 'world'
Em dash: - and en dash: -
Curly quotes: "test" and 'example'"""
        
        result = self.preprocessor._fix_encoding_artifacts(input_text)
        self.assertEqual(result, expected)
    
    def test_normalize_whitespace_excessive_blank_lines(self):
        """Test normalizing excessive blank lines."""
        input_text = """First line



Second line


Third line



Fourth line"""
        
        expected = """First line

Second line

Third line

Fourth line"""
        
        result = self.preprocessor._normalize_whitespace(input_text)
        self.assertEqual(result, expected)
    
    def test_normalize_whitespace_trailing_spaces(self):
        """Test removing trailing spaces from lines."""
        input_text = """Line with spaces at end   
Line with tabs at end	
Line with mixed spaces and tabs  	
Normal line"""
        
        expected = """Line with spaces at end
Line with tabs at end
Line with mixed spaces and tabs
Normal line"""
        
        result = self.preprocessor._normalize_whitespace(input_text)
        self.assertEqual(result, expected)
    
    def test_normalize_whitespace_combined(self):
        """Test combined whitespace normalization."""
        input_text = """First line with spaces   
Multiple blank lines should be collapsed



Second line with tabs	
Normal line


Third line with mixed  	
"""
        
        expected = """First line with spaces

Multiple blank lines should be collapsed

Second line with tabs

Normal line

Third line with mixed"""
        
        result = self.preprocessor._normalize_whitespace(input_text)
        self.assertEqual(result, expected)
    
    def test_preprocess_full_pipeline(self):
        """Test the complete preprocessing pipeline."""
        input_text = """EXPERIENCE

• Developed Python appli-
cations for various cli-
ents.
  ● Managed team projects
  ◦ Database design

EDUCATION

Stanford Uni-
versity â€" BS in Com-
puter Science

SKILLS

Python, Java, JavaScript"""
        
        result = self.preprocessor.preprocess(input_text)
        
        # Check that bullets are normalized
        self.assertIn('- Developed Python applications', result)
        self.assertIn('- Managed team projects', result)
        self.assertIn('- Database design', result)
        
        # Check that broken lines are fixed
        self.assertIn('applications for various clients', result)
        self.assertIn('Stanford University - BS in Computer Science', result)
        
        # Check that headers are normalized
        self.assertIn('Experience', result)
        self.assertIn('Education', result)
        self.assertIn('Skills', result)
        
        # Check encoding fixes
        self.assertIn('Stanford University -', result)  # â€" should become -
    
    def test_preprocess_empty_input(self):
        """Test preprocessing with empty input."""
        result = self.preprocessor.preprocess("")
        self.assertEqual(result, "")
        
        result = self.preprocessor.preprocess(None)
        self.assertEqual(result, "")
    
    def test_preprocess_simple_text(self):
        """Test preprocessing with simple, clean text."""
        input_text = """This is a simple resume.
No special formatting needed.
Just plain text."""
        
        result = self.preprocessor.preprocess(input_text)
        self.assertEqual(result, input_text)
    
    def test_get_preprocessing_stats(self):
        """Test preprocessing statistics calculation."""
        original = """EXPERIENCE

• Developed appli-
cations

EDUCATION
Stanford Uni-
versity"""
        
        processed = self.preprocessor.preprocess(original)
        stats = self.preprocessor.get_preprocessing_stats(original, processed)
        
        self.assertGreater(stats['original_length'], 0)
        self.assertGreater(stats['processed_length'], 0)
        self.assertGreater(stats['lines_before'], 0)
        self.assertGreater(stats['lines_after'], 0)
        self.assertIsInstance(stats['encoding_fixes_applied'], int)
        self.assertIsInstance(stats['size_reduction'], int)


class TestResumePreprocessorEdgeCases(unittest.TestCase):
    """Test edge cases and error handling."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.preprocessor = ResumePreprocessor()
    
    def test_preprocess_very_long_text(self):
        """Test preprocessing with very long text."""
        long_text = "A" * 10000 + "\n" + "B" * 10000
        result = self.preprocessor.preprocess(long_text)
        self.assertIsInstance(result, str)
        self.assertGreater(len(result), 0)
    
    def test_preprocess_special_characters(self):
        """Test preprocessing with various special characters."""
        special_text = """Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?
Unicode: αβγδεζηθ
Numbers: 1234567890
Mixed: Hello World! 123"""
        
        result = self.preprocessor.preprocess(special_text)
        self.assertIsInstance(result, str)
        self.assertIn('Special chars:', result)
        self.assertIn('Unicode:', result)
        self.assertIn('Numbers:', result)
    
    def test_preprocess_mixed_line_endings(self):
        """Test preprocessing with mixed line endings."""
        mixed_text = "Line 1\r\nLine 2\nLine 3\rLine 4\nLine 5"
        result = self.preprocessor.preprocess(mixed_text)
        self.assertIsInstance(result, str)
        lines = result.split('\n')
        self.assertEqual(len(lines), 5)


if __name__ == '__main__':
    # Run the tests
    unittest.main(verbosity=2)
