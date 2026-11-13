#!/usr/bin/env node
/** Verify the approved exhibit without rebuilding or approximating its artwork. */
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(repo, 'web/public/exhibits/al-bayt-al-muzlim');
const manifestName = 'approved-source.json';
const approvedCommit = 'c784d7c27a8120d85242175641b029ddfbd12285';
const expectedRuntime = [
  'index.html', 'style.css', 'app.js', 'renderer.js', 'software.js',
  'scene.js', 'courtyard.js', 'instruments.js',
  'observation-instruments.js', 'instrument-experiments.js',
];
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--source')) {
  throw new Error('Usage: node tools/verify-dark-room-exhibit.mjs [--source <approved dist directory>]');
}
const approvedSource = args.length ? path.resolve(args[1]) : null;
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const fail = (message) => { throw new Error(`Dark-room fidelity: ${message}`); };

async function listFiles(root, prefix = '') {
  const result = [];
  for (const entry of await fs.readdir(path.join(root, prefix), { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) fail(`symbolic link is not permitted: ${relative}`);
    if (entry.isDirectory()) result.push(...await listFiles(root, relative));
    else if (entry.isFile()) result.push(relative);
    else fail(`unsupported file type: ${relative}`);
  }
  return result.sort();
}

const manifest = JSON.parse(await fs.readFile(path.join(directory, manifestName), 'utf8'));
if (manifest.schemaVersion !== 1 || manifest.source?.commit !== approvedCommit) {
  fail('the manifest does not identify the approved source revision');
}
if (manifest.entrypoint !== 'index.html' || !Array.isArray(manifest.files)) fail('invalid manifest');
const entries = new Map();
const contents = new Map();
for (const entry of manifest.files) {
  if (typeof entry.path !== 'string' || entry.path.includes('\\') ||
      path.posix.isAbsolute(entry.path) || path.posix.normalize(entry.path) !== entry.path ||
      entry.path.startsWith('../') || entry.path === '..' || entry.path === manifestName) {
    fail(`unsafe manifest path: ${entry.path}`);
  }
  if (entries.has(entry.path)) fail(`duplicate manifest path: ${entry.path}`);
  if (!Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || !/^[0-9a-f]{64}$/.test(entry.sha256)) {
    fail(`invalid checksum metadata: ${entry.path}`);
  }
  entries.set(entry.path, entry);
}
for (const file of expectedRuntime) if (!entries.has(file)) fail(`missing runtime file: ${file}`);
const actual = await listFiles(directory);
const expected = [...entries.keys(), manifestName].sort();
if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  fail(`unexpected or missing files; expected only the approved manifest inventory\nactual=${actual.join(', ')}`);
}
let totalBytes = 0;
for (const [relative, entry] of entries) {
  const bytes = await fs.readFile(path.join(directory, relative));
  if (bytes.length !== entry.bytes || hash(bytes) !== entry.sha256) fail(`changed approved file: ${relative}`);
  if (approvedSource) {
    const source = await fs.readFile(path.join(approvedSource, relative));
    if (!bytes.equals(source)) fail(`differs from approved source: ${relative}`);
  }
  if (relative.endsWith('.zip') && bytes.length >= 30_000_000) fail(`ZIP exceeds the requested limit: ${relative}`);
  contents.set(relative, bytes);
  totalBytes += bytes.length;
}

let checkedReferences = 0;
function checkReference(source, raw) {
  const reference = raw.replace(/&amp;/g, '&').trim();
  if (!reference || reference.startsWith('#') || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(reference)) return;
  if (reference.startsWith('/')) fail(`root-relative reference would escape the exhibit: ${source} -> ${reference}`);
  let resource;
  try { resource = decodeURIComponent(reference.split(/[?#]/, 1)[0]); }
  catch { fail(`invalid reference encoding: ${source} -> ${reference}`); }
  if (!resource) return;
  let resolved = path.posix.normalize(path.posix.join(path.posix.dirname(source), resource));
  if (resolved === '.') resolved = 'index.html';
  else if (resource.endsWith('/')) resolved = path.posix.join(resolved, 'index.html');
  if (resolved.startsWith('../') || resolved === '..' || !entries.has(resolved)) {
    fail(`unresolved local reference: ${source} -> ${reference}`);
  }
  checkedReferences++;
}
for (const [relative, bytes] of contents) {
  if (!/\.(?:html|css|js)$/.test(relative)) continue;
  const source = bytes.toString('utf8');
  if (relative.endsWith('.html')) {
    for (const match of source.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/g)) checkReference(relative, match[1]);
  }
  if (relative.endsWith('.js')) {
    for (const match of source.matchAll(/\b(?:import|export)\s+(?:[^;\n]*?\s+from\s*)?["']([^"']+)["']/g)) checkReference(relative, match[1]);
    for (const match of source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) checkReference(relative, match[1]);
  }
  if (relative.endsWith('.css')) {
    for (const match of source.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/g)) checkReference(relative, match[1]);
  }
}

console.log(`Approved dark-room exhibit verified: ${entries.size} unchanged files, ${checkedReferences} local references, ${totalBytes.toLocaleString('en-US')} bytes.`);
console.log(`Source: ${approvedCommit}${approvedSource ? ' (also compared byte-for-byte with the supplied source directory)' : ''}`);
