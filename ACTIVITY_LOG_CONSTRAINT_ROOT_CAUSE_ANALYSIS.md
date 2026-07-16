# Activity Log Constraint Failure - Root Cause Analysis

## Current Error

**PostgreSQL Error:** 23514  
**Error Message:** new row for relation "activity_log" violates check constraint "valid_activity_type"  
**Failing Value:** `candidate_created`

---

## 1. Constraint Definition

### Original Constraint (Migration 032_add_activity_log.sql)

**File:** `backend/src/database/migrations/032_add_activity_log.sql`  
**Lines:** 26-31

```sql
CONSTRAINT valid_activity_type CHECK (activity_type IN (
    'call_made',
    'candidate_sourced', 
    'candidate_submitted',
    'interview_scheduled'
))
```

**Allowed Values:**
- `call_made`
- `candidate_sourced`
- `candidate_submitted`
- `interview_scheduled`

---

## 2. Application Activity Type Usage

### Search Results: INSERT INTO activity_log

| File | Line | Activity Type | Status |
|------|------|----------------|--------|
| `candidate.controller.ts` | 594 | `candidate_created` | ❌ INVALID |
| `candidate.controller.ts` | 629 | `candidate_created` | ❌ INVALID |
| `submission.controller.ts` | 136 | `candidate_submitted` | ✅ VALID (commented out) |
| `submission.controller.ts` | 772 | `submission_reviewed` | ❌ INVALID (commented out) |
| `submission.controller.ts` | 1005 | `client_outcome_recorded` | ❌ INVALID (commented out) |
| `job.controller.ts` | 1272 | `recruiter_assigned` | ❌ INVALID |
| `interview.controller.ts` | 179 | `interview_scheduled` | ✅ VALID |
| `interview.controller.ts` | 703 | `interview_feedback` | ❌ INVALID |
| `upload.controller.ts` | 369 | `candidate_created` | ❌ INVALID |

### Activity Types Used in Application:

**Invalid (not in constraint):**
- `candidate_created` ✗
- `recruiter_assigned` ✗
- `interview_feedback` ✗
- `submission_reviewed` ✗
- `client_outcome_recorded` ✗

**Valid (in constraint):**
- `candidate_submitted` ✓
- `interview_scheduled` ✓

---

## 3. Root Cause

**Database Schema Mismatch**

The database constraint was created with a limited set of activity types based on the original design (tracking calls, sourcing, submissions, and interviews). However, the application evolved to include more activity types:

- **Candidate creation** → `candidate_created`
- **Job assignment** → `recruiter_assigned`
- **Interview feedback** → `interview_feedback`

The database constraint was never updated to reflect these new activity types.

---

## 4. Exact File and Line Causing Issue

**File:** `backend/src/controllers/candidate.controller.ts`

**Lines:** 591-594 and 626-629

**Code:**
```typescript
await client.query(
  `INSERT INTO activity_log (activity_type, related_id, user_id, created_at)
   VALUES ($1, $2, $3, NOW())`,
  ['candidate_created', candidate.id, userId]
);
```

**Error:** `candidate_created` is not in the allowed list in the constraint `valid_activity_type`

---

## 5. Fix Applied

### Migration Created

**File:** `backend/src/database/migrations/045_update_activity_log_constraint.sql`

**Changes:**
1. Dropped old constraint: `valid_activity_type`
2. Added new constraint with all activity types used in application
3. Updated `log_activity()` function to accept new activity types

**New Constraint:**
```sql
CONSTRAINT valid_activity_type CHECK (activity_type IN (
    'call_made',
    'candidate_sourced',
    'candidate_submitted',
    'interview_scheduled',
    'candidate_created',
    'recruiter_assigned',
    'interview_feedback'
))
```

### Migration Executed

**Command:** `psql -U postgres -d resume_parser -f src/database/migrations/045_update_activity_log_constraint.sql`

**Result:** ✅ Constraint updated successfully

**Verification:**
```sql
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'valid_activity_type';
```

**Output:** Constraint now includes all 7 activity types

---

## 6. Before and After Flow

### BEFORE (Constraint Violation)

```
1. Candidate Insert (STEP 3) ✅
   ↓
2. Skills Insert (STEP 4) ✅
   ↓
3. Work Experience Insert (STEP 5) ✅
   ↓
4. Education Insert (STEP 6) ✅
   ↓
5. Activity Log Insert (STEP 9) ❌
   → ERROR: violates check constraint "valid_activity_type"
   → value: candidate_created
   ↓
6. Transaction Rollback ✅
   ↓
7. Candidate Data Lost ❌
```

### AFTER (Constraint Updated)

```
1. Candidate Insert (STEP 3) ✅
   ↓
2. Skills Insert (STEP 4) ✅
   ↓
3. Work Experience Insert (STEP 5) ✅
   ↓
4. Education Insert (STEP 6) ✅
   ↓
5. Activity Log Insert (STEP 9) ✅
   → activity_type: candidate_created (NOW VALID)
   ↓
6. Transaction Commit ✅
   ↓
7. Candidate Saved Successfully ✅
```

---

## 7. Transaction Rollback Verification

### Current Transaction Flow

```typescript
try {
  await client.query("BEGIN");
  
  // ... candidate insert ...
  // ... skills insert ...
  // ... work experience insert ...
  // ... education insert ...
  
  await client.query(
    `INSERT INTO activity_log ...`,
    ['candidate_created', ...]
  );
  
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
}
```

**Verification:** ✅ Transaction rollback is correctly implemented. When activity log insert fails, the entire transaction is rolled back, preventing partial data.

---

## 8. Additional Activity Types Found

### Commented Out (Potential Future Use)

From `submission.controller.ts`:
- `submission_reviewed`
- `client_outcome_recorded`

These are currently commented out with the note: "DISABLED (table might not exist or have different schema)"

**Recommendation:** Consider adding these to the constraint if they will be used in the future.

---

## 9. Recommendations

### Short Term (Applied)
✅ Updated database constraint to include all current activity types

### Medium Term
1. **Create Activity Type Enum** - Single source of truth
   ```typescript
   export enum ActivityType {
     CALL_MADE = 'call_made',
     CANDIDATE_SOURCED = 'candidate_sourced',
     CANDIDATE_SUBMITTED = 'candidate_submitted',
     INTERVIEW_SCHEDULED = 'interview_scheduled',
     CANDIDATE_CREATED = 'candidate_created',
     RECRUITER_ASSIGNED = 'recruiter_assigned',
     INTERVIEW_FEEDBACK = 'interview_feedback',
   }
   ```

2. **Replace Hardcoded Strings** - Use enum throughout codebase
   ```typescript
   // Before:
   ['candidate_created', candidate.id, userId]
   
   // After:
   [ActivityType.CANDIDATE_CREATED, candidate.id, userId]
   ```

3. **Update Seed File** - Add new activity types to seed data
   ```javascript
   const activityTypes = [
     'call_made', 'candidate_sourced', 'candidate_submitted',
     'interview_scheduled', 'candidate_created', 'recruiter_assigned',
     'interview_feedback'
   ];
   ```

### Long Term
1. **Create migration script** - Automated constraint updates
2. **Activity type registry** - Centralized management
3. **Documentation** - Keep constraint and app in sync

---

## 10. Verification Steps

### Test Candidate Creation

```bash
curl 'http://localhost:3001/api/candidates' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  --data-raw '{
    "name": "Test Candidate",
    "email": "test@example.com",
    "phone": "1234567890",
    "summary": "Test summary",
    "skills": ["React", "Node.js"],
    "work_experience": [...],
    "education": [...],
    "projects": [...]
  }'
```

**Expected Result:**
- Status: 201 Created
- Candidate saved successfully
- Activity log inserted with `candidate_created`
- Transaction committed successfully

---

## 11. Deliverables

### ✅ Exact Constraint Definition

**Original Constraint:**
```sql
CHECK (activity_type IN (
    'call_made',
    'candidate_sourced', 
    'candidate_submitted',
    'interview_scheduled'
))
```

**Updated Constraint:**
```sql
CHECK (activity_type IN (
    'call_made',
    'candidate_sourced',
    'candidate_submitted',
    'interview_scheduled',
    'candidate_created',
    'recruiter_assigned',
    'interview_feedback'
))
```

### ✅ Allowed Activity Types

| Activity Type | Status | Source |
|----------------|--------|--------|
| `call_made` | ✅ Valid | Original |
| `candidate_sourced` | ✅ Valid | Original |
| `candidate_submitted` | ✅ Valid | Original |
| `interview_scheduled` | ✅ Valid | Original |
| `candidate_created` | ✅ Valid | **Added** |
| `recruiter_assigned` | ✅ Valid | **Added** |
| `interview_feedback` | ✅ Valid | **Added** |

### ✅ Invalid Value Currently Used

**Value:** `candidate_created`  
**File:** `backend/src/controllers/candidate.controller.ts`  
**Lines:** 594, 629  
**Status:** ✅ Now valid after migration

### ✅ Exact File and Line Number Causing Issue

**File:** `backend/src/controllers/candidate.controller.ts`  
**Lines:** 591-594, 626-629  
**Root Cause:** Database constraint did not include `candidate_created`

### ✅ Fix Applied

**Migration File:** `backend/src/database/migrations/045_update_activity_log_constraint.sql`  
**Executed:** ✅ Successfully  
**Constraint Updated:** ✅ Verified with `pg_constraint` query  
**Transaction Rollback:** ✅ Working correctly

---

## 12. Expected Result

POST /api/candidates should now:

1. ✅ Acquire database client
2. ✅ Begin transaction
3. ✅ Insert candidate record
4. ✅ Insert skills
5. ✅ Insert work experience
6. ✅ Insert education
7. ✅ Insert activity log (with `candidate_created`)
8. ✅ Commit transaction
9. ✅ Release database client
10. ✅ Return 201 Created

**No constraint violations.**