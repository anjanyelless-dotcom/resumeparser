# Filter Search API Root Cause Analysis

## Executive Summary

The candidate search filter API is returning **379 unrelated candidates** when searching for "Frontend Developer", including Data Engineers, Security Engineers, Product Managers, QA Engineers, and other unrelated roles.

**Root Cause:** The `role` filter is being used for **SCORING** instead of **FILTERING** at the database level. This causes all candidates to be fetched from the database, then scored, resulting in unrelated candidates being returned with low scores.

---

## 1. Current Implementation Analysis

### 1.1 Database Query (Stage 1 - Pre-filtering)

**File:** `backend/src/controllers/candidate-search.controller.ts` (lines 48-136)

**Current WHERE Clause:**
```sql
WHERE c.status = 'success' AND c.deleted_at IS NULL
  AND c.location = ANY($1)           -- If locations provided
  AND c.current_company = ANY($2)    -- If currentCompany provided
  AND c.notice_period = ANY($3)      -- If noticePeriod provided
  AND c.employment_type = ANY($4)    -- If employmentType provided
  AND c.years_experience >= $5       -- If minExperience provided
  AND c.years_experience <= $6       -- If maxExperience provided
```

**❌ CRITICAL ISSUE:** `role` and `skills` filters are **NOT** in the WHERE clause.

**Impact:**
- When searching for "Frontend Developer", the query returns **ALL** candidates with status='success'
- No role-based filtering occurs at the database level
- Pagination is applied to the unfiltered result set
- 379 candidates are returned before any filtering

### 1.2 Virtual JD Builder (Stage 2)

**File:** `backend/src/services/virtual-jd-builder.service.ts` (lines 37-68)

**Current Implementation:**
```typescript
if (filters.role) {
  extractedJD.roleKeywords = [filters.role];
}
```

**Issue:** The role is only used to build `roleKeywords` for the ATS engine, which is a **SCORING** mechanism, not a **FILTERING** mechanism.

### 1.3 ATS Engine Role Scoring

**File:** `backend/src/services/ats-engine.service.ts` (lines 260-279)

**Current Implementation:**
```typescript
function scoreRole(jd: ExtractedJD, candidate: CandidateData, blob: string): number {
  if (!jd.roleKeywords.length) return 100;

  let matches = 0;
  for (const role of jd.roleKeywords) {
    if (blob.toLowerCase().includes(role.toLowerCase())) {
      matches++;
    }
  }

  return Math.round((matches / jd.roleKeywords.length) * 100);
}
```

**Issue:** This function checks if the role keyword appears in the candidate's resume text blob. A Data Engineer might get a score of 0% for role, but they're still returned in the results.

### 1.4 Response Structure

**File:** `backend/src/controllers/candidate-search.controller.ts` (lines 179-206)

**Current Response:**
```typescript
{
  id: atsResult.candidate_id,
  full_name: atsResult.candidate_name,
  role_score: atsResult.role_score,  // Can be 0 for unrelated roles
  matching_skills: atsResult.matched_skills,
  missing_skills: atsResult.missing_skills,
  extra_skills: [],
  recommendation: atsResult.match_label,
}
```

**Issue:** Candidates with `role_score = 0` are still returned in the response.

---

## 2. Why Skills Are Empty

### 2.1 No Role-to-Skill Mapping

**Finding:** There is **NO** role-to-skill mapping in the codebase.

**Search Results:**
- No `role-skill-mapping` file found
- No database table for role-skill relationships
- No service for mapping roles to required skills

**Impact:**
When searching for "Frontend Developer" without explicit skills:
- The virtual JD builder creates: `roleKeywords: ["Frontend Developer"]`
- The JD extractor does NOT populate `skills` from the role
- Result: `matching_skills: []`, `missing_skills: []`
- Error message: "Candidate covers only 0 of 0 required skills"

### 2.2 Virtual JD Builder Limitation

**File:** `backend/src/services/virtual-jd-builder.service.ts` (lines 77-129)

**Current Implementation:**
```typescript
function buildJDTextFromFilters(filters: FilterCriteria): string {
  const parts: string[] = [];

  if (filters.role) {
    parts.push(`Role: ${filters.role}`);
  }

  if (filters.skills && filters.skills.length > 0) {
    parts.push(`Required Skills: ${filters.skills.join(', ')}`);
  }
  // ...
}
```

**Issue:** The role is added as a simple text line. The JD extractor does not have logic to:
- Map "Frontend Developer" → ["React", "JavaScript", "HTML", "CSS"]
- Map "Data Engineer" → ["Python", "SQL", "Spark", "Airflow"]
- Map any role to its required skills

---

## 3. Database Schema Analysis

### 3.1 Available Columns for Role Filtering

**File:** `backend/src/database/migrations/020_update_candidates_schema.sql`

**Relevant Columns:**
```sql
current_title character varying(200)          -- Line 18
job_titles jsonb DEFAULT '[]'::jsonb         -- Line 53 (array of all job titles)
```

**These columns CAN be used for role filtering but are NOT currently used.**

### 3.2 Current Query Usage

**File:** `backend/src/controllers/candidate-search.controller.ts` (lines 105-136)

**Current Query:**
```sql
SELECT c.*,
       (SELECT array_agg(DISTINCT s.name) FROM candidate_skills cs JOIN skills s ON cs.skill_id = s.id WHERE cs.candidate_id = c.id) as skills,
       (SELECT json_agg(we.*) FROM work_history we WHERE we.candidate_id = c.id) as work_history,
       ...
FROM candidates c
WHERE c.status = 'success' AND c.deleted_at IS NULL
ORDER BY c.created_at DESC
LIMIT $7 OFFSET $8
```

**Issue:** The query does NOT use `current_title` or `job_titles` for filtering.

---

## 4. Pagination Strategy Analysis

### 4.1 Current Pagination Flow

**File:** `backend/src/controllers/candidate-search.controller.ts` (lines 94-103)

**Current Implementation:**
```typescript
// Get total count for pagination
const countQuery = `
  SELECT COUNT(*) as total
  FROM candidates c
  ${whereClause}  // Missing role filter
`;
const total = parseInt(countResult.rows[0].total);

// Fetch filtered candidates
const candidatesQuery = `
  SELECT c.* FROM candidates c
  ${whereClause}  // Missing role filter
  ORDER BY c.created_at DESC
  LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
`;
```

**Issue:** Pagination is executed **BEFORE** role filtering.
- Total count includes all candidates (379)
- Page 1 returns first 20 of 379 unfiltered candidates
- Role filtering happens AFTER pagination in the ATS engine

### 4.2 Expected Pagination Flow

**Correct Flow:**
1. Filter by role at database level (WHERE clause)
2. Get total count of FILTERED candidates
3. Fetch FILTERED candidates with pagination
4. Score FILTERED candidates
5. Return scored FILTERED candidates

---

## 5. Scoring vs Filtering Confusion

### 5.1 Current Architecture

```
Request: { role: "Frontend Developer" }
    ↓
Stage 1: Database Query
    WHERE status = 'success'  ← NO role filter
    Returns: ALL 379 candidates
    ↓
Stage 2: Build Virtual JD
    roleKeywords: ["Frontend Developer"]
    ↓
Stage 3: ATS Scoring
    Score each candidate based on roleKeywords
    Data Engineer: role_score = 0%  ← Still returned!
    Frontend Developer: role_score = 100%
    ↓
Stage 4: Sort by overall_score
    ↓
Response: All 379 candidates (including unrelated ones)
```

### 5.2 Correct Architecture

```
Request: { role: "Frontend Developer" }
    ↓
Stage 1: Database Query
    WHERE status = 'success'
      AND (current_title ILIKE '%Frontend Developer%'
           OR job_titles @> '["Frontend Developer"]')  ← Role filter
    Returns: 25 candidates (only Frontend Developers)
    ↓
Stage 2: Build Virtual JD
    roleKeywords: ["Frontend Developer"]
    skills: ["React", "JavaScript", "HTML", "CSS"]  ← From role-skill mapping
    ↓
Stage 3: ATS Scoring
    Score each candidate based on skills, experience, etc.
    Frontend Developer: skill_score = 85%, overall_score = 82%
    ↓
Stage 4: Sort by overall_score
    ↓
Response: 25 Frontend Developers (ranked by score)
```

---

## 6. Root Cause Summary

### 6.1 Primary Root Causes

1. **Role Filter Not Applied at Database Level**
   - `role` filter is missing from SQL WHERE clause
   - All candidates are fetched regardless of role
   - Pagination executed on unfiltered result set

2. **Scoring Used Instead of Filtering**
   - `roleKeywords` used for ATS scoring (scoreRole function)
   - Candidates with role_score = 0 are still returned
   - No minimum score threshold to filter out low matches

3. **No Role-to-Skill Mapping**
   - No database table or service mapping roles to required skills
   - Searching by role alone returns empty skill arrays
   - JD extractor cannot infer skills from role

4. **No Minimum Score Threshold**
   - No filter to exclude candidates with overall_score < X
   - Even 0% match candidates are returned

### 6.2 Secondary Issues

5. **No Role Synonym Normalization**
   - "Frontend Developer" ≠ "Frontend Engineer" ≠ "UI Developer"
   - No fuzzy matching or semantic search for roles

6. **No Post-Scoring Filter**
   - After ATS scoring, candidates are not filtered by score
   - All scored candidates are returned regardless of match quality

---

## 7. Corrected Implementation Strategy

### 7.1 Database-Level Role Filtering

**Add to WHERE clause:**
```typescript
// Role filter (hard filter at database level)
if (filters.role) {
  const roleVariations = generateRoleVariations(filters.role);
  whereClause += ` AND (
    c.current_title ILIKE ANY($${paramIndex})
    OR c.job_titles @> $${paramIndex + 1}::jsonb
  )`;
  queryParams.push(roleVariations.map(r => `%${r}%`), JSON.stringify([filters.role]));
  paramIndex += 2;
}
```

**Role Synonyms Mapping:**
```typescript
function generateRoleVariations(role: string): string[] {
  const synonyms: Record<string, string[]> = {
    "Frontend Developer": ["Frontend Engineer", "UI Developer", "Frontend Developer", "React Developer"],
    "Full Stack Developer": ["Full Stack Engineer", "Full Stack Developer", "Full-Stack Developer"],
    "Backend Developer": ["Backend Engineer", "Server-Side Developer", "Backend Developer"],
    "Data Engineer": ["Data Engineer", "Data Engineering", "ETL Developer"],
    // ... more mappings
  };

  const normalized = role.toLowerCase().trim();
  for (const [key, values] of Object.entries(synonyms)) {
    if (values.some(v => v.toLowerCase() === normalized)) {
      return values;
    }
  }

  return [role]; // Return original if no synonyms found
}
```

### 7.2 Database-Level Skills Filtering

**Add to WHERE clause:**
```typescript
// Skills filter (hard filter at database level)
if (filters.skills && filters.skills.length > 0) {
  whereClause += ` AND EXISTS (
    SELECT 1 FROM candidate_skills cs
    JOIN skills s ON cs.skill_id = s.id
    WHERE cs.candidate_id = c.id
    AND s.name = ANY($${paramIndex})
  )`;
  queryParams.push(filters.skills);
  paramIndex++;
}
```

### 7.3 Role-to-Skill Mapping Service

**Create new file:** `backend/src/services/role-skill-mapping.service.ts`

```typescript
export interface RoleSkillMapping {
  role: string;
  requiredSkills: string[];
  preferredSkills: string[];
}

const ROLE_SKILL_MAPPINGS: RoleSkillMapping[] = [
  {
    role: "Frontend Developer",
    requiredSkills: ["HTML", "CSS", "JavaScript"],
    preferredSkills: ["React", "TypeScript", "Redux", "Vue.js", "Angular"],
  },
  {
    role: "Full Stack Developer",
    requiredSkills: ["JavaScript", "HTML", "CSS"],
    preferredSkills: ["React", "Node.js", "TypeScript", "SQL", "MongoDB"],
  },
  {
    role: "Backend Developer",
    requiredSkills: ["JavaScript", "Node.js"],
    preferredSkills: ["Python", "Java", "SQL", "MongoDB", "Redis"],
  },
  // ... more mappings
];

export function getSkillsForRole(role: string): string[] {
  const mapping = ROLE_SKILL_MAPPINGS.find(m =>
    m.role.toLowerCase() === role.toLowerCase()
  );

  if (!mapping) return [];

  return [...mapping.requiredSkills, ...mapping.preferredSkills];
}
```

**Update virtual-jd-builder.service.ts:**
```typescript
import { getSkillsForRole } from "./role-skill-mapping.service";

export function buildVirtualJDFromFilters(filters: FilterCriteria): ExtractedJD {
  const jdText = buildJDTextFromFilters(filters);
  const extractedJD = extractJD(jdText);

  // If skills not provided, infer from role
  if (!filters.skills || filters.skills.length === 0) {
    if (filters.role) {
      extractedJD.skills = getSkillsForRole(filters.role);
    }
  } else {
    extractedJD.skills = filters.skills;
  }

  // ... rest of the code
}
```

### 7.4 Minimum Score Threshold

**Add after scoring:**
```typescript
const MIN_OVERALL_SCORE = 30; // Exclude candidates with < 30% match

const filteredCandidates = candidatesWithScores.filter(
  candidate => candidate.overall_score >= MIN_OVERALL_SCORE
);

// Recalculate pagination after filtering
const filteredTotal = filteredCandidates.length;
const filteredTotalPages = Math.ceil(filteredTotal / limit);
const paginatedCandidates = filteredCandidates.slice(offset, offset + limit);
```

### 7.5 Corrected Pagination Strategy

```typescript
// Stage 1: Database filtering with role and skills
// (Apply all filters including role and skills in WHERE clause)

// Stage 2: Get total count of FILTERED candidates
const countQuery = `
  SELECT COUNT(*) as total
  FROM candidates c
  ${whereClause}  // Now includes role and skills
`;

// Stage 3: Fetch FILTERED candidates with pagination
const candidatesQuery = `
  SELECT c.* FROM candidates c
  ${whereClause}  // Now includes role and skills
  ORDER BY c.created_at DESC
  LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
`;

// Stage 4: Score only FILTERED candidates
const atsResults = await rankCandidates(virtualJD, atsCandidates);

// Stage 5: Sort by score (already filtered)
const sortedCandidates = candidatesWithScores.sort(
  (a, b) => b.overall_score - a.overall_score
);

// Stage 6: Return filtered, scored, paginated results
```

---

## 8. Before vs After Example

### 8.1 Before (Current - Broken)

**Request:**
```json
{
  "role": "Frontend Developer",
  "page": 1,
  "limit": 20
}
```

**Response:**
```json
{
  "success": true,
  "searchType": "filters",
  "pagination": {
    "current_page": 1,
    "total_pages": 19,
    "total_items": 379,  // ❌ Includes all candidates
    "items_per_page": 20
  },
  "candidates": [
    {
      "id": "1",
      "full_name": "John Doe",
      "current_title": "Data Engineer",  // ❌ Unrelated role
      "role_score": 0,  // ❌ Zero score but still returned
      "matching_skills": [],  // ❌ Empty
      "missing_skills": [],  // ❌ Empty
      "overall_score": 5,
      "recommendation": "Low Match"
    },
    {
      "id": "2",
      "full_name": "Jane Smith",
      "current_title": "Security Engineer",  // ❌ Unrelated role
      "role_score": 0,
      "matching_skills": [],
      "missing_skills": [],
      "overall_score": 3,
      "recommendation": "Low Match"
    },
    // ... more unrelated candidates
  ]
}
```

### 8.2 After (Corrected)

**Request:**
```json
{
  "role": "Frontend Developer",
  "page": 1,
  "limit": 20
}
```

**Response:**
```json
{
  "success": true,
  "searchType": "filters",
  "pagination": {
    "current_page": 1,
    "total_pages": 2,
    "total_items": 25,  // ✅ Only Frontend Developers
    "items_per_page": 20
  },
  "candidates": [
    {
      "id": "1",
      "full_name": "John Doe",
      "current_title": "Frontend Developer",  // ✅ Correct role
      "role_score": 100,  // ✅ High score
      "matching_skills": ["React", "JavaScript", "TypeScript"],  // ✅ Populated
      "missing_skills": ["GraphQL"],
      "overall_score": 85,
      "recommendation": "Strong Match"
    },
    {
      "id": "2",
      "full_name": "Jane Smith",
      "current_title": "React Developer",  // ✅ Synonym matched
      "role_score": 95,
      "matching_skills": ["React", "JavaScript", "HTML"],
      "missing_skills": ["TypeScript"],
      "overall_score": 78,
      "recommendation": "Good Match"
    },
    // ... only Frontend Developers
  ]
}
```

---

## 9. Performance Optimization Recommendations

### 9.1 Database Indexes

**Add indexes for role filtering:**
```sql
-- Index on current_title for role filtering
CREATE INDEX idx_candidates_current_title ON candidates(current_title);

-- GIN index on job_titles JSONB for array contains queries
CREATE INDEX idx_candidates_job_titles_gin ON candidates USING GIN(job_titles);

-- Composite index for common filter combinations
CREATE INDEX idx_candidates_location_experience ON candidates(location, years_experience);
```

### 9.2 Query Optimization

**Use EXISTS instead of JOIN for skills filtering:**
```sql
-- Slower (JOINs all skills)
SELECT c.* FROM candidates c
JOIN candidate_skills cs ON cs.candidate_id = c.id
JOIN skills s ON s.id = cs.skill_id
WHERE s.name IN ('React', 'JavaScript')

-- Faster (stops at first match)
SELECT c.* FROM candidates c
WHERE EXISTS (
  SELECT 1 FROM candidate_skills cs
  JOIN skills s ON s.id = cs.skill_id
  WHERE cs.candidate_id = c.id AND s.name IN ('React', 'JavaScript')
)
```

### 9.3 Caching Strategy

**Cache role-to-skill mappings:**
```typescript
const roleSkillCache = new Map<string, string[]>();

export function getSkillsForRole(role: string): string[] {
  if (roleSkillCache.has(role)) {
    return roleSkillCache.get(role)!;
  }

  const skills = fetchSkillsForRole(role);
  roleSkillCache.set(role, skills);
  return skills;
}
```

**Cache frequent search results:**
```typescript
const searchCache = new LRUCache<string, SearchResponse>({
  max: 100,
  ttl: 1000 * 60 * 5, // 5 minutes
});

export async function searchCandidatesByFilters(req: Request, res: Response) {
  const cacheKey = JSON.stringify(req.body);

  if (searchCache.has(cacheKey)) {
    return res.json(searchCache.get(cacheKey));
  }

  const result = await performSearch(req.body);
  searchCache.set(cacheKey, result);
  return res.json(result);
}
```

### 9.4 Pagination Optimization

**Use cursor-based pagination for large datasets:**
```typescript
// Instead of OFFSET (slow for large offsets)
// Use cursor-based pagination (fast)

const cursor = req.body.cursor;
const limit = req.body.limit || 20;

const query = `
  SELECT c.* FROM candidates c
  ${whereClause}
  AND c.id > $${paramIndex}  -- Cursor-based
  ORDER BY c.id ASC
  LIMIT $${paramIndex + 1}
`;
```

### 9.5 Batch Processing

**Process scoring in batches:**
```typescript
const BATCH_SIZE = 100;

for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
  const batch = candidates.slice(i, i + BATCH_SIZE);
  const batchResults = await rankCandidates(virtualJD, batch);
  allResults.push(...batchResults);
}
```

---

## 10. Implementation Priority

### Phase 1: Critical Fixes (Immediate)
1. ✅ Add role filter to database WHERE clause
2. ✅ Add skills filter to database WHERE clause
3. ✅ Implement role synonym normalization
4. ✅ Add minimum score threshold filter

### Phase 2: Feature Enhancements (Week 1)
5. ✅ Create role-to-skill mapping service
6. ✅ Update virtual JD builder to use role-skill mapping
7. ✅ Fix pagination to execute after filtering

### Phase 3: Performance Optimization (Week 2)
8. ✅ Add database indexes for role filtering
9. ✅ Implement query optimization
10. ✅ Add caching strategy

### Phase 4: Advanced Features (Week 3)
11. ✅ Implement cursor-based pagination
12. ✅ Add batch processing for large datasets
13. ✅ Implement fuzzy matching for roles

---

## 11. Recommended Code Changes

### File 1: `backend/src/controllers/candidate-search.controller.ts`

**Changes Required:**
- Add role filter to WHERE clause (line 51)
- Add skills filter to WHERE clause (line 51)
- Implement role synonym generation function
- Add minimum score threshold filter (after line 211)
- Fix pagination to execute after filtering (lines 94-103)

### File 2: `backend/src/services/role-skill-mapping.service.ts` (NEW)

**Create new file with:**
- RoleSkillMapping interface
- ROLE_SKILL_MAPPINGS constant
- getSkillsForRole function
- Role synonym mapping

### File 3: `backend/src/services/virtual-jd-builder.service.ts`

**Changes Required:**
- Import getSkillsForRole from role-skill-mapping.service
- Update buildVirtualJDFromFilters to infer skills from role (line 47-49)

### File 4: `backend/migrations/`

**Create new migration:**
- Add indexes on current_title
- Add GIN index on job_titles
- Add composite indexes for common filter combinations

---

## 12. Testing Checklist

### Unit Tests
- [ ] Role synonym generation
- [ ] Role-to-skill mapping
- [ ] Database WHERE clause with role filter
- [ ] Database WHERE clause with skills filter
- [ ] Minimum score threshold filter

### Integration Tests
- [ ] Search by role only
- [ ] Search by role + skills
- [ ] Search by role + location + experience
- [ ] Pagination with filters
- [ ] Sorting after filtering

### Performance Tests
- [ ] Query with 1,000 candidates
- [ ] Query with 10,000 candidates
- [ ] Query with 100,000 candidates
- [ ] Index effectiveness verification

---

## 13. Conclusion

The filter search API is fundamentally flawed because it uses **SCORING** instead of **FILTERING** for role selection. The current implementation:

1. ❌ Returns all candidates from database (no role filter)
2. ❌ Scores all candidates including unrelated ones
3. ❌ Returns candidates with 0% role score
4. ❌ Has no role-to-skill mapping
5. ❌ Applies pagination before filtering

The corrected implementation must:

1. ✅ Apply role filter at database level (WHERE clause)
2. ✅ Apply skills filter at database level (WHERE clause)
3. ✅ Use role synonyms for better matching
4. ✅ Implement role-to-skill mapping
5. ✅ Apply minimum score threshold
6. ✅ Execute pagination after filtering

**Priority:** Implement Phase 1 fixes immediately to prevent returning unrelated candidates.