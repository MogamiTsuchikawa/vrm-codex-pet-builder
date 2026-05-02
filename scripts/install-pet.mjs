import { cp, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'out/shibajii');
const codexHome = process.env.CODEX_HOME || resolve(process.env.HOME || '.', '.codex');
const target = resolve(codexHome, 'pets/shibajii');

async function main() {
  if (!existsSync(resolve(source, 'pet.json')) || !existsSync(resolve(source, 'spritesheet.webp'))) {
    throw new Error('Run npm run capture before npm run install-pet.');
  }
  await mkdir(target, { recursive: true });
  await cp(resolve(source, 'pet.json'), resolve(target, 'pet.json'));
  await cp(resolve(source, 'spritesheet.webp'), resolve(target, 'spritesheet.webp'));
  console.log(JSON.stringify({ ok: true, target }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
