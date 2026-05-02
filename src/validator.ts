import {
  ATLAS_COLUMNS,
  ATLAS_HEIGHT,
  ATLAS_ROWS,
  ATLAS_WIDTH,
  CELL_HEIGHT,
  CELL_WIDTH,
  STATE_SPECS,
  type PetManifest,
} from './pet-contract';

export type ValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

function alphaNonZeroCount(data: Uint8ClampedArray, imageWidth: number, row: number, column: number): number {
  let count = 0;
  const startX = column * CELL_WIDTH;
  const startY = row * CELL_HEIGHT;
  for (let y = startY; y < startY + CELL_HEIGHT; y += 1) {
    for (let x = startX; x < startX + CELL_WIDTH; x += 1) {
      const alphaIndex = (y * imageWidth + x) * 4 + 3;
      if (data[alphaIndex] !== 0) count += 1;
    }
  }
  return count;
}

export function validateAtlas(canvas: HTMLCanvasElement): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (canvas.width !== ATLAS_WIDTH || canvas.height !== ATLAS_HEIGHT) {
    errors.push(`Expected atlas ${ATLAS_WIDTH}x${ATLAS_HEIGHT}, got ${canvas.width}x${canvas.height}.`);
    return { ok: false, errors, warnings };
  }

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    return { ok: false, errors: ['Could not inspect atlas pixels.'], warnings };
  }

  const imageData = context.getImageData(0, 0, ATLAS_WIDTH, ATLAS_HEIGHT);
  for (let row = 0; row < ATLAS_ROWS; row += 1) {
    const spec = STATE_SPECS[row];
    for (let column = 0; column < ATLAS_COLUMNS; column += 1) {
      const nonTransparent = alphaNonZeroCount(imageData.data, imageData.width, row, column);
      if (column < spec.frames && nonTransparent < 50) {
        errors.push(`${spec.state} frame ${column} is empty or too sparse (${nonTransparent} pixels).`);
      }
      if (column >= spec.frames && nonTransparent !== 0) {
        errors.push(`${spec.state} unused frame ${column} is not transparent (${nonTransparent} pixels).`);
      }
      if (column < spec.frames && nonTransparent > CELL_WIDTH * CELL_HEIGHT * 0.95) {
        warnings.push(`${spec.state} frame ${column} is almost opaque; inspect for background leakage.`);
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function validateManifest(manifest: PetManifest): ValidationResult {
  const errors: string[] = [];
  if (!manifest.id) errors.push('pet.json id is required.');
  if (!manifest.displayName) errors.push('pet.json displayName is required.');
  if (!manifest.description) errors.push('pet.json description is required.');
  if (manifest.spritesheetPath !== 'spritesheet.webp') {
    errors.push('pet.json spritesheetPath must be spritesheet.webp.');
  }
  return { ok: errors.length === 0, errors, warnings: [] };
}
