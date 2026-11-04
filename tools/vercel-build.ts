import { spawnSync } from 'node:child_process';
import { deploymentMode } from './deploy/mode';
const mode = deploymentMode(process.env.VERCEL_ENV);
console.log(
  `Vercel ${mode} build${mode === 'preview' ? ' — unapproved cards remain visibly marked DRAFT' : ' — advisory approval required for named cards'}`,
);
const result = spawnSync(
  'pnpm',
  ['run', mode === 'preview' ? 'build:preview' : 'build'],
  { stdio: 'inherit', env: process.env },
);
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
