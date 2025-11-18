# Railway SMTP Environment Variables

## Required Environment Variables for SMTP

Add these environment variables in Railway Dashboard → Variables:

```bash
# SMTP Server Configuration
SMTP_HOST=mail.arriival.com
SMTP_PORT=465
SMTP_USER=aimagicbox@arriival.com
SMTP_PASS=Arr!!9394!@#

# Email Sender Configuration
SMTP_FROM=aimagicbox@arriival.com
SMTP_FROM_NAME=AI MagicBox

# Application URL (for email links)
APP_URL=https://web-production-8cd2.up.railway.app
```

## How to Add Environment Variables in Railway

1. Go to Railway Dashboard: https://railway.app/dashboard
2. Select your `aimagicbox` project
3. Click on your service (web-production-8cd2)
4. Go to **"Variables"** tab
5. Click **"+ New Variable"** for each variable above
6. Click **"Deploy"** to apply changes

## Notes

- **SMTP_PORT**: Use 465 for SSL, or 587 for STARTTLS
- **SMTP_PASS**: The password contains special characters (!@#), Railway handles them correctly
- **APP_URL**: This is used in email verification and password reset links

## Testing

After setting environment variables:
1. Railway will automatically redeploy
2. Test registration to receive verification email
3. Test "Forgot Password" to receive reset email

## Troubleshooting

If emails still fail to send:
1. Check Railway logs for SMTP errors
2. Verify all environment variables are set correctly
3. Try using port 587 instead of 465
4. Contact arriival.com support to verify SMTP credentials
