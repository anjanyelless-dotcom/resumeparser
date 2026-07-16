# Resume Parser AI Service

A FastAPI-based AI service for resume text extraction and parsing. Provides comprehensive text extraction capabilities for PDF, DOCX, and TXT files with OCR fallback for scanned documents.

## Features

### Text Extraction

- **PDF Support**: PyMuPDF extraction with Tesseract OCR fallback
- **DOCX Support**: Paragraph and table extraction
- **TXT Support**: Encoding detection and cleanup
- **OCR Fallback**: Automatic OCR for scanned PDFs
- **Quality Assessment**: Automatic quality scoring (0-1)
- **Privacy Protection**: Email/phone number removal

### API Endpoints

- `POST /parse` - Extract text from resume files
- `POST /parse-text` - Parse raw text directly
- `GET /health` - Service health check
- `GET /` - Welcome message and endpoint info
- `GET /docs` - Interactive API documentation

### Production Features

- **CORS Support**: Configured for frontend integration
- **Request Logging**: Comprehensive request/response logging
- **Error Handling**: Graceful error responses
- **Health Monitoring**: Service status and capability checking

## Quick Start

### Prerequisites

#### Python Dependencies

```bash
# Python 3.8+ required
python --version
```

#### System Dependencies (for OCR)

```bash
# macOS
brew install tesseract

# Ubuntu/Debian
sudo apt-get install tesseract-ocr

# Windows
# Download from: https://github.com/UB-Mannheim/tesseract/wiki
```

### Installation

#### Option 1: Using Startup Script (Recommended)

```bash
cd ai-service
./start.sh
```

#### Option 2: Manual Installation

```bash
cd ai-service

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the service
python main.py
```

### Verify Installation

The service should start at: http://localhost:8000

- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health
- **Alternative Docs**: http://localhost:8000/redoc

## API Usage

### 1. Parse Resume File

```bash
curl -X POST "http://localhost:8000/parse" \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "/path/to/resume.pdf",
    "candidate_id": "candidate-123",
    "file_type": "pdf"
  }'
```

**Response:**

```json
{
  "candidate_id": "candidate-123",
  "status": "success",
  "extracted_text": "John Doe\nSoftware Engineer...",
  "word_count": 250,
  "quality_score": 0.85,
  "parsing_method": "pymupdf"
}
```

### 2. Parse Raw Text

```bash
curl -X POST "http://localhost:8000/parse-text" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "John Doe\nSoftware Engineer\nExperience: 5 years...",
    "candidate_id": "candidate-456"
  }'
```

**Response:**

```json
{
  "candidate_id": "candidate-456",
  "status": "success",
  "extracted_text": "John Doe\nSoftware Engineer\nExperience: 5 years...",
  "word_count": 15,
  "quality_score": 0.72,
  "parsing_method": "direct"
}
```

### 3. Health Check

```bash
curl -X GET "http://localhost:8000/health"
```

**Response:**

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "extractor_available": true,
  "supported_formats": [".pdf", ".docx", ".txt"]
}
```

## Testing

### Run Test Suite

```bash
# Make sure the service is running first
python main.py &

# In another terminal:
python test_api.py
```

### Test Files

Create a `test_files` directory with sample documents:

- `sample_resume.pdf`
- `sample_resume.docx`
- `sample_resume.txt`

### Expected Test Output

```
🚀 AI Service API Test Suite
==================================================

🏥 Testing Health Endpoint
------------------------------
✅ Health check successful!
   Status: healthy
   Version: 1.0.0
   Extractor Available: true
   Supported Formats: ['.pdf', '.docx', '.txt']

📝 Testing Parse Text Endpoint
------------------------------
✅ Parse text successful!
   Candidate ID: test-candidate-123
   Status: success
   Word Count: 85
   Quality Score: 0.82
   Parsing Method: direct
```

## Integration with Node.js Backend

### Backend Configuration

In your Node.js backend, set the AI service URL:

```bash
export AI_SERVICE_URL=http://localhost:8000
```

### Example Integration

```javascript
// In your worker or controller
const axios = require("axios");

async function parseResume(filePath, candidateId, fileType) {
  try {
    const response = await axios.post(`${process.env.AI_SERVICE_URL}/parse`, {
      file_path: filePath,
      candidate_id: candidateId,
      file_type: fileType,
    });

    return response.data;
  } catch (error) {
    console.error("AI service error:", error.response?.data || error.message);
    throw error;
  }
}
```

## Configuration

### Environment Variables

```bash
# Optional: Custom Tesseract path
export TESSERACT_CMD="/usr/local/bin/tesseract"

# Optional: Log level
export LOG_LEVEL="INFO"  # DEBUG, INFO, WARNING, ERROR
```

### CORS Configuration

The service is pre-configured to accept requests from:

- `http://localhost:3001` (Node.js backend)
- `http://localhost:3000` (React frontend)
- `http://localhost:5173` (Vite dev server)
- `https://lakshya-llm-resume-parser-ated.vercel.app` (Production)

Modify the CORS origins in `main.py` if needed.

## Performance Considerations

### OCR Processing

- **CPU Intensive**: OCR can be slow for large documents
- **Memory Usage**: Image processing requires additional memory
- **Quality vs Speed**: Higher resolution improves OCR but slows processing

### Optimization Tips

1. **Batch Processing**: Process files sequentially to manage memory
2. **Caching**: Cache extraction results for repeated processing
3. **Resource Limits**: Set appropriate memory/time limits
4. **Monitoring**: Track OCR usage and performance metrics

### Production Deployment

```bash
# Using Gunicorn (recommended for production)
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app

# Or using Docker
docker build -t resume-parser-ai .
docker run -p 8000:8000 resume-parser-ai
```

## Troubleshooting

### Common Issues

#### Service Won't Start

```bash
# Check dependencies
pip install -r requirements.txt

# Check Tesseract
tesseract --version

# Check Python version (3.8+)
python --version
```

#### OCR Not Working

```bash
# Verify Tesseract installation
which tesseract
tesseract --list-langs

# Reinstall if needed
brew reinstall tesseract
```

#### File Not Found Errors

- Ensure file paths are absolute
- Check file permissions
- Verify the service has access to the upload directory

#### CORS Errors

- Check the CORS configuration in `main.py`
- Ensure your frontend URL is in the allowed origins list

### Debug Mode

Enable detailed logging:

```python
# In main.py, change logging level
logging.basicConfig(level=logging.DEBUG)
```

### Performance Issues

- Monitor memory usage with large files
- Check OCR processing time
- Consider implementing result caching
- Set up appropriate resource limits

## Architecture

### Project Structure

```
ai-service/
├── main.py                 # FastAPI application
├── requirements.txt        # Python dependencies
├── start.sh               # Startup script
├── test_api.py            # API test suite
├── README.md              # This file
├── parsers/
│   ├── __init__.py        # Package init
│   └── text_extractor.py  # Text extraction logic
└── test_files/            # Sample files for testing
    ├── sample_resume.pdf
    ├── sample_resume.docx
    └── sample_resume.txt
```

### Data Flow

```
1. Request → FastAPI Router
2. Router → TextExtractor
3. TextExtractor → File Parser (PDF/DOCX/TXT)
4. Parser → OCR (if needed)
5. Results → Text Cleaning
6. Response → JSON API Response
```

## Dependencies

### Core Dependencies

- **fastapi**: Web framework
- **uvicorn**: ASGI server
- **pydantic**: Data validation
- **python-multipart**: File upload support

### Text Extraction

- **PyMuPDF**: PDF text extraction
- **python-docx**: DOCX text extraction
- **pytesseract**: OCR engine
- **Pillow**: Image processing

### AI/ML (Future)

- **transformers**: Hugging Face models
- **torch**: PyTorch framework
- **spacy**: NLP library

## License

This service uses open-source libraries with various licenses:

- **FastAPI**: MIT License
- **PyMuPDF**: AGPL License
- **python-docx**: MIT License
- **Tesseract**: Apache License 2.0

Ensure compliance with all licenses when using in production.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review the API documentation at `/docs`
3. Check the test suite for usage examples
4. Review the logs for detailed error information
