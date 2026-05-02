import { readFile } from 'node:fs/promises';
import { PNG } from 'pngjs';

const atlasPath = process.argv[2] || 'out/shibajii/spritesheet.png';
const width = 1536;
const height = 1872;
const cellWidth = 192;
const cellHeight = 208;
const states = [
  ['idle', 6],
  ['running-right', 8],
  ['running-left', 8],
  ['waving', 4],
  ['jumping', 5],
  ['failed', 8],
  ['waiting', 6],
  ['running', 6],
  ['review', 6],
];

function countAlpha(image, col, row) {
  let count = 0;
  for (let y = row * cellHeight; y < (row + 1) * cellHeight; y += 1) {
    for (let x = col * cellWidth; x < (col + 1) * cellWidth; x += 1) {
      const index = (y * image.width + x) * 4 + 3;
      if (image.data[index] !== 0) count += 1;
    }
  }
  return count;
}

const image = PNG.sync.read(await readFile(atlasPath));
const errors = [];
const warnings = [];

if (image.width !== width || image.height !== height) {
  errors.push(`expected ${width}x${height}, got ${image.width}x${image.height}`);
}

for (let row = 0; row < states.length; row += 1) {
  const [state, usedFrames] = states[row];
  for (let col = 0; col < 8; col += 1) {
    const alphaPixels = countAlpha(image, col, row);
    if (col < usedFrames && alphaPixels < 50) {
      errors.push(`${state} frame ${col} is empty or too sparse (${alphaPixels} alpha pixels)`);
    }
    if (col >= usedFrames && alphaPixels !== 0) {
      errors.push(`${state} unused frame ${col} is not transparent (${alphaPixels} alpha pixels)`);
    }
    if (col < usedFrames && alphaPixels > cellWidth * cellHeight * 0.95) {
      warnings.push(`${state} frame ${col} is nearly opaque; inspect for background leakage`);
    }
  }
}

const result = {
  ok: errors.length === 0,
  file: atlasPath,
  width: image.width,
  height: image.height,
  errors,
  warnings,
};

console.log(JSON.stringify(result, null, 2));
if (errors.length > 0) {
  process.exit(1);
}
