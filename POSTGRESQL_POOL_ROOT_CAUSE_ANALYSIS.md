# PostgreSQL Connection Pool Lifecycle - Root Cause Analysis

## Current Error
```
Error: Cannot use a pool after calling end on the pool
```

## Stack Trace
```
getClient()
→ pool.connect()
→ Error: Cannot use a pool after calling end on the pool
```

---

## 1. OCCURRENCES OF pool.end()

### ✅ CORRECT USAGE (Standalone Scripts)

| File | Line | Context | Status |
|------|------|---------|--------|
| `analyze_update_issue.js` | 118 | Standalone diagnostic script | ✅ Correct |
| `check_education_table.js` | 60 | Standalone diagnostic script | ✅ Correct |
| `check_candidate_skills_table.js` | 70 | Standalone diagnostic script | ✅ Correct |
| `check_real_columns.js` | 101 | Standalone diagnostic script | ✅ Correct |
| `examine_candidate_data.js` | 119 | Standalone diagnostic script | ✅ Correct |
| `check_enum_values.js` | 61 | Standalone diagnostic script | ✅ Correct |
| `fix_candidates_query.js` | 69 | Standalone diagnostic script | ✅ Correct |
| `check_database_tables.js` | 52 | Standalone diagnostic script | ✅ Correct |
| `scripts/run_setup.ts` | 26 | Database setup script | ✅ Correct |
| `scripts/reset_db.ts` | 17 | Database reset script | ✅ Correct |
| `scripts/list_tables.ts` | 21 | Database listing script | ✅ Correct |
| `scripts/describe_schema.ts` | 25 | Schema description script | ✅ Correct |
| `scripts/check_db_tables.ts` | 28 | Database check script | ✅ Correct |
| `scripts/apply_migration.ts` | 20 | Migration script | ✅ Correct |
| `scripts/apply_all_migrations.ts` | 86 | Migration script | ✅ Correct |

### ⚠️ POTENTIAL ISSUE (Application Server)

| File | Line | Context | Status |
|------|------|---------|--------|
| `server.ts` | 57 | SIGTERM handler | ⚠️ Triggered by ts-node-dev restart |
| `server.ts` | 68 | SIGINT handler | ⚠️ Triggered by ts-node-dev restart |

---

## 2. DATABASE/DB.TS ANALYSIS

### Current Implementation ✅ CORRECT

```typescript
const pool = new Pool(poolConfig);  // Singleton pool created once

export const getClient = (): Promise<PoolClient> => pool.connect();
// ✅ Correct - borrows client from pool

export default pool;
// ✅ Correct - exports singleton
```

### Verification Results

- ✅ Pool is created once as a singleton
- ✅ `getClient()` never creates/destroys pools
- ✅ Only calls `pool.connect()` to borrow clients
- ✅ No `client.end()` or `db.end()` calls in src directory
- ✅ No pool recreation logic

---

## 3. SERVER.TS ANALYSIS

### Shutdown Handlers

```typescript
// Line 54-63: SIGTERM handler
process.on("SIGTERM", async () => {
  console.log("🔄 SIGTERM received, shutting down gracefully");
  try {
    await pool.end();  // ⚠️ This closes the pool
    console.log("✅ All services shut down successfully");
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
  }
  process.exit(0);
});

// Line 65-74: SIGINT handler
process.on("SIGINT", async () => {
  console.log("🔄 SIGINT received, shutting down gracefully");
  try {
    await pool.end();  // ⚠️ This closes the pool
    console.log("✅ All services shut down successfully");
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
  }
  process.exit(0);
});
```

### Status: ✅ CORRECT for production shutdown
These handlers are correctly implemented for graceful shutdown.

---

## 4. ROOT CAUSE IDENTIFICATION

### 🎯 PRIMARY CAUSE: ts-node-dev Auto-Restart

**Evidence:**

1. **package.json Line 10:**
   ```json
   "dev": "ts-node-dev --respawn --transpile-only server.ts"
   ```

2. **ts-node-dev Behavior:**
   - `--respawn` flag enables automatic restart on file changes
   - When files are modified, ts-node-dev sends SIGTERM to the current process
   - The SIGTERM handler in server.ts calls `pool.end()`
   - If a request is in progress, the pool gets closed mid-request
   - Subsequent requests fail with "Cannot use a pool after calling end on the pool"

3. **Observed Logs:**
   ```
   [INFO] 13:13:19 Restarting: candidate.controller.ts has been modified
   🔄 SIGTERM received, shutting down gracefully
   Error: Cannot use a pool after calling end on the pool
   ```

### 📊 Timeline of Events

```
1. Developer modifies candidate.controller.ts
   ↓
2. ts-node-dev detects file change
   ↓
3. ts-node-dev sends SIGTERM to restart server
   ↓
4. SIGTERM handler in server.ts executes
   ↓
5. pool.end() is called → PostgreSQL pool closed
   ↓
6. HTTP request from frontend arrives (bulk upload in progress)
   ↓
7. getClient() tries to acquire client from closed pool
   ↓
8. Error: Cannot use a pool after calling end on the pool
```

---

## 5. INCORRECT USAGE CHECK

### ✅ NO INCORRECT USAGE FOUND

Searched for:
- ❌ `pool.end()` in controllers → NOT FOUND
- ❌ `pool.end()` in services → NOT FOUND
- ❌ `pool.end()` in repositories → NOT FOUND
- ❌ `pool.end()` in request handlers → NOT FOUND
- ❌ `client.end()` → NOT FOUND
- ❌ `db.end()` → NOT FOUND

**Result:** The code architecture is correct. No incorrect pool.end() calls in application code.

---

## 6. DIAGNOSTIC LOGGING ADDED

### database/db.ts

Added comprehensive logging:
```typescript
✅ POOL CREATED - PostgreSQL pool initialized
🔵 POOL CONNECT REQUEST - Attempting to acquire client
✅ POOL CLIENT ACQUIRED - Client successfully acquired
🟢 POOL CLIENT RELEASED - Client returned to pool
⚠️ POOL END CALLED - Pool being terminated (with stack trace)
🔗 POOL CONNECT - New client connected
🔌 POOL REMOVE - Client removed from pool
```

### server.ts

Added stack trace logging:
```typescript
🔄 SIGTERM received, shutting down gracefully
SIGTERM STACK TRACE - Shows where SIGTERM was sent from
```

---

## 7. ARCHITECTURE VERIFICATION

### ✅ Current Pattern is CORRECT

**Application Startup:**
```typescript
const pool = new Pool(...)  // ✅ Single pool created once
export default pool         // ✅ Exported as singleton
```

**Application Runtime:**
```typescript
const client = await pool.connect()  // ✅ Borrow client
try {
  // ... operations
} finally {
  client.release()  // ✅ Return client to pool
}
```

**Application Shutdown Only:**
```typescript
process.on("SIGTERM", async () => {
  await pool.end()  // ✅ Only during shutdown
})
```

---

## 8. SOLUTIONS

### 🔧 SOLUTION 1: Disable Auto-Restart During Testing (Recommended)

**File:** `backend/src/package.json`

**Change:**
```json
// Before:
"dev": "ts-node-dev --respawn --transpile-only server.ts"

// After:
"dev": "ts-node-dev --transpile-only server.ts"
```

**Effect:** Removes `--respawn` flag, preventing automatic restarts during file changes.

**When to use:** During development and testing of bulk upload functionality.

---

### 🔧 SOLUTION 2: Use nodemon with ignore patterns

**File:** Create `backend/nodemon.json`

**Content:**
```json
{
  "watch": ["src"],
  "ext": "ts",
  "ignore": ["src/controllers/*.ts", "src/**/*.test.ts"],
  "exec": "ts-node src/server.ts"
}
```

**Effect:** Prevents restarts when controller files change.

---

### 🔧 SOLUTION 3: Run without auto-restart during testing

**Command:**
```bash
# Instead of: npm run dev
# Use:
npx ts-node --transpile-only src/server.ts
```

**Effect:** No auto-restart, pool stays alive during testing.

---

### 🔧 SOLUTION 4: Add Connection Pool Health Check

**Add to database/db.ts:**
```typescript
export const isPoolHealthy = (): boolean => {
  return pool.totalCount > 0 && !pool.ending;
};
```

**Add error recovery:**
```typescript
export const getClient = (): Promise<PoolClient> => {
  if (pool.ending) {
    throw new Error("Connection pool is shutting down");
  }
  return pool.connect();
};
```

---

## 9. BEFORE AND AFTER FLOW

### BEFORE (Current Problem)

```
1. Bulk upload starts
   ↓
2. Developer modifies file
   ↓
3. ts-node-dev sends SIGTERM
   ↓
4. pool.end() called → Pool closed
   ↓
5. Request arrives → pool.connect() fails
   ↓
6. Error: Cannot use a pool after calling end on the pool
```

### AFTER (Solution Applied)

```
1. Bulk upload starts
   ↓
2. Developer modifies file
   ↓
3. ts-node-dev does NOT restart (--respawn removed)
   ↓
4. Pool remains open
   ↓
5. Request arrives → pool.connect() succeeds
   ↓
6. Candidate saved successfully
```

---

## 10. DELIVERABLES

### ✅ Exact File Containing Incorrect pool.end()

**File:** `backend/src/server.ts`

**Lines:** 57 and 68

**Why pool was closed:** SIGTERM signal sent by ts-node-dev during auto-restart

**Root Cause:** ts-node-dev's `--respawn` flag triggers automatic restart on file changes, which sends SIGTERM and closes the pool mid-request

---

### ✅ Correct Fix Applied

**File Modified:** `backend/src/package.json`

**Change:**
```json
// Line 10: Remove --respawn flag
"dev": "ts-node-dev --transpile-only server.ts"
```

**Alternative:** Run without auto-restart during testing:
```bash
npx ts-node --transpile-only src/server.ts
```

---

### ✅ Additional Diagnostic Logging Added

**Files Modified:**
1. `backend/src/database/db.ts` - Added pool lifecycle logging
2. `backend/src/server.ts` - Added SIGTERM/SIGINT stack trace logging

**Logs Added:**
- POOL CREATED
- POOL CONNECT REQUEST
- POOL CLIENT ACQUIRED
- POOL CLIENT RELEASED
- POOL END CALLED (with stack trace)
- SIGTERM STACK TRACE
- SIGINT STACK TRACE

---

## 11. RECOMMENDATION

**For Development/Testing:**
1. Remove `--respawn` flag from package.json
2. Or run directly with `npx ts-node --transpile-only src/server.ts`
3. Manually restart server only when needed

**For Production:**
- Keep SIGTERM/SIGINT handlers (they are correct)
- No changes needed for production deployment

---

## 12. VERIFICATION

After applying the fix:

1. Start backend: `npx ts-node --transpile-only src/server.ts`
2. Start bulk upload
3. Modify controller file (if needed)
4. Verify pool remains open
5. Verify bulk upload completes successfully

**Expected Logs:**
```
✅ POOL CREATED
🔵 POOL CONNECT REQUEST
✅ POOL CLIENT ACQUIRED
[... candidate creation ...]
🟢 POOL CLIENT RELEASED
✅ Candidate saved successfully
```

**No More:**
```
⚠️ POOL END CALLED (mid-request)
Error: Cannot use a pool after calling end on the pool
```