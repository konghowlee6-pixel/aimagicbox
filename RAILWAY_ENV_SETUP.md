# Railway Environment Variables Setup

## ✅ Migration Complete: Gemini → DeepSeek

The AI MagicBox project has been successfully migrated from **Google Gemini API** to **DeepSeek API**.

---

## 🔑 Required Environment Variables for Railway

You need to add the following environment variable to your Railway project:

### 1. DEEPSEEK_API_KEY
```
DEEPSEEK_API_KEY=sk-8ba2b2c8a9c64a93bd54758815e2b553
```

### 2. RUNWARE_API_KEY (Already set, verify it's correct)
```
RUNWARE_API_KEY=nhfOlliGtbwKtXaxWZyXNcF0FAwlOLXO
```

---

## 📝 How to Add Environment Variables in Railway

1. **Go to your Railway project dashboard**
   - Visit: https://railway.app/dashboard

2. **Select your AI MagicBox project**

3. **Click on the service/deployment**

4. **Go to "Variables" tab**

5. **Add the new variable:**
   - Click "+ New Variable"
   - Variable name: `DEEPSEEK_API_KEY`
   - Value: `sk-8ba2b2c8a9c64a93bd54758815e2b553`
   - Click "Add"

6. **Remove old GEMINI_API_KEY (if exists)**
   - Find `GEMINI_API_KEY` in the variables list
   - Click the trash icon to delete it

7. **Verify RUNWARE_API_KEY exists**
   - Make sure `RUNWARE_API_KEY` is set to: `nhfOlliGtbwKtXaxWZyXNcF0FAwlOLXO`

8. **Redeploy** (Railway should auto-deploy after the git push)
   - If not, click "Deploy" button manually

---

## 🧪 Testing After Deployment

Once Railway finishes deploying, test the following endpoints:

### 1. Health Check
```bash
curl https://your-railway-domain.up.railway.app/api/diagnostics
```

Expected response should show:
```json
{
  "services": {
    "deepseek": "configured",
    "runware": "configured"
  }
}
```

### 2. Test Ad Copy Generation
Login to the dashboard and try:
- Generate Ad Copy
- Generate Headlines
- Any text generation feature

---

## 📊 What Changed

### Files Modified:
- ✅ `server/deepseek.ts` - New DeepSeek API integration (replaces gemini.ts)
- ✅ `server/routes.ts` - Updated all imports and API calls
- ✅ `package.json` - Added OpenAI SDK dependency
- ✅ Health check endpoints updated

### API Endpoints Using DeepSeek:
- `/api/generate/ad-copy` - Ad copy generation
- `/api/generate/brandkit` - Brand kit generation
- `/api/generate/text` - Generic text generation
- `/api/optimize-prompt` - Prompt optimization
- Various internal text generation functions

### Image/Video Generation:
- Still uses **Runware AI** (no changes needed)
- HiDream, FLUX models for image generation
- Video generation with Runware

---

## ⚠️ Important Notes

1. **DeepSeek API is OpenAI-compatible**
   - Uses the same SDK as OpenAI
   - Base URL: `https://api.deepseek.com`
   - Model: `deepseek-chat`

2. **Cost Tracking Updated**
   - API usage tracking changed from `gemini_text` to `deepseek_text`
   - Cost estimates remain the same in the database

3. **No Frontend Changes**
   - UI/UX remains exactly the same
   - Users won't notice any difference
   - Only the backend API provider changed

4. **Database**
   - No schema changes required
   - Existing data is preserved
   - API usage logs will show new endpoint names

---

## 🎉 Benefits of DeepSeek

- ✅ More cost-effective than Gemini
- ✅ OpenAI-compatible API (easier integration)
- ✅ Good performance for marketing copy generation
- ✅ No rate limiting issues
- ✅ Stable and reliable service

---

## 🔍 Troubleshooting

### If you see "deepseek: missing" in diagnostics:
1. Double-check the environment variable name: `DEEPSEEK_API_KEY` (case-sensitive)
2. Verify the API key starts with `sk-`
3. Redeploy the service after adding the variable

### If API calls fail with 401 error:
1. Check that the API key is correct
2. Ensure no extra spaces in the environment variable value
3. Try regenerating the API key from DeepSeek platform

### If deployment fails:
1. Check Railway build logs
2. Verify all dependencies installed correctly
3. Ensure `openai` package is in package.json

---

## 📞 Support

If you encounter any issues:
1. Check Railway deployment logs
2. Test the `/api/diagnostics` endpoint
3. Verify environment variables are set correctly
4. Contact support with error logs if needed

---

**Last Updated:** November 18, 2025
**Status:** ✅ Ready for Production Deployment
