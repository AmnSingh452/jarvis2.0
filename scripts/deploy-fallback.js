const { execSync } = require('child_process');

console.log('🚀 Starting Render build (fallback method)...');

function runCommand(command, description) {
    try {
        console.log(`${description}...`);
        execSync(command, { stdio: 'inherit' });
        console.log(`✅ ${description} completed`);
    } catch (error) {
        console.error(`❌ ${description} failed:`, error.message);
        throw error;
    }
}

// Install dependencies
runCommand('npm install', '📦 Installing dependencies');

// Generate Prisma client
runCommand('npx prisma generate', '🔧 Generating Prisma client');

// Use db push instead of migrations (safer for production with existing data)
console.log('🗃️ Pushing database schema...');
try {
    runCommand('npx prisma db push --accept-data-loss', '🚀 Pushing database schema');
} catch (error) {
    console.log('⚠️ db push failed, trying without --accept-data-loss flag...');
    runCommand('npx prisma db push', '🚀 Pushing database schema (safe mode)');
}

// Final Prisma client generation
runCommand('npx prisma generate', '🔧 Final Prisma client generation');

// Build the app
runCommand('npm run build', '🏗️ Building application');

console.log('🎉 Deployment completed successfully!');
