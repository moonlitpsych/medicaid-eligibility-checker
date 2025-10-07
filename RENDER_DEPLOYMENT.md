# Render Deployment Guide

## Quick Deploy to Render

### 1. Prerequisites
- GitHub account with this repository
- Render account (free tier available at https://render.com)
- Environment variables from `.env.local`

### 2. Deploy Steps

**Option A: One-Click Deploy (Easiest)**

1. Go to https://render.com/deploy
2. Connect your GitHub account
3. Select this repository: `medicaid-eligibility-checker`
4. Render will auto-detect `render.yaml` and configure everything
5. Add environment variables (see below)
6. Click "Create Web Service"

**Option B: Manual Deploy**

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `medicaid-eligibility-api`
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
5. Add environment variables (see below)
6. Click "Create Web Service"

### 3. Required Environment Variables

Go to your Render dashboard → Your service → Environment

Add these variables (get values from your local `.env.local`):

```bash
# Office Ally Real-time API
OFFICE_ALLY_ENDPOINT=https://wsd.officeally.com/TransactionService/rtx.svc
OFFICE_ALLY_RECEIVER_ID=OFFALLY
OFFICE_ALLY_SENDER_ID=1161680
OFFICE_ALLY_USERNAME=moonlit
OFFICE_ALLY_PASSWORD=[your-password]

# Office Ally SFTP
OFFICE_ALLY_SFTP_HOST=ftp10.officeally.com
OFFICE_ALLY_SFTP_PORT=22
OFFICE_ALLY_SFTP_USERNAME=moonlit
OFFICE_ALLY_SFTP_PASSWORD=[your-password]

# Provider Info
PROVIDER_NPI=1275348807
PROVIDER_NAME=Moonlit PLLC

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=[your-supabase-url]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-supabase-anon-key]
SUPABASE_SERVICE_KEY=[your-supabase-service-key]

# IntakeQ Integration
INTAKEQ_API_KEY=[your-intakeq-api-key]

# Optional
NODE_ENV=production
PORT=3000
```

### 4. Deploy and Test

1. Render will automatically deploy when you push to `main` branch
2. Wait for deployment to complete (~2-3 minutes)
3. Your service will be available at: `https://medicaid-eligibility-api.onrender.com`

### 5. Test Your Deployment

```bash
# Test eligibility check endpoint
curl -X POST https://medicaid-eligibility-api.onrender.com/api/database-eligibility/check \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "Patient",
    "dateOfBirth": "1990-01-01",
    "payerId": "UTMCD"
  }'
```

### 6. Access the Web Interface

Navigate to: `https://medicaid-eligibility-api.onrender.com/public/universal-eligibility-interface.html`

### 7. Monitoring

- **Logs**: Dashboard → Your Service → Logs
- **Metrics**: Dashboard → Your Service → Metrics
- **Health**: Auto-monitored via health check endpoint

### Important Notes

⚠️ **Free Tier Limitations**:
- Service spins down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds
- 750 hours/month free (enough for one service 24/7)

💡 **Upgrade to Paid** ($7/month) for:
- No spin-down
- Faster response times
- More memory

🔐 **Security**:
- All environment variables are encrypted
- HTTPS is automatic (free SSL certificate)
- Render provides DDoS protection

### Troubleshooting

**Build fails**:
- Check that `package.json` has correct dependencies
- Verify Node version compatibility

**Service won't start**:
- Check logs for errors
- Verify all environment variables are set
- Ensure PORT is set to 3000 (or use `process.env.PORT`)

**Slow first request**:
- This is normal on free tier (cold start)
- Upgrade to paid tier to eliminate

### Custom Domain

To use your own domain (e.g., `eligibility.moonlit.health`):

1. Dashboard → Your Service → Settings → Custom Domains
2. Add your domain
3. Update DNS records (Render provides instructions)
4. SSL certificate auto-provisioned

### Continuous Deployment

Render automatically deploys when you:
1. Push to `main` branch on GitHub
2. Manual deploy via dashboard

To disable auto-deploy:
- Dashboard → Your Service → Settings → Build & Deploy → Auto-Deploy: OFF

### Environment-Specific Configuration

For staging vs production:

1. Create separate services on Render
2. Use different environment variables
3. Deploy from different branches

Example:
- `main` branch → Production
- `staging` branch → Staging environment

### Support

- Render Docs: https://render.com/docs
- Status: https://status.render.com
- Community: https://community.render.com
