import type { CSSProperties } from 'react';
import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

const CELL_WIDTH = 192;
const CELL_HEIGHT = 208;
const ATLAS_WIDTH = 1536;
const ATLAS_HEIGHT = 1872;
const ATLAS_SRC = 'promotion-assets/spritesheet.png';

const palette = {
  ink: '#edf4ef',
  muted: '#a9b7b0',
  panel: '#1c2426',
  panelDeep: '#111718',
  line: 'rgba(255,255,255,0.12)',
  accent: '#8bd3b9',
  yellow: '#e6c878',
  red: '#e77b74',
};

type SceneCopy = {
  eyebrow: string;
  title: string;
  body: string;
};

type StateButton = {
  label: string;
  row: number;
  frames: number;
};

const scenes: SceneCopy[] = [
  {
    eyebrow: 'ブラウザだけで作成',
    title: 'VRMをCodexペットに変換。',
    body: 'ローカルで読み込み、状態を確認し、必要なファイルを出力します。',
  },
  {
    eyebrow: 'アップロード不要',
    title: 'モデルはブラウザの外へ出ません。',
    body: 'キャラクターファイルは手元に置いたまま、プレビューと調整だけをブラウザで行います。',
  },
  {
    eyebrow: '仕様どおりのアトラス',
    title: '実際に生成したspritesheetを表示。',
    body: '待機、走り、手振り、ジャンプなどを固定8x9グリッドへ透明背景でレンダリングします。',
  },
  {
    eyebrow: 'そのまま配置できるZIP',
    title: 'pet.jsonとWebPをまとめてダウンロード。',
    body: 'サイズ、透明度、未使用セルを検証してから、配布やインストールに進めます。',
  },
];

const states: StateButton[] = [
  { label: '待機', row: 0, frames: 6 },
  { label: '右走り', row: 1, frames: 8 },
  { label: '左走り', row: 2, frames: 8 },
  { label: '手振り', row: 3, frames: 4 },
  { label: 'ジャンプ', row: 4, frames: 5 },
  { label: '失敗', row: 5, frames: 8 },
  { label: '待ち', row: 6, frames: 6 },
  { label: '走り', row: 7, frames: 6 },
  { label: 'レビュー', row: 8, frames: 6 },
];

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

function frameIndex(frame: number, frames: number, speed: number): number {
  return Math.floor(frame / speed) % frames;
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
        <div style={styles.branch}>promotionブランチ</div>
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
        <div style={styles.featureRow}>
          <Pill active={activeScene >= 0}>ローカルVRM</Pill>
          <Pill active={activeScene >= 1}>アップロードなし</Pill>
          <Pill active={activeScene >= 2}>透明WebP</Pill>
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
        <span>静的Viteアプリ · React + Three.js + Remotion</span>
      </div>
    </AbsoluteFill>
  );
};

function BuilderMockup({ scene, local }: { scene: number; local: number }) {
  const frame = useCurrentFrame();
  const pulse = (Math.sin(frame / 9) + 1) / 2;
  const activeStateIndex = scene === 0 ? 0 : scene === 1 ? 3 : scene === 2 ? 1 : 8;
  const activeState = states[activeStateIndex];
  const col = scene === 2 ? Math.floor(local * activeState.frames) % activeState.frames : frameIndex(frame, activeState.frames, 9);
  const petTurn = scene === 2 ? interpolate(local, [0, 1], [-4, 4], fit) : interpolate(pulse, [0, 1], [-2, 2]);
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
            <span>プレビュー</span>
            <span style={styles.cellBadge}>192x208</span>
          </div>
          <div style={styles.previewStage}>
            <div style={styles.cellFrame}>
              <SpriteFrame row={activeState.row} col={col} scale={1.16 + pulse * 0.035} rotate={petTurn} />
            </div>
          </div>
          <div style={styles.stateGrid}>
            {states.map((state, index) => {
              const active = index === activeStateIndex || (scene === 2 && index >= 0 && index <= 4);
              return (
                <div key={state.label} style={{ ...styles.stateButton, ...(active ? styles.stateActive : null) }}>
                  {state.label}
                </div>
              );
            })}
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
      <div style={styles.cardTitle}>1. VRMを読み込む</div>
      <div style={styles.dropzone}>
        <div style={styles.fileIcon}>VRM</div>
        <div style={styles.dropText}>VRM / GLBを選択</div>
      </div>
      <div style={styles.progressTrack}>
        <div style={{ ...styles.progressFill, width: `${uploadProgress * 100}%` }} />
      </div>
      <div style={styles.microcopy}>ブラウザ内で処理されます。アップロードはされません。</div>
    </div>
  );
}

function AtlasCard({ scene }: { scene: number }) {
  const active = scene >= 2;
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>2. アトラス</div>
      <div style={styles.atlasPreviewBox}>
        <Img
          src={staticFile(ATLAS_SRC)}
          style={{
            ...styles.atlasPreviewImage,
            opacity: active ? 1 : 0.42,
            transform: `scale(${active ? 1 : 0.96})`,
          }}
        />
      </div>
      <div style={styles.microcopy}>生成済みspritesheet.pngを使用</div>
    </div>
  );
}

function PackageCard({ ready }: { ready: number }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>3. 生成</div>
      <div style={styles.zipBox}>
        <div style={{ ...styles.zipLid, transform: `translateY(${(1 - ready) * 18}px)` }} />
        <div style={styles.zipBody}>
          <span>pet.json</span>
          <span>spritesheet.webp</span>
        </div>
      </div>
      <div style={{ ...styles.readyLine, opacity: ready }}>ZIPパッケージの準備ができました。</div>
    </div>
  );
}

function SpriteFrame({ row, col, scale, rotate }: { row: number; col: number; scale: number; rotate: number }) {
  return (
    <div
      style={{
        ...styles.spriteCrop,
        transform: `scale(${scale}) rotate(${rotate}deg)`,
      }}
    >
      <Img
        src={staticFile(ATLAS_SRC)}
        style={{
          ...styles.spriteSheet,
          transform: `translate(${-col * CELL_WIDTH}px, ${-row * CELL_HEIGHT}px)`,
        }}
      />
    </div>
  );
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
    top: 184,
    width: 720,
  },
  eyebrow: {
    color: palette.accent,
    fontSize: 29,
    fontWeight: 820,
    marginBottom: 24,
  },
  title: {
    margin: 0,
    fontSize: 78,
    lineHeight: 1.12,
    letterSpacing: 0,
    fontWeight: 860,
  },
  body: {
    width: 680,
    margin: '34px 0 0',
    color: palette.muted,
    fontSize: 33,
    lineHeight: 1.55,
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
    overflow: 'hidden',
    border: '2px solid rgba(236,245,240,0.25)',
    borderRadius: 8,
    background: 'rgba(0,0,0,0.25)',
  },
  spriteCrop: {
    position: 'relative',
    width: CELL_WIDTH,
    height: CELL_HEIGHT,
    overflow: 'hidden',
    transformOrigin: 'center',
  },
  spriteSheet: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: ATLAS_WIDTH,
    height: ATLAS_HEIGHT,
    maxWidth: 'none',
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
    lineHeight: 1.4,
  },
  atlasPreviewBox: {
    height: 232,
    display: 'grid',
    placeItems: 'center',
    overflow: 'hidden',
    borderRadius: 8,
    background: '#050607',
  },
  atlasPreviewImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    transition: 'none',
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
