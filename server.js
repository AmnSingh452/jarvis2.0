import express from 'express';
import { createRequestHandler } from '@remix-run/express';
import { installGlobals } from '@remix-run/node';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

installGlobals();

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/assets', express.static(path.join(__dirname, 'build/client/assets')));
app.use(express.static(path.join(__dirname, 'build/client')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Run database migrations once at startup
async function runMigrations() {
  if (process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
    try {
      console.log('Running database migrations...');
      await execAsync('npx prisma migrate deploy');
      console.log('Database migrations completed');
    } catch (error) {
      console.warn('Migration failed (might be already applied):', error.message);
      // Don't fail the startup for migration issues in production
    }
  }
}

// Load Remix build and setup request handler
async function setupRemix() {
  try {
    const build = await import('./build/server/index.js');
    return createRequestHandler({ build });
  } catch (error) {
    console.error('Failed to load Remix build:', error);
    throw error;
  }
}

// Initialize server
async function startServer() {
  try {
    // Run migrations first
    await runMigrations();
    
    // Setup Remix handler
    const requestHandler = await setupRemix();
    
    // Handle all other requests with Remix
    app.all('*', requestHandler);
    
    const port = process.env.PORT || 3000;
    
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}

startServer();