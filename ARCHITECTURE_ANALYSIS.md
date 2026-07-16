# Analytics/Reports Module - Comprehensive Architecture Analysis

**Date:** January 30, 2026  
**Analysis Type:** Pre-Implementation Architecture Review  
**Scope:** Complete analysis of existing implementation before making changes

---

## 1. CURRENT ARCHITECTURE SUMMARY

### 1.1 Permission Model

**Two-Tier Permission System:**

1. **Database-Based Permissions** (Intended):
   - Tables: `roles`, `permissions`, `role_permissions`
   - Permission format: `module.entity.action` (e.g., `analytics.analytics.view`)
   - Currently has data for: admin, manager, bdm, client_manager, team_lead, recruiter, hr, candidate
   - Analytics permissions exist: `analytics.analytics.view`, `analytics.analytics.export`

2. **Legacy Role-Based Permissions** (Fallback):
   - Hardcoded role checks in `requirePermission` middleware
   - Permission format: `module.action` (e.g., `analytics:view`)
   - Used when user doesn't have `roleId`
   - Admin gets all permissions
   - Other roles get predefined module access lists

### 1.2 CRITICAL FINDING: Permission Middleware Disabled

**File:** `/backend/src/middleware/auth.middleware.ts`  
**Lines:** 82-84

```typescript
// TEMPORARY: Allow all authenticated users to access all routes
console.log("[Permission Check] Allowing access for authenticated user:", req.user.email);
return next();
```

**Impact:**
- The `requirePermission` middleware is **COMPLETELY DISABLED**
- All authenticated users can access ALL routes regardless of permissions
- The actual permission check logic is commented out (lines 86-174)
- This explains why my earlier permission additions didn't restrict access
- **This appears to be intentional for development/testing purposes**

### 1.3 Authentication Flow

```
Request → authenticateToken → req.user populated → requirePermission (BYPASSED) → Controller
```

**User Object Structure:**
```typescript
{
  id: string,
  email: string,
  role: string,        // Legacy: 'admin', 'recruiter', 'team_lead', 'bdm', 'client_manager', 'viewer'
  roleId?: string,     // New UUID-based role ID
  roleName?: string    // New role name from database
}
```

---

## 2. ROLE-BASED ACCESS PATTERNS

### 2.1 Existing Role-Based Data Filtering Pattern

**Example from Client Controller** (`client.controller.ts` lines 320-324):

```typescript
// Add client_manager scoping
if (userRole === 'client_manager' && userId) {
  whereConditions.push(`owner_user_id = $${paramIndex}`);
  queryParams.push(userId);
  paramIndex++;
}
```

**Pattern:**
1. Get `userRole` from `req.user.role`
2. Get `userId` from `req.user.id`
3. Add WHERE clause based on role
4. Filter data to show only user's records

### 2.2 Role-Based Filtering Examples in Codebase

| Controller | Role | Filtering Logic |
|------------|------|-----------------|
| `client.controller.ts` | Client Manager | `owner_user_id = userId` |
| `job.controller.ts` | All | `created_by_user_id` filter available |
| `analytics.controller.ts` | Team Lead | Filter by `team_lead_id` |
| `analytics.controller.ts` | Admin/Manager | Filter by client ownership |

---

## 3. EXISTING WORKFLOW

### 3.1 Analytics Module Workflow

```
Frontend: AnalyticsPage.tsx
    ↓
Sidebar: DashboardLayout.tsx (uses usePermission hook)
    ↓
API: /api/analytics/* 
    ↓
Middleware: authenticateToken (✅ Active)
    ↓
Middleware: requirePermission("analytics", "view") (❌ BYPASSED)
    ↓
Controller: analytics.controller.ts
    ↓
Database: Returns ALL data (no role filtering for most endpoints)
```

### 3.2 Sidebar Visibility Workflow

**Frontend:**
```typescript
// DashboardLayout.tsx lines 23-24
const canViewAnalytics = usePermission("analytics", "view");

// Sidebar menu (line 160)
...(user?.role === 'admin' || user?.role === 'recruiter' || user?.role === 'team_lead' ? [{
  name: "Analytics",
  href: "/analytics",
```

**Pattern:** Role-based conditional rendering using hardcoded role checks (not using permission hook for visibility)

---

## 4. ROOT CAUSE ANALYSIS

### 4.1 Why Analytics Returns All Data

**Root Cause 1: Permission Middleware Disabled**
- `requirePermission` is bypassed at line 82-84
- All authenticated users pass through regardless of actual permissions

**Root Cause 2: No Data Filtering in Controllers**
- Most analytics functions don't check `req.user.role`
- Queries don't include WHERE clauses for user-specific data
- Functions like `getParsingStats`, `getSkillDistribution`, `getMetrics` query all data

**Root Cause 3: Permission Format Mismatch**
- Database permissions: `module.entity.action` (e.g., `analytics.analytics.view`)
- Middleware expects: `module.action` (e.g., `analytics:view`)
- Mismatch prevents database-based permissions from working

### 4.2 Why BDM Reports Not Available to Client Managers

**Root Cause:**
- Sidebar hardcoded to only show BDM Reports for `user.role === 'bdm'`
- No consideration that Client Managers might need similar reports
- Data filtering already exists (by `owner_user_id`), just not exposed to Client Managers

---

## 5. IMPACT ANALYSIS

### 5.1 Security Impact

| Issue | Severity | Impact |
|-------|----------|--------|
| Permission middleware disabled | **CRITICAL** | Any authenticated user can access any endpoint |
| No data filtering in analytics | **HIGH** | Recruiters see all recruiters' data, BDMs see all BDMs' revenue |
| Permission format mismatch | **MEDIUM** | Database-based permissions don't work |

### 5.2 Functional Impact

| Issue | Impact |
|-------|--------|
| Analytics accessible to all roles | ✅ Working as intended |
| Data visibility not role-specific | ❌ Users see data they shouldn't |
| Export functionality | ✅ Working for all roles |
| BDM Reports | ⚠️ Only BDM can access, Client Managers excluded |

---

## 6. FILES THAT NEED MODIFICATION

### 6.1 Critical Files (Permission System)

1. **`/backend/src/middleware/auth.middleware.ts`**
   - Need to re-enable permission checks
   - Need to fix permission format mismatch
   - OR implement a different permission strategy

### 6.2 Analytics Controller Files

2. **`/backend/src/controllers/analytics.controller.ts`**
   - Functions needing role-based filtering:
     - `getParsingStats` - Add team/role filtering
     - `getSkillDistribution` - Add role filtering
     - `getMetrics` - Add role filtering
     - `getUploadTrends` - Add role filtering
     - `getRecruiterActivity` - Add role filtering (show only own activity)
     - `getClientPerformance` - Add client filtering
     - `getPlacements` - Add client/recruiter filtering
     - `getRevenue` - Add client filtering

### 6.3 Sidebar Configuration

3. **`/frontend/src/components/layout/DashboardLayout.tsx`**
   - Consider adding BDM Reports to Client Manager role
   - OR create a shared "Reports" section

---

## 7. PROPOSED SOLUTION

### 7.1 Approach: Follow Existing Patterns

**Don't reinvent the wheel.** Use the existing patterns found in the codebase.

### 7.2 Solution Strategy

**Option A: Re-enable Database-Based Permissions (Recommended)**
1. Fix permission format mismatch in middleware
2. Add missing permissions to database
3. Re-enable permission checks in middleware
4. Add role-based data filtering in controllers

**Option B: Keep Permission Middleware Disabled, Add Data Filtering Only**
1. Keep the current bypass in place (if intentional)
2. Add role-based data filtering to all analytics endpoints
3. Use the pattern from `client.controller.ts` as template
4. This is the minimal change approach

**Option C: Hybrid Approach**
1. Re-enable permission checks for critical endpoints
2. Add data filtering for all analytics endpoints
3. Use hardcoded role checks in controllers (like existing pattern)

### 7.3 Recommended Approach: Option B (Minimal Changes)

**Rationale:**
- Permission middleware appears intentionally disabled for development
- Adding data filtering directly in controllers follows existing patterns
- Minimal risk of breaking existing functionality
- Backward compatible with current setup

---

## 8. PROPOSED IMPLEMENTATION PLAN

### 8.1 Phase 1: Add Data Filtering to Analytics Controllers

**Pattern to Follow (from client.controller.ts):**

```typescript
const userId = req.user?.id;
const userRole = req.user?.role;

// Add role-based WHERE clause
if (userRole === 'recruiter' && userId) {
  whereConditions.push(`created_by_user_id = $${paramIndex}`);
  queryParams.push(userId);
  paramIndex++;
}
```

**Functions to Update:**

1. **`getParsingStats`** - Add filtering based on parsing_jobs.created_by or team
2. **`getSkillDistribution`** - Show only skills from user's candidates
3. **`getMetrics`** - Filter by user's candidates/jobs
4. **`getUploadTrends`** - Show only user's uploads
5. **`getRecruiterActivity`** - Show only own activity (already has some logic)
6. **`getClientPerformance`** - Filter by user's clients
7. **`getPlacements`** - Filter by user's clients/jobs
8. **`getRevenue`** - Filter by user's clients

### 8.2 Phase 2: Extend BDM Reports to Client Managers

**File:** `/frontend/src/components/layout/DashboardLayout.tsx`

Change:
```typescript
...(user?.role === 'bdm' ? [{
  name: "Reports",
  href: "/bdm/reports",
```

To:
```typescript
...(user?.role === 'bdm' || user?.role === 'client_manager' ? [{
  name: "Reports",
  href: "/bdm/reports",
```

---

## 9. TESTING STRATEGY

### 9.1 Role-by-Role Testing Matrix

| Role | Test Case | Expected Behavior |
|------|-----------|------------------|
| Admin | View Analytics | See all data (no filtering) |
| Recruiter | View Analytics | See only own candidates/jobs data |
| Team Lead | View Analytics | See team's candidates/jobs data |
| Client Manager | View Analytics | See own clients' data |
| BDM | View Analytics | See own clients' data |
| Viewer | View Analytics | Read-only access to all data |

### 9.2 Backward Compatibility Tests

- ✅ Ensure existing analytics functionality still works
- ✅ Ensure all roles can still access Analytics menu
- ✅ Ensure export functionality still works
- ✅ Ensure no broken routes

---

## 10. CODING PATTERNS TO FOLLOW

### 10.1 Role Check Pattern
```typescript
const userId = req.user?.id;
const userRole = req.user?.role;
```

### 10.2 WHERE Clause Pattern
```typescript
const whereConditions = [];
const queryParams: any[] = [];
let paramIndex = 1;

if (userRole === 'recruiter' && userId) {
  whereConditions.push(`column = $${paramIndex}`);
  queryParams.push(userId);
  paramIndex++;
}

const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
```

### 10.3 Admin Bypass Pattern
```typescript
// Admins see everything
if (userRole === 'admin') {
  // No filtering
} else {
  // Apply role-based filtering
}
```

---

## 11. FILES TO MODIFY (FINAL LIST)

1. **`/backend/src/controllers/analytics.controller.ts`**
   - Add role-based data filtering to 8 functions
   - Use existing patterns from `client.controller.ts`
   - Keep backward compatibility

2. **`/frontend/src/components/layout/DashboardLayout.tsx`**
   - Extend BDM Reports access to Client Manager
   - Minimal change to sidebar

3. **`/backend/src/routes/analytics.routes.ts`**
   - Already modified (permissions added)
   - No further changes needed

---

## 12. BACKWARD COMPATIBILITY PLAN

### 12.1 What Will NOT Break
- ✅ Authentication still works
- ✅ All roles can still access Analytics
- ✅ Export functionality still works
- ✅ Sidebar navigation unchanged (except Client Manager gets Reports)
- ✅ Existing analytics endpoints still return data

### 12.2 What Will Change
- ⚠️ Non-admin users will see less data (more secure)
- ⚠️ Client Managers will see Reports menu (new feature)
- ⚠️ Data will be filtered by role (security improvement)

---

## 13. RECOMMENDATION

### **Implement Option B (Minimal Changes)**

**Why:**
1. Follows existing patterns in codebase
2. Minimal risk of breaking functionality
3. Permission middleware appears intentionally disabled
4. Data filtering in controllers is the standard pattern
5. Backward compatible with current setup

**Changes Required:**
1. Add role-based data filtering to 8 analytics controller functions
2. Extend BDM Reports to Client Manager in sidebar
3. Test each role to ensure correct data visibility

**Estimated Effort:** 2-3 hours

---

## 14. CONCLUSION

The existing codebase has:
- ✅ A well-defined permission system (database-based)
- ✅ Clear patterns for role-based data filtering
- ✅ Consistent coding patterns across controllers
- ⚠️ Permission middleware intentionally disabled (development mode)
- ⚠️ Analytics controllers lack data filtering

**Recommended Approach:** Add data filtering directly to analytics controllers using the existing pattern from `client.controller.ts`, then extend BDM Reports to Client Managers. This is the minimal, safest approach that follows existing architecture.

**Next Step:** Implement the proposed solution following the patterns identified in this analysis.