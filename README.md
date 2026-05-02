# VRM Codex Pet Builder

A browser-only tool for turning a local VRM/GLB model into a Codex custom pet package.

The app renders the model with Three.js and `@pixiv/three-vrm`, builds the fixed Codex pet atlas, encodes a transparent WebP in the browser, validates the result, and downloads a ZIP containing:

```text
<pet-id>/
├── pet.json
├── spritesheet.webp
└── README.txt
```

## Privacy

VRM files are handled with browser object URLs. They are not uploaded to a server by this app.

Private character files and generated outputs are ignored by git:

- `*.vrm`, `*.vrma`, `*.glb`, `*.gltf`
- `public/models/`
- `out/`
- `shibajii.vrm`

## Commands

```bash
npm run dev
npm run build
npm run capture
npm run validate
npm run install-pet
npm run video:assets
npm run video:render
```

- `npm run dev` starts the Vite app.
- `npm run build` runs TypeScript and production bundling.
- `npm run capture` is a local regression helper that uploads a private local `shibajii.vrm`, generates the ZIP through the browser UI, and extracts generated files into `out/shibajii/`.
- `npm run validate` checks the generated PNG atlas dimensions, used frames, and transparent unused cells.
- `npm run install-pet` copies `out/shibajii/pet.json` and `out/shibajii/spritesheet.webp` into `${CODEX_HOME:-$HOME/.codex}/pets/shibajii`.
- `npm run video:assets` copies ignored local generated files from `out/shibajii/` into ignored Remotion assets under `public/promotion-assets/`.
- `npm run video:studio` opens Remotion Studio for the promotional composition.
- `npm run video:still` renders a still frame to `out/promotion/promo-frame.png`.
- `npm run video:render` renders the promotional MP4 to `out/promotion/vrm-codex-pet-builder-promo.mp4`.

`npm run capture` and `npm run install-pet` are local development helpers, not required for the public static app.

## Promotion video

The `promotion` branch includes a Remotion composition named `Promotion`. It reads the locally generated atlas from `out/shibajii/spritesheet.png` via `npm run video:assets`, while keeping character assets out of git.

## License

MIT
