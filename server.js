import express from 'express';
import { createRequestHandler } from '@remix-run/express';
import { installGlobals } from '@remix-run/node';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

installGlobals();

const app = express();

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
