# Resume Text Formatter

## Overview

The Resume Text Formatter is a preprocessing module that cleans and structures raw resume text before NER (Named Entity Recognition) processing. It ensures that extracted text from PDFs or other sources is properly formatted for accurate entity extraction.

## Purpose

When resumes are extracted from PDFs using OCR or text extraction tools, the output is often:
- Jumbled with mixed sections
- Missing proper spacing
- Has broken sentences
- Contains misaligned bullet points
- Lacks clear section boundaries

The formatter fixes these issues to improve downstream NER accuracy.

## Features

- **Preserves Original Order**: Never reorders or mixes content
- **Section Separation**: Clearly identifies and separates sections (Experience, Education, Skills, etc.)
- **Proper Spacing**: Maintains appropriate spacing between sections
- **Bullet Point Alignment**: Keeps bullet points under correct sections
- **No Information Loss**: Never removes or summarizes content
- **Two Modes**: Rule-based (fast) or LLM-based (more accurate)

## Usage

### Basic Usage (Rule-Based)

```python
from parsers.resume_formatter import ResumeTextFormatter

# Create formatter without LLM
formatter = ResumeTextFormatter(llm_client=None)

# Format raw resume text
raw_text = """
John Doe john@email.com EXPERIENCE Software Engineer at TechCorp 2020-Present
Developed APIs EDUCATION MS Computer Science Stanford 2018
"""

formatted_text = formatter.format_resume_text(raw_text)
print(formatted_text)
```

### LLM-Based Formatting (More Accurate)

```python
from parsers.resume_formatter import ResumeTextFormatter

# Provide your LLM client
formatter = ResumeTextFormatter(llm_client=your_llm_client)

formatted_text = formatter.format_resume_text(raw_text)
```

### Convenience Function

```python
from parsers.resume_formatter import format_resume_text

# Quick formatting without creating formatter instance
formatted = format_resume_text(raw_text, llm_client=None)
```

## Integration with NER Pipeline

The formatter should be used **before** NER extraction:

```python
from parsers.resume_formatter import format_resume_text
from parsers.deberta_ner_parser import DeBERTaNERParser

# Step 1: Extract raw text from PDF
raw_text = extract_text_from_pdf("resume.pdf")

# Step 2: Format the text
formatted_text = format_resume_text(raw_text)

# Step 3: Run NER extraction
ner_parser = DeBERTaNERParser()
entities = ner_parser.parse(formatted_text)
```

## Testing

Run the test script to see the formatter in action:

```bash
cd /Users/anjanyelle/Desktop/untitled\ folder\ 3/Lakshya-LLM-Resume-Parser/ai-service
python test_formatter.py
```

## Formatting Rules

The formatter follows these strict rules:

1. **Never jumble or mix text** - Original order is preserved
2. **Section headings** - Clearly separated (EXPERIENCE, EDUCATION, SKILLS, etc.)
3. **Proper spacing** - Blank lines between sections
4. **Bullet points** - Kept under correct sections
5. **No merging** - Different sections stay separate
6. **No rewriting** - Content is not summarized or changed
7. **No removal** - All important information is retained
8. **Logical grouping** - If headings are missing, content is grouped intelligently
9. **Clean structure** - Each section starts on a new line

## Output Format

The formatter produces:

- ✅ Clean structured resume text
- ✅ Proper section headings
- ✅ Bullet points properly aligned
- ✅ No broken sentences
- ✅ No mixed lines
- ✅ Human-readable format

## When to Use

Use the formatter when:

- Resume text is extracted from PDFs with poor formatting
- OCR output is messy or jumbled
- Sections are not clearly separated
- You want to improve NER extraction accuracy
- Text needs to be human-readable before processing

## Performance

- **Rule-based mode**: Very fast (<1ms for typical resumes)
- **LLM-based mode**: Slower (~1-2s) but more accurate for complex cases

## Examples

### Before Formatting

```
JANE SMITH Email: jane@example.com Phone: 555-1234 EXPERIENCE Senior Engineer TechCorp 2021-Present Built APIs Led team Data Engineer StartupXYZ 2019-2021 ETL pipelines EDUCATION MS Data Science Berkeley 2019 BS Computer Science UCLA 2017
```

### After Formatting

```
JANE SMITH
Email: jane@example.com
Phone: 555-1234

EXPERIENCE

Senior Engineer
TechCorp
2021-Present
• Built APIs
• Led team

Data Engineer
StartupXYZ
2019-2021
• ETL pipelines

EDUCATION

MS Data Science
Berkeley
2019

BS Computer Science
UCLA
2017
```

## Notes

- The formatter is designed to work with US-format resumes
- It handles multi-page resumes (2-20 pages)
- Works with various resume styles (chronological, functional, federal)
- Safe to use - never loses information from original text

## Future Enhancements

- Support for non-English resumes
- Custom section detection
- Configurable formatting rules
- Integration with specific PDF extraction libraries
