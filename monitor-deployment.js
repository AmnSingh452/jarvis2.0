/**
 * Monitor deployment status
 */

const API_URL = 'https://jarvis2-0-djg1.onrender.com/api/partner-agencies';

async function checkStatus() {
  try {
    const response = await fetch(API_URL);
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      console.log('✅ DEPLOYMENT READY! You can now run: node test-create-agency.js');
      process.exit(0);
    } else {
      console.log('⏳ Still deploying... checking again in 10 seconds');
    }
  } catch (error) {
    console.log('⚠️  Server error:', error.message, '- checking again in 10 seconds');
  }
}

console.log('🔍 Monitoring Render deployment...\n');
console.log('Checking: ' + API_URL + '\n');

// Check every 10 seconds
checkStatus();
setInterval(checkStatus, 10000);
