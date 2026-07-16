# Deployment Hotfix - MODULE_NOT_FOUND Error

## Issue
Backend deployment failed with MODULE_NOT_FOUND error for `level5HiringScore.js`:
```
Error: Cannot find module '../services/companyIntel/level5HiringScore'
```

## Root Cause
TypeScript only compiles `.ts` files to the `dist` folder. The `services/companyIntel` directory contains `.js` files that were not being copied during the build process.

## Fix Applied

### 1. Updated package.json Build Script
**File:** `backend/src/package.json`

**Changed:**
```json
"scripts": {
  "build": "tsc",
  ...
}
```

**To:**
```json
"scripts": {
  "build": "tsc && npm run copy-js-files",
  "copy-js-files": "mkdir -p dist/services/companyIntel && cp -r services/companyIntel/*.js dist/services/companyIntel/",
  ...
}
```

### 2. Verification
- ✅ Build now includes copy step
- ✅ `.js` files copied to `dist/services/companyIntel/`
- ✅ Build completes successfully

## Deployment Impact

### Before Deployment (Local)
1. Pull latest changes from git
2. Run `npm run build` - this will now copy .js files automatically
3. Deploy as usual

### On Production Server
1. SSH into production server
2. Pull latest changes: `git pull origin main`
3. Install dependencies: `npm install`
4. Build: `npm run build` - this will now copy .js files
5. Restart PM2: `pm2 restart resume-parser-backend`

## Files Modified
- `backend/src/package.json` - Updated build script

## Files Copied to Dist
The following .js files are now copied from `services/companyIntel/` to `dist/services/companyIntel/`:
- level1Analyzer.js
- level2CareerDetector.js
- level3AtsDetector.js
- level4AiAnalyzer.js
- level5HiringScore.js
- browserFetcher.js
- extractJobsDispatcher.js
- playwrightScraper.js

## Verification Command
```bash
# After build, verify files were copied
ls -la dist/services/companyIntel/
```

Expected output should list all .js files from the source directory.
