import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { unzipSync } from 'fflate';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceVrm = resolve(root, 'shibajii.vrm');
const outputDir = resolve(root, 'out/shibajii');
const outputPng = resolve(outputDir, 'spritesheet.png');
const outputWebp = resolve(outputDir, 'spritesheet.webp');
const manifestPath = resolve(outputDir, 'pet.json');
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function decodeDataUrl(dataUrl) {
  const prefix = 'data:image/png;base64,';
  if (!dataUrl.startsWith(prefix)) {
    throw new Error('Capture did not return a PNG data URL.');
  }
  return Buffer.from(dataUrl.slice(prefix.length), 'base64');
}

function findZipEntry(files, suffix) {
  const entryName = Object.keys(files).find((name) => name.endsWith(suffix));
  if (!entryName) throw new Error(`ZIP did not contain ${suffix}`);
  return files[entryName];
}

async function main() {
  if (!existsSync(sourceVrm)) {
    throw new Error('Local test file shibajii.vrm is missing. Add a private VRM locally to run npm run capture.');
  }
  await mkdir(outputDir, { recursive: true });

  const server = await createServer({
    root,
    logLevel: 'warn',
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: false,
    },
  });
  await server.listen();
  const address = server.resolvedUrls?.local[0] ?? 'http://127.0.0.1:5173/';

  const launchOptions = existsSync(chromePath)
    ? { headless: true, executablePath: chromePath }
    : { headless: true };
  const browser = await chromium.launch(launchOptions);

  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900, deviceScaleFactor: 1 },
    });
    page.on('console', (message) => {
      if (message.type() === 'error') {
        console.error(`[browser:${message.type()}] ${message.text()}`);
      }
    });
    page.on('pageerror', (error) => {
      console.error(`[browser:pageerror] ${error.message}`);
    });

    await page.goto(address, { waitUntil: 'networkidle' });
    await page.setInputFiles('[data-testid="vrm-file"]', sourceVrm);
    await page.waitForFunction(
      () => document.querySelector('[data-testid="status"]')?.getAttribute('data-status-key') === 'loaded',
      null,
      { timeout: 30_000 },
    );
    await page.getByTestId('generate-package').click();
    await page.waitForFunction(
      () => document.querySelector('[data-testid="status"]')?.getAttribute('data-status-key') === 'zipReady',
      null,
      { timeout: 60_000 },
    );

    const atlasDataUrl = await page.evaluate(() => window.petBuilderDebug?.getAtlasDataUrl());
    if (typeof atlasDataUrl !== 'string') {
      throw new Error('The page did not expose an atlas PNG for validation.');
    }
    await writeFile(outputPng, decodeDataUrl(atlasDataUrl));

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('download-package').click();
    const download = await downloadPromise;
    const zipPath = resolve(outputDir, await download.suggestedFilename());
    await download.saveAs(zipPath);

    const zipBytes = await import('node:fs/promises').then((fs) => fs.readFile(zipPath));
    const files = unzipSync(new Uint8Array(zipBytes));
    await writeFile(manifestPath, findZipEntry(files, '/pet.json'));
    await writeFile(outputWebp, findZipEntry(files, '/spritesheet.webp'));

    console.log(
      JSON.stringify(
        {
          ok: true,
          png: outputPng,
          webp: outputWebp,
          manifest: manifestPath,
          zip: zipPath,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
