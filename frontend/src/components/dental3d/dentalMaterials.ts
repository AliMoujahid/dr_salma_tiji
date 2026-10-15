import * as THREE from 'three';
import { ToothStatusType } from '../../types';
import { ToothSurface } from './dental3dTypes';

/**
 * Photorealistic PBR Dental Materials Manager
 * Implements medically and aesthetically accurate materials for teeth, restorations,
 * titanium implants, and oral mucosa.
 */

// Natural biological enamel base colors
export const NATURAL_ENAMEL_COLOR = '#faf8f0';
export const NATURAL_DENTINE_COLOR = '#f4ebd8';
export const HEALTHY_GINGIVA_COLOR = '#d16073';
export const IMPLANT_TITANIUM_COLOR = '#8892a0';

// Status color and PBR properties registry
export const STATUS_PBR_PRESETS: Record<
  string,
  {
    label: string;
    badgeColor: string;
    color: string;
    roughness: number;
    metalness: number;
    clearcoat: number;
    clearcoatRoughness?: number;
    transmission?: number;
    ior?: number;
    opacity?: number;
    wireframe?: boolean;
    isLocalized?: boolean; // Can be rendered as a localized surface restoration
  }
> = {
  Healthy: {
    label: 'Sain',
    badgeColor: 'bg-emerald-500',
    color: NATURAL_ENAMEL_COLOR,
    roughness: 0.16,
    metalness: 0.02,
    clearcoat: 0.88,
    clearcoatRoughness: 0.06,
    transmission: 0.02,
    ior: 1.63,
  },
  Caries: {
    label: 'Carie',
    badgeColor: 'bg-amber-900',
    color: '#361d0a', // Demineralized brown/black cavity
    roughness: 0.88,
    metalness: 0.0,
    clearcoat: 0.0,
    isLocalized: true,
  },
  'Composite Filling': {
    label: 'Composite',
    badgeColor: 'bg-cyan-500',
    color: '#f5f0e1', // Tooth-colored aesthetic composite resin
    roughness: 0.22,
    metalness: 0.02,
    clearcoat: 0.65,
    clearcoatRoughness: 0.08,
    isLocalized: true,
  },
  Filling: {
    label: 'Obturation',
    badgeColor: 'bg-cyan-500',
    color: '#f5f0e1',
    roughness: 0.22,
    metalness: 0.02,
    clearcoat: 0.65,
    isLocalized: true,
  },
  'Amalgam Filling': {
    label: 'Amalgame Métallique',
    badgeColor: 'bg-slate-400',
    color: '#525966', // Burnished silver-mercury amalgam
    roughness: 0.28,
    metalness: 0.88,
    clearcoat: 0.1,
    isLocalized: true,
  },
  Crown: {
    label: 'Couronne Céramique',
    badgeColor: 'bg-amber-500',
    color: '#faf7ed', // Glazed prosthetic ceramic
    roughness: 0.08,
    metalness: 0.02,
    clearcoat: 0.98,
    clearcoatRoughness: 0.04,
    ior: 1.65,
  },
  'Permanent Crown': {
    label: 'Couronne Zircone / Or',
    badgeColor: 'bg-amber-400',
    color: '#f59e0b',
    roughness: 0.12,
    metalness: 0.75,
    clearcoat: 0.8,
  },
  'Temporary Crown': {
    label: 'Couronne Provisoire',
    badgeColor: 'bg-amber-600',
    color: '#e5c07b',
    roughness: 0.35,
    metalness: 0.0,
    clearcoat: 0.2,
  },
  'Root Canal': {
    label: 'Dévitalisée (Endo)',
    badgeColor: 'bg-pink-500',
    color: NATURAL_ENAMEL_COLOR, // Enamel stays healthy; canal has gutta-percha
    roughness: 0.2,
    metalness: 0.02,
    clearcoat: 0.85,
  },
  Implant: {
    label: 'Implant Titane',
    badgeColor: 'bg-blue-500',
    color: IMPLANT_TITANIUM_COLOR,
    roughness: 0.18,
    metalness: 0.94,
    clearcoat: 0.0,
  },
  Bridge: {
    label: 'Pont (Bridge)',
    badgeColor: 'bg-violet-500',
    color: '#a78bfa',
    roughness: 0.2,
    metalness: 0.4,
    clearcoat: 0.6,
  },
  Missing: {
    label: 'Absente',
    badgeColor: 'bg-slate-600',
    color: '#64748b',
    roughness: 0.6,
    metalness: 0.0,
    clearcoat: 0.0,
    opacity: 0.18,
    wireframe: true,
  },
  Extracted: {
    label: 'Extraite',
    badgeColor: 'bg-rose-500',
    color: '#ef4444',
    roughness: 0.5,
    metalness: 0.0,
    clearcoat: 0.0,
    opacity: 0.25,
    wireframe: true,
  },
  Fracture: {
    label: 'Fracture',
    badgeColor: 'bg-red-600',
    color: '#dc2626',
    roughness: 0.5,
    metalness: 0.0,
    clearcoat: 0.2,
  },
  'Mobile Grade I': {
    label: 'Mobilité I',
    badgeColor: 'bg-teal-500',
    color: '#14b8a6',
    roughness: 0.3,
    metalness: 0.0,
    clearcoat: 0.4,
  },
  'Mobile Grade II': {
    label: 'Mobilité II',
    badgeColor: 'bg-teal-600',
    color: '#0d9488',
    roughness: 0.3,
    metalness: 0.0,
    clearcoat: 0.4,
  },
  'Mobile Grade III': {
    label: 'Mobilité III',
    badgeColor: 'bg-teal-700',
    color: '#0f766e',
    roughness: 0.3,
    metalness: 0.0,
    clearcoat: 0.4,
  },
  'Wisdom Tooth': {
    label: 'Dent de Sagesse',
    badgeColor: 'bg-indigo-500',
    color: '#6366f1',
    roughness: 0.2,
    metalness: 0.05,
    clearcoat: 0.8,
  },
};

/**
 * Creates or updates an enamel MeshPhysicalMaterial
 */
export const createEnamelMaterial = (
  isSelected: boolean,
  status: ToothStatusType = 'Healthy',
  isFullCrownTint: boolean = false
): THREE.Material => {
  const preset = STATUS_PBR_PRESETS[status] || STATUS_PBR_PRESETS.Healthy;

  if (isSelected) {
    return new THREE.MeshPhysicalMaterial({
      color: '#2563eb', // Selected electric cobalt
      roughness: 0.15,
      metalness: 0.08,
      clearcoat: 0.9,
      clearcoatRoughness: 0.06,
      reflectivity: 0.9,
    });
  }

  // If status is localized (like Caries, Filling, Amalgam), the main crown keeps natural enamel!
  const useNaturalColor = !isFullCrownTint && preset.isLocalized;
  const color = useNaturalColor ? NATURAL_ENAMEL_COLOR : preset.color;

  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: preset.roughness,
    metalness: preset.metalness,
    clearcoat: preset.clearcoat,
    clearcoatRoughness: preset.clearcoatRoughness ?? 0.08,
    transmission: preset.transmission ?? 0.02,
    ior: preset.ior ?? 1.62,
    reflectivity: 0.85,
    transparent: Boolean(preset.opacity),
    opacity: preset.opacity ?? 1.0,
    wireframe: Boolean(preset.wireframe),
  });
};

/**
 * Creates localized restoration material for specific tooth surfaces (e.g. occlusal filling, caries pit)
 */
export const createSurfaceRestorationMaterial = (
  status: ToothStatusType,
  surface: ToothSurface = 'Occlusal'
): THREE.Material => {
  const preset = STATUS_PBR_PRESETS[status] || STATUS_PBR_PRESETS['Composite Filling'];

  return new THREE.MeshPhysicalMaterial({
    color: preset.color,
    roughness: preset.roughness,
    metalness: preset.metalness,
    clearcoat: preset.clearcoat,
    clearcoatRoughness: 0.08,
    depthTest: true,
    depthWrite: true,
    polygonOffset: true,
    polygonOffsetFactor: -1.0, // Prevents z-fighting with the underlying enamel crown
    polygonOffsetUnits: -1.0,
  });
};

/**
 * Creates gingiva / gum material
 */
export const createGingivaMaterial = (showRoots: boolean): THREE.Material => {
  return new THREE.MeshPhysicalMaterial({
    color: HEALTHY_GINGIVA_COLOR,
    roughness: 0.36,
    metalness: 0.02,
    clearcoat: 0.35,
    clearcoatRoughness: 0.12,
    reflectivity: 0.7,
    transparent: showRoots,
    opacity: showRoots ? 0.35 : 0.98,
  });
};

/**
 * Creates natural tooth root material with optional endodontic canal filling
 */
export const createRootMaterial = (hasEndo: boolean = false, showRoots: boolean = true): THREE.Material => {
  return new THREE.MeshStandardMaterial({
    color: NATURAL_DENTINE_COLOR,
    roughness: 0.42,
    metalness: 0.0,
    transparent: hasEndo && showRoots,
    opacity: hasEndo && showRoots ? 0.65 : 1.0,
  });
};

/**
 * Gutta-percha canal material for devitalized teeth (Root canal)
 */
export const createGuttaPerchaMaterial = (): THREE.Material => {
  return new THREE.MeshStandardMaterial({
    color: '#ea580c', // Bright orange-pink endodontic gutta-percha
    roughness: 0.3,
    metalness: 0.0,
  });
};

/**
 * Titanium dental implant material
 */
export const createTitaniumImplantMaterial = (): THREE.Material => {
  return new THREE.MeshStandardMaterial({
    color: IMPLANT_TITANIUM_COLOR,
    metalness: 0.94,
    roughness: 0.2,
  });
};
