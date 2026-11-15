import { writeJson } from './build/io';
import { supportingCharacters } from '../packages/shared/supporting-cast';

await writeJson('content/ambient/supporting-cast.json', supportingCharacters());
console.log(
  'Prepared 17 sparse supporting roles; existing named people, lab staff and listeners are retained.',
);
