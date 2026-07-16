# Job Description CRUD API Test Guide

## Authentication Required

All job endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## API Endpoints

### 1. Create Job Description

```bash
POST http://localhost:3001/api/jobs
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Senior Software Engineer",
  "department": "Engineering",
  "location": "San Francisco, CA",
  "employment_type": "full-time",
  "description": "We are looking for a Senior Software Engineer with extensive experience in building scalable web applications. The ideal candidate will have strong knowledge of modern JavaScript frameworks, cloud platforms, and agile development methodologies. You will be responsible for designing and implementing complex features, mentoring junior developers, and contributing to technical architecture decisions.",
  "required_skills": ["JavaScript", "React", "Node.js", "AWS", "PostgreSQL", "Docker"],
  "min_experience_years": 5,
  "max_experience_years": 10,
  "education_level": "bachelor",
  "salary_min": 120000,
  "salary_max": 180000
}
```

### 2. Get All Jobs (Paginated with Filters)

```bash
GET http://localhost:3001/api/jobs?page=1&limit=10&search=engineer&department=Engineering&location=San%20Francisco&employment_type=full-time&min_experience=3&max_experience=8
Authorization: Bearer <token>
```

### 3. Get Job by ID

```bash
GET http://localhost:3001/api/jobs/<job-id>
Authorization: Bearer <token>
```

### 4. Update Job Description

```bash
PUT http://localhost:3001/api/jobs/<job-id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Lead Software Engineer",
  "salary_min": 130000,
  "required_skills": ["JavaScript", "React", "Node.js", "AWS", "PostgreSQL", "Docker", "Kubernetes"]
}
```

### 5. Delete Job Description

```bash
DELETE http://localhost:3001/api/jobs/<job-id>
Authorization: Bearer <token>
```

### 6. Get Job Options (Filter Values)

```bash
GET http://localhost:3001/api/jobs/options
Authorization: Bearer <token>
```

## Response Examples

### Create Job Response

```json
{
  "message": "Job created successfully",
  "job": {
    "id": "uuid-here",
    "title": "Senior Software Engineer",
    "department": "Engineering",
    "location": "San Francisco, CA",
    "employment_type": "full-time",
    "description": "We are looking for a Senior Software Engineer...",
    "required_skills": [
      "JavaScript",
      "React",
      "Node.js",
      "AWS",
      "PostgreSQL",
      "Docker"
    ],
    "min_experience_years": 5,
    "max_experience_years": 10,
    "education_level": "bachelor",
    "salary_min": 120000,
    "salary_max": 180000,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### Get All Jobs Response

```json
{
  "jobs": [...],
  "pagination": {
    "current_page": 1,
    "total_pages": 3,
    "total_items": 25,
    "items_per_page": 10,
    "has_next_page": true,
    "has_prev_page": false
  },
  "filters": {
    "search": "engineer",
    "department": "Engineering"
  }
}
```

### Get Job Options Response

```json
{
  "departments": ["Engineering", "Marketing", "Sales", "HR"],
  "locations": ["San Francisco, CA", "New York, NY", "Remote"],
  "employment_types": [
    "full-time",
    "part-time",
    "contract",
    "internship",
    "temporary"
  ],
  "education_levels": ["high-school", "bachelor", "master", "phd", "any"]
}
```

## Validation Rules

### Required Fields (Create)

- `title`: 3-255 characters, required
- `description`: Minimum 50 characters, required
- `required_skills`: Array of strings, required

### Optional Fields

- `department`: 1-100 characters
- `location`: 1-100 characters
- `employment_type`: Must be one of: full-time, part-time, contract, internship, temporary
- `min_experience_years`: 0-50 (integer)
- `max_experience_years`: 0-50 (integer)
- `education_level`: Must be one of: high-school, bachelor, master, phd, any
- `salary_min`: Positive integer
- `salary_max`: Positive integer

### Cross-Field Validation

- `salary_min` cannot be greater than `salary_max`
- `min_experience_years` cannot be greater than `max_experience_years`

### Error Response (Validation Failed)

```json
{
  "error": "Validation failed",
  "details": [
    "Title must be at least 3 characters long",
    "Description must be at least 50 characters long",
    "Required skills must be an array"
  ]
}
```

## Query Parameters for Filtering

| Parameter         | Type    | Description                              | Example                     |
| ----------------- | ------- | ---------------------------------------- | --------------------------- |
| `page`            | integer | Page number (default: 1)                 | `page=2`                    |
| `limit`           | integer | Items per page, 1-100 (default: 20)      | `limit=50`                  |
| `search`          | string  | Search in title, description, department | `search=engineer`           |
| `department`      | string  | Filter by department                     | `department=Engineering`    |
| `location`        | string  | Filter by location                       | `location=San%20Francisco`  |
| `employment_type` | string  | Filter by employment type                | `employment_type=full-time` |
| `min_experience`  | integer | Filter by minimum experience             | `min_experience=3`          |
| `max_experience`  | integer | Filter by maximum experience             | `max_experience=8`          |

## Test Workflow

1. **Register/Login** to get JWT token
2. **Create a job** with all fields
3. **Get all jobs** to see pagination
4. **Filter jobs** using query parameters
5. **Get specific job** by ID
6. **Update job** with partial data
7. **Get job options** for filter values
8. **Delete job** to test deletion

The API includes comprehensive validation, error handling, and follows RESTful conventions.
