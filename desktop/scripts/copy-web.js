const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', '..', 'artifacts', 'cbt-app', 'dist', 'public');
const dest = path.join(__dirname, '..', 'web');

function copyDir(from, to) {
  if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, entry.name);
    const d = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

if (!fs.existsSync(src)) {
  console.error('Frontend build not found at:', src);
  console.error('Run: PORT=3000 BASE_PATH=/ pnpm --filter @workspace/cbt-app build');
  process.exit(1);
}

if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true });
copyDir(src, dest);
console.log('Frontend copied to desktop/web/');
