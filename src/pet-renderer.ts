import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { buildPoseFrame } from './animation-states';
import {
  ATLAS_COLUMNS,
  ATLAS_HEIGHT,
  ATLAS_WIDTH,
  CELL_HEIGHT,
  CELL_WIDTH,
  STATE_SPECS,
  type PetState,
} from './pet-contract';

const CAMERA_HEIGHT = 2.72;
const CAMERA_WIDTH = CAMERA_HEIGHT * (CELL_WIDTH / CELL_HEIGHT);

export type LoadInfo = {
  title: string;
  author: string;
  version: string;
  license: string;
};

export type RenderAdjustments = {
  scale: number;
  offsetX: number;
  offsetY: number;
  yaw: number;
};

export const DEFAULT_ADJUSTMENTS: RenderAdjustments = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  yaw: 0,
};

export class PetRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.OrthographicCamera;

  private readonly modelRoot = new THREE.Group();
  private readonly lightRig = new THREE.Group();
  private vrm: VRM | null = null;
  private basePosition = new THREE.Vector3();
  private modelCenter = new THREE.Vector3();
  private baseScale = 1;
  private adjustments: RenderAdjustments = { ...DEFAULT_ADJUSTMENTS };
  private lastTick = performance.now();
  private currentState: PetState = 'idle';
  private currentFrame = 0;
  private frameElapsed = 0;
  private loadInfo: LoadInfo | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      premultipliedAlpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.camera = new THREE.OrthographicCamera(
      -CAMERA_WIDTH / 2,
      CAMERA_WIDTH / 2,
      CAMERA_HEIGHT / 2,
      -CAMERA_HEIGHT / 2,
      0.01,
      100,
    );
    this.camera.position.set(0, 0, 5);
    this.camera.lookAt(0, 0, 0);

    this.scene.add(this.modelRoot);
    this.setupLights();
    this.resize(CELL_WIDTH, CELL_HEIGHT);
  }

  get info(): LoadInfo | null {
    return this.loadInfo;
  }

  async load(url: string): Promise<LoadInfo> {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    const gltf = await loader.loadAsync(url);
    const vrm = gltf.userData.vrm as VRM;
    VRMUtils.rotateVRM0(vrm);

    vrm.scene.traverse((object) => {
      object.frustumCulled = false;
    });

    this.modelRoot.clear();
    this.adjustments = { ...DEFAULT_ADJUSTMENTS };
    this.modelRoot.add(vrm.scene);
    this.vrm = vrm;
    this.normalizeModel();
    this.applyStateFrame('idle', 0);
    this.render();

    const meta = vrm.meta as unknown as Record<string, unknown>;
    this.loadInfo = {
      title: String(meta.title ?? meta.name ?? 'shibajii'),
      author: String(meta.author ?? (Array.isArray(meta.authors) ? meta.authors.join(', ') : '') ?? ''),
      version: String(meta.version ?? ''),
      license: String(meta.licenseName ?? meta.licenseUrl ?? ''),
    };
    return this.loadInfo;
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
  }

  setState(state: PetState): void {
    this.currentState = state;
    this.currentFrame = 0;
    this.frameElapsed = 0;
    this.applyStateFrame(state, 0);
    this.render();
  }

  setAdjustments(adjustments: RenderAdjustments): void {
    this.adjustments = { ...adjustments };
    this.applyStateFrame(this.currentState, this.currentFrame);
    this.render();
  }

  tick(): void {
    if (!this.vrm) return;

    const now = performance.now();
    const delta = Math.min((now - this.lastTick) / 1000, 0.1);
    this.lastTick = now;
    const spec = STATE_SPECS.find((item) => item.state === this.currentState) ?? STATE_SPECS[0];
    this.frameElapsed += delta * 1000;
    const duration = spec.durations[this.currentFrame] ?? 140;
    if (this.frameElapsed >= duration) {
      this.frameElapsed = 0;
      this.currentFrame = (this.currentFrame + 1) % spec.frames;
      this.applyStateFrame(this.currentState, this.currentFrame);
    }
    this.vrm.update(delta);
    this.render();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  captureCurrentPng(): string {
    this.render();
    return this.renderer.domElement.toDataURL('image/png');
  }

  async captureAtlasCanvas(onProgress?: (state: PetState, frames: number) => void): Promise<HTMLCanvasElement> {
    if (!this.vrm) {
      throw new Error('VRM is not loaded yet.');
    }

    const previousState = this.currentState;
    const previousFrame = this.currentFrame;
    const previousPixelRatio = this.renderer.getPixelRatio();
    const atlas = document.createElement('canvas');
    atlas.width = ATLAS_WIDTH;
    atlas.height = ATLAS_HEIGHT;
    const context = atlas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Could not create atlas canvas context.');

    this.renderer.setPixelRatio(1);
    this.resize(CELL_WIDTH, CELL_HEIGHT);
    context.clearRect(0, 0, atlas.width, atlas.height);

    for (let row = 0; row < STATE_SPECS.length; row += 1) {
      const spec = STATE_SPECS[row];
      onProgress?.(spec.state, spec.frames);
      for (let col = 0; col < spec.frames; col += 1) {
        this.applyStateFrame(spec.state, col);
        this.vrm.update(1 / 30);
        this.render();
        context.drawImage(this.renderer.domElement, col * CELL_WIDTH, row * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
      }
      for (let col = spec.frames; col < ATLAS_COLUMNS; col += 1) {
        context.clearRect(col * CELL_WIDTH, row * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
      }
    }

    this.renderer.setPixelRatio(previousPixelRatio);
    this.resize(CELL_WIDTH, CELL_HEIGHT);
    this.applyStateFrame(previousState, previousFrame);
    this.currentState = previousState;
    this.currentFrame = previousFrame;
    this.render();

    return atlas;
  }

  async captureAtlas(onProgress?: (state: PetState, frames: number) => void): Promise<string> {
    const atlas = await this.captureAtlasCanvas(onProgress);
    return atlas.toDataURL('image/png');
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 2.5);
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(2.2, 3.2, 4.5);
    const fill = new THREE.DirectionalLight(0xdcecff, 0.9);
    fill.position.set(-3, 2, 2);
    this.lightRig.add(ambient, key, fill);
    this.scene.add(this.lightRig);
  }

  private normalizeModel(): void {
    if (!this.vrm) return;

    this.modelRoot.position.set(0, 0, 0);
    this.modelRoot.rotation.set(0, 0, 0);
    this.modelRoot.scale.setScalar(1);
    this.vrm.humanoid.resetNormalizedPose();
    this.vrm.update(0);
    this.scene.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(this.modelRoot);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    this.modelCenter.copy(center);
    const widestHorizontalAxis = Math.max(size.x, size.z);
    const scale = Math.min(
      (CAMERA_WIDTH * 0.66) / Math.max(widestHorizontalAxis, 0.001),
      (CAMERA_HEIGHT * 0.66) / Math.max(size.y, 0.001),
    );

    this.baseScale = scale;
    const activeScale = this.baseScale * this.adjustments.scale;
    this.modelRoot.scale.setScalar(activeScale);
    this.modelRoot.position.set(-center.x * activeScale, -center.y * activeScale - 0.03, -center.z * activeScale);
    this.basePosition.copy(this.modelRoot.position);
    this.scene.updateMatrixWorld(true);
  }

  private applyStateFrame(state: PetState, frameIndex: number): void {
    if (!this.vrm) return;
    this.currentState = state;
    this.currentFrame = frameIndex;

    const poseFrame = buildPoseFrame(this.vrm, state, frameIndex);
    this.vrm.humanoid.resetNormalizedPose();
    this.vrm.expressionManager?.resetValues();
    this.vrm.humanoid.setNormalizedPose(poseFrame.pose);
    for (const [name, weight] of Object.entries(poseFrame.expressionWeights)) {
      this.vrm.expressionManager?.setValue(name, weight);
    }
    this.modelRoot.rotation.set(0, poseFrame.yaw + this.adjustments.yaw, 0);
    const activeScale = this.baseScale * this.adjustments.scale;
    this.modelRoot.scale.setScalar(activeScale);
    this.modelRoot.position.set(
      -this.modelCenter.x * activeScale,
      -this.modelCenter.y * activeScale - 0.03,
      -this.modelCenter.z * activeScale,
    );
    this.modelRoot.position.x += this.adjustments.offsetX;
    this.modelRoot.position.y += poseFrame.offsetY;
    this.modelRoot.position.y += this.adjustments.offsetY;
    this.vrm.update(1 / 30);
    this.scene.updateMatrixWorld(true);
  }
}
