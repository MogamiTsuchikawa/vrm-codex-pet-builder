import * as THREE from 'three';
import type { VRM, VRMPose } from '@pixiv/three-vrm';
import { STATE_BY_NAME, type PetState } from './pet-contract';

export type PoseFrame = {
  pose: VRMPose;
  yaw: number;
  offsetY: number;
  expressionWeights: Record<string, number>;
};

const IDENTITY: [number, number, number, number] = [0, 0, 0, 1];

function quat(x: number, y: number, z: number): [number, number, number, number] {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'XYZ'));
  return [q.x, q.y, q.z, q.w];
}

function addBone(pose: VRMPose, vrm: VRM, boneName: string, rotation: [number, number, number, number]): void {
  if (vrm.humanoid.getNormalizedBoneNode(boneName as never)) {
    pose[boneName as keyof VRMPose] = { rotation };
  }
}

function setExpression(weights: Record<string, number>, vrm: VRM, name: string, value: number): void {
  if (vrm.expressionManager?.getExpression(name)) {
    weights[name] = value;
  }
}

export function buildPoseFrame(vrm: VRM, state: PetState, frameIndex: number): PoseFrame {
  const spec = STATE_BY_NAME[state];
  const loop = frameIndex / spec.frames;
  const wave = Math.sin(loop * Math.PI * 2);
  const alt = Math.cos(loop * Math.PI * 2);
  const pose: VRMPose = {};
  const expressionWeights: Record<string, number> = {};
  let yaw = 0;
  let offsetY = 0;

  const runLegA = 0.48 * wave;
  const runLegB = -0.52 * wave;
  const runArmA = -0.44 * wave;
  const runArmB = 0.44 * wave;
  const bounce = Math.max(0, Math.sin(loop * Math.PI * 4)) * 0.035;

  const applyFrontRun = (amount = 1): void => {
    addBone(pose, vrm, 'leftUpperLeg', quat(runLegA * amount, 0, 0.08 * wave));
    addBone(pose, vrm, 'rightUpperLeg', quat(runLegB * amount, 0, -0.08 * wave));
    addBone(pose, vrm, 'leftLowerLeg', quat(Math.max(0, -wave) * 0.62 * amount, 0, 0));
    addBone(pose, vrm, 'rightLowerLeg', quat(Math.max(0, wave) * 0.62 * amount, 0, 0));
    addBone(pose, vrm, 'leftUpperArm', quat(runArmA * amount, 0, 0.22));
    addBone(pose, vrm, 'rightUpperArm', quat(runArmB * amount, 0, -0.22));
    addBone(pose, vrm, 'leftLowerArm', quat(-0.18, 0, 0));
    addBone(pose, vrm, 'rightLowerArm', quat(-0.18, 0, 0));
    addBone(pose, vrm, 'spine', quat(0.04 * alt, 0, 0.035 * wave));
    addBone(pose, vrm, 'head', quat(-0.04 * alt, 0.03 * wave, -0.025 * wave));
    offsetY = bounce;
  };

  switch (state) {
    case 'idle': {
      const blink = frameIndex === 1 ? 1 : frameIndex === 2 ? 0.55 : 0;
      addBone(pose, vrm, 'spine', quat(0.02 * wave, 0, 0));
      addBone(pose, vrm, 'head', quat(-0.025 * wave, 0.02 * alt, 0));
      addBone(pose, vrm, 'leftUpperArm', quat(0.05, 0, 0.18));
      addBone(pose, vrm, 'rightUpperArm', quat(0.05, 0, -0.18));
      setExpression(expressionWeights, vrm, 'blink', blink);
      setExpression(expressionWeights, vrm, 'neutral', 0.2);
      offsetY = 0.012 * Math.max(0, wave);
      break;
    }
    case 'running-right':
      yaw = -Math.PI / 2;
      applyFrontRun(1.08);
      break;
    case 'running-left':
      yaw = Math.PI / 2;
      applyFrontRun(1.08);
      break;
    case 'waving': {
      const wavePose = [0.4, 1.0, 0.65, 0.2][frameIndex] ?? 0.2;
      addBone(pose, vrm, 'spine', quat(0.02 * wave, 0, 0.04));
      addBone(pose, vrm, 'head', quat(-0.03, 0.06 * wave, -0.03));
      addBone(pose, vrm, 'rightUpperArm', quat(-1.12, -0.25, -0.65));
      addBone(pose, vrm, 'rightLowerArm', quat(-0.65, wavePose * 0.55, -0.25));
      addBone(pose, vrm, 'leftUpperArm', quat(0.12, 0, 0.24));
      setExpression(expressionWeights, vrm, 'happy', 0.65);
      setExpression(expressionWeights, vrm, 'relaxed', 0.25);
      break;
    }
    case 'jumping': {
      const jumpOffsets = [0, 0.18, 0.36, 0.18, 0.02];
      const crouch = frameIndex === 0 ? 0.38 : frameIndex === 4 ? 0.16 : 0;
      offsetY = jumpOffsets[frameIndex] ?? 0;
      addBone(pose, vrm, 'hips', quat(-0.08, 0, 0));
      addBone(pose, vrm, 'spine', quat(-0.12, 0, 0));
      addBone(pose, vrm, 'leftUpperLeg', quat(crouch - 0.24, 0, 0.06));
      addBone(pose, vrm, 'rightUpperLeg', quat(crouch - 0.24, 0, -0.06));
      addBone(pose, vrm, 'leftLowerLeg', quat(crouch * 0.9, 0, 0));
      addBone(pose, vrm, 'rightLowerLeg', quat(crouch * 0.9, 0, 0));
      addBone(pose, vrm, 'leftUpperArm', quat(-0.45, 0, 0.36));
      addBone(pose, vrm, 'rightUpperArm', quat(-0.45, 0, -0.36));
      setExpression(expressionWeights, vrm, 'happy', frameIndex === 2 ? 0.7 : 0.35);
      break;
    }
    case 'failed': {
      addBone(pose, vrm, 'hips', quat(0.18, 0, 0));
      addBone(pose, vrm, 'spine', quat(0.28, 0.02 * wave, 0.06 * wave));
      addBone(pose, vrm, 'head', quat(0.42, 0.08 * wave, 0.05 * wave));
      addBone(pose, vrm, 'leftUpperArm', quat(0.5, 0, 0.38));
      addBone(pose, vrm, 'rightUpperArm', quat(0.5, 0, -0.38));
      addBone(pose, vrm, 'leftLowerArm', quat(0.32, 0, 0));
      addBone(pose, vrm, 'rightLowerArm', quat(0.32, 0, 0));
      setExpression(expressionWeights, vrm, 'sad', 0.85);
      setExpression(expressionWeights, vrm, 'blink', frameIndex % 4 === 1 ? 0.45 : 0);
      offsetY = -0.02 + 0.008 * wave;
      break;
    }
    case 'waiting': {
      addBone(pose, vrm, 'spine', quat(0.02 * wave, 0.04 * wave, 0));
      addBone(pose, vrm, 'head', quat(-0.02, 0.2 * wave, 0.03 * wave));
      addBone(pose, vrm, 'leftUpperArm', quat(0.08, 0, 0.16));
      addBone(pose, vrm, 'rightUpperArm', quat(0.08, 0, -0.16));
      setExpression(expressionWeights, vrm, 'blink', frameIndex === 3 ? 0.8 : 0);
      setExpression(expressionWeights, vrm, 'relaxed', 0.2);
      offsetY = 0.018 * Math.max(0, -wave);
      break;
    }
    case 'running':
      applyFrontRun(0.9);
      break;
    case 'review': {
      addBone(pose, vrm, 'spine', quat(0.12, 0.05 * wave, -0.04));
      addBone(pose, vrm, 'neck', quat(0.06, 0, 0));
      addBone(pose, vrm, 'head', quat(0.08, -0.12 + 0.08 * wave, 0.04));
      addBone(pose, vrm, 'leftUpperArm', quat(-0.15, 0, 0.24));
      addBone(pose, vrm, 'rightUpperArm', quat(-0.2, 0, -0.28));
      addBone(pose, vrm, 'rightLowerArm', quat(-0.35, 0, 0));
      setExpression(expressionWeights, vrm, 'lookDown', 0.35);
      setExpression(expressionWeights, vrm, 'blink', frameIndex === 4 ? 0.35 : 0);
      break;
    }
    default:
      addBone(pose, vrm, 'head', IDENTITY);
  }

  return { pose, yaw, offsetY, expressionWeights };
}
