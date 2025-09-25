npm install
npx prisma generate
npx prisma migrate resolve --applied 20250806162105_make_access_token_nullable
npx prisma migrate resolve --applied 20250914092034_add_analytics_tables  
npx prisma migrate resolve --applied 20250925062914_add_cart_abandonment_settings
npx prisma migrate resolve --applied 20250925063102_add_cart_abandonment_log
npx prisma migrate resolve --applied 20250925072519_update_cart_abandonment_log
npx prisma migrate deploy
npm run build
