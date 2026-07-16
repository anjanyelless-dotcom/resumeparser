# Filter Search API Implementation Guide

## Overview

This guide provides step-by-step instructions to fix the candidate search filter API so that role filters behave as strict filters and do not return unrelated candidates.

## Files Created

1. **FILTER_SEARCH_ROOT_CAUSE_ANALYSIS.md** - Comprehensive root cause analysis
2. **backend/src/services/role-skill-mapping.service.ts** - Role-to-skill mapping service
3. **backend/src/controllers/candidate-search.controller.fixed.ts** - Corrected controller
4. **backend/migrations/add_role_filter_indexes.sql** - Database indexes migration

## Implementation Steps

### Step 1: Replace the Controller

**Action:** Replace the existing controller with the corrected version

```bash
cd backend/src/controllers
mv candidate-search.controller.ts candidate-search.controller.ts.backup
mv candidate-search.controller.fixed.ts candidate-search.controller.ts
```

**What this fixes:**
- ✅ Adds role filter to database WHERE clause
- ✅ Adds skills filter to database WHERE clause
- ✅ Implements role synonym normalization
- ✅ Adds minimum score threshold (30%) to filter out low matches
- ✅ Fixes pagination to execute after filtering

### Step 2: Update Virtual JD Builder

**Action:** The virtual-jd-builder.service.ts has already been updated to use role-skill mapping

**What this fixes:**
- ✅ Infers skills from role when skills not provided
- ✅ Populates matching_skills and missing_skills arrays
- ✅ Eliminates "Candidate covers only 0 of 0 required skills" error

### Step 3: Run Database Migration

**Action:** Run the migration to add performance indexes

```bash
cd backend
psql -U postgres -d lakshya_ats -f migrations/add_role_filter_indexes.sql
```

**What this adds:**
- ✅ Index on current_title for role filtering
- ✅ GIN index on job_titles JSONB for array contains queries
- ✅ Composite indexes for common filter combinations
- ✅ Indexes for location, company, notice_period, employment_type

### Step 4: Test the Fixes

**Test 1: Search by role only**

```bash
curl -X POST http://localhost:3001/api/candidates/search/filters \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "role": "Frontend Developer",
    "page": 1,
    "limit": 20
  }'
```

**Expected Result:**
- Only Frontend Developers (or synonyms) returned
- matching_skills populated with React, JavaScript, HTML, CSS, etc.
- No Data Engineers, Security Engineers, etc.

**Test 2: Search by role + skills**

```bash
curl -X POST http://localhost:3001/api/candidates/search/filters \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "role": "Frontend Developer",
    "skills": ["React", "TypeScript"],
    "minExperience": 2,
    "maxExperience": 5,
    "page": 1,
    "limit": 20
  }'
```

**Expected Result:**
- Only Frontend Developers with React and TypeScript skills
- Experience range 2-5 years
- High skill_score and overall_score

**Test 3: Verify pagination**

```bash
curl -X POST http://localhost:3001/api/candidates/search/filters \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "role": "Frontend Developer",
    "page": 1,
    "limit": 5
  }'
```

**Expected Result:**
- total_items should be the count of Frontend Developers only
- total_pages calculated from filtered count
- Page 1 returns first 5 Frontend Developers

### Step 5: Verify No Unrelated Candidates

**Checklist:**
- [ ] No Data Engineers when searching for Frontend Developer
- [ ] No Security Engineers when searching for Frontend Developer
- [ ] No Product Managers when searching for Frontend Developer
- [ ] No QA Engineers when searching for Frontend Developer
- [ ] matching_skills array is not empty
- [ ] missing_skills array is populated
- [ ] role_score is > 0 for all returned candidates
- [ ] overall_score is >= 30 for all returned candidates

## Performance Optimization

### For 10,000+ Candidates

1. **Indexes Applied** (Step 3)
   - current_title index enables fast role filtering
   - job_titles GIN index enables fast JSONB array queries
   - Composite indexes optimize common filter combinations

2. **Query Optimization**
   - Uses EXISTS instead of JOIN for skills filtering
   - Filtered at database level before scoring
   - Reduces candidates to score from 10,000 to ~100

3. **Pagination Strategy**
   - Pagination executed after filtering
   - Only filtered candidates are scored
   - Reduces memory usage and processing time

4. **Batch Processing** (Future Enhancement)
   - Process scoring in batches of 100 candidates
   - Prevents memory issues with large datasets

## Monitoring

### Key Metrics to Monitor

1. **Query Performance**
   - Database query time (should be < 100ms)
   - Scoring time (should be < 500ms for 100 candidates)
   - Total response time (should be < 1s)

2. **Result Quality**
   - Percentage of unrelated candidates (should be 0%)
   - Average overall_score (should be > 50%)
   - Percentage of candidates with matching_skills (should be > 80%)

3. **Pagination Accuracy**
   - total_items matches actual filtered count
   - total_pages calculated correctly
   - Page boundaries work correctly

## Rollback Plan

If issues occur, rollback steps:

```bash
# 1. Restore original controller
cd backend/src/controllers
mv candidate-search.controller.ts.backup candidate-search.controller.ts

# 2. Remove indexes (optional)
psql -U postgres -d lakshya_ats -c "
DROP INDEX IF EXISTS idx_candidates_current_title;
DROP INDEX IF EXISTS idx_candidates_job_titles_gin;
DROP INDEX IF EXISTS idx_candidates_location_experience;
DROP INDEX IF EXISTS idx_candidates_company_experience;
DROP INDEX IF EXISTS idx_candidates_years_experience;
DROP INDEX IF EXISTS idx_candidates_location;
DROP INDEX IF EXISTS idx_candidates_current_company;
DROP INDEX IF EXISTS idx_candidates_notice_period;
DROP INDEX IF EXISTS idx_candidates_employment_type;
"

# 3. Revert virtual-jd-builder.service.ts changes
git checkout backend/src/services/virtual-jd-builder.service.ts
```

## Additional Enhancements (Future Work)

### Phase 2 Enhancements

1. **Fuzzy Matching for Roles**
   - Implement Levenshtein distance for role matching
   - Handle typos in role names
   - Example: "Frontend Develper" → "Frontend Developer"

2. **Semantic Role Matching**
   - Use embeddings for semantic role similarity
   - Map "UI Engineer" to "Frontend Developer" automatically
   - Discover role relationships from data

3. **Skill Proficiency Levels**
   - Filter by skill proficiency (Beginner, Intermediate, Expert)
   - Weight scoring by proficiency level
   - Display proficiency in results

4. **Advanced Filters**
   - Filter by specific projects
   - Filter by education level
   - Filter by certifications
   - Filter by salary range

### Phase 3 Enhancements

5. **Machine Learning Ranking**
   - Train model on recruiter feedback
   - Learn which candidates get hired
   - Improve ranking over time

6. **Saved Searches**
   - Allow recruiters to save filter combinations
   - Quick access to common searches
   - Email alerts for new matches

7. **Bulk Operations**
   - Bulk contact candidates
   - Bulk export to CSV
   - Bulk add to pipeline

## Support

If you encounter issues:

1. Check the logs: `backend/logs/*.log`
2. Verify database indexes: `\d+ candidates` in psql
3. Test query performance: `EXPLAIN ANALYZE` on the query
4. Review root cause analysis: FILTER_SEARCH_ROOT_CAUSE_ANALYSIS.md

## Summary

After implementing these fixes:

✅ Role filters will work as strict filters
✅ Only matching roles will be returned
✅ Skills will be inferred from role automatically
✅ Unrelated candidates will be excluded
✅ Pagination will be accurate
✅ Performance will be optimized for 10,000+ candidates
✅ matching_skills and missing_skills will be populated

The filter search API will now provide accurate, relevant results for recruiters.