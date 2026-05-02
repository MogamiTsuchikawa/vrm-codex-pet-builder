import { useEffect, useMemo, useRef, useState } from 'react';
import { canvasToPngDataUrl, encodeCanvasToLosslessWebp } from './atlas-exporter';
import { downloadBytes, makePetPackage, type PetPackage } from './pet-package';
import { PetRenderer, type LoadInfo, type RenderAdjustments, DEFAULT_ADJUSTMENTS } from './pet-renderer';
import { CELL_HEIGHT, CELL_WIDTH, makeManifest, slugifyPetId, STATE_SPECS, type PetState } from './pet-contract';
import { validateAtlas, validateManifest, type ValidationResult } from './validator';

declare global {
  interface Window {
    petBuilderDebug?: {
      getAtlasDataUrl: () => string | null;
      getLastManifest: () => string | null;
    };
  }
}

const APP_TITLE = 'VRM Codex Pet Builder';

type Locale = 'en' | 'ja';
type StatusKey =
  | 'drop'
  | 'loading'
  | 'loaded'
  | 'loadError'
  | 'needVrm'
  | 'renderingAll'
  | 'renderingFrame'
  | 'validationFailed'
  | 'encoding'
  | 'zipReady'
  | 'generateError';

type StatusParams = {
  detail?: string;
  fileName?: string;
  progress?: string;
};

type GenerationState = {
  phase: 'idle' | 'working' | 'ready' | 'error';
  key: StatusKey;
  params?: StatusParams;
};

type Translation = {
  languageLabel: string;
  english: string;
  japanese: string;
  lede: string;
  status: Record<StatusKey, string | ((params: StatusParams) => string)>;
  stateLabels: Record<PetState, string>;
  frames: string;
  preview: string;
  noVrmLoaded: string;
  previewAria: string;
  statePreviewAria: string;
  canvasAria: string;
  builderControlsAria: string;
  resultAria: string;
  loadVrmTitle: string;
  chooseVrm: string;
  localOnly: string;
  metadataTitle: string;
  metadataAuthor: string;
  metadataLicense: string;
  packageInfoTitle: string;
  petId: string;
  displayName: string;
  description: string;
  framingTitle: string;
  scale: string;
  xOffset: string;
  yOffset: string;
  yaw: string;
  resetFraming: string;
  generateTitle: string;
  generatePackage: string;
  downloadZip: string;
  readyPackage: (fileName: string, size: string) => string;
  validationTitle: string;
  atlasPreviewTitle: string;
  emptyAtlas: string;
  noValidation: string;
  validationOk: string;
  validationFailed: string;
  defaultConfig: {
    id: string;
    displayName: string;
    description: string;
  };
  generatedDescription: (fileName: string) => string;
};

const TRANSLATIONS: Record<Locale, Translation> = {
  en: {
    languageLabel: 'Language',
    english: 'EN',
    japanese: '日本語',
    lede: 'Turn a local VRM into the fixed 8x9 transparent atlas, validate it, and download a ready-to-install ZIP.',
    status: {
      drop: 'Drop in a VRM to begin.',
      loading: ({ fileName }) => `Loading ${fileName ?? 'VRM'} locally...`,
      loaded: 'VRM loaded. Adjust the framing, then generate the ZIP.',
      loadError: ({ detail }) => detail ?? 'Could not load this VRM.',
      needVrm: 'Load a VRM before generating a package.',
      renderingAll: 'Rendering all animation rows...',
      renderingFrame: ({ progress }) => `Rendering ${progress ?? 'animation'}...`,
      validationFailed: 'Validation failed. Fix the issues before downloading.',
      encoding: 'Encoding transparent lossless WebP...',
      zipReady: 'ZIP package is ready.',
      generateError: ({ detail }) => detail ?? 'Could not generate this package.',
    },
    stateLabels: {
      idle: 'Idle',
      'running-right': 'Run Right',
      'running-left': 'Run Left',
      waving: 'Wave',
      jumping: 'Jump',
      failed: 'Failed',
      waiting: 'Waiting',
      running: 'Run',
      review: 'Review',
    },
    frames: 'frames',
    preview: 'Preview',
    noVrmLoaded: 'No VRM loaded yet',
    previewAria: 'Pet preview',
    statePreviewAria: 'Animation state preview',
    canvasAria: 'VRM pet preview',
    builderControlsAria: 'Builder controls',
    resultAria: 'Generated atlas and validation',
    loadVrmTitle: '1. Load VRM',
    chooseVrm: 'Choose VRM / GLB',
    localOnly: 'Processed locally. Nothing is uploaded.',
    metadataTitle: 'Title',
    metadataAuthor: 'Author',
    metadataLicense: 'License',
    packageInfoTitle: '2. Package info',
    petId: 'Pet ID',
    displayName: 'Display name',
    description: 'Description',
    framingTitle: '3. Framing',
    scale: 'Scale',
    xOffset: 'X offset',
    yOffset: 'Y offset',
    yaw: 'Yaw',
    resetFraming: 'Reset framing',
    generateTitle: '4. Generate',
    generatePackage: 'Generate ZIP package',
    downloadZip: 'Download ZIP',
    readyPackage: (fileName, size) => `Ready: ${fileName} (${size})`,
    validationTitle: 'Validation',
    atlasPreviewTitle: 'Atlas preview',
    emptyAtlas: 'Generate a package to preview the full atlas.',
    noValidation: 'No atlas generated yet.',
    validationOk: 'All required checks passed.',
    validationFailed: 'Validation failed.',
    defaultConfig: {
      id: 'custom-pet',
      displayName: 'Custom Pet',
      description: 'A custom Codex pet.',
    },
    generatedDescription: (fileName) => `A custom Codex pet generated from ${fileName}.`,
  },
  ja: {
    languageLabel: '表示言語',
    english: 'EN',
    japanese: '日本語',
    lede: 'ローカルのVRMから固定8x9の透明アトラスを作成し、検証して、すぐ配置できるZIPとしてダウンロードできます。',
    status: {
      drop: 'VRMを選択して開始します。',
      loading: ({ fileName }) => `${fileName ?? 'VRM'}をローカルで読み込み中...`,
      loaded: 'VRMを読み込みました。フレーミングを調整してからZIPを生成してください。',
      loadError: ({ detail }) => detail ?? 'このVRMを読み込めませんでした。',
      needVrm: 'パッケージを生成する前にVRMを読み込んでください。',
      renderingAll: 'すべてのアニメーション行をレンダリング中...',
      renderingFrame: ({ progress }) => `${progress ?? 'アニメーション'}をレンダリング中...`,
      validationFailed: '検証に失敗しました。問題を修正してからダウンロードしてください。',
      encoding: '透明のロスレスWebPにエンコード中...',
      zipReady: 'ZIPパッケージの準備ができました。',
      generateError: ({ detail }) => detail ?? 'このパッケージを生成できませんでした。',
    },
    stateLabels: {
      idle: '待機',
      'running-right': '右走り',
      'running-left': '左走り',
      waving: '手振り',
      jumping: 'ジャンプ',
      failed: '失敗',
      waiting: '待ち',
      running: '走り',
      review: 'レビュー',
    },
    frames: 'フレーム',
    preview: 'プレビュー',
    noVrmLoaded: 'VRMはまだ読み込まれていません',
    previewAria: 'ペットのプレビュー',
    statePreviewAria: 'アニメーション状態のプレビュー',
    canvasAria: 'VRMペットのプレビュー',
    builderControlsAria: 'ビルダー操作',
    resultAria: '生成されたアトラスと検証結果',
    loadVrmTitle: '1. VRMを読み込む',
    chooseVrm: 'VRM / GLBを選択',
    localOnly: 'ブラウザ内で処理されます。アップロードはされません。',
    metadataTitle: 'タイトル',
    metadataAuthor: '作者',
    metadataLicense: 'ライセンス',
    packageInfoTitle: '2. パッケージ情報',
    petId: 'ペットID',
    displayName: '表示名',
    description: '説明',
    framingTitle: '3. フレーミング',
    scale: '拡大率',
    xOffset: 'X位置',
    yOffset: 'Y位置',
    yaw: '向き',
    resetFraming: 'フレーミングをリセット',
    generateTitle: '4. 生成',
    generatePackage: 'ZIPパッケージを生成',
    downloadZip: 'ZIPをダウンロード',
    readyPackage: (fileName, size) => `準備完了: ${fileName} (${size})`,
    validationTitle: '検証',
    atlasPreviewTitle: 'アトラスプレビュー',
    emptyAtlas: 'パッケージを生成すると、ここにアトラス全体が表示されます。',
    noValidation: 'アトラスはまだ生成されていません。',
    validationOk: '必要なチェックはすべて通過しました。',
    validationFailed: '検証に失敗しました。',
    defaultConfig: {
      id: 'custom-pet',
      displayName: 'カスタムペット',
      description: 'カスタムCodexペットです。',
    },
    generatedDescription: (fileName) => `${fileName}から生成したカスタムCodexペットです。`,
  },
};

function getInitialLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en';
  return navigator.language.toLowerCase().startsWith('ja') ? 'ja' : 'en';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function mergeValidationResults(...results: ValidationResult[]): ValidationResult {
  const errors = results.flatMap((result) => result.errors);
  const warnings = results.flatMap((result) => result.warnings);
  return { ok: errors.length === 0, errors, warnings };
}

function resolveStatusMessage(t: Translation, status: GenerationState): string {
  const message = t.status[status.key];
  if (typeof message === 'function') {
    return message(status.params ?? {});
  }
  return message;
}

function localizeValidationMessage(message: string, locale: Locale, t: Translation): string {
  if (locale === 'en') return message;

  let match = message.match(/^Expected atlas (\d+x\d+), got (\d+x\d+)\.$/);
  if (match) {
    return `アトラスは${match[1]}である必要がありますが、実際は${match[2]}です。`;
  }

  match = message.match(/^([a-z-]+) frame (\d+) is empty or too sparse \((\d+) pixels\)\.$/);
  if (match) {
    const state = match[1] as PetState;
    return `${t.stateLabels[state] ?? match[1]}の${match[2]}フレーム目が空、または描画量が少なすぎます（${match[3]}ピクセル）。`;
  }

  match = message.match(/^([a-z-]+) unused frame (\d+) is not transparent \((\d+) pixels\)\.$/);
  if (match) {
    const state = match[1] as PetState;
    return `${t.stateLabels[state] ?? match[1]}の未使用フレーム${match[2]}が透明ではありません（${match[3]}ピクセル）。`;
  }

  match = message.match(/^([a-z-]+) frame (\d+) is almost opaque; inspect for background leakage\.$/);
  if (match) {
    const state = match[1] as PetState;
    return `${t.stateLabels[state] ?? match[1]}の${match[2]}フレーム目がほぼ不透明です。背景が混ざっていないか確認してください。`;
  }

  const staticMessages: Record<string, string> = {
    'Could not inspect atlas pixels.': 'アトラスのピクセルを検査できませんでした。',
    'pet.json id is required.': 'pet.jsonのidは必須です。',
    'pet.json displayName is required.': 'pet.jsonのdisplayNameは必須です。',
    'pet.json description is required.': 'pet.jsonのdescriptionは必須です。',
    'pet.json spritesheetPath must be spritesheet.webp.': 'pet.jsonのspritesheetPathはspritesheet.webpである必要があります。',
  };

  return staticMessages[message] ?? message;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<PetRenderer | null>(null);
  const fileUrlRef = useRef<string | null>(null);
  const lastAtlasRef = useRef<HTMLCanvasElement | null>(null);
  const lastPackageRef = useRef<PetPackage | null>(null);
  const [locale, setLocale] = useState<Locale>(getInitialLocale);
  const t = TRANSLATIONS[locale];
  const [selectedState, setSelectedState] = useState<PetState>('idle');
  const [loadInfo, setLoadInfo] = useState<LoadInfo | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [config, setConfig] = useState(() => TRANSLATIONS[getInitialLocale()].defaultConfig);
  const [adjustments, setAdjustments] = useState<RenderAdjustments>(DEFAULT_ADJUSTMENTS);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [atlasPreview, setAtlasPreview] = useState<string | null>(null);
  const [packageInfo, setPackageInfo] = useState<{ fileName: string; size: number } | null>(null);
  const [status, setStatus] = useState<GenerationState>({
    phase: 'idle',
    key: 'drop',
  });

  const manifestPreview = useMemo(() => makeManifest(config), [config]);
  const statusMessage = resolveStatusMessage(t, status);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = APP_TITLE;
  }, [locale]);

  useEffect(() => {
    if (!canvasRef.current) return undefined;
    const renderer = new PetRenderer(canvasRef.current);
    rendererRef.current = renderer;

    let raf = 0;
    const animate = () => {
      renderer.tick();
      raf = requestAnimationFrame(animate);
    };
    animate();

    window.petBuilderDebug = {
      getAtlasDataUrl: () => (lastAtlasRef.current ? canvasToPngDataUrl(lastAtlasRef.current) : null),
      getLastManifest: () => (lastPackageRef.current ? JSON.stringify(lastPackageRef.current.manifest, null, 2) : null),
    };

    return () => {
      cancelAnimationFrame(raf);
      rendererRef.current = null;
      if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
      delete window.petBuilderDebug;
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.setState(selectedState);
  }, [selectedState]);

  useEffect(() => {
    rendererRef.current?.setAdjustments(adjustments);
  }, [adjustments]);

  async function loadVrmFile(file: File): Promise<void> {
    if (!rendererRef.current) return;

    setStatus({ phase: 'working', key: 'loading', params: { fileName: file.name } });
    setValidation(null);
    setAtlasPreview(null);
    setPackageInfo(null);
    lastAtlasRef.current = null;
    lastPackageRef.current = null;

    if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
    const url = URL.createObjectURL(file);
    fileUrlRef.current = url;
    setSelectedFile(file);

    const baseName = file.name.replace(/\.[^.]+$/, '');
    const inferredId = slugifyPetId(baseName) || 'custom-pet';
    setConfig({
      id: inferredId,
      displayName: baseName || t.defaultConfig.displayName,
      description: t.generatedDescription(file.name),
    });
    setAdjustments(DEFAULT_ADJUSTMENTS);

    try {
      const info = await rendererRef.current.load(url);
      setLoadInfo(info);
      setSelectedState('idle');
      setStatus({ phase: 'ready', key: 'loaded' });
    } catch (error) {
      setLoadInfo(null);
      setStatus({
        phase: 'error',
        key: 'loadError',
        params: { detail: error instanceof Error ? error.message : undefined },
      });
    }
  }

  async function handleFileChange(fileList: FileList | null): Promise<void> {
    const file = fileList?.[0];
    if (!file) return;
    await loadVrmFile(file);
  }

  function updateAdjustment<K extends keyof RenderAdjustments>(key: K, value: number): void {
    setAdjustments((current) => ({ ...current, [key]: value }));
  }

  async function generatePackage(): Promise<void> {
    if (!rendererRef.current || !selectedFile) {
      setStatus({ phase: 'error', key: 'needVrm' });
      return;
    }

    try {
      setStatus({ phase: 'working', key: 'renderingAll' });
      const atlas = await rendererRef.current.captureAtlasCanvas((state, frames) => {
        setStatus({
          phase: 'working',
          key: 'renderingFrame',
          params: { progress: `${t.stateLabels[state]}: ${frames} ${t.frames}` },
        });
      });
      lastAtlasRef.current = atlas;
      setAtlasPreview(canvasToPngDataUrl(atlas));

      const atlasValidation = validateAtlas(atlas);
      const manifest = makeManifest(config);
      const manifestValidation = validateManifest(manifest);
      const mergedValidation = mergeValidationResults(atlasValidation, manifestValidation);
      setValidation(mergedValidation);
      if (!mergedValidation.ok) {
        setStatus({ phase: 'error', key: 'validationFailed' });
        return;
      }

      setStatus({ phase: 'working', key: 'encoding' });
      const webpBytes = await encodeCanvasToLosslessWebp(atlas);
      const petPackage = makePetPackage(config, webpBytes);
      lastPackageRef.current = petPackage;
      setPackageInfo({ fileName: petPackage.zipFileName, size: petPackage.zipBytes.byteLength });
      setStatus({ phase: 'ready', key: 'zipReady' });
    } catch (error) {
      setStatus({
        phase: 'error',
        key: 'generateError',
        params: { detail: error instanceof Error ? error.message : undefined },
      });
    }
  }

  function downloadPackage(): void {
    if (!lastPackageRef.current) return;
    downloadBytes(lastPackageRef.current.zipBytes, lastPackageRef.current.zipFileName, 'application/zip');
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <div className="title-row">
            <h1>{APP_TITLE}</h1>
            <div className="language-switcher" role="group" aria-label={t.languageLabel}>
              <button
                type="button"
                className={locale === 'en' ? 'is-selected' : ''}
                aria-pressed={locale === 'en'}
                onClick={() => setLocale('en')}
              >
                {TRANSLATIONS.en.english}
              </button>
              <button
                type="button"
                className={locale === 'ja' ? 'is-selected' : ''}
                aria-pressed={locale === 'ja'}
                onClick={() => setLocale('ja')}
              >
                {TRANSLATIONS.ja.japanese}
              </button>
            </div>
          </div>
          <p className="lede">{t.lede}</p>
        </div>
        <div className={`status status-${status.phase}`} role="status" data-testid="status" data-status-key={status.key}>
          {statusMessage}
        </div>
      </header>

      <section className="builder-layout">
        <section className="preview-area" aria-label={t.previewAria}>
          <div className="preview-toolbar">
            <div>
              <h2>{t.preview}</h2>
              <p>{selectedFile ? selectedFile.name : t.noVrmLoaded}</p>
            </div>
            <div className="cell-size">
              {CELL_WIDTH}x{CELL_HEIGHT}
            </div>
          </div>
          <div className="cell-stage">
            <div className="cell-frame" style={{ width: CELL_WIDTH, height: CELL_HEIGHT }}>
              <canvas ref={canvasRef} width={CELL_WIDTH} height={CELL_HEIGHT} aria-label={t.canvasAria} />
            </div>
          </div>
          <div className="state-strip" aria-label={t.statePreviewAria}>
            {STATE_SPECS.map((spec) => (
              <button
                key={spec.state}
                type="button"
                data-state={spec.state}
                className={selectedState === spec.state ? 'is-active' : ''}
                onClick={() => setSelectedState(spec.state)}
              >
                {t.stateLabels[spec.state]}
              </button>
            ))}
          </div>
        </section>

        <aside className="control-panel" aria-label={t.builderControlsAria}>
          <section className="panel-section">
            <h2>{t.loadVrmTitle}</h2>
            <label className="file-drop">
              <input
                data-testid="vrm-file"
                type="file"
                accept=".vrm,.glb,.gltf,model/gltf-binary,model/gltf+json"
                onChange={(event) => void handleFileChange(event.currentTarget.files)}
              />
              <span>{t.chooseVrm}</span>
              <small>{t.localOnly}</small>
            </label>
            {loadInfo ? (
              <dl className="meta-grid">
                <dt>{t.metadataTitle}</dt>
                <dd>{loadInfo.title || '-'}</dd>
                <dt>{t.metadataAuthor}</dt>
                <dd>{loadInfo.author || '-'}</dd>
                <dt>{t.metadataLicense}</dt>
                <dd>{loadInfo.license || '-'}</dd>
              </dl>
            ) : null}
          </section>

          <section className="panel-section">
            <h2>{t.packageInfoTitle}</h2>
            <label>
              {t.petId}
              <input
                value={config.id}
                onChange={(event) => setConfig((current) => ({ ...current, id: event.target.value }))}
              />
            </label>
            <label>
              {t.displayName}
              <input
                value={config.displayName}
                onChange={(event) => setConfig((current) => ({ ...current, displayName: event.target.value }))}
              />
            </label>
            <label>
              {t.description}
              <textarea
                rows={3}
                value={config.description}
                onChange={(event) => setConfig((current) => ({ ...current, description: event.target.value }))}
              />
            </label>
            <pre className="manifest-preview">{JSON.stringify(manifestPreview, null, 2)}</pre>
          </section>

          <section className="panel-section">
            <h2>{t.framingTitle}</h2>
            <Slider label={t.scale} value={adjustments.scale} min={0.55} max={1.8} step={0.01} onChange={(value) => updateAdjustment('scale', value)} />
            <Slider label={t.xOffset} value={adjustments.offsetX} min={-0.8} max={0.8} step={0.01} onChange={(value) => updateAdjustment('offsetX', value)} />
            <Slider label={t.yOffset} value={adjustments.offsetY} min={-0.8} max={0.8} step={0.01} onChange={(value) => updateAdjustment('offsetY', value)} />
            <Slider label={t.yaw} value={adjustments.yaw} min={-Math.PI} max={Math.PI} step={0.01} onChange={(value) => updateAdjustment('yaw', value)} format={(value) => `${Math.round((value * 180) / Math.PI)}deg`} />
            <button type="button" className="secondary" onClick={() => setAdjustments(DEFAULT_ADJUSTMENTS)}>
              {t.resetFraming}
            </button>
          </section>

          <section className="panel-section">
            <h2>{t.generateTitle}</h2>
            <button
              data-testid="generate-package"
              type="button"
              className="primary"
              disabled={!selectedFile || status.phase === 'working'}
              onClick={() => void generatePackage()}
            >
              {t.generatePackage}
            </button>
            <button
              data-testid="download-package"
              type="button"
              className="secondary"
              disabled={!lastPackageRef.current}
              onClick={downloadPackage}
            >
              {t.downloadZip}
            </button>
            {packageInfo ? (
              <p className="package-note">{t.readyPackage(packageInfo.fileName, formatBytes(packageInfo.size))}</p>
            ) : null}
          </section>
        </aside>
      </section>

      <section className="result-area" aria-label={t.resultAria}>
        <div>
          <h2>{t.validationTitle}</h2>
          <ValidationPanel validation={validation} locale={locale} t={t} />
        </div>
        <div>
          <h2>{t.atlasPreviewTitle}</h2>
          {atlasPreview ? (
            <img className="atlas-preview" src={atlasPreview} alt={t.atlasPreviewTitle} />
          ) : (
            <p className="empty-note">{t.emptyAtlas}</p>
          )}
        </div>
      </section>
    </main>
  );
}

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
};

function Slider({ label, value, min, max, step, onChange, format }: SliderProps) {
  return (
    <label className="slider-row">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output>{format ? format(value) : value.toFixed(2)}</output>
    </label>
  );
}

function ValidationPanel({
  validation,
  locale,
  t,
}: {
  validation: ValidationResult | null;
  locale: Locale;
  t: Translation;
}) {
  if (!validation) {
    return <p className="empty-note">{t.noValidation}</p>;
  }
  return (
    <div className={validation.ok ? 'validation validation-ok' : 'validation validation-error'} data-testid="validation">
      <strong>{validation.ok ? t.validationOk : t.validationFailed}</strong>
      {validation.errors.length > 0 ? (
        <ul>
          {validation.errors.map((error) => (
            <li key={error}>{localizeValidationMessage(error, locale, t)}</li>
          ))}
        </ul>
      ) : null}
      {validation.warnings.length > 0 ? (
        <ul>
          {validation.warnings.map((warning) => (
            <li key={warning}>{localizeValidationMessage(warning, locale, t)}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
