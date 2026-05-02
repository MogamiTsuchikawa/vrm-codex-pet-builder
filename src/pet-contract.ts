export const CELL_WIDTH = 192;
export const CELL_HEIGHT = 208;
export const ATLAS_COLUMNS = 8;
export const ATLAS_ROWS = 9;
export const ATLAS_WIDTH = CELL_WIDTH * ATLAS_COLUMNS;
export const ATLAS_HEIGHT = CELL_HEIGHT * ATLAS_ROWS;

export type PetState =
  | 'idle'
  | 'running-right'
  | 'running-left'
  | 'waving'
  | 'jumping'
  | 'failed'
  | 'waiting'
  | 'running'
  | 'review';

export type StateSpec = {
  state: PetState;
  label: string;
  frames: number;
  durations: number[];
};

export const STATE_SPECS: StateSpec[] = [
  { state: 'idle', label: 'Idle', frames: 6, durations: [280, 110, 110, 140, 140, 320] },
  {
    state: 'running-right',
    label: 'Run Right',
    frames: 8,
    durations: [120, 120, 120, 120, 120, 120, 120, 220],
  },
  {
    state: 'running-left',
    label: 'Run Left',
    frames: 8,
    durations: [120, 120, 120, 120, 120, 120, 120, 220],
  },
  { state: 'waving', label: 'Wave', frames: 4, durations: [140, 140, 140, 280] },
  { state: 'jumping', label: 'Jump', frames: 5, durations: [140, 140, 140, 140, 280] },
  { state: 'failed', label: 'Failed', frames: 8, durations: [140, 140, 140, 140, 140, 140, 140, 240] },
  { state: 'waiting', label: 'Waiting', frames: 6, durations: [150, 150, 150, 150, 150, 260] },
  { state: 'running', label: 'Run', frames: 6, durations: [120, 120, 120, 120, 120, 220] },
  { state: 'review', label: 'Review', frames: 6, durations: [150, 150, 150, 150, 150, 280] },
];

export const STATE_BY_NAME = Object.fromEntries(STATE_SPECS.map((spec) => [spec.state, spec])) as Record<
  PetState,
  StateSpec
>;

export type PetManifest = {
  id: string;
  displayName: string;
  description: string;
  spritesheetPath: string;
};

export type PetPackageConfig = {
  id: string;
  displayName: string;
  description: string;
};

export function slugifyPetId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

export function makeManifest(config: PetPackageConfig): PetManifest {
  return {
    id: slugifyPetId(config.id || config.displayName) || 'custom-pet',
    displayName: config.displayName.trim() || 'Custom Pet',
    description: config.description.trim() || 'A custom Codex pet.',
    spritesheetPath: 'spritesheet.webp',
  };
}
