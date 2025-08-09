import express from 'express';
import { createRequestHandler } from '@remix-run/express';
import { installGlobals } from '@remix-run/node';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

installGlobals();

async function setupDatabase() {
  if (process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
    try {
      console.log('🔄 Running database migrations...');
      await execAsync('npx prisma migrate deploy');
      console.log('✅ Database migrations completed');
    } catch (error) {
      console.warn('⚠️ Database migration failed (this might be okay if already migrated):', error.message);
    }
  }
}

async function startServer() {
  const app = express();

  // Check if build directory exists
  const buildClientPath = path.join(__dirname, 'build/client');
  const buildServerPath = path.join(__dirname, 'build/server/index.js');

  if (!fs.existsSync(buildClientPath)) {
    console.error('❌ Build client directory not found. Make sure to run npm run build first.');
    process.exit(1);
  }

  if (!fs.existsSync(buildServerPath)) {
    console.error('❌ Build server file not found. Make sure to run npm run build first.');
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

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  try {
    // Handle all other requests with Remix
    app.all('*', createRequestHandler({
      build: await import('./build/server/index.js')
    }));
  } catch (error) {
    console.error('❌ Failed to load Remix build:', error);
    process.exit(1);
  }

  const port = process.env.PORT || 3000;
  
  app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
  });
}

// Setup database and start server
setupDatabase()
  .then(() => startServer())
  .catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
