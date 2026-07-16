# Resume Upload and Parsing Architecture Analysis

## Executive Summary

This document provides a comprehensive analysis of the existing resume upload and parsing architecture to guide the implementation of IMAGE resume processing support using PaddleOCR.

---

## 1. Current Architecture Overview

### 1.1 System Components

```
┌─────────────────┐
│   Frontend      │
│   (React/Vite)  │
└────────┬────────┘
         │
         │ POST /api/upload/parse
         │ (multipart/form-data)
         ↓
┌─────────────────┐
│  Backend API    │
│  (Express/TS)   │
│  Port: 3001     │
└────────┬────────┘
         │
         │ File Upload (Multer)
         ↓
┌─────────────────┐
│  File Storage   │
│  ./uploads/     │
└────────┬────────┘
         │
         │ POST /preview-sections
         │ POST /parse
         ↓
┌─────────────────┐
│  AI Service     │
│  (FastAPI/Py)   │
│  Port: 8000     │
└────────┬────────┘
         │
         │ Parsed JSON
         ↓
┌─────────────────┐
│  PostgreSQL DB  │
│  Port: 5432     │
└─────────────────┘
```

---

## 2. Current Upload Flow

### 2.1 API Endpoint

**Endpoint:** `POST /api/upload/parse`  
**Controller:** `backend/src/controllers/upload.controller.ts`  
**Middleware:** `backend/src/middleware/upload.middleware.ts`

### 2.2 Upload Process Flow

```
1. Frontend uploads file
   ↓
2. Multer middleware validates and stores file
   - Allowed types: PDF, DOCX, TXT
   - Max size: 10MB (configurable)
   - Storage: ./uploads/{uuid}_{originalname}
   ↓
3. Create candidate record (status: 'pending')
   ↓
4. Create parsing_job record (status: 'pending')
   ↓
5. Call AI Service: POST /preview-sections
   - Extract raw text from file
   - Return raw text immediately
   ↓
6. Call AI Service: POST /parse
   - Parse sections from raw text
   - Extract: name, email, phone, skills, work_history, education, projects, certifications
   ↓
7. Duplicate check (after AI extraction)
   ↓
8. Store parsed data in database
   - Update candidates table
   - Insert work_history
   - Insert education
   - Insert candidate_skills
   - Insert certifications
   - Update parsing_job (status: 'completed')
   ↓
9. Return response with candidate data
```

---

## 3. File Type Processing

### 3.1 PDF Processing

**File:** `ai-service/parsers/text_extractor.py`  
**Method:** `extract_from_pdf()`

**Multi-tier Strategy:**
```
Tier 1: pdfplumber (text-based PDFs)
  ↓ (if quality poor or < 200 chars)
Tier 2: AWS Textract (scanned PDFs, table-heavy layouts)
  ↓ (if quality poor or < 200 chars)
Tier 3: pymupdf (digital text fallback)
  ↓ (if quality poor or < 200 chars)
Tier 4: Tesseract OCR (last-resort local OCR)
```

**Return Value:**
```python
{
  'text': str,
  'method_used': str,
  'char_count': int,
  'quality_score': float,
  'has_tables': bool (optional),
  'ocr_confidence': float (optional),
  'ocr_quality_ok': bool (optional)
}
```

### 3.2 DOCX Processing

**File:** `ai-service/parsers/text_extractor.py`  
**Method:** `extract_from_docx()`

**Library:** python-docx  
**Process:**
- Extract text from paragraphs
- Extract text from tables
- Preserve document structure

### 3.3 TXT Processing

**File:** `ai-service/parsers/text_extractor.py`  
**Method:** `extract_from_txt()`

**Process:**
- Direct file reading
- Encoding detection
- Text normalization

---

## 4. AI Service Architecture

### 4.1 AI Service Structure

**Location:** `ai-service/`  
**Framework:** FastAPI (Python)  
**Port:** 8000

### 4.2 Main Endpoints

**File:** `ai-service/main.py`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/preview-sections` | POST | Extract raw text from file |
| `/parse` | POST | Parse sections from text |
| `/parse-sections` | POST | Parse sections from text (alternative) |
| `/health` | GET | Health check |

### 4.3 Parser Architecture

**File:** `ai-service/parsers/master_parser.py`

**Parser Hierarchy:**
```
MasterParser
  ├── DeBERTa NER Parser (primary)
  ├── Rule-based Parser (fallback)
  ├── LLM-based Parser (enhancement)
  ├── Hybrid Merger (combine results)
  ├── Confidence Scorer
  └── Entity Validator
```

### 4.4 Section Extraction

**Extracted Sections:**
- Personal Information (name, email, phone, location)
- Social Links (linkedin, github, portfolio)
- Professional Summary
- Skills (technical, soft skills)
- Work Experience (company, role, dates, description)
- Education (institution, degree, field, years)
- Projects
- Certifications
- Achievements
- Languages
- Additional Information

---

## 5. Database Schema

### 5.1 Core Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `candidates` | Candidate profiles | id, email, full_name, phone, location, linkedin_url, github_url, summary, status, raw_resume_text, resume_hash, email_hash |
| `work_history` | Work experience | id, candidate_id, job_title, company_name, start_date, end_date, is_current, description |
| `education` | Education | id, candidate_id, degree, institution, field_of_study, start_date, end_date, gpa |
| `candidate_skills` | Candidate-skill relationships | candidate_id, skill_id, proficiency_level |
| `skills` | Skills catalog | id, name, category |
| `certifications` | Certifications | id, candidate_id, name, issuer, date |
| `parsing_jobs` | Parsing job tracking | id, candidate_id, status, confidence_score, parsed_data, raw_text |

### 5.2 No Schema Changes Required

The existing schema supports all resume data types. Image resumes will use the same tables.

---

## 6. Backend API Structure

### 6.1 Upload Controller

**File:** `backend/src/controllers/upload.controller.ts`

**Key Functions:**
- `uploadResume()` - Main upload handler
- `parseResume()` - Parse resume from text
- `parseSections()` - Parse sections from text
- `storeAllParsedData()` - Store parsed data in database

### 6.2 Upload Middleware

**File:** `backend/src/middleware/upload.middleware.ts`

**Key Functions:**
- `uploadResume` - Multer configuration
- `fileFilter` - Validate file types
- `handleUploadError` - Error handling
- `getFileType` - Get file type from mimetype
- `validateUploadedFile` - Validate uploaded file
- `getFileInfo` - Get file info
- `deleteUploadedFile` - Delete uploaded file

**Current Allowed Types:**
```typescript
const allowedMimeTypes = [
  "application/pdf", // PDF files
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX files
  "text/plain", // TXT files
];
```

---

## 7. Candidate Creation Flow

### 7.1 Manual Candidate Creation

**Endpoint:** `POST /api/candidates`  
**Controller:** `backend/src/controllers/candidate.controller.ts`  
**Function:** `createCandidate()`

**Flow:**
```
1. Validate request body
2. Map work_experience → work_history
3. Begin transaction
4. Duplicate check (before transaction)
5. Insert candidate record
6. Insert skills (with candidate_skills relationship)
7. Insert work_history
8. Insert education
9. Insert certifications
10. Insert projects (JSONB)
11. Insert activity_log
12. Commit transaction
13. Return candidate with all nested data
```

### 7.2 Resume Upload Candidate Creation

**Endpoint:** `POST /api/upload/parse`  
**Controller:** `backend/src/controllers/upload.controller.ts`  
**Function:** `uploadResume()`

**Flow:**
```
1. Upload file
2. Create candidate (status: 'pending')
3. Create parsing_job (status: 'pending')
4. Extract text via AI service
5. Parse sections via AI service
6. Duplicate check (after AI extraction)
7. Store parsed data
8. Update parsing_job (status: 'completed')
9. Return candidate data
```

---

## 8. Error Handling Patterns

### 8.1 Upload Errors

**Types:**
- File too large
- Invalid file type
- Too many files
- Unexpected field

**Response Format:**
```json
{
  "error": "Error type",
  "message": "Detailed message",
  "code": "ERROR_CODE"
}
```

### 8.2 Parsing Errors

**Types:**
- AI service unavailable
- Parsing failed
- Invalid response
- OCR extraction failed

**Response Format:**
```json
{
  "error": "Error type",
  "message": "Detailed message",
  "details": {}
}
```

### 8.3 Database Errors

**Types:**
- Connection errors
- Constraint violations
- Transaction failures

**Handling:**
- Transaction rollback
- Error logging
- User-friendly error messages

---

## 9. Logging Patterns

### 9.1 Backend Logging

**Format:**
```typescript
console.log("📄 Extracting text...");
console.log("✅ Extraction successful");
console.log("⚠️ Warning message");
console.log("❌ Error message");
```

**Sections Logged:**
- File upload
- Text extraction
- AI service calls
- Database operations
- Duplicate checks
- Performance metrics

### 9.2 AI Service Logging

**Format:**
```python
logger.info("Processing file...")
logger.warning("Quality poor...")
logger.error("Extraction failed...")
```

**Sections Logged:**
- Request/response
- Processing time
- Method used
- Confidence scores
- Token usage (for LLM)

---

## 10. Performance Considerations

### 10.1 Current Performance

- PDF extraction: 1-5 seconds (depends on size)
- DOCX extraction: < 1 second
- Text parsing: 2-10 seconds (depends on LLM)
- Total upload time: 5-20 seconds

### 10.2 Async Processing

**Current State:** Synchronous processing  
**Impact:** Large files block requests

**Recommendation for Images:**
- OCR processing should be async
- Use job queue for large images
- Return job ID for status polling

---

## 11. Security Considerations

### 11.1 File Validation

**Current Checks:**
- File type validation (mimetype)
- File size validation
- Filename sanitization

### 11.2 Image-Specific Security

**Additional Checks Needed:**
- Image format validation
- Image dimension validation
- Image quality validation
- Malicious image detection

---

## 12. Image OCR Implementation Plan

### 12.1 Architecture for Image Processing

```
IMAGE UPLOAD
  ↓
Multer Middleware (updated to accept images)
  ↓
File Storage (./uploads/)
  ↓
PaddleOCR Service (NEW)
  ↓
Plain Text Extraction
  ↓
Existing AI Service (/parse)
  ↓
Section Extraction
  ↓
Database Storage
```

### 12.2 Files to Modify

**Backend:**
1. `backend/src/middleware/upload.middleware.ts`
   - Add image MIME types to allowed list
   - Update file type detection
   - Add image validation

2. `backend/src/controllers/upload.controller.ts`
   - Add image type detection
   - Add PaddleOCR service call
   - Add OCR text cleanup
   - Integrate with existing flow

**AI Service (Python):**
3. `ai-service/parsers/text_extractor.py`
   - Add `extract_from_image()` method
   - Integrate PaddleOCR
   - Add image preprocessing

4. `ai-service/main.py`
   - Add OCR endpoint (optional, or use existing)

### 12.3 Database Impact

**No schema changes required.** Existing tables support all resume data.

### 12.4 API Impact

**No new endpoints required.** Existing `/api/upload/parse` will be extended.

**Changes:**
- Update request validation
- Update response documentation
- Add image-specific error codes

### 12.5 Performance Impact

**Expected:**
- OCR processing: 2-10 seconds per image
- Memory usage: Increased (PaddleOCR model)
- CPU usage: Increased during OCR

**Mitigation:**
- Async processing for large images
- Image size limits
- Image quality thresholds
- Retry mechanism for failures

---

## 13. PaddleOCR Integration Strategy

### 13.1 PaddleOCR Service Options

**Option 1: Integrate into AI Service (Recommended)**
- Add PaddleOCR to `ai-service/`
- Use existing FastAPI infrastructure
- Reuse existing error handling
- Reuse existing logging

**Option 2: Separate OCR Service**
- Create new FastAPI service
- Independent scaling
- More complex deployment

**Recommendation:** Option 1 (integrate into AI service)

### 13.2 OCR Text Cleanup

**Required Cleanup Steps:**
1. Remove duplicate lines
2. Remove OCR noise (random characters)
3. Normalize spacing (multiple spaces → single space)
4. Merge broken sentences
5. Preserve section headings
6. Preserve bullet points
7. Preserve chronological order

**Implementation Location:**
- `ai-service/parsers/text_preprocessor.py` (existing)
- Add `clean_ocr_text()` function

### 13.3 Error Handling for Images

**Error Types:**
- Blurry images
- Low-resolution images
- Empty images
- Corrupted images
- OCR extraction failures
- Unsupported formats

**Handling Strategy:**
- Validate image before OCR
- Check image quality
- Return meaningful error messages
- Retry mechanism (max 3 attempts)
- Fallback to alternative OCR if available

---

## 14. Implementation Checklist

### 14.1 Backend Changes

- [ ] Update `upload.middleware.ts` to accept image MIME types
- [ ] Add image validation functions
- [ ] Update `upload.controller.ts` to detect image types
- [ ] Add PaddleOCR service call
- [ ] Add OCR text cleanup
- [ ] Add OCR-specific error handling
- [ ] Add OCR performance logging
- [ ] Add OCR confidence score logging
- [ ] Update API documentation

### 14.2 AI Service Changes

- [ ] Install PaddleOCR dependencies
- [ ] Add `extract_from_image()` to `text_extractor.py`
- [ ] Add image preprocessing
- [ ] Add OCR text cleanup function
- [ ] Add image quality validation
- [ ] Add OCR error handling
- [ ] Add OCR performance logging
- [ ] Add OCR confidence scoring
- [ ] Test with various image formats

### 14.3 Testing

- [ ] Test JPG upload
- [ ] Test JPEG upload
- [ ] Test PNG upload
- [ ] Test WEBP upload
- [ ] Test single-column resumes
- [ ] Test multi-column resumes
- [ ] Test table-heavy resumes
- [ ] Test scanned resumes
- [ ] Test resume screenshots
- [ ] Test blurry images
- [ ] Test low-resolution images
- [ ] Test empty images
- [ ] Test corrupted images
- [ ] Test OCR confidence scoring
- [ ] Test text cleanup
- [ ] Test error handling
- [ ] Test performance

---

## 15. Expected Final Flow

### 15.1 PDF Resume (Existing)
```
PDF Upload
  ↓
Text Extraction (pdfplumber/Textract/pymupdf/Tesseract)
  ↓
Existing Parser
  ↓
Candidate Creation
```

### 15.2 DOCX Resume (Existing)
```
DOCX Upload
  ↓
Text Extraction (python-docx)
  ↓
Existing Parser
  ↓
Candidate Creation
```

### 15.3 IMAGE Resume (NEW)
```
IMAGE Upload
  ↓
PaddleOCR
  ↓
Text Extraction
  ↓
Existing Parser
  ↓
Candidate Creation
```

---

## 16. Backward Compatibility

### 16.1 Existing Functionality

**Must Maintain:**
- PDF upload and parsing
- DOCX upload and parsing
- TXT upload and parsing
- Existing section extraction
- Existing database schema
- Existing API endpoints
- Existing error handling
- Existing logging patterns

### 16.2 Compatibility Strategy

**Approach:**
- Extend existing middleware (don't replace)
- Extend existing controller (don't replace)
- Extend existing parser (don't replace)
- Add new code paths (don't modify existing)
- Use feature flags if needed

---

## 17. Dependencies

### 17.1 Backend Dependencies

**New Dependencies:**
- None (PaddleOCR will be in AI service)

### 17.2 AI Service Dependencies

**New Dependencies:**
- paddleocr
- paddlepaddle
- pillow (already installed)
- numpy (already installed)

**Installation:**
```bash
pip install paddleocr paddlepaddle
```

---

## 18. Configuration

### 18.1 Environment Variables

**New Variables:**
```bash
# PaddleOCR Configuration
PADDLEOCR_ENABLED=true
PADDLEOCR_MODEL_DIR=./models/ocr
PADDLEOCR_USE_GPU=false
PADDLEOCR_LANG=en
```

### 18.2 Configuration Files

**New Files:**
- `ai-service/config/ocr_config.py` - OCR configuration
- `ai-service/models/ocr/` - OCR model storage

---

## 19. Monitoring and Observability

### 19.1 Metrics to Track

**OCR-Specific Metrics:**
- OCR processing time
- OCR confidence score
- OCR success rate
- OCR failure rate
- Image quality score
- Text cleanup effectiveness

### 19.2 Logging

**OCR-Specific Logs:**
- Image format detected
- Image dimensions
- Image quality score
- OCR method used
- OCR processing time
- OCR confidence score
- Text cleanup stats
- OCR errors

---

## 20. Rollback Plan

### 20.1 Rollback Strategy

**If Issues Arise:**
1. Disable image upload via environment variable
2. Revert middleware changes
3. Revert controller changes
4. Keep existing PDF/DOCX functionality intact

### 20.2 Feature Flag

**Implementation:**
```typescript
const IMAGE_UPLOAD_ENABLED = process.env.IMAGE_UPLOAD_ENABLED === 'true';

if (IMAGE_UPLOAD_ENABLED && isImage(file)) {
  // Use PaddleOCR
} else {
  // Use existing flow
}
```

---

## 21. Conclusion

### 21.1 Summary

The existing architecture is well-structured and modular, making it straightforward to add image OCR support without breaking existing functionality.

### 21.2 Key Points

1. **No database schema changes required**
2. **No new API endpoints required**
3. **Extend existing middleware and controller**
4. **Integrate PaddleOCR into AI service**
5. **Maintain 100% backward compatibility**
6. **Follow existing coding patterns**
7. **Reuse existing error handling and logging**

### 21.3 Next Steps

1. Review this analysis
2. Approve implementation plan
3. Begin implementation
4. Test thoroughly
5. Deploy with feature flag
6. Monitor performance
7. Gradual rollout

---

**Document Version:** 1.0  
**Last Updated:** 2026-07-03  
**Author:** Devin AI Assistant