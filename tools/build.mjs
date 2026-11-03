// Copies src/ to dist/, checks size, and zips it into deploy/builds/bondwork-vX-DATE.zip with index.html at the root.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { VERSION } from '../src/data.js';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
fs.cpSync(path.join(root, 'src'), dist, { recursive: true });

let bytes = 0;
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); f.isDirectory() ? walk(p) : (bytes += fs.statSync(p).size); } })(dist);
if (bytes > 2 * 1024 * 1024) { console.error('Build too large: ' + bytes); process.exit(1); }

const date = new Date().toISOString().slice(0, 10);
const zip = path.join(root, 'deploy', 'builds', `bondwork-v${VERSION}-${date}.zip`);
fs.mkdirSync(path.dirname(zip), { recursive: true });
fs.rmSync(zip, { force: true });
// Compress-Archive on Windows; zip -r elsewhere. Entries are relative to dist so index.html is at the root.
if (process.platform === 'win32') {
  execFileSync('powershell', ['-NoProfile', '-Command', `Add-Type -A System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory('${dist}', '${zip}', 'Optimal', $false)`], { stdio: 'inherit' });
} else execFileSync('zip', ['-r', zip, '.'], { cwd: dist, stdio: 'inherit' });
console.log(`built ${path.relative(root, zip)} (${bytes} bytes unzipped)`);
