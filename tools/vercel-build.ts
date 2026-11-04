import { spawnSync } from 'node:child_process';
import { deploymentMode } from './deploy/mode';
const mode = deploymentMode(process.env.DAR_CONTENT_MODE);
console.log(
  `Vercel ${mode} build${mode === 'prototype' ? ' — unapproved cards remain visibly marked DRAFT' : ' — advisory approval required for named cards'}`,
);
const result = spawnSync(
  'pnpm',
  ['run', mode === 'prototype' ? 'build:preview' : 'build'],
  { stdio: 'inherit', env: process.env },
);
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
