const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..', '..');
const webDest = path.resolve(__dirname, '..', 'web');
const distSrc = path.resolve(root, 'artifacts', 'cbt-app', 'dist', 'public');

console.log('[build-frontend] Building React frontend...');

try {
  execSync('pnpm --filter @workspace/cbt-app build', {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, PORT: '3000', BASE_PATH: '/' },
    shell: true,
  });
} catch {
  process.exit(1);
}

if (!fs.existsSync(distSrc)) {
  console.error('[build-frontend] Build output not found at:', distSrc);
  process.exit(1);
}

function copyDir(from, to) {
  if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, entry.name);
    const d = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

if (fs.existsSync(webDest)) fs.rmSync(webDest, { recursive: true });
copyDir(distSrc, webDest);
console.log('[build-frontend] Frontend copied to desktop/web/');
