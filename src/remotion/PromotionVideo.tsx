import type { CSSProperties } from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

const palette = {
  ink: '#edf4ef',
  muted: '#a9b7b0',
  panel: '#1c2426',
  panelDeep: '#111718',
  line: 'rgba(255,255,255,0.12)',
  accent: '#8bd3b9',
  accentDark: '#173329',
  blue: '#7b94d7',
  yellow: '#e6c878',
  red: '#e77b74',
};

type SceneCopy = {
  eyebrow: string;
  title: string;
  body: string;
  jp: string;
};

const scenes: SceneCopy[] = [
  {
    eyebrow: 'Browser-only creator',
    title: 'Turn VRM avatars into Codex pets.',
    body: 'Upload locally. Preview states. Export the exact pet package.',
    jp: 'VRMをブラウザ内で読み込み、Codex用ペット素材へ。',
  },
  {
    eyebrow: 'Private by design',
    title: 'Your model never leaves the browser.',
    body: 'Object URLs keep character files local while the builder renders previews in real time.',
    jp: 'キャラクターファイルはアップロードせず、手元のブラウザで処理。',
  },
  {
    eyebrow: 'Codex-ready atlas',
    title: 'Render every state into one transparent WebP.',
    body: 'Idle, run, wave, jump, fail, wait, run-in-place, and review states in the fixed 8x9 grid.',
    jp: '8x9グリッド、192x208セル、未使用セルは透明。',
  },
  {
    eyebrow: 'One click package',
    title: 'Download a pet.json + spritesheet.zip.',
    body: 'Validate dimensions, alpha, and unused cells before sharing or installing.',
    jp: '検証済みZIPをそのまま配布・配置できます。',
  },
];

const states = ['Idle', 'Run R', 'Run L', 'Wave', 'Jump', 'Failed', 'Waiting', 'Run', 'Review'];

const fit = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
} as const;

function fade(frame: number, start: number, end: number): number {
  return interpolate(frame, [start, start + 14, end - 14, end], [0, 1, 1, 0], fit);
}

function progress(frame: number, start: number, end: number): number {
  return interpolate(frame, [start, end], [0, 1], fit);
}

function ease(frame: number, input: [number, number], output: [number, number]): number {
  return interpolate(frame, input, output, {
    ...fit,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
}

export const PromotionVideo = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const activeScene = Math.min(scenes.length - 1, Math.floor(frame / (3 * fps)));
  const sceneStart = activeScene * 3 * fps;
  const sceneEnd = sceneStart + 3 * fps;
  const sceneFade = fade(frame, sceneStart, sceneEnd);
  const local = progress(frame, sceneStart, sceneEnd);
  const copy = scenes[activeScene];
  const heroSpring = spring({
    frame: frame - sceneStart,
    fps,
    config: { damping: 18, stiffness: 110, mass: 0.8 },
  });

  return (
    <AbsoluteFill style={styles.stage}>
      <div style={styles.gridTexture} />
      <div style={styles.header}>
        <div style={styles.brand}>VRM Codex Pet Builder</div>
        <div style={styles.branch}>promotion branch</div>
      </div>

      <div style={styles.copyColumn}>
        <div style={{ ...styles.eyebrow, opacity: sceneFade }}>{copy.eyebrow}</div>
        <h1
          style={{
            ...styles.title,
            opacity: sceneFade,
            transform: `translateY(${(1 - heroSpring) * 26}px)`,
          }}
        >
          {copy.title}
        </h1>
        <p style={{ ...styles.body, opacity: sceneFade }}>{copy.body}</p>
        <p style={{ ...styles.jp, opacity: sceneFade }}>{copy.jp}</p>
        <div style={styles.featureRow}>
          <Pill active={activeScene >= 0}>Local VRM</Pill>
          <Pill active={activeScene >= 1}>No upload</Pill>
          <Pill active={activeScene >= 2}>Transparent WebP</Pill>
          <Pill active={activeScene >= 3}>pet.json</Pill>
        </div>
      </div>

      <div
        style={{
          ...styles.visualColumn,
          transform: `translateX(${ease(frame, [0, 48], [80, 0])}px)`,
        }}
      >
        <BuilderMockup scene={activeScene} local={local} />
      </div>

      <div style={styles.footer}>
        <Timeline frame={frame} fps={fps} />
        <span>Static Vite app · React + Three.js + Remotion</span>
      </div>
    </AbsoluteFill>
  );
};

function BuilderMockup({ scene, local }: { scene: number; local: number }) {
  const frame = useCurrentFrame();
  const pulse = (Math.sin(frame / 9) + 1) / 2;
  const petTurn = scene === 2 ? interpolate(local, [0, 1], [-7, 7], fit) : interpolate(pulse, [0, 1], [-3, 3]);
  const packageReady = scene === 3 ? ease(local, [0.2, 0.62], [0, 1]) : 0;

  return (
    <div style={styles.mockup}>
      <div style={styles.mockupTopbar}>
        <div style={styles.windowDots}>
          <span style={{ ...styles.dot, background: palette.red }} />
          <span style={{ ...styles.dot, background: palette.yellow }} />
          <span style={{ ...styles.dot, background: palette.accent }} />
        </div>
        <div style={styles.urlBar}>vrm-codex-pet-builder.pages.dev</div>
      </div>

      <div style={styles.mockupBody}>
        <div style={styles.previewPanel}>
          <div style={styles.panelHeader}>
            <span>Preview</span>
            <span style={styles.cellBadge}>192x208</span>
          </div>
          <div style={styles.previewStage}>
            <div style={styles.cellFrame}>
              <Mascot scale={1 + pulse * 0.035} rotate={petTurn} wave={scene === 1 || scene === 2} />
            </div>
          </div>
          <div style={styles.stateGrid}>
            {states.map((state, index) => (
              <div
                key={state}
                style={{
                  ...styles.stateButton,
                  ...(index === scene || (scene === 2 && index < 5) ? styles.stateActive : null),
                }}
              >
                {state}
              </div>
            ))}
          </div>
        </div>

        <div style={styles.controlPanel}>
          <UploadCard scene={scene} />
          <AtlasCard scene={scene} />
          <PackageCard ready={packageReady} />
        </div>
      </div>
    </div>
  );
}

function UploadCard({ scene }: { scene: number }) {
  const uploadProgress = scene === 0 ? 0.38 : 1;
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>1. Load VRM</div>
      <div style={styles.dropzone}>
        <div style={styles.fileIcon}>VRM</div>
        <div style={styles.dropText}>Choose VRM / GLB</div>
      </div>
      <div style={styles.progressTrack}>
        <div style={{ ...styles.progressFill, width: `${uploadProgress * 100}%` }} />
      </div>
      <div style={styles.microcopy}>Processed locally. Nothing is uploaded.</div>
    </div>
  );
}

function AtlasCard({ scene }: { scene: number }) {
  const active = scene >= 2;
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>2. Atlas</div>
      <div style={styles.atlasGrid}>
        {Array.from({ length: 72 }).map((_, index) => {
          const row = Math.floor(index / 8);
          const col = index % 8;
          const empty = col >= (row === 0 ? 6 : row === 3 ? 4 : row === 4 ? 5 : row > 5 ? 6 : 8);
          return (
            <div key={index} style={{ ...styles.atlasCell, opacity: active ? (empty ? 0.16 : 1) : 0.34 }}>
              {!empty ? <MiniPet delay={index * 0.07} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PackageCard({ ready }: { ready: number }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>3. Generate</div>
      <div style={styles.zipBox}>
        <div style={{ ...styles.zipLid, transform: `translateY(${(1 - ready) * 18}px)` }} />
        <div style={styles.zipBody}>
          <span>pet.json</span>
          <span>spritesheet.webp</span>
        </div>
      </div>
      <div style={{ ...styles.readyLine, opacity: ready }}>ZIP package is ready.</div>
    </div>
  );
}

function Mascot({ scale, rotate, wave }: { scale: number; rotate: number; wave: boolean }) {
  const frame = useCurrentFrame();
  const arm = wave ? Math.sin(frame / 4) * 16 - 22 : Math.sin(frame / 12) * 6;
  return (
    <div
      style={{
        ...styles.mascot,
        transform: `scale(${scale}) rotate(${rotate}deg)`,
      }}
    >
      <div style={styles.antenna} />
      <div style={styles.face}>
        <span style={styles.eye} />
        <span style={styles.eye} />
      </div>
      <div style={styles.mouth} />
      <span style={{ ...styles.arm, left: -32, transform: 'rotate(10deg)' }} />
      <span style={{ ...styles.arm, right: -32, transform: `rotate(${arm}deg)` }} />
      <span style={{ ...styles.foot, left: 36 }} />
      <span style={{ ...styles.foot, right: 36 }} />
    </div>
  );
}

function MiniPet({ delay }: { delay: number }) {
  const frame = useCurrentFrame();
  const hop = Math.sin(frame / 8 + delay) * 2;
  return <div style={{ ...styles.miniPet, transform: `translateY(${hop}px)` }} />;
}

function Pill({ active, children }: { active: boolean; children: string }) {
  return <div style={{ ...styles.pill, ...(active ? styles.pillActive : null) }}>{children}</div>;
}

function Timeline({ frame, fps }: { frame: number; fps: number }) {
  return (
    <div style={styles.timeline}>
      {scenes.map((scene, index) => {
        const active = frame >= index * 3 * fps;
        const current = Math.floor(frame / (3 * fps)) === index;
        return (
          <div key={scene.eyebrow} style={{ ...styles.timelineSegment, ...(active ? styles.timelineDone : null) }}>
            <div
              style={{
                ...styles.timelineFill,
                width: current ? `${progress(frame, index * 3 * fps, (index + 1) * 3 * fps) * 100}%` : active ? '100%' : '0%',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  stage: {
    overflow: 'hidden',
    background: '#0f1314',
    color: palette.ink,
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", sans-serif',
  },
  gridTexture: {
    position: 'absolute',
    inset: 0,
    opacity: 0.4,
    backgroundImage:
      'linear-gradient(rgba(255,255,255,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
    backgroundSize: '44px 44px',
  },
  header: {
    position: 'absolute',
    top: 54,
    left: 70,
    right: 70,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontWeight: 780,
  },
  brand: {
    fontSize: 31,
  },
  branch: {
    padding: '10px 16px',
    border: `1px solid ${palette.line}`,
    borderRadius: 8,
    background: 'rgba(255,255,255,0.06)',
    color: palette.accent,
    fontSize: 22,
  },
  copyColumn: {
    position: 'absolute',
    left: 80,
    top: 185,
    width: 690,
  },
  eyebrow: {
    color: palette.accent,
    fontSize: 28,
    fontWeight: 820,
    marginBottom: 24,
  },
  title: {
    margin: 0,
    fontSize: 84,
    lineHeight: 1.02,
    letterSpacing: 0,
    fontWeight: 860,
  },
  body: {
    margin: '34px 0 0',
    color: palette.muted,
    fontSize: 34,
    lineHeight: 1.35,
  },
  jp: {
    margin: '26px 0 0',
    color: '#d6e6de',
    fontSize: 27,
    lineHeight: 1.45,
  },
  featureRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 44,
  },
  pill: {
    padding: '11px 16px',
    border: `1px solid ${palette.line}`,
    borderRadius: 8,
    background: 'rgba(255,255,255,0.05)',
    color: palette.muted,
    fontSize: 20,
    fontWeight: 760,
  },
  pillActive: {
    borderColor: 'rgba(139,211,185,0.65)',
    background: 'rgba(139,211,185,0.14)',
    color: palette.accent,
  },
  visualColumn: {
    position: 'absolute',
    right: 78,
    top: 120,
    width: 930,
    height: 880,
  },
  mockup: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    border: `1px solid ${palette.line}`,
    borderRadius: 14,
    background: palette.panel,
    boxShadow: '0 48px 120px rgba(0,0,0,0.34)',
  },
  mockupTopbar: {
    height: 68,
    display: 'flex',
    alignItems: 'center',
    gap: 18,
    padding: '0 24px',
    borderBottom: `1px solid ${palette.line}`,
    background: '#222b2e',
  },
  windowDots: {
    display: 'flex',
    gap: 9,
  },
  dot: {
    width: 13,
    height: 13,
    borderRadius: 999,
  },
  urlBar: {
    flex: 1,
    padding: '9px 16px',
    border: `1px solid ${palette.line}`,
    borderRadius: 8,
    color: palette.muted,
    fontSize: 18,
    background: 'rgba(0,0,0,0.18)',
  },
  mockupBody: {
    display: 'grid',
    gridTemplateColumns: '1.25fr 0.75fr',
    gap: 20,
    padding: 24,
  },
  previewPanel: {
    minHeight: 620,
    padding: 18,
    border: `1px solid ${palette.line}`,
    borderRadius: 10,
    background: palette.panelDeep,
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 21,
    fontWeight: 800,
    marginBottom: 16,
  },
  cellBadge: {
    padding: '7px 11px',
    border: '1px solid rgba(139,211,185,0.5)',
    borderRadius: 8,
    color: palette.accent,
    fontSize: 17,
  },
  previewStage: {
    height: 350,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 8,
    background:
      'linear-gradient(45deg, rgba(255,255,255,0.04) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.04) 25%, transparent 25%), #111718',
    backgroundSize: '22px 22px',
  },
  cellFrame: {
    position: 'relative',
    width: 238,
    height: 258,
    display: 'grid',
    placeItems: 'center',
    border: '2px solid rgba(236,245,240,0.25)',
    borderRadius: 8,
    background: 'rgba(0,0,0,0.25)',
  },
  stateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
    marginTop: 18,
  },
  stateButton: {
    minHeight: 42,
    display: 'grid',
    placeItems: 'center',
    border: `1px solid ${palette.line}`,
    borderRadius: 8,
    color: palette.muted,
    fontSize: 16,
    fontWeight: 780,
    background: 'rgba(255,255,255,0.055)',
  },
  stateActive: {
    background: palette.accent,
    color: '#10221b',
  },
  controlPanel: {
    display: 'grid',
    gap: 14,
  },
  card: {
    border: `1px solid ${palette.line}`,
    borderRadius: 10,
    padding: 18,
    background: '#20292c',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 820,
    marginBottom: 14,
  },
  dropzone: {
    height: 100,
    display: 'grid',
    placeItems: 'center',
    border: '1px dashed rgba(139,211,185,0.55)',
    borderRadius: 8,
    background: 'rgba(139,211,185,0.08)',
  },
  fileIcon: {
    width: 54,
    height: 42,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 7,
    background: palette.accent,
    color: '#10221b',
    fontWeight: 900,
    fontSize: 15,
  },
  dropText: {
    marginTop: -12,
    color: palette.accent,
    fontSize: 18,
    fontWeight: 820,
  },
  progressTrack: {
    height: 9,
    marginTop: 14,
    borderRadius: 999,
    background: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    background: palette.accent,
  },
  microcopy: {
    marginTop: 10,
    color: palette.muted,
    fontSize: 15,
  },
  atlasGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(8, 1fr)',
    gap: 4,
    padding: 8,
    borderRadius: 8,
    background: '#050607',
  },
  atlasCell: {
    height: 28,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 3,
    background: 'rgba(255,255,255,0.035)',
  },
  miniPet: {
    width: 15,
    height: 19,
    borderRadius: '9px 9px 7px 7px',
    background: palette.accent,
    boxShadow: 'inset 0 -4px 0 rgba(0,0,0,0.18)',
  },
  zipBox: {
    position: 'relative',
    height: 110,
    display: 'grid',
    placeItems: 'center',
  },
  zipLid: {
    position: 'absolute',
    top: 8,
    width: 150,
    height: 30,
    borderRadius: '8px 8px 3px 3px',
    background: palette.yellow,
  },
  zipBody: {
    width: 190,
    height: 74,
    display: 'grid',
    alignContent: 'center',
    gap: 8,
    padding: 15,
    borderRadius: 9,
    background: '#2e3a3d',
    color: palette.ink,
    fontSize: 17,
    fontWeight: 780,
  },
  readyLine: {
    color: palette.accent,
    fontSize: 17,
    fontWeight: 800,
  },
  mascot: {
    position: 'relative',
    width: 132,
    height: 160,
    borderRadius: '64px 64px 42px 42px',
    background: '#2d8f3f',
    boxShadow: 'inset 0 -28px 0 rgba(0,0,0,0.16)',
  },
  antenna: {
    position: 'absolute',
    top: -24,
    left: 55,
    width: 22,
    height: 36,
    borderRadius: '18px 18px 8px 8px',
    background: '#49aa5f',
  },
  face: {
    position: 'absolute',
    top: 49,
    left: 30,
    display: 'flex',
    gap: 18,
  },
  eye: {
    width: 25,
    height: 25,
    borderRadius: 999,
    background: '#fff',
    boxShadow: 'inset 8px 7px 0 #6f1d18',
  },
  mouth: {
    position: 'absolute',
    left: 52,
    top: 88,
    width: 30,
    height: 15,
    borderRadius: '0 0 20px 20px',
    borderBottom: '7px solid #6f1d18',
  },
  arm: {
    position: 'absolute',
    top: 86,
    width: 44,
    height: 17,
    borderRadius: 999,
    background: '#2d8f3f',
  },
  foot: {
    position: 'absolute',
    bottom: -17,
    width: 21,
    height: 32,
    borderRadius: '0 0 14px 14px',
    background: '#6f1d18',
  },
  footer: {
    position: 'absolute',
    left: 80,
    right: 80,
    bottom: 46,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: palette.muted,
    fontSize: 21,
  },
  timeline: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 80px)',
    gap: 10,
  },
  timelineSegment: {
    position: 'relative',
    height: 8,
    overflow: 'hidden',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.11)',
  },
  timelineDone: {
    background: 'rgba(139,211,185,0.17)',
  },
  timelineFill: {
    position: 'absolute',
    inset: 0,
    borderRadius: 999,
    background: palette.accent,
  },
};
