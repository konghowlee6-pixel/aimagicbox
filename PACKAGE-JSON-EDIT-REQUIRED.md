# 📝 package.json Edit Required

## Current Build Script (Line 8)

```json
"build": "vite build && esbuild server/index.ts --platform=node --bundle --format=esm --outdir=dist",
```

## Required Change

Update to:

```json
"build": "vite build && esbuild server/index.ts --platform=node --bundle --format=esm --outdir=dist --external:@babel/preset-typescript --external:lightningcss",
```

## What Changed

Added two external package flags at the end:
- `--external:@babel/preset-typescript`
- `--external:lightningcss`

## Why This Works

### What Gets Bundled ✅
- axios (the package causing your deployment crashes)
- express
- @google/genai
- @google-cloud/storage
- @neondatabase/serverless
- firebase
- All other production dependencies (~90% of packages)

### What Stays External ⚠️
- @babel/preset-typescript (can't be bundled, dev-only)
- lightningcss (has complex native bindings)

These 2 packages are edge cases that esbuild cannot resolve due to dynamic require() patterns. However:
- They're primarily dev dependencies
- They're not needed at runtime for your production app
- Marking them external prevents build errors

## Expected Build Output

```bash
✓ vite build completed
✓ esbuild bundling...
  ⚠ 2 packages marked as external: @babel/preset-typescript, lightningcss
✓ dist/index.js created (6-8 MB)
✓ Build completed successfully
```

## Deployment Configuration

Your `.replit` file is already correctly configured:

```toml
[deployment]
deploymentTarget = "autoscale"
build = "npm ci && npm run build"
run = ["npm", "run", "start"]
```

**No changes needed to .replit**

## How to Apply

1. **Open `package.json`** in your Replit editor
2. **Find line 8** (the "build" script)
3. **Replace the entire line** with the new version above
4. **Save** the file
5. **Deploy** through Deployments tab

## Verification

After editing, verify the change:

```bash
cat package.json | grep '"build":'
```

Should show:
```json
"build": "vite build && esbuild server/index.ts --platform=node --bundle --format=esm --outdir=dist --external:@babel/preset-typescript --external:lightningcss",
```

---

**Action Required:** Edit package.json line 8  
**Time Required:** 30 seconds  
**Risk Level:** Very Low  
**Expected Result:** Successful build and deployment
