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

// Health check endpoint (must be first)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Check if build directory exists
const buildClientPath = path.join(__dirname, 'build/client');
const buildServerPath = path.join(__dirname, 'build/server/index.js');

console.log('🔍 Checking build files...');
console.log('Build client path:', buildClientPath);
console.log('Build server path:', buildServerPath);

if (!fs.existsSync(buildClientPath)) {
  console.error('❌ Build client directory not found:', buildClientPath);
  process.exit(1);
}

if (!fs.existsSync(buildServerPath)) {
  console.error('❌ Build server file not found:', buildServerPath);
  process.exit(1);
}

console.log('✅ Build files found');

// Serve static files from the build/client directory
app.use('/assets', express.static(path.join(__dirname, 'build/client/assets'), {
  maxAge: '1y',
  immutable: true
}));

// Serve other static files
app.use(express.static(path.join(__dirname, 'build/client'), {
  maxAge: '1h'
}));

console.log('📁 Static file serving configured');

// Load Remix build and create request handler
async function startServer() {
  try {
    console.log('🔄 Loading Remix build...');
    const build = await import('./build/server/index.js');
    const requestHandler = createRequestHandler({ build });
    console.log('✅ Remix build loaded successfully');

    // Handle all other requests with Remix
    app.all('*', requestHandler);

    const port = process.env.PORT || 3000;

    app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`🌐 Health check available at: http://localhost:${port}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to load Remix build:', error);
    process.exit(1);
  }
}

startServer();
