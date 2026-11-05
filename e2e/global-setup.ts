import { execSync } from 'child_process';
import path from 'path';
import { E2E } from './support/env';

// Runs once before the web servers start: bring the throwaway database to the latest schema and
// add the demo data (staff account, the two packages the pricing page links to).
export default function globalSetup() {
  const backend = path.join(__dirname, '..', 'backend');
  const env = { ...process.env, ...E2E.backendEnv };
  execSync('npx prisma migrate deploy', { cwd: backend, env, stdio: 'inherit' });
  execSync('npx tsx scripts/seed.ts', { cwd: backend, env, stdio: 'inherit' });
}
