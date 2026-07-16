# OpenAI GPT-4o-mini Integration

## Overview

This integration adds OpenAI GPT-4o-mini as an alternative parsing model alongside the existing DeBERTa NER pipeline.

## Installation

### 1. Install OpenAI SDK

```bash
cd backend/src
npm install openai
```

### 2. Add Environment Variable

Add to your `.env` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

## How It Works

### Model Selection

The `/api/upload/parse-sections` endpoint now accepts a `model` parameter:

- `own-model` (default): Uses existing DeBERTa NER parser
- `gpt-4o-mini`: Uses OpenAI GPT-4o-mini

### Request Format

```json
{
  "model": "gpt-4o-mini",
  "sections": {
    "experience": {
      "text": "Work experience section text..."
    },
    "education": {
      "text": "Education section text..."
    }
  }
}
```

### Response Format

The response schema is identical to the DeBERTa parser:

```json
{
  "work_experience": [
    {
      "company": "Company Name",
      "company_name": "Company Name",
      "role": "Software Engineer",
      "job_title": "Software Engineer",
      "location": "San Francisco, CA",
      "start_date": "2020-01",
      "end_date": "2023-12",
      "is_current": false,
      "client": null,
      "clients": [],
      "description": "Job description..."
    }
  ],
  "education": [
    {
      "institution": "University Name",
      "degree": "Bachelor of Science",
      "field_of_study": "Computer Science",
      "start_year": 2016,
      "end_year": 2020,
      "grade": "3.8"
    }
  ],
  "metadata": {
    "model": "gpt-4o-mini",
    "token_usage": {
      "prompt_tokens": 450,
      "completion_tokens": 320,
      "total_tokens": 770
    },
    "processing_time_ms": 1250
  }
}
```

## Features

### ✅ Automatic Fallback

If OpenAI parsing fails (API error, timeout, invalid response), the system automatically falls back to the DeBERTa parser.

### ✅ Token Usage Tracking

The response includes token usage statistics:
- `prompt_tokens`: Input tokens
- `completion_tokens`: Output tokens
- `total_tokens`: Total tokens used

### ✅ Processing Time Logging

Both console logs and response metadata include processing time in milliseconds.

### ✅ Schema Normalization

The OpenAI response is automatically normalized to match the DeBERTa parser schema, ensuring frontend compatibility.

## Implementation Details

### Files Created

1. **`services/openai-parser.service.ts`**
   - OpenAI client initialization
   - Prompt construction
   - Response parsing and normalization
   - Error handling

### Files Modified

1. **`controllers/upload.controller.ts`**
   - Added model selection logic
   - Integrated OpenAI parser
   - Implemented fallback mechanism
   - Enhanced logging

## Prompt Engineering

The OpenAI prompt is designed to:

1. **Extract Work Experience**
   - Detect actual employer vs client companies
   - Normalize job titles (e.g., "Stack Developer" → "Full Stack Developer")
   - Identify current employment
   - Parse and normalize dates to YYYY-MM format

2. **Extract Education**
   - Parse institution, degree, and field of study
   - Extract start/end years
   - Capture GPA/grade information

3. **Follow Strict Rules**
   - Never invent data
   - Return null for missing values
   - Output valid JSON only
   - No markdown or explanations

## Error Handling

### OpenAI Errors
- Missing API key → Throws error on initialization
- API timeout → Falls back to DeBERTa
- Invalid JSON response → Falls back to DeBERTa
- Rate limit exceeded → Falls back to DeBERTa

### DeBERTa Fallback Errors
- Service unavailable → Returns 503
- Parse failed → Returns error from AI service
- Internal error → Returns 500

## Logging

Console logs include:
- 🎯 Selected model
- 🤖 OpenAI parser start
- 📝 Input text lengths
- ✅ Success with extraction counts
- 📊 Token usage
- ⏱️ Processing time
- ❌ Errors with fallback indication
- 🔄 Fallback attempts

## Cost Estimation

GPT-4o-mini pricing (as of implementation):
- Input: $0.15 per 1M tokens
- Output: $0.60 per 1M tokens

Typical resume parsing:
- Input tokens: ~400-600
- Output tokens: ~200-400
- Cost per resume: ~$0.0003-0.0005

## Testing

### Test with own-model (DeBERTa)
```bash
curl -X POST http://localhost:3001/api/upload/parse-sections \
  -H "Content-Type: application/json" \
  -d '{
    "model": "own-model",
    "sections": {
      "experience": {"text": "..."},
      "education": {"text": "..."}
    }
  }'
```

### Test with gpt-4o-mini
```bash
curl -X POST http://localhost:3001/api/upload/parse-sections \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "sections": {
      "experience": {"text": "..."},
      "education": {"text": "..."}
    }
  }'
```

## Frontend Integration

No frontend changes required! The existing frontend will work seamlessly because:

1. The response schema is identical
2. Model selection is passed via the existing dropdown
3. Error handling remains the same
4. The metadata field is optional and won't break existing code

## Security

- API key is stored in `.env` (not committed to git)
- API key is validated on service initialization
- No API key is exposed in logs or responses
- OpenAI SDK handles secure communication

## Monitoring

Monitor the following in production:

1. **Token Usage**: Track costs via `metadata.token_usage`
2. **Processing Time**: Monitor via `metadata.processing_time_ms`
3. **Fallback Rate**: Count OpenAI failures vs successes
4. **Error Rates**: Track API errors and timeouts

## Future Enhancements

Potential improvements:

1. Add support for more OpenAI models (GPT-4, GPT-4-turbo)
2. Implement caching for identical resume sections
3. Add retry logic with exponential backoff
4. Implement batch processing for multiple resumes
5. Add confidence scoring similar to DeBERTa
6. Support streaming responses for large resumes
