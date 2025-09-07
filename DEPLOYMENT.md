# Jarvis 2.0 Deployment Guide

## Render Deployment

### Prerequisites
1. GitHub repository with your code
2. Render account
3. Shopify Partner account

### Step 1: Prepare Repository
1. Push your code to GitHub with all the deployment files:
   - `shopify.app.toml` (updated with production URLs)
   - `render.yaml` (deployment configuration)
   - `.env.example` (environment variables template)
   - `package.json` (with production scripts)
   - `server.js` (production server)

### Step 2: Create Render Service
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Use these settings:
   - **Name**: `jarvis2-0`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm start`

### Step 3: Set Environment Variables
In Render dashboard, add these environment variables:
- `SHOPIFY_API_KEY`: Your app's API key from Partners dashboard
- `SHOPIFY_API_SECRET`: Your app's API secret from Partners dashboard
- `DATABASE_URL`: Your PostgreSQL database connection string
- `SHOPIFY_CHATBOT_WIDGET_ID`: Your widget ID
- `NODE_ENV`: `production`
- `HOST`: `https://jarvis2-0.onrender.com` (or your custom domain)

### Step 4: Database Setup
1. Create a PostgreSQL database on Render or use external provider
2. Update `DATABASE_URL` environment variable
3. Database migrations will run automatically during deployment

### Step 5: Update Shopify App URLs
In your Shopify Partners dashboard:
1. Go to App setup → URLs
2. Update App URL to: `https://jarvis2-0.onrender.com`
3. Update Allowed redirection URLs to include:
   - `https://jarvis2-0.onrender.com/auth/callback`
   - `https://jarvis2-0.onrender.com/auth/shopify/callback`
   - `https://jarvis2-0.onrender.com/api/auth/callback`

### Step 6: App Proxy Configuration
1. In Partners dashboard → App setup → App proxy
2. Set Subpath prefix: `a`
3. Set Subpath: `jarvis-proxy`
4. Set Proxy URL: `https://jarvis2-0.onrender.com/a/jarvis-proxy`

### Step 7: Install App
1. Use the installation URL: `https://jarvis2-0.onrender.com/auth/shopify?shop=your-store.myshopify.com`
2. Or use Partners dashboard test installation

## Expected Benefits
- ✅ Stable URLs (no more changing tunnels)
- ✅ Persistent database connections
- ✅ Proper OAuth flow
- ✅ Reliable token management
- ✅ Production-ready environment

## Troubleshooting
- Check Render logs for deployment issues
- Verify all environment variables are set
- Ensure database migrations completed successfully
- Test app proxy endpoints after deployment
