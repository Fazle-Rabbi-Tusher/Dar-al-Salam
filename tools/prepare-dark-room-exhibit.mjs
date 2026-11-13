#!/usr/bin/env node
/** Materialize two approved GLBs from the unchanged, checked-in ZIP. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../web/public/exhibits/al-bayt-al-muzlim',
);
const allowlist = [
  'assets/al-bayt-al-muzlim-complete.glb',
  'assets/al-bayt-al-muzlim-cutaway.glb',
];
const archiveName = 'assets/al-bayt-al-muzlim-collection.zip';
const fail = (message) => {
  throw new Error(`Dark-room extraction: ${message}`);
};
const manifest = JSON.parse(
  await fs.readFile(path.join(root, 'approved-source.json'), 'utf8'),
);
if (manifest.source?.commit !== 'c784d7c27a8120d85242175641b029ddfbd12285')
  fail('unexpected approved source revision');
const records = new Map();
for (const name of [archiveName, ...allowlist]) {
  const matches = manifest.files?.filter((entry) => entry.path === name) ?? [];
  if (
    matches.length !== 1 ||
    !Number.isSafeInteger(matches[0].bytes) ||
    matches[0].bytes < 1 ||
    !/^[a-f0-9]{64}$/.test(matches[0].sha256)
  )
    fail(`invalid manifest entry: ${name}`);
  records.set(name, matches[0]);
}
function verify(name, data) {
  const expected = records.get(name);
  if (
    data.length !== expected.bytes ||
    createHash('sha256').update(data).digest('hex') !== expected.sha256
  )
    fail(`size or SHA-256 mismatch: ${name}`);
}
async function existing(name) {
  try {
    const location = path.join(root, name),
      stat = await fs.lstat(location);
    if (!stat.isFile() || stat.isSymbolicLink())
      fail(`not a regular file: ${name}`);
    verify(name, await fs.readFile(location));
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

const archive = await fs.readFile(path.join(root, archiveName));
verify(archiveName, archive);
const missing = [];
for (const name of allowlist) if (!(await existing(name))) missing.push(name);
if (missing.length) {
  // Read only the central directory; never extract arbitrary archive paths.
  let eocd = -1;
  for (
    let i = archive.length - 22;
    i >= Math.max(0, archive.length - 65557);
    i--
  ) {
    if (
      archive.readUInt32LE(i) === 0x06054b50 &&
      i + 22 + archive.readUInt16LE(i + 20) === archive.length
    ) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) fail('missing ZIP end record');
  const count = archive.readUInt16LE(eocd + 10),
    size = archive.readUInt32LE(eocd + 12),
    start = archive.readUInt32LE(eocd + 16);
  if (
    archive.readUInt16LE(eocd + 4) ||
    archive.readUInt16LE(eocd + 6) ||
    archive.readUInt16LE(eocd + 8) !== count ||
    count === 0xffff ||
    size === 0xffffffff ||
    start === 0xffffffff
  )
    fail('multi-disk and ZIP64 archives are unsupported');
  const end = start + size;
  if (end !== eocd || start < 0 || start > end)
    fail('invalid central-directory bounds');
  const entries = new Map();
  let cursor = start;
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || archive.readUInt32LE(cursor) !== 0x02014b50)
      fail('invalid central-directory entry');
    const nameLength = archive.readUInt16LE(cursor + 28),
      extraLength = archive.readUInt16LE(cursor + 30),
      commentLength = archive.readUInt16LE(cursor + 32),
      next = cursor + 46 + nameLength + extraLength + commentLength;
    if (next > end) fail('central-directory entry exceeds bounds');
    const name = archive.toString(
      'utf8',
      cursor + 46,
      cursor + 46 + nameLength,
    );
    if (allowlist.includes(name)) {
      if (entries.has(name)) fail(`duplicate approved entry: ${name}`);
      const flags = archive.readUInt16LE(cursor + 8),
        method = archive.readUInt16LE(cursor + 10),
        compressed = archive.readUInt32LE(cursor + 20),
        uncompressed = archive.readUInt32LE(cursor + 24),
        offset = archive.readUInt32LE(cursor + 42);
      if (
        flags & 1 ||
        method !== 8 ||
        archive.readUInt16LE(cursor + 34) ||
        uncompressed !== records.get(name).bytes ||
        compressed === 0xffffffff ||
        offset === 0xffffffff
      )
        fail(`unsupported or inconsistent entry: ${name}`);
      entries.set(name, { flags, method, compressed, offset });
    }
    cursor = next;
  }
  if (cursor !== end) fail('central-directory length mismatch');
  const pending = [];
  for (const name of missing) {
    const entry = entries.get(name);
    if (!entry) fail(`approved file absent from ZIP: ${name}`);
    const offset = entry.offset;
    if (offset + 30 > start || archive.readUInt32LE(offset) !== 0x04034b50)
      fail(`invalid local header: ${name}`);
    const nameLength = archive.readUInt16LE(offset + 26),
      extraLength = archive.readUInt16LE(offset + 28),
      dataStart = offset + 30 + nameLength + extraLength,
      dataEnd = dataStart + entry.compressed;
    if (
      dataEnd > start ||
      archive.readUInt16LE(offset + 6) !== entry.flags ||
      archive.readUInt16LE(offset + 8) !== entry.method ||
      archive.toString('utf8', offset + 30, offset + 30 + nameLength) !== name
    )
      fail(`inconsistent local header: ${name}`);
    const data = inflateRawSync(archive.subarray(dataStart, dataEnd), {
      maxOutputLength: records.get(name).bytes,
    });
    verify(name, data);
    pending.push({ name, data });
  }
  // Validate every payload before writing any. Hard-link publication is atomic
  // and refuses to overwrite a file created concurrently after the first check.
  for (const { name, data } of pending) {
    const destination = path.join(root, name),
      temporary = destination + `.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporary, data, { flag: 'wx', mode: 0o644 });
      try {
        await fs.link(temporary, destination);
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        await existing(name);
      }
    } finally {
      await fs.rm(temporary, { force: true });
    }
  }
}
console.log(
  `Approved dark-room models ready: ${missing.length} extracted; ${allowlist.length - missing.length} already byte-identical.`,
);
