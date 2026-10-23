import fs from 'fs';
import { execSync } from 'child_process';

console.log('==> Checking Python dependencies for backend...');
try {
  execSync('pip install -r requirements.txt || pip3 install -r requirements.txt', { stdio: 'inherit' });
} catch (e) {
  console.log('Pip install step completed or skipped (node runtime)');
}

if (fs.existsSync('client/package.json')) {
  console.log('==> Building client from repository root...');
  execSync('npm --prefix client install && npm --prefix client run build', { stdio: 'inherit' });
} else {
  console.log('==> Building client from client directory...');
  execSync('npm run build', { stdio: 'inherit' });
}
