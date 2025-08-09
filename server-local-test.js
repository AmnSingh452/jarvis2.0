import express from 'express';
import { createRequestHandler } from '@remix-run/express';
import { installGlobals } from '@remix-run/node';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

installGlobals();

const app = express();

console.log('🔍 Checking build files...');

// Check if build files exist
const buildClientPath = path.join(__dirname, 'build/client');
const buildServerPath = path.join(__dirname, 'build/server/index.js');

console.log('Build client path:', buildClientPath);
console.log('Build server path:', buildServerPath);
console.log('Build client exists:', fs.existsSync(buildClientPath));
console.log('Build server exists:', fs.existsSync(buildServerPath));

if (!fs.existsSync(buildClientPath) || !fs.existsSync(buildServerPath)) {
  console.error('❌ Build files missing. Run npm run build first.');
  process.exit(1);
}

// Serve static files
app.use('/assets', express.static(path.join(__dirname, 'build/client/assets')));
app.use(express.static(path.join(__dirname, 'build/client')));

console.log('📁 Static file serving configured');

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Load Remix build
console.log('🔄 Loading Remix build...');

try {
  const build = await import('./build/server/index.js');
  console.log('✅ Remix build loaded successfully');
  console.log('Build object keys:', Object.keys(build));
  
  app.all('*', createRequestHandler({ build }));
  
  const port = process.env.PORT || 3000;
  
  app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
    console.log(`🌐 Health check: http://localhost:${port}/health`);
  });
} catch (error) {
  console.error('❌ Failed to load Remix build:', error);
  process.exit(1);
}
