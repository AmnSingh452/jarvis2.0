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

// CORS configuration for Shopify
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/assets', express.static(path.join(__dirname, 'build/client/assets')));
app.use(express.static(path.join(__dirname, 'build/client')));

// Health check endpoint - respond to both GET and HEAD
app.all('/health', (req, res) => {
  console.log(`Health check accessed via ${req.method}`);
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint for HEAD requests
app.head('/', (req, res) => {
  console.log('HEAD request to root');
  res.status(200).end();
});

console.log('🚀 Starting server initialization...');

// Run database migrations once at startup
async function runMigrations() {
  if (process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
    try {
      console.log('🔄 Running database migrations...');
      await execAsync('npx prisma migrate deploy');
      console.log('✅ Database migrations completed');
    } catch (error) {
      console.warn('⚠️ Migration failed (might be already applied):', error.message);
      // Don't fail the startup for migration issues in production
    }
  } else {
    console.log('⏭️ Skipping migrations (not production or no DATABASE_URL)');
  }
}

// Load Remix build and setup request handler
async function setupRemix() {
  try {
    console.log('🔄 Loading Remix build...');
    const build = await import('./build/server/index.js');
    console.log('✅ Remix build loaded successfully');
    return createRequestHandler({ build });
  } catch (error) {
    console.error('❌ Failed to load Remix build:', error);
    throw error;
  }
}

// Initialize server
async function startServer() {
  try {
    console.log('🔄 Starting server initialization...');
    
    // Run migrations first
    await runMigrations();
    
    // Setup Remix handler
    const requestHandler = await setupRemix();
    
    // Handle all other requests with Remix
    app.all('*', requestHandler);
    
    const port = process.env.PORT || 3000;
    
    app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`📡 Server ready to accept requests`);
      console.log(`🌐 Health check: http://localhost:${port}/health`);
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

console.log('🏁 Initializing Jarvis 2.0 server...');
startServer();