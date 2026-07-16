# AI Section Recovery API Documentation

## Overview

The AI Section Recovery API provides intelligent fallback mechanisms to recover missing critical sections from resume text when initial parsing fails. This ensures comprehensive resume parsing even for complex or poorly formatted resumes.

## Problem Solved

Sometimes `/api/upload/preview-sections` returns incomplete results:
```json
{
  "detected_sections": ["contact", "summary"],
  "missing_sections": ["experience", "education", "skills", "projects", "certifications"]
}
```

Even when the resume contains these sections, the initial parsing might miss them due to formatting issues, complex layouts, or OCR errors.

## Solution

### Critical Sections Detection
The system automatically identifies these critical sections:
- **experience** - Work history and professional experience
- **education** - Academic background and qualifications  
- **skills** - Technical and professional skills
- **contact** - Personal contact information

### AI Fallback Logic
```javascript
const criticalSections = ["experience", "education", "skills", "contact"];
const missingCriticalSections = criticalSections.filter(
  section => !sections[section]
);
const shouldRunAIRecovery = missingCriticalSections.length > 0;
```

## API Endpoints

### 1. Standalone Section Recovery
**POST** `/api/upload/recover-sections`

Recovers specific missing sections from raw resume text.

#### Request Body
```json
{
  "raw_text": "Full resume text content...",
  "missing_sections": ["experience", "projects"],
  "detected_sections": ["contact", "summary", "skills", "education"]
}
```

#### Response
```json
{
  "status": "success",
  "message": "Successfully recovered 1 sections",
  "recovered_sections": {
    "experience": [
      {
        "company": "EBOT TECHNOSOFT",
        "role": "DevOps Engineer",
        "start_date": "2024-01",
        "end_date": "",
        "is_current": true,
        "description": "Designed, implemented, and maintained end-to-end CICD pipelines..."
      }
    ]
  },
  "sections_attempted": ["experience"],
  "processing_time_ms": 2341,
  "ai_service_response": {
    "model": "gpt-4o-mini",
    "confidence": {
      "experience": 0.89
    },
    "tokens_used": {
      "prompt": 1444,
      "completion": 916,
      "total": 2360
    }
  }
}
```

### 2. Enhanced Preview with Recovery
**POST** `/api/upload/preview-sections-with-recovery`

Automatically runs AI recovery when critical sections are missing from initial preview.

#### Request Body (multipart/form-data)
- **file**: Resume file (required)
- **force_ocr**: "true" or "false" (optional)

#### Response
```json
{
  "sections": {
    "contact": { ... },
    "summary": "AWS Cloud and DevOps Engineer...",
    "skills": ["AWS", "Kubernetes", "Docker", ...],
    "education": [...],
    "experience": [...], // Recovered by AI
    "certifications": [...]
  },
  "detected_sections": ["contact", "summary", "skills", "education", "experience", "certifications"],
  "missing_sections": ["projects"],
  "recovery_applied": true,
  "recovery_reason": "Missing critical sections: experience",
  "recovered_sections": {
    "experience": [...]
  },
  "recovery_stats": {
    "sections_attempted": ["experience"],
    "sections_recovered": ["experience"],
    "recovery_success_rate": 100.0
  },
  "ai_recovery_info": {
    "processing_time_ms": 2341,
    "model": "gpt-4o-mini",
    "confidence": {
      "experience": 0.89
    }
  }
}
```

## Integration Examples

### Frontend Integration

```javascript
// Use enhanced preview with automatic recovery
const formData = new FormData();
formData.append('file', resumeFile);
formData.append('force_ocr', 'false');

const response = await fetch('/api/upload/preview-sections-with-recovery', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData
});

const result = await response.json();

if (result.recovery_applied) {
  console.log(`AI recovered: ${result.recovery_stats.sections_recovered.join(', ')}`);
  console.log(`Success rate: ${result.recovery_stats.recovery_success_rate}%`);
}
```

### Manual Recovery Integration

```javascript
// First, get initial preview
const initialPreview = await fetch('/api/upload/preview-sections', { ... });

// Check if critical sections are missing
const criticalSections = ["experience", "education", "skills", "contact"];
const missingCritical = criticalSections.filter(
  section => !initialPreview.sections[section]
);

if (missingCritical.length > 0) {
  // Run manual recovery
  const recoveryResponse = await fetch('/api/upload/recover-sections', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      raw_text: initialPreview.raw_text,
      missing_sections: missingCritical,
      detected_sections: initialPreview.detected_sections
    })
  });
  
  const recovered = await recoveryResponse.json();
  
  // Merge results
  const enhancedSections = {
    ...initialPreview.sections,
    ...recovered.recovered_sections
  };
}
```

## Error Handling

### Common Error Responses

#### 400 - Bad Request
```json
{
  "error": "Missing required field",
  "message": "raw_text is required for section recovery",
  "code": "MISSING_RAW_TEXT"
}
```

#### 503 - Service Unavailable
```json
{
  "error": "AI service unavailable",
  "message": "The Python AI service is currently unreachable. Please try again later.",
  "code": "AI_SERVICE_UNAVAILABLE"
}
```

#### 500 - Internal Error
```json
{
  "error": "Section recovery failed",
  "message": "An unexpected error occurred while recovering sections",
  "code": "RECOVERY_FAILED"
}
```

## Performance Considerations

### Timeouts
- **Initial Preview**: 60 seconds
- **AI Recovery**: 120 seconds (2 minutes)
- **Total Enhanced Preview**: Up to 180 seconds

### Processing Time
Typical processing times:
- **Simple Recovery**: 1-3 seconds
- **Complex Recovery**: 3-10 seconds
- **Multiple Sections**: 5-15 seconds

### Token Usage
AI recovery uses OpenAI API tokens:
- **Prompt Tokens**: ~1,000-2,000 (depends on resume length)
- **Completion Tokens**: ~500-1,500 (depends on sections recovered)
- **Total Tokens**: ~1,500-3,500 per recovery request

## Configuration

### Environment Variables
```env
AI_SERVICE_URL=http://localhost:8000  # Python AI service URL
```

### Critical Sections Configuration
The critical sections list can be modified in the code:
```javascript
const criticalSections = ["experience", "education", "skills", "contact"];
```

## Testing

### Run Test Suite
```bash
cd backend/src
node test_ai_section_recovery.js
```

### Test Coverage
- ✅ Standalone recovery with missing sections
- ✅ Enhanced preview with automatic recovery
- ✅ No recovery needed scenarios
- ✅ Error handling for invalid requests
- ✅ Integration with existing preview flow

## Monitoring

### Logging
The API provides detailed logging:
```
🔄 AI Section Recovery API called
📋 Recovering sections: experience, projects
✅ Already detected: contact, summary, skills, education
🤖 Calling AI service for section recovery: http://localhost:8000/recover-sections
✅ AI Section Recovery completed in 2341ms
```

### Metrics to Monitor
- **Recovery Success Rate**: Percentage of missing sections successfully recovered
- **Processing Time**: Average time for recovery operations
- **Token Usage**: OpenAI API token consumption
- **Error Rates**: Frequency of recovery failures

## Best Practices

### When to Use Recovery
1. **Initial Preview Fails**: When critical sections are missing
2. **Complex Resumes**: For resumes with unusual formatting
3. **OCR Documents**: When OCR might miss section boundaries
4. **Quality Assurance**: As a fallback for improved parsing accuracy

### When NOT to Use Recovery
1. **Complete Parsing**: When all critical sections are detected
2. **Performance Critical**: When speed is more important than completeness
3. **Cost Constraints**: When token usage needs to be minimized

### Frontend Integration Tips
1. **Show Progress**: Display recovery status to users
2. **Handle Timeouts**: Implement proper timeout handling
3. **Cache Results**: Cache recovery results to avoid repeated calls
4. **Graceful Degradation**: Fall back to manual entry if recovery fails

## Troubleshooting

### Common Issues

#### Recovery Returns Empty Results
- **Cause**: AI service couldn't identify sections in the text
- **Solution**: Check resume text quality and formatting

#### High Processing Times
- **Cause**: Large resume text or multiple sections to recover
- **Solution**: Optimize resume text or reduce sections to recover

#### Service Unavailable
- **Cause**: Python AI service is not running
- **Solution**: Check AI service status and configuration

#### Poor Recovery Quality
- **Cause**: Resume text is poorly formatted or contains noise
- **Solution**: Preprocess text or use manual correction

## Future Enhancements

### Planned Improvements
1. **Adaptive Recovery**: Learn from successful recovery patterns
2. **Confidence Thresholds**: Only recover high-confidence sections
3. **Batch Processing**: Recover multiple resumes simultaneously
4. **Caching**: Cache recovery results for similar resumes
5. **Custom Models**: Train specialized models for specific industries

### Integration Opportunities
1. **Resume Scoring**: Factor recovery success into resume quality scores
2. **Auto-Correction**: Automatically fix common formatting issues
3. **Template Detection**: Identify resume templates for better parsing
4. **Multi-language**: Support for resumes in different languages
