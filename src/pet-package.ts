import { strToU8, zipSync } from 'fflate';
import { makeManifest, type PetManifest, type PetPackageConfig } from './pet-contract';

export type PetPackage = {
  manifest: PetManifest;
  zipBytes: Uint8Array;
  zipFileName: string;
};

export function makePetPackage(config: PetPackageConfig, spritesheetWebp: Uint8Array): PetPackage {
  const manifest = makeManifest(config);
  const folder = manifest.id;
  const readme = [
    `${manifest.displayName} Codex pet`,
    '',
    'Install:',
    '1. Unzip this archive.',
    `2. Move the "${folder}" folder to ~/.codex/pets/.`,
    '3. Reload Codex and select the pet from settings.',
    '',
    'This package was generated in the browser; the source VRM was not uploaded.',
  ].join('\n');

  const zipBytes = zipSync({
    [folder]: {
      'pet.json': strToU8(`${JSON.stringify(manifest, null, 2)}\n`),
      'spritesheet.webp': spritesheetWebp,
      'README.txt': strToU8(`${readme}\n`),
    },
  });

  return {
    manifest,
    zipBytes,
    zipFileName: `${manifest.id}-codex-pet.zip`,
  };
}

export function downloadBytes(bytes: Uint8Array, fileName: string, mimeType: string): void {
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
