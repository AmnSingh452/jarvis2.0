const { execSync } = require('child_process');

console.log('🚀 Starting Render deployment...');

function runCommand(command, description) {
    try {
        console.log(`${description}...`);
        execSync(command, { stdio: 'inherit' });
        console.log(`✅ ${description} completed`);
    } catch (error) {
        console.error(`❌ ${description} failed:`, error.message);
        // Don't exit on migration resolve errors - they're expected
        if (!command.includes('migrate resolve')) {
            process.exit(1);
        }
    }
}

// Install dependencies
runCommand('npm install', '📦 Installing dependencies');

// Generate Prisma client
runCommand('npx prisma generate', '🔧 Generating Prisma client');

console.log('🗃️ Resolving migration state for production database...');

// Resolve all migrations as applied (handles P3005 error)
const migrations = [
    '20250806162105_make_access_token_nullable',
    '20250914092034_add_analytics_tables', 
    '20250925062914_add_cart_abandonment_settings',
    '20250925063102_add_cart_abandonment_log',
    '20250925072519_update_cart_abandonment_log'
];

migrations.forEach(migration => {
    try {
        execSync(`npx prisma migrate resolve --applied ${migration}`, { stdio: 'pipe' });
        console.log(`✅ Resolved migration: ${migration}`);
    } catch (error) {
        // Ignore errors - migration might already be resolved
        console.log(`ℹ️ Migration ${migration} already resolved or not needed`);
    }
});

// Deploy migrations
runCommand('npx prisma migrate deploy', '🚀 Deploying migrations');

// Final Prisma client generation
runCommand('npx prisma generate', '🔧 Final Prisma client generation');

// Build the app
runCommand('npm run build', '🏗️ Building application');

console.log('🎉 Deployment completed successfully!');
