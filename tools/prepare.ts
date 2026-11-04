import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
try {
  await fs.access('art/parts/bases/adult-man.json');
} catch {
  execFileSync('pnpm', ['gen:placeholder'], { stdio: 'inherit' });
}
execFileSync('pnpm', ['build:assets'], { stdio: 'inherit' });
