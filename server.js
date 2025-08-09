import express from 'express';
import { createRequestHandler } from '@remix-run/express';
import { installGlobals } from '@remix-run/node';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

installGlobals();

const app = express();

// Health check endpoint (must be first)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files
app.use('/assets', express.static(path.join(__dirname, 'build/client/assets')));
app.use(express.static(path.join(__dirname, 'build/client')));

// Import and setup Remix handler
import('./build/server/index.js')
  .then((build) => {
    const requestHandler = createRequestHandler({ build });
    app.all('*', requestHandler);
    
    const port = process.env.PORT || 3000;
    
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
