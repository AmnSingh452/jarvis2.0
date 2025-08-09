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

// Check if build directory exists
const buildClientPath = path.join(__dirname, 'build/client');
const buildServerPath = path.join(__dirname, 'build/server/index.js');

if (!fs.existsSync(buildClientPath)) {
  console.error('Build client directory not found. Make sure to run npm run build first.');
  process.exit(1);
}

if (!fs.existsSync(buildServerPath)) {
  console.error('Build server file not found. Make sure to run npm run build first.');
  process.exit(1);
}

// Serve static files from the build/client directory
app.use('/assets', express.static(path.join(__dirname, 'build/client/assets'), {
  maxAge: '1y',
  immutable: true
}));

// Serve other static files
app.use(express.static(path.join(__dirname, 'build/client'), {
  maxAge: '1h'
}));

// Handle all other requests with Remix
app.all('*', createRequestHandler({
  build: await import('./build/server/index.js')
}));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
