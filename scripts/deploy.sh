#!/bin/bash

# Render deployment script for Shopify app
echo "🚀 Starting Render deployment..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Check migration status and handle accordingly
echo "🗃️ Checking migration status..."

# Try to get migration status
MIGRATION_STATUS=$(npx prisma migrate status 2>&1)

if [[ $MIGRATION_STATUS == *"following migrations have not yet been applied"* ]]; then
    echo "⚠️ Pending migrations detected. Resolving migration state..."
    
    # Mark existing migrations as applied (for production database that already has schema)
    npx prisma migrate resolve --applied 20250806162105_make_access_token_nullable || true
    npx prisma migrate resolve --applied 20250914092034_add_analytics_tables || true  
    npx prisma migrate resolve --applied 20250925062914_add_cart_abandonment_settings || true
    npx prisma migrate resolve --applied 20250925063102_add_cart_abandonment_log || true
    npx prisma migrate resolve --applied 20250925072519_update_cart_abandonment_log || true
    
    echo "✅ Migration state resolved"
elif [[ $MIGRATION_STATUS == *"P3005"* ]] || [[ $MIGRATION_STATUS == *"database schema is not empty"* ]]; then
    echo "⚠️ P3005 error detected. Database schema exists but migrations not tracked."
    echo "🔧 Resolving by marking migrations as applied..."
    
    # Force resolve all migrations as applied
    npx prisma migrate resolve --applied 20250806162105_make_access_token_nullable || true
    npx prisma migrate resolve --applied 20250914092034_add_analytics_tables || true
    npx prisma migrate resolve --applied 20250925062914_add_cart_abandonment_settings || true  
    npx prisma migrate resolve --applied 20250925063102_add_cart_abandonment_log || true
    npx prisma migrate resolve --applied 20250925072519_update_cart_abandonment_log || true
    
    echo "✅ P3005 error resolved"
else
    echo "✅ Migration status OK"
fi

# Final migration deploy (should work now)
echo "🚀 Deploying migrations..."
npx prisma migrate deploy

# Final Prisma client generation
echo "🔧 Final Prisma client generation..."
npx prisma generate

# Build the app
echo "🏗️ Building application..."
npm run build

echo "🎉 Deployment completed successfully!"
