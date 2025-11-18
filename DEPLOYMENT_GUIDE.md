# AI MagicBox - Final Deployment Guide

## 🎯 Current Status

✅ **Local Development:** All features working
✅ **Code Pushed:** GitHub repository updated
⏳ **Railway Deployment:** Waiting for environment variables

---

## 🔑 Required Railway Environment Variables

You need to add **THREE** API keys to Railway:

### 1. DEEPSEEK_API_KEY (Text Generation)
```
DEEPSEEK_API_KEY=sk-8ba2b2c8a9c64a93bd54758815e2b553
```
**Used for:**
- Ad copy generation
- Headlines generation
- Brand kit creation
- Text rewriting
- Prompt enhancement
- Campaign strategies

### 2. GEMINI_API_KEY (Image Analysis / Vision)
```
GEMINI_API_KEY=AIzaSyA2PP-C-SlNs7vNyvsIXnFBZVFzsukOzQ8
```
**Used for:**
- ✨ **QuickClip Magic Wand** (analyze images → suggest animations)
- Visual text placement analysis
- Caption script generation from images
- Promo scene descriptions

### 3. RUNWARE_API_KEY (Image/Video Generation)
```
RUNWARE_API_KEY=nhfOlliGtbwKtXaxWZyXNcF0FAwlOLXO
```
**Used for:**
- Image generation (HiDream, FLUX models)
- Video generation
- Background removal
- Image upscaling

---

## 📝 How to Add Environment Variables in Railway

### Step-by-Step Instructions:

1. **Login to Railway**
   - Go to: https://railway.app/dashboard

2. **Select Your Project**
   - Find "AI MagicBox" or your project name

3. **Go to Variables Tab**
   - Click on your service/deployment
   - Click "Variables" in the left sidebar

4. **Add Each Variable:**
   
   **Variable 1:**
   - Click "+ New Variable"
   - Name: `DEEPSEEK_API_KEY`
   - Value: `sk-8ba2b2c8a9c64a93bd54758815e2b553`
   - Click "Add"

   **Variable 2:**
   - Click "+ New Variable"
   - Name: `GEMINI_API_KEY`
   - Value: `AIzaSyA2PP-C-SlNs7vNyvsIXnFBZVFzsukOzQ8`
   - Click "Add"

   **Variable 3:**
   - Click "+ New Variable"
   - Name: `RUNWARE_API_KEY`
   - Value: `nhfOlliGtbwKtXaxWZyXNcF0FAwlOLXO`
   - Click "Add"

5. **Verify All Variables**
   - Make sure all three are listed
   - Check for typos in variable names (case-sensitive!)
   - Check for extra spaces in values

6. **Redeploy**
   - Railway should auto-deploy after git push
   - If not, click "Deploy" button manually

---

## 🧪 Testing After Deployment

### 1. Check Diagnostics Endpoint

```bash
curl https://your-railway-domain.up.railway.app/api/diagnostics
```

**Expected Response:**
```json
{
  "status": "operational",
  "services": {
    "deepseek": "configured",
    "gemini": "configured",
    "runware": "configured"
  }
}
```

### 2. Test Dashboard Features

Login to your dashboard and test:

**Text Generation (DeepSeek):**
- ✅ Generate Ad Copy
- ✅ Generate Headlines
- ✅ Shuffle button for text variations

**Image Analysis (Gemini Vision):**
- ✅ QuickClip Magic Wand button
- ✅ Visual text placement
- ✅ Caption generation

**Media Generation (Runware):**
- ✅ Generate images
- ✅ Generate videos
- ✅ Background removal

### 3. Specific Test: Magic Wand Feature

1. Go to **QuickClip Video Generator**
2. Upload an image (or use URL input)
3. Click the **"Magic Wand"** button
4. Should generate animation prompt automatically
5. Should NOT show "Failed to generate prompt" error

---

## 📊 API Usage Summary

| Feature | API | Cost | Status |
|---------|-----|------|--------|
| Ad Copy | DeepSeek | Low | ✅ |
| Headlines | DeepSeek | Low | ✅ |
| Text Rewriting | DeepSeek | Low | ✅ |
| Magic Wand | Gemini Vision | Medium | ✅ |
| Text Placement | Gemini Vision | Medium | ✅ |
| Image Generation | Runware | Medium | ✅ |
| Video Generation | Runware | High | ✅ |

---

## 🎯 Why Three APIs?

### Cost Optimization Strategy:

1. **DeepSeek** - Cheapest for text generation
   - Used for: Ad copy, headlines, rewriting
   - Cost: ~$0.001 per request

2. **Gemini Vision** - Only option for image analysis
   - Used for: Magic Wand, visual analysis
   - Cost: ~$0.01 per request
   - **Cannot be replaced** (DeepSeek doesn't support vision)

3. **Runware** - Best for media generation
   - Used for: Images, videos, effects
   - Cost: ~$0.05-0.20 per generation

**Total Setup:**
- ✅ Minimizes costs (DeepSeek for text)
- ✅ Maintains all features (Gemini for vision)
- ✅ High quality media (Runware)

---

## 🔍 Troubleshooting

### Issue: "deepseek: missing" in diagnostics
**Solution:** 
- Check variable name: `DEEPSEEK_API_KEY` (case-sensitive)
- Verify value starts with `sk-`
- No extra spaces before/after value

### Issue: "gemini: missing" in diagnostics
**Solution:**
- Check variable name: `GEMINI_API_KEY` (case-sensitive)
- Verify value starts with `AIza`
- No extra spaces before/after value

### Issue: Magic Wand still fails
**Solution:**
1. Check Railway logs for errors
2. Verify `GEMINI_API_KEY` is set correctly
3. Test diagnostics endpoint
4. Try redeploying the service

### Issue: Deployment fails
**Solution:**
1. Check Railway build logs
2. Look for dependency errors
3. Verify all environment variables are set
4. Check if `openai` package is installed

---

## 📞 Support Checklist

If you encounter issues, provide:
- [ ] Railway deployment logs
- [ ] Response from `/api/diagnostics` endpoint
- [ ] Screenshot of Railway environment variables
- [ ] Specific error message from browser console
- [ ] Which feature is not working

---

## ✅ Final Checklist

Before marking as complete:

- [ ] All three API keys added to Railway
- [ ] Railway deployment completed successfully
- [ ] Diagnostics endpoint shows all APIs as "configured"
- [ ] Login to dashboard works
- [ ] Ad copy generation works (DeepSeek)
- [ ] Magic Wand button works (Gemini Vision)
- [ ] Image generation works (Runware)
- [ ] No console errors in browser

---

## 🎉 Success Criteria

Your deployment is successful when:

1. ✅ Diagnostics shows all APIs configured
2. ✅ Magic Wand generates animation prompts
3. ✅ Ad copy generation works
4. ✅ Image generation works
5. ✅ No errors in Railway logs
6. ✅ Users can complete full workflows

---

## 📈 Next Steps After Deployment

1. **Monitor Usage**
   - Check API usage in dashboard
   - Monitor costs for each API

2. **Test All Features**
   - Create a test campaign
   - Generate ad copy
   - Generate images
   - Create QuickClip videos

3. **User Testing**
   - Have users test all features
   - Collect feedback
   - Fix any reported issues

4. **Performance Monitoring**
   - Check response times
   - Monitor error rates
   - Optimize if needed

---

**Deployment Date:** November 18, 2025
**Status:** Ready for Production ✅
**Last Updated:** After Magic Wand fix

---

## 🚀 Quick Reference

**Railway Dashboard:** https://railway.app/dashboard

**Environment Variables to Add:**
1. `DEEPSEEK_API_KEY` = `sk-8ba2b2c8a9c64a93bd54758815e2b553`
2. `GEMINI_API_KEY` = `AIzaSyA2PP-C-SlNs7vNyvsIXnFBZVFzsukOzQ8`
3. `RUNWARE_API_KEY` = `nhfOlliGtbwKtXaxWZyXNcF0FAwlOLXO`

**Test Endpoint:**
```bash
curl https://your-app.railway.app/api/diagnostics
```

**Expected Result:**
All three APIs show "configured" ✅

---

Good luck with your deployment! 🎉
