import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function globalSetup() {
  if (process.env.SKIP_BACKEND_SETUP) {
    console.log('Skipping backend DB setup...');
    return;
  }
  console.log('Setting up test database...');
  const backendDir = path.resolve(__dirname, '../../backend');
  
  // Set environment variable to use test DB
  process.env.ENVIRONMENT = 'test';
  const pythonCmd = process.env.PYTHON_BIN || 'python';
  
  try {
    // Cross-platform python command execution
    // First, ensure we reset the test database
    console.log('Resetting DB schemas...');
    execSync(`${pythonCmd} scripts/db_reset.py --env test`, { 
      cwd: backendDir, 
      stdio: 'inherit',
      env: { ...process.env, ENVIRONMENT: 'test' }
    });
    
    // Then seed test data
    console.log('Seeding test data...');
    execSync(`${pythonCmd} scripts/seed_data.py`, { 
      cwd: backendDir, 
      stdio: 'inherit',
      env: { ...process.env, ENVIRONMENT: 'test' }
    });
    
    console.log('Seeding E2E specific test data...');
    execSync(`${pythonCmd} scripts/seed_e2e.py`, { 
      cwd: backendDir, 
      stdio: 'inherit',
      env: { ...process.env, ENVIRONMENT: 'test' }
    });
    
    console.log('Database setup complete.');
  } catch (error) {
    console.error('Failed to setup test database:', error);
    process.exit(1);
  }
}
