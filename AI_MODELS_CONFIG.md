# AI MagicBox - AI Models & API Configuration

## 🔑 Required API Keys

### 1. Google Gemini API (Primary Text Generation)
```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

**Where to get:**
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Get API Key"
3. Create a new API key or use existing one

**Used for:**
- Ad copy generation (gemini-2.5-flash)
- Brand kit generation (gemini-2.5-pro)
- Text optimization (gemini-2.0-flash-001)
- Headlines, descriptions, hashtags
- Prompt enhancement

---

### 2. Runware API (Image & Video Generation)
```bash
RUNWARE_API_KEY=your_runware_api_key_here
```

**Where to get:**
1. Go to [Runware Dashboard](https://runware.ai/dashboard)
2. Sign up or log in
3. Navigate to API Keys section
4. Generate a new API key

**Used for:**
- Text-to-image generation (HiDream-I1 Dev)
- Image outpainting (FLUX.1 Expand Pro)
- Image inpainting (FLUX Fill)
- Image-to-image transformation (FLUX.1 Dev)
- Background removal
- Image upscaling
- Video generation (Seedance 1.0 Pro Fast)
- Prompt enhancement
- Image captioning

---

### 3. Google Vertex AI (Advanced Text Generation)
```bash
GCP_PROJECT_ID=your_gcp_project_id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

**Where to get:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Vertex AI API
4. Create a service account with Vertex AI permissions
5. Download the JSON key file

**Used for:**
- Smart text rewriting (gemini-2.5-pro via Vertex)
- AI Product Fusion descriptions
- Contextual copywriting
- Platform-specific ad optimization

---

### 4. Database Configuration
```bash
DATABASE_URL=postgresql://user:password@host:port/database
```

**Required for:**
- User authentication
- Project management
- Campaign storage
- Visual assets storage

---

### 5. SMTP Configuration (Email Notifications)
```bash
SMTP_HOST=mail.arriival.com
SMTP_PORT=465
SMTP_USER=aimagicbox@arriival.com
SMTP_PASS=your_smtp_password
SMTP_FROM=aimagicbox@arriival.com
SMTP_FROM_NAME=AI MagicBox
```

---

### 6. Application Configuration
```bash
# Application URL (for email links and redirects)
APP_URL=https://your-domain.com

# Session & JWT secrets
SESSION_SECRET=your_random_session_secret
JWT_SECRET=your_random_jwt_secret

# Server port
PORT=5000

# Node environment
NODE_ENV=production
```

---

## 📋 Complete Environment Variables Template

Create a `.env` file with all required variables:

```bash
# === AI Models & APIs ===
GEMINI_API_KEY=
RUNWARE_API_KEY=
GCP_PROJECT_ID=
GOOGLE_APPLICATION_CREDENTIALS=

# === Database ===
DATABASE_URL=

# === SMTP Email ===
SMTP_HOST=mail.arriival.com
SMTP_PORT=465
SMTP_USER=aimagicbox@arriival.com
SMTP_PASS=
SMTP_FROM=aimagicbox@arriival.com
SMTP_FROM_NAME=AI MagicBox

# === Application ===
APP_URL=http://localhost:5000
PORT=5000
NODE_ENV=development

# === Security ===
SESSION_SECRET=
JWT_SECRET=

# === Optional ===
ENABLE_TEST_AUTH=false
STRIPE_SECRET_KEY=
```

---

## 🚀 Setup Instructions

### For Local Development (Manus)

1. Create `.env` file in project root
2. Add all required API keys
3. Restart the development server

### For Railway Deployment

1. Go to Railway Dashboard → Your Project → Variables
2. Add each environment variable one by one
3. Railway will automatically redeploy

---

## 🧪 Testing API Keys

### Test Gemini API
```bash
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

### Test Runware API
```bash
curl -X POST "https://api.runware.ai/v1/image/generate" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test","model":"runware:97@2"}'
```

---

## 🔍 Troubleshooting

### "Failed to generate headlines"
- ✅ Check if `GEMINI_API_KEY` is set
- ✅ Verify API key is valid
- ✅ Check API quota/billing

### "Image generation failed"
- ✅ Check if `RUNWARE_API_KEY` is set
- ✅ Verify Runware account has credits
- ✅ Check API rate limits

### "Vertex AI error"
- ✅ Check if `GCP_PROJECT_ID` is set
- ✅ Verify `GOOGLE_APPLICATION_CREDENTIALS` path is correct
- ✅ Ensure Vertex AI API is enabled in GCP
- ✅ Verify service account has proper permissions

---

## 📊 AI Models Summary

| Provider | Model | Purpose | Env Var |
|----------|-------|---------|---------|
| Google Gemini | gemini-2.5-flash | Fast text generation | GEMINI_API_KEY |
| Google Gemini | gemini-2.5-pro | High-quality content | GEMINI_API_KEY |
| Google Gemini | gemini-2.0-flash-001 | Alternative text | GEMINI_API_KEY |
| Vertex AI | gemini-2.5-pro | Smart rewriting | GCP_PROJECT_ID |
| Runware | runware:97@2 | Image generation | RUNWARE_API_KEY |
| Runware | bfl:1@3 | Image expansion | RUNWARE_API_KEY |
| Runware | runware:102@1 | Image inpainting | RUNWARE_API_KEY |
| Runware | runware:101@1 | Image transformation | RUNWARE_API_KEY |
| Runware | bytedance:2@2 | Video generation | RUNWARE_API_KEY |

---

## 🎯 Next Steps

1. ✅ Get all required API keys
2. ✅ Add them to `.env` (local) or Railway Variables (production)
3. ✅ Restart the application
4. ✅ Test each feature to verify integration
5. ✅ Monitor API usage and quotas
