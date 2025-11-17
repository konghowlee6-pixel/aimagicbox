# Railway Environment Variables Configuration

## 🔐 Required Environment Variables

Copy these variables to your Railway project settings:

### **1. Database Configuration**
```
DATABASE_URL=<your-railway-postgresql-url>
```
**Note:** Railway will automatically provide this when you add a PostgreSQL database to your project.

### **2. Session & Authentication**
```
SESSION_SECRET=<generate-random-32-char-string>
JWT_SECRET=<generate-random-32-char-string>
```
**Generate secure secrets using:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### **3. AI API Keys (Required for core features)**
```
RUNWARE_API_KEY=nhfOlliGtbwKtXaxWZyXNcF0FAwlOLXO
GEMINI_API_KEY=AIzaSyA2PP-C-SlNs7vNyvsIXnFBZVFzsukOzQ8
```

### **4. Email Configuration (SMTP)**
```
SMTP_HOST=mail.arriival.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=careteam@arriival.com
SMTP_PASS=Lin!!8899!@#!@#
SMTP_FROM=careteam@arriival.com
SMTP_FROM_NAME=AI MagicBox
```

### **5. Application URL**
```
APP_URL=https://aimagicbox.ai
```
**Note:** Update this after connecting your custom domain.

### **6. Node Environment**
```
NODE_ENV=production
```

---

## 🔧 Optional Environment Variables

### **Firebase Configuration (if using Firebase features)**
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### **Google Cloud TTS (if using text-to-speech)**
```
GOOGLE_APPLICATION_CREDENTIALS=<path-to-service-account-json>
```

---

## 📋 Quick Setup Checklist

1. ✅ Copy all **Required** variables to Railway
2. ✅ Generate new `SESSION_SECRET` and `JWT_SECRET`
3. ✅ Railway will auto-generate `DATABASE_URL`
4. ✅ Update `APP_URL` after domain connection
5. ✅ Add optional variables if needed

---

## ⚠️ Security Notes

- **Never commit `.env` file to Git** (already in .gitignore)
- **Regenerate secrets** for production (don't use development values)
- **Keep API keys secure** and rotate them periodically
- **Use Railway's secret management** for sensitive data
