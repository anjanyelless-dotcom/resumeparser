# Parser Refactoring Plan

## Current Issues Identified

### 1. **Code Duplication**

- Skill taxonomy duplicated across 3 files (experience_extractor.py has 2 copies, rule_parser.py has 1)
- Regex patterns duplicated (email, phone, date patterns in multiple files)
- Normalization logic scattered across entity_normalizer.py and parsers

### 2. **Inconsistent Architecture**

- No base class or interface for parsers
- Inconsistent error handling patterns
- Mixed logging approaches
- No standardized validation

### 3. **Accuracy Issues**

- Hardcoded skill lists (90 items → 2000+ items added by user, but still incomplete)
- Weak regex patterns for complex entities
- No fuzzy matching for skills
- Date parsing fallback to epoch not fully guarded
- Section detection fragile for PDFs

### 4. **Maintainability Problems**

- 113KB experience_extractor.py (too large)
- Tight coupling between components
- No clear separation of concerns
- Missing type hints in many places

### 5. **Performance Issues**

- Regex compiled on every parse in some files
- No caching of taxonomy lookups
- Inefficient string operations

---

## Refactoring Strategy

### Phase 1: Create Standardized Foundation (HIGH PRIORITY)

#### 1.1 Base Classes & Interfaces

```python
# parsers/base/parser_base.py
- BaseParser (abstract base class)
- ParserResult (standardized output)
- ParserConfig (configuration management)
- ValidationMixin (input validation)
```

#### 1.2 Centralized Configuration

```python
# parsers/config/
- skill_taxonomy.py (single source of truth for skills)
- regex_patterns.py (all regex patterns)
- field_weights.py (scoring weights)
- constants.py (magic numbers, thresholds)
```

#### 1.3 Shared Utilities

```python
# parsers/utils/
- text_utils.py (cleaning, normalization)
- date_utils.py (date parsing with guards)
- validation_utils.py (email, phone, URL validation)
- fuzzy_matcher.py (skill matching with Levenshtein distance)
```

### Phase 2: Refactor Individual Parsers (MEDIUM PRIORITY)

#### 2.1 Consolidate Rule Parsers

- Merge simple_rule_parser.py into rule_parser.py
- Use inheritance to avoid duplication
- Standardize output format

#### 2.2 Split Large Files

- Break experience_extractor.py into:
  - experience_extractor.py (core logic)
  - experience_patterns.py (regex patterns)
  - experience_validators.py (validation logic)

#### 2.3 Improve Entity Extraction

- Add fuzzy skill matching (threshold: 85% similarity)
- Improve name extraction with NER confidence
- Better company name extraction
- Location extraction with geocoding validation

### Phase 3: Enhance Accuracy (HIGH PRIORITY)

#### 3.1 Skill Extraction Improvements

- Load skills from external JSON/YAML file
- Add skill categories and synonyms
- Implement TF-IDF for skill relevance
- Add context-aware skill extraction

#### 3.2 Date Parsing Hardening

- Centralize all date parsing in date_utils.py
- Add comprehensive guards (1980-2030 range)
- Handle ambiguous formats (MM/DD vs DD/MM)
- Validate date sequences (start < end)

#### 3.3 Section Detection Enhancement

- Add ML-based section classification fallback
- Improve PDF artifact cleanup
- Handle multi-column layouts
- Detect tables and extract structured data

### Phase 4: Error Handling & Logging (MEDIUM PRIORITY)

#### 4.1 Standardized Error Handling

```python
# parsers/exceptions.py
- ParserException (base)
- ValidationError
- ExtractionError
- ConfigurationError
```

#### 4.2 Structured Logging

- Use structured logging (JSON format)
- Add correlation IDs for tracing
- Log performance metrics
- Add debug mode with detailed traces

### Phase 5: Testing & Validation (HIGH PRIORITY)

#### 5.1 Unit Tests

- Test each parser independently
- Test edge cases (empty input, malformed data)
- Test regex patterns with real examples

#### 5.2 Integration Tests

- Test full pipeline with sample resumes
- Validate accuracy metrics
- Performance benchmarks

---

## Implementation Priority

### Immediate (This Session)

1. ✅ Create base parser class
2. ✅ Centralize skill taxonomy into config file
3. ✅ Create shared utilities (text_utils, date_utils, validation_utils)
4. ✅ Refactor regex patterns into central module
5. ✅ Add fuzzy skill matching
6. ✅ Improve error handling across all parsers

### Short Term (Next Session)

1. Split experience_extractor.py
2. Add comprehensive unit tests
3. Implement ML-based section classification
4. Add skill categorization and weighting

### Medium Term (Future)

1. Add resume quality scoring
2. Implement caching layer
3. Add API rate limiting
4. Create parser benchmarking suite

---

## File Structure (After Refactoring)

```
parsers/
├── __init__.py
├── base/
│   ├── __init__.py
│   ├── parser_base.py          # Abstract base class
│   ├── parser_result.py        # Standardized result format
│   └── mixins.py               # Validation, logging mixins
├── config/
│   ├── __init__.py
│   ├── skill_taxonomy.json     # 2000+ skills with categories
│   ├── regex_patterns.py       # All regex patterns
│   ├── field_weights.py        # Scoring weights
│   └── constants.py            # Thresholds, magic numbers
├── utils/
│   ├── __init__.py
│   ├── text_utils.py           # Text cleaning, normalization
│   ├── date_utils.py           # Date parsing with guards
│   ├── validation_utils.py     # Email, phone, URL validators
│   ├── fuzzy_matcher.py        # Skill fuzzy matching
│   └── pdf_utils.py            # PDF artifact cleanup
├── extractors/
│   ├── __init__.py
│   ├── experience_extractor.py
│   ├── education_extractor.py
│   ├── skill_extractor.py      # NEW: Dedicated skill extractor
│   └── contact_extractor.py    # NEW: Email, phone, social
├── parsers/
│   ├── __init__.py
│   ├── rule_parser.py          # Consolidated rule-based
│   ├── ai_ner_parser.py
│   ├── hybrid_merger.py
│   └── master_parser.py
├── scorers/
│   ├── __init__.py
│   ├── confidence_scorer.py
│   └── quality_scorer.py       # NEW: Resume quality assessment
├── normalizers/
│   ├── __init__.py
│   ├── entity_normalizer.py
│   └── skill_normalizer.py     # NEW: Dedicated skill normalization
├── splitters/
│   ├── __init__.py
│   ├── section_splitter.py
│   └── block_splitter.py       # NEW: Experience/education blocks
├── exceptions.py               # Custom exceptions
└── text_extractor.py           # Keep as is (PDF/DOCX extraction)
```

---

## Success Metrics

### Accuracy Improvements

- Name extraction: 95%+ accuracy (currently ~70%)
- Email extraction: 99%+ accuracy (currently ~95%)
- Skills extraction: 85%+ precision, 80%+ recall (currently ~60%/50%)
- Experience dates: 90%+ accuracy (currently ~70% due to epoch bug)
- Education: 85%+ accuracy (currently ~75%)

### Code Quality

- Reduce code duplication by 80%
- 100% type hint coverage
- 90%+ test coverage
- All files < 500 lines

### Performance

- Parse time < 2 seconds per resume
- Memory usage < 100MB per parse
- Support batch processing (10+ resumes/sec)

---

## Breaking Changes

### API Changes

- All parsers will return `ParserResult` objects instead of dicts
- Error handling will raise custom exceptions instead of returning None
- Configuration will be loaded from files instead of hardcoded

### Migration Guide

```python
# Old
result = parser.parse(text)
email = result.get('email')

# New
result = parser.parse(text)
email = result.contact.email  # Structured access
```
