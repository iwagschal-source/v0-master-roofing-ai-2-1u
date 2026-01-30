# BTX Generation Fix - January 30, 2026

## Problem
BTX files downloaded from the frontend showed "error loading tool set" in Bluebeam.

## Root Cause
The Next.js API routes were calling the wrong backend URL:
- **WRONG:** `https://136.111.252.120` (port 443, goes through nginx, returns 405 error)
- **CORRECT:** `http://136.111.252.120:8000` (FastAPI direct, works)

## Files Changed

### 1. `app/api/ko/takeoff/[projectId]/btx/route.js`
```javascript
// BEFORE (broken):
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://136.111.252.120'

// AFTER (working):
const BACKEND_URL = process.env.BTX_BACKEND_URL || 'http://136.111.252.120:8000'
```

### 2. `app/api/ko/takeoff/[projectId]/config/route.js`
```javascript
// BEFORE (broken):
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://136.111.252.120'

// AFTER (working):
const BACKEND_URL = process.env.BACKEND_URL || 'http://136.111.252.120:8000'
```

Also removed the `fetchWithSSL` wrapper since we're using HTTP now.

## How to Verify Fix Works

```bash
# Test backend directly:
curl -X POST "http://136.111.252.120:8000/bluebeam/generate-btx" \
  -H "Content-Type: application/json" \
  -d '{"project_name":"Test","selected_items":["MR-003BU2PLY"],"locations":["ROOF"]}'

# Should return XML starting with:
# <?xml version='1.0' encoding='utf-8'?>
# <BluebeamRevuToolSet Version="1">
```

## Backup Files
Working versions backed up to:
- `docs/backups/btx_route_WORKING_20260130.js`
- `docs/backups/config_route_WORKING_20260130.js`

## Key Points
1. FastAPI backend runs on port **8000** (HTTP)
2. Nginx on port **443** (HTTPS) does NOT proxy to FastAPI for `/bluebeam/*` routes
3. Always use `http://136.111.252.120:8000` for BTX and config endpoints
