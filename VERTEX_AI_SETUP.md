# Vertex AI Setup Instructions

## ✅ What's Already Done
- Vertex AI integration code is complete and ready
- Environment variables (VERTEX_API_KEY, VERTEX_PROJECT_ID) are configured
- Three new backend endpoints are implemented:
  - `/api/vertex/rewrite-text` - Smart text rewriting
  - `/api/vertex/fusion` - Product fusion background generation
  - `/api/vertex/copywriting` - Contextual ad copy generation

## 🔧 What You Need to Do

### Step 1: Enable Vertex AI API in Google Cloud Console

The Vertex AI API needs to be enabled for your Google Cloud project before the endpoints will work.

**Quick Link:**
```
https://console.developers.google.com/apis/api/aiplatform.googleapis.com/overview?project=ai-magicbox
```

**Manual Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project: `ai-magicbox`
3. Navigate to **APIs & Services** → **Library**
4. Search for "Vertex AI API"
5. Click **Enable**
6. Wait 2-3 minutes for the API to propagate

### Step 2: Verify Your API Credentials

Make sure your environment variables are correctly set:

**VERTEX_API_KEY**: Your Google Cloud API key with Vertex AI permissions
- Create at: https://console.cloud.google.com/apis/credentials
- Click "Create Credentials" → "API Key"
- Restrict to Vertex AI API for security

**VERTEX_PROJECT_ID**: Your Google Cloud Project ID (currently: `ai-magicbox`)
- Find at the top navigation bar in Google Cloud Console
- Or go to Project Settings

### Step 3: Test the Integration

After enabling the Vertex AI API, test the endpoints:

```bash
# Test Smart Text Rewriting
curl -X POST http://localhost:5000/api/vertex/rewrite-text \
  -H "Content-Type: application/json" \
  -H "x-user-id: your-firebase-user-id" \
  -H "x-user-email: your@email.com" \
  -H "x-user-name: Your Name" \
  -H "x-user-photo: https://example.com/photo.jpg" \
  -d '{
    "text": "fast shipping",
    "targetStyle": "professional",
    "context": "e-commerce feature"
  }'

# Test AI Fusion
curl -X POST http://localhost:5000/api/vertex/fusion \
  -H "Content-Type: application/json" \
  -H "x-user-id: your-firebase-user-id" \
  -H "x-user-email: your@email.com" \
  -H "x-user-name: Your Name" \
  -H "x-user-photo: https://example.com/photo.jpg" \
  -d '{
    "productDescription": "wireless earbuds",
    "backgroundTheme": "modern lifestyle",
    "mood": "energetic"
  }'

# Test Contextual Copywriting
curl -X POST http://localhost:5000/api/vertex/copywriting \
  -H "Content-Type: application/json" \
  -H "x-user-id: your-firebase-user-id" \
  -H "x-user-email: your@email.com" \
  -H "x-user-name: Your Name" \
  -H "x-user-photo: https://example.com/photo.jpg" \
  -d '{
    "platform": "Instagram",
    "productName": "EcoBottle Pro",
    "productDescription": "Sustainable water bottle",
    "targetAudience": "eco-conscious millennials",
    "tone": "friendly"
  }'
```

Or use the included test script:
```bash
node test-vertex.mjs
```

## 🎯 Features Enabled

### 1. Smart Text Rewriting (`/api/vertex/rewrite-text`)
- Transforms basic keywords into compelling marketing copy
- Uses Gemini 2.5 Pro with specialized system instructions
- Supports multiple tone styles: professional, casual, persuasive, technical
- Cost: 3 cents per request

### 2. AI Product Fusion (`/api/vertex/fusion`)
- Generates intelligent background descriptions for product photos
- Creates contextual scenes that enhance product appeal
- Considers lighting, color harmony, and brand context
- Cost: 5 cents per request

### 3. Contextual Copywriting (`/api/vertex/copywriting`)
- Platform-specific ad copy optimization (Facebook, Instagram, Google Ads, etc.)
- Returns structured JSON with headline, body, and CTA
- Adapts to target audience and brand voice
- Cost: 4 cents per request

## 📊 API Usage Tracking

All Vertex AI requests are automatically tracked in the database:
- Token usage estimation
- Cost calculation
- User attribution
- Endpoint tracking

View usage statistics at: `/api/stats` and `/api/usage/history`

## 🔒 Security Notes

- API keys are stored securely as environment variables
- Never exposed to frontend
- Firebase authentication required for all endpoints
- Rate limiting recommended for production

## 🚀 Next Steps

After enabling the Vertex AI API:
1. Test all three endpoints
2. Integrate into frontend UI (optional - endpoints are backend-ready)
3. Monitor usage and costs in Google Cloud Console
4. Consider setting up billing alerts

## 💡 Tips

- Vertex AI API usually takes 2-5 minutes to activate after enabling
- If you see "PERMISSION_DENIED" errors, wait a bit longer and retry
- Check Google Cloud Console for detailed API usage metrics
- The system_instruction parameter ensures high-quality, contextual responses
