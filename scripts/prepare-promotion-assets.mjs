import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = resolve(root, 'out/shibajii');
const sourceAtlas = resolve(sourceDir, 'spritesheet.png');
const sourceManifest = resolve(sourceDir, 'pet.json');
const targetDir = resolve(root, 'public/promotion-assets');
const targetAtlas = resolve(targetDir, 'spritesheet.png');
const targetManifest = resolve(targetDir, 'pet.json');

if (!existsSync(sourceAtlas) || !existsSync(sourceManifest)) {
  throw new Error('Promotion assets are missing. Run `npm run capture` before rendering the promotion video.');
}

await mkdir(targetDir, { recursive: true });
await copyFile(sourceAtlas, targetAtlas);
await copyFile(sourceManifest, targetManifest);

const manifest = JSON.parse(await readFile(targetManifest, 'utf8'));
await writeFile(
  resolve(targetDir, 'README.txt'),
  [
    'Local-only Remotion promotion assets.',
    '',
    `Pet ID: ${manifest.id}`,
    `Display name: ${manifest.displayName}`,
    '',
    'These files are generated from ignored local output and must not be committed.',
    '',
  ].join('\n'),
);

console.log(
  JSON.stringify(
    {
      ok: true,
      atlas: targetAtlas,
      manifest: targetManifest,
    },
    null,
    2,
  ),
);
