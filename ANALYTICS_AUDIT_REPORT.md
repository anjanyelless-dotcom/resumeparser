# Analytics/Reports Module - Role-Based Access Audit Report

**Date:** January 30, 2026  
**Auditor:** Devin AI  
**Scope:** Complete role-based access and functionality review for Reports/Analytics module

---

## Executive Summary

### Key Findings:
1. ✅ **No "Specific Reports" module exists** - Analytics serves as the primary reports module
2. ✅ **Analytics menu is visible** for all 6 roles (Admin, Recruiter, Team Lead, Client Manager, BDM, Viewer)
3. ⚠️ **Permission middleware was missing** - Now added to all analytics endpoints
4. ❌ **Partial role-based data filtering** - Only some endpoints have role-based data filtering
5. ✅ **BDM Reports exists** but is BDM-specific (Client Performance Reports)
6. ⚠️ **Client Managers cannot access BDM Reports** - May need access

---

## 1. Analytics Module Access Validation

### Frontend Sidebar Configuration

| Role | Analytics Menu Visible? | Route | Permission Check |
|------|------------------------|-------|------------------|
| Admin | ✅ Yes | `/analytics` | `canViewAnalytics` |
| Recruiter | ✅ Yes | `/analytics` | `canViewAnalytics` |
| Team Lead | ✅ Yes | `/analytics` | `canViewAnalytics` |
| Client Manager | ✅ Yes | `/analytics` | `canViewAnalytics` |
| BDM | ✅ Yes | `/analytics` | `canViewAnalytics` |
| Viewer | ✅ Yes | `/analytics` | `canViewAnalytics` |

**Status:** ✅ All roles have Analytics menu visibility

---

## 2. Backend API Permission Enforcement

### Changes Made:

**File Modified:** `/backend/src/routes/analytics.routes.ts`

**Before:**
- All endpoints only had `authenticateToken` middleware
- No role-based permission checks
- Security risk: Any authenticated user could access all analytics data

**After:**
- Added `requirePermission("analytics", "view")` to all endpoints
- Endpoints now properly secured with role-based access

### Endpoints Updated:

| Endpoint | Permission Added | Status |
|----------|------------------|--------|
| `/parsing-stats` | ✅ `analytics:view` | Fixed |
| `/skill-distribution` | ✅ `analytics:view` | Fixed |
| `/metrics` | ✅ `analytics:view` | Fixed |
| `/upload-trends` | ✅ `analytics:view` | Fixed |
| `/recruiter-activity` | ✅ `analytics:view` | Fixed |
| `/export/csv` | ✅ `analytics:view` | Fixed |
| `/export/pdf` | ✅ `analytics:view` | Fixed |
| `/overview` | ✅ `analytics:view` | Fixed |
| `/client-performance` | ✅ `analytics:view` | Fixed |
| `/placements` | ✅ `analytics:view` | Fixed |
| `/revenue` | ✅ `analytics:view` | Fixed |
| `/team-closures` | ✅ `team:view_kpis` | Already secured |
| `/submission-success-rate` | ✅ `team:view_kpis` | Already secured |
| `/new-clients-acquired` | ✅ `reports:view_own` | Already secured |
| `/revenue-generated` | ✅ `reports:view_own` | Already secured |
| `/open-opportunities` | ✅ `reports:view_own` | Already secured |
| `/client-manager-summary` | ✅ `analytics:view` | Fixed |

**Status:** ✅ All analytics endpoints now have proper permission middleware

---

## 3. Data Visibility Validation

### Controllers with Role-Based Filtering:

| Function | Has Role Filtering | Notes |
|----------|-------------------|-------|
| `getTeamClosures` | ✅ Yes | Team leads see their team, admins see all |
| `getSubmissionSuccessRate` | ✅ Yes | Team leads see their team, admins see all |
| `getNewClientsAcquired` | ✅ Yes | Non-admins see own clients, admins see all |
| `getRevenueGenerated` | ✅ Yes | Non-admins see own clients, admins see all |
| `getOpenOpportunities` | ✅ Yes | Non-admins see own clients, admins see all |
| `getClientManagerSummary` | ✅ Yes | Client managers see their clients |
| `getPlacements` | ❌ No | Returns all placements |
| `getRevenue` | ❌ No | Returns all revenue |
| `getClientPerformance` | ❌ No | Returns all client performance |
| `getParsingStats` | ❌ No | Returns all parsing stats |
| `getSkillDistribution` | ❌ No | Returns all skills |
| `getMetrics` | ❌ No | Returns all metrics |
| `getUploadTrends` | ❌ No | Returns all upload trends |
| `getRecruiterActivity` | ❌ No | Returns all recruiter activity |

**Status:** ⚠️ **Partial** - Some endpoints have filtering, many don't

---

## 4. Reports Module Assessment

### Current State:

1. **Analytics Module** (`/analytics`)
   - Purpose: General analytics and metrics
   - Available to: All 6 roles
   - Status: ✅ Functional with proper permissions

2. **BDM Reports Module** (`/bdm/reports`)
   - Purpose: Client performance metrics
   - Available to: BDM only
   - Status: ⚠️ BDM-specific, may need to extend to Client Managers

### Gap Analysis:

| Requirement | Current State | Gap |
|-------------|---------------|-----|
| General analytics for all roles | ✅ Analytics module | None |
| Role-specific data filtering | ⚠️ Partial | Many endpoints lack filtering |
| Client performance reports | ⚠️ BDM-only | Client Managers don't have access |
| Custom report builder | ❌ Not implemented | Missing feature |
| Export functionality | ✅ Available | None |

**Recommendation:** Analytics module serves as the primary Reports module. Consider renaming "Analytics" to "Reports" for clarity.

---

## 5. Sidebar and Navigation Audit

### Complete Sidebar Menu by Role:

#### Admin:
- ✅ Dashboard
- ✅ Candidates
- ✅ Upload Resume
- ✅ Jobs
- ✅ Matching
- ✅ JD Matching (NEW)
- ✅ Labeling
- ✅ Analytics
- ✅ Settings
- ✅ Users
- ✅ Clients
- ✅ Audit Logs
- ✅ Roles & Permissions

#### Recruiter:
- ✅ Dashboard
- ✅ Candidates
- ✅ Upload Resume
- ✅ Jobs
- ✅ Matching
- ✅ JD Matching (NEW)
- ✅ Labeling
- ✅ Analytics
- ✅ Settings
- ✅ My Requirements

#### Team Lead:
- ✅ Dashboard
- ✅ Candidates
- ✅ Upload Resume
- ✅ Jobs
- ✅ Matching
- ✅ JD Matching (NEW)
- ✅ Labeling
- ✅ Analytics
- ✅ Settings

#### Client Manager:
- ✅ Dashboard (Client Manager)
- ✅ Requirements
- ✅ Candidate Submissions
- ✅ Client Pipeline
- ✅ Analytics

#### BDM:
- ✅ Dashboard (BDM)
- ✅ Client Pipeline
- ✅ Candidates
- ✅ Submissions
- ✅ Reports (BDM-specific)
- ✅ Analytics

#### Viewer:
- ✅ Dashboard
- ✅ Candidates
- ✅ Jobs
- ✅ Analytics

**Status:** ✅ All sidebar configurations are correct, no broken routes

---

## 6. Role-by-Role Access Matrix

| Feature | Admin | Recruiter | Team Lead | Client Manager | BDM | Viewer |
|---------|-------|-----------|-----------|----------------|-----|--------|
| Analytics Menu | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Analytics Page | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Parsing Stats | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Skill Distribution | ⚠️ All | ⚠️ All | ⚠️ All | ⚠️ All | ⚠️ All | ⚠️ All |
| Metrics | ⚠️ All | ⚠️ All | ⚠️ All | ⚠️ All | ⚠️ All | ⚠️ All |
| Upload Trends | ⚠️ All | ⚠️ All | ⚠️ All | ⚠️ All | ⚠️ All | ⚠️ All |
| Recruiter Activity | ⚠️ All | ⚠️ All | ⚠️ All | ⚠️ All | ⚠️ All | ⚠️ All |
| Export CSV | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Export PDF | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Client Performance | ⚠️ All | ⚠️ All | ⚠️ All | ⚠️ All | ⚠️ All | ⚠️ All |
| Placements | ⚠️ All | ⚠️ All | ⚠️ All | ⚠️ All | ⚠️ All | ⚠️ All |
| Revenue | ⚠️ All | ⚠️ All | ⚠️ All | ⚠️ All | ⚠️ All | ⚠️ All |
| Team Closures | ✅ Team Only | ❌ No Access | ✅ Own Team | ❌ No Access | ❌ No Access | ❌ No Access |
| New Clients | ✅ All | ⚠️ Own Clients | ⚠️ Own Clients | ⚠️ Own Clients | ⚠️ Own Clients | ❌ No Access |
| Revenue Generated | ✅ All | ⚠️ Own Clients | ⚠️ Own Clients | ⚠️ Own Clients | ⚠️ Own Clients | ❌ No Access |
| Open Opportunities | ✅ All | ⚠️ Own Clients | ⚠️ Own Clients | ⚠️ Own Clients | ⚠️ Own Clients | ❌ No Access |
| BDM Reports | ❌ No Access | ❌ No Access | ❌ No Access | ❌ No Access | ✅ Yes | ❌ No Access |

**Legend:**
- ✅ = Properly secured with role-based access
- ⚠️ = Accessible but returns all data (security concern)
- ❌ = No access or not applicable

---

## 7. Security Concerns Identified

### Critical Issues:

1. **Data Leakage in Analytics Endpoints**
   - **Severity:** HIGH
   - **Impact:** Recruiters can see all recruiters' activity, BDMs can see all BDMs' revenue, etc.
   - **Affected Endpoints:** `getParsingStats`, `getSkillDistribution`, `getMetrics`, `getUploadTrends`, `getRecruiterActivity`, `getClientPerformance`, `getPlacements`, `getRevenue`
   - **Recommendation:** Implement role-based WHERE clauses in SQL queries

2. **Missing Role-Based Filtering**
   - **Severity:** MEDIUM
   - **Impact:** Users cannot see only their relevant data
   - **Affected Functions:** 8 out of 17 analytics functions
   - **Recommendation:** Add user role checks and filter queries accordingly

### Low Priority Issues:

3. **BDM Reports Not Available to Client Managers**
   - **Severity:** LOW
   - **Impact:** Client Managers cannot view their own client performance reports
   - **Recommendation:** Extend BDMReportsPage access to Client Managers

---

## 8. Files Modified

### Modified Files:
1. `/backend/src/routes/analytics.routes.ts`
   - Added `requirePermission("analytics", "view")` to 12 endpoints
   - Changed `/client-manager-summary` from `authenticateToken` to `requirePermission("analytics", "view")`

### Files Reviewed (No Changes):
1. `/frontend/src/components/layout/DashboardLayout.tsx` - Sidebar audit
2. `/frontend/src/pages/AnalyticsPage.tsx` - Page review
3. `/frontend/src/pages/BDMReportsPage.tsx` - BDM reports review
4. `/backend/src/controllers/analytics.controller.ts` - Controller review

---

## 9. Remaining Gaps

### High Priority:
1. **Implement role-based data filtering** for analytics endpoints that return all data
2. **Add user-specific filtering** for Recruiter, Team Lead, and Client Manager roles

### Medium Priority:
1. **Extend BDM Reports to Client Managers** - They need to see their client performance
2. **Consider renaming "Analytics" to "Reports"** for clarity

### Low Priority:
1. **Create custom report builder** - Advanced feature for specific reporting needs
2. **Add more export formats** - Excel, etc.

---

## 10. Final Compliance Status

### Access Control:
- ✅ Authentication: All endpoints require authentication
- ✅ Authorization: All endpoints now have permission middleware
- ⚠️ Data Filtering: Partial - needs improvement

### Functionality:
- ✅ Menu Visibility: All roles can see Analytics menu
- ✅ Page Access: Analytics page loads for all roles
- ✅ Export: CSV and PDF export working
- ⚠️ Data Visibility: Some endpoints show unauthorized data

### Overall Status:
**⚠️ PARTIALLY COMPLIANT**

The Analytics/Reports module is functionally accessible to all intended roles with proper permission middleware. However, **data visibility needs improvement** to ensure users only see data they are authorized to access.

---

## Recommendations

### Immediate Actions (High Priority):
1. Implement role-based WHERE clauses in analytics controllers
2. Add user ID filtering for Recruiter-specific metrics
3. Add team lead filtering for Team Lead-specific metrics
4. Add client filtering for Client Manager and BDM-specific metrics

### Short-term Actions (Medium Priority):
1. Extend BDM Reports access to Client Managers
2. Add unit tests for role-based data filtering
3. Document data visibility rules for each role

### Long-term Actions (Low Priority):
1. Consider creating a dedicated "Reports" module with custom report builder
2. Add more granular permissions (e.g., `analytics:view_all`, `analytics:view_own`)
3. Implement audit logging for analytics access

---

**Report Generated:** January 30, 2026  
**Auditor:** Devin AI  
**Status:** ⚠️ Partially Compliant - Data filtering needs implementation