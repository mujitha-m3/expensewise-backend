# ExpenseWise Backend - Google Cloud Deployment Guide

## Prerequisites
1. Install [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
2. Create a Google Cloud Project
3. Enable billing on your project

## Setup MongoDB
You have two options:

### Option 1: MongoDB Atlas (Recommended)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get connection string
4. Whitelist Google Cloud IPs (or allow all: 0.0.0.0/0)

### Option 2: Google Cloud MongoDB
Use Cloud Marketplace to deploy MongoDB

## Deployment Steps

### 1. Install Google Cloud SDK (if not already installed)
```bash
# Windows (PowerShell as Administrator)
(New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", "$env:Temp\GoogleCloudSDKInstaller.exe")
& $env:Temp\GoogleCloudSDKInstaller.exe
```

### 2. Authenticate with Google Cloud
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### 3. Set Environment Variables in Google Cloud
```bash
# Set your environment variables
gcloud run deploy expensewise-backend \
  --set-env-vars "MONGODB_URI=your_mongodb_connection_string,JWT_SECRET=your_jwt_secret,NODE_ENV=production,PORT=8080"
```

### 4. Deploy to Cloud Run
```bash
# Build and deploy
gcloud run deploy expensewise-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --port 8080
```

### 5. Set Environment Variables (Alternative Method)
Create a `.env.yaml` file (DON'T commit this):
```yaml
MONGODB_URI: "your_mongodb_connection_string"
JWT_SECRET: "your_jwt_secret"
JWT_EXPIRES_IN: "7d"
JWT_REFRESH_EXPIRES_IN: "30d"
NODE_ENV: "production"
PORT: "8080"
```

Then deploy with:
```bash
gcloud run deploy expensewise-backend \
  --source . \
  --env-vars-file .env.yaml \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## Quick Deploy Command
```bash
# One-line deploy (after setting up gcloud)
gcloud run deploy expensewise-backend --source . --region us-central1 --allow-unauthenticated --set-env-vars MONGODB_URI=YOUR_MONGO_URI,JWT_SECRET=YOUR_SECRET
```

## Custom Domain (Optional)
```bash
# Map custom domain
gcloud run domain-mappings create --service expensewise-backend --domain api.yourdomain.com --region us-central1
```

## View Logs
```bash
gcloud run logs read --service expensewise-backend --region us-central1
```

## Update Deployment
```bash
# Just run deploy command again
gcloud run deploy expensewise-backend --source . --region us-central1
```

## Pricing Estimate
- **Cloud Run**: Free tier includes 2 million requests/month
- **MongoDB Atlas**: Free tier (512MB storage)
- Estimated cost: **$0-5/month** for small projects

## Important Notes
1. Make sure PORT is set to 8080 (or use process.env.PORT in server.js)
2. Update CORS settings for your frontend domain
3. Set JWT_SECRET to a strong random string
4. Use MongoDB Atlas whitelist: 0.0.0.0/0 for Cloud Run (or use VPC)

## Troubleshooting
```bash
# Check service status
gcloud run services describe expensewise-backend --region us-central1

# View recent logs
gcloud run logs tail --service expensewise-backend --region us-central1

# Delete service
gcloud run services delete expensewise-backend --region us-central1
```
