import { encode } from '@jsquash/webp';
import { ATLAS_HEIGHT, ATLAS_WIDTH } from './pet-contract';

export async function encodeCanvasToLosslessWebp(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Could not read atlas canvas.');
  if (canvas.width !== ATLAS_WIDTH || canvas.height !== ATLAS_HEIGHT) {
    throw new Error(`Atlas must be ${ATLAS_WIDTH}x${ATLAS_HEIGHT}.`);
  }

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const buffer = await encode(imageData, {
    quality: 100,
    method: 6,
    lossless: 1,
    exact: 1,
    alpha_quality: 100,
    near_lossless: 100,
  });
  return new Uint8Array(buffer);
}

export function canvasToPngDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}
