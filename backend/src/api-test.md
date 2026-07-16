# Candidate CRUD API Test Guide

## Authentication Required

All candidate endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## API Endpoints

### 1. Register User

```bash
POST http://localhost:3001/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123",
  "role": "recruiter"
}
```

### 2. Login

```bash
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

### 3. Create Candidate

```bash
POST http://localhost:3001/api/candidates
Authorization: Bearer <token>
Content-Type: application/json

{
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "location": "San Francisco, CA",
  "linkedin_url": "https://linkedin.com/in/johndoe",
  "github_url": "https://github.com/johndoe",
  "summary": "Software Engineer with 5 years of experience"
}
```

### 4. Get All Candidates (Paginated)

```bash
GET http://localhost:3001/api/candidates?page=1&limit=10&search=john
Authorization: Bearer <token>
```

### 5. Get Candidate by ID

```bash
GET http://localhost:3001/api/candidates/<candidate-id>
Authorization: Bearer <token>
```

### 6. Update Candidate

```bash
PUT http://localhost:3001/api/candidates/<candidate-id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "full_name": "John Smith",
  "location": "New York, NY"
}
```

### 7. Delete Candidate (Soft Delete)

```bash
DELETE http://localhost:3001/api/candidates/<candidate-id>
Authorization: Bearer <token>
```

### 8. Get Parsing Status

```bash
GET http://localhost:3001/api/candidates/<candidate-id>/parsing-status
Authorization: Bearer <token>
```

## Response Examples

### Create Candidate Response

```json
{
  "message": "Candidate created successfully",
  "candidate": {
    "id": "uuid-here",
    "full_name": "John Doe",
    "email": "john@example.com",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### Get All Candidates Response

```json
{
  "candidates": [...],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_items": 50,
    "items_per_page": 10,
    "has_next_page": true,
    "has_prev_page": false
  }
}
```

### Get Candidate with Details Response

```json
{
  "candidate": {
    "id": "uuid-here",
    "full_name": "John Doe",
    "email": "john@example.com",
    "work_experience": [...],
    "education": [...],
    "skills": [...]
  }
}
```
