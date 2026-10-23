import fs from 'fs';
import { execSync } from 'child_process';

if (fs.existsSync('client/package.json')) {
  console.log('==> Building client from repository root...');
  execSync('npm --prefix client install && npm --prefix client run build', { stdio: 'inherit' });
} else {
  console.log('==> Building client from client directory...');
  execSync('npm run build', { stdio: 'inherit' });
}
