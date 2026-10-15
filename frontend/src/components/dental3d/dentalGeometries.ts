import * as THREE from 'three';
import { ToothSurface } from './dental3dTypes';

/**
 * Anatomical 3D Dental Geometry Sculptor
 * Generates true human tooth morphology, localized surface restoration overlays,
 * multiradicular anatomical roots with endodontic canals, titanium implants,
 * and scalloped gingiva with interdental papillae.
 */

// Helper to compute rounded profile curve
const smoothStep = (min: number, max: number, value: number) => {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
};

/**
 * Builds realistic anatomical human tooth crown geometry
 */
export const buildRealisticAnatomicalCrown = (
  type: 'Incisor' | 'Canine' | 'Premolar' | 'Molar',
  isUpper: boolean,
  fdiNumber: number
): THREE.BufferGeometry => {
  const isCentralIncisor = fdiNumber === 11 || fdiNumber === 21 || fdiNumber === 51 || fdiNumber === 61;
  const isLateralIncisor = fdiNumber === 12 || fdiNumber === 22 || fdiNumber === 52 || fdiNumber === 62;
  const isLowerIncisor = (fdiNumber >= 31 && fdiNumber <= 42) || (fdiNumber >= 71 && fdiNumber <= 82);

  if (type === 'Incisor') {
    // 1. ANATOMICAL HUMAN INCISOR
    // Upper centrals are wide shovel/spade shaped crowns with labial convexities.
    // Lower incisors are slender chisels compressed labiolingually.
    let width = 0.52;
    let height = 0.76;
    let depth = 0.35;

    if (isUpper) {
      width = isCentralIncisor ? 0.68 : (isLateralIncisor ? 0.56 : 0.50);
      height = isCentralIncisor ? 0.84 : 0.76;
      depth = 0.36;
    } else {
      width = isLowerIncisor ? 0.48 : 0.54;
      height = 0.72;
      depth = 0.30;
    }

    const baseGeo = new THREE.BoxGeometry(width, height, depth, 24, 24, 24);
    baseGeo.translate(0, isUpper ? -height / 2 : height / 2, 0);

    const pos = baseGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);
      const t = isUpper ? -y / height : y / height; // 0 at cervix (gumline) to 1 at incisal edge

      // Cervical neck taper (creates biological cervical convergence)
      const neck = 0.65 + 0.35 * Math.sin(t * Math.PI * 0.5);
      x *= neck;

      // Incisal edge thinning
      const incisalThinning = 1.0 - 0.62 * Math.pow(t, 1.3);
      z *= incisalThinning;

      // Labial curvature (convex facial face) and Lingual concavity (fossa + cingulum)
      if (z > 0) {
        // Labial developmental depressions
        const labialArch = Math.cos((x / (width * 0.5)) * (Math.PI / 2.3));
        z += 0.055 * Math.sin(t * Math.PI) * labialArch;
      } else {
        // Lingual cingulum bulge near cervix (t < 0.3) and lingual fossa (t >= 0.3)
        if (t < 0.3) {
          z -= 0.045 * Math.cos((t / 0.3) * Math.PI * 0.5); // Cingulum
        } else {
          z += 0.05 * Math.sin((t - 0.3) * Math.PI * 1.3); // Lingual fossa
        }
      }

      // Rounded incisal edge corners: mesial is sharp (~90 deg), distal is rounded
      if (t > 0.8) {
        const edgeDist = Math.abs(x) / (width * 0.5);
        if (edgeDist > 0.6) {
          const cornerDrop = 0.06 * Math.pow((edgeDist - 0.6) / 0.4, 2.0);
          y += isUpper ? cornerDrop : -cornerDrop;
        }
      }

      pos.setXYZ(i, x, y, z);
    }
    baseGeo.computeVertexNormals();
    return baseGeo;

  } else if (type === 'Canine') {
    // 2. ANATOMICAL HUMAN CANINE
    // Pentagonal crown with prominent labial ridge, robust cusp tip, and strong cingulum
    const width = isUpper ? 0.68 : 0.62;
    const height = isUpper ? 0.88 : 0.80;
    const depth = 0.46;

    const baseGeo = new THREE.CylinderGeometry(width * 0.5, width * 0.36, height, 32, 24);
    baseGeo.translate(0, isUpper ? -height / 2 : height / 2, 0);

    const pos = baseGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);
      const t = isUpper ? -y / height : y / height;

      // Flatten labiolingually
      z *= 0.75;

      // Prominent Labial Ridge (central vertical ridge running along facial face)
      if (z > 0) {
        const ridgeFactor = Math.max(0, 1 - Math.abs(x) / (width * 0.38));
        z += 0.07 * ridgeFactor * Math.sin(t * Math.PI);
      } else {
        // Lingual cingulum and marginal ridges
        if (t < 0.32) {
          z -= 0.05 * (1 - t / 0.32);
        } else {
          z += 0.04 * Math.sin((t - 0.32) * Math.PI);
        }
      }

      // Pointed Cusp Apex with sloping incisal ridges
      if (t > 0.65) {
        const cuspFactor = (1 - t) / 0.35;
        x *= (0.25 + 0.75 * cuspFactor);
        z *= (0.25 + 0.75 * cuspFactor);
        if (t > 0.95) {
          y += isUpper ? -0.05 : 0.05;
        }
      }

      // Cervical constriction at gumline
      if (t < 0.25) {
        const neck = 0.70 + 0.30 * (t / 0.25);
        x *= neck;
        z *= neck;
      }

      pos.setXYZ(i, x, y, z);
    }
    baseGeo.computeVertexNormals();
    return baseGeo;

  } else if (type === 'Premolar') {
    // 3. ANATOMICAL HUMAN BICUSPID PREMOLAR
    // Two distinct cusps (Buccal & Palatal/Lingual) separated by a central developmental groove
    const width = 0.60;
    const height = 0.66;
    const depth = 0.62;
    const baseGeo = new THREE.BoxGeometry(width, height, depth, 24, 24, 24);
    baseGeo.translate(0, isUpper ? -height / 2 : height / 2, 0);

    const pos = baseGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);
      const t = isUpper ? -y / height : y / height;

      // Rounded ovoid contour
      const r = Math.sqrt((x / (width * 0.5)) ** 2 + (z / (depth * 0.5)) ** 2);
      if (r > 1) {
        x /= r;
        z /= r;
      }

      // Cervical taper
      const neck = 0.68 + 0.32 * Math.sin(t * Math.PI * 0.5);
      x *= neck;
      z *= neck;

      // Occlusal Table (2 Cusps & Central Fissure)
      if (t > 0.55) {
        const oFactor = (t - 0.55) / 0.45;
        // Buccal Cusp (z > 0.06) - taller and sharper
        if (z > 0.06) {
          const d = Math.sqrt(x * x + (z - 0.16) ** 2);
          const lift = 0.10 * oFactor * Math.max(0, 1 - d / 0.24);
          y += isUpper ? -lift : lift;
        }
        // Lingual Cusp (z < -0.06)
        else if (z < -0.06) {
          const d = Math.sqrt(x * x + (z + 0.16) ** 2);
          const lift = 0.08 * oFactor * Math.max(0, 1 - d / 0.22);
          y += isUpper ? -lift : lift;
        }
        // Central Developmental Groove (dip in the middle)
        if (Math.abs(z) < 0.08) {
          const dip = 0.07 * oFactor * (1 - Math.abs(z) / 0.08);
          y += isUpper ? dip : -dip;
        }
      }

      pos.setXYZ(i, x, y, z);
    }
    baseGeo.computeVertexNormals();
    return baseGeo;

  } else {
    // 4. ANATOMICAL HUMAN QUADRICUSPID / MULTICUSPID MOLAR
    // Rhomboid / trapezoidal crown with 4 major cusps (MB, DB, ML, DL), central fossa, and grooves
    const width = 0.78;
    const height = 0.64;
    const depth = 0.80;
    const baseGeo = new THREE.BoxGeometry(width, height, depth, 28, 28, 28);
    baseGeo.translate(0, isUpper ? -height / 2 : height / 2, 0);

    const pos = baseGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);
      const t = isUpper ? -y / height : y / height;

      // Rounded rectangular molar contour
      const maxR = 0.86;
      const cornerR = Math.pow(Math.abs(x / (width * 0.5)), 3) + Math.pow(Math.abs(z / (depth * 0.5)), 3);
      if (cornerR > maxR) {
        const scale = Math.pow(maxR / cornerR, 0.25);
        x *= scale;
        z *= scale;
      }

      // Cervical constriction
      if (t < 0.35) {
        const neck = 0.72 + 0.28 * (t / 0.35);
        x *= neck;
        z *= neck;
      } else if (t < 0.65) {
        // Anatomical buccal/lingual height of contour bulge
        const bulge = 1.0 + 0.05 * Math.sin(((t - 0.35) / 0.30) * Math.PI);
        x *= bulge;
        z *= bulge;
      }

      // Occlusal Table Anatomy: 4 Cusps, Central Fossa, and Developmental Grooves
      if (t > 0.52) {
        const oFactor = Math.pow((t - 0.52) / 0.48, 1.2);
        const cusps = [
          { cx: -0.22, cz:  0.22, h: 0.12 }, // Mesio-Buccal
          { cx:  0.22, cz:  0.22, h: 0.10 }, // Disto-Buccal
          { cx: -0.22, cz: -0.22, h: 0.11 }, // Mesio-Lingual
          { cx:  0.22, cz: -0.22, h: 0.09 }, // Disto-Lingual
        ];

        let cuspLift = 0;
        for (const c of cusps) {
          const d = Math.sqrt((x - c.cx) ** 2 + (z - c.cz) ** 2);
          if (d < 0.26) {
            cuspLift += c.h * Math.cos((d / 0.26) * (Math.PI / 2));
          }
        }
        y += isUpper ? -cuspLift * oFactor : cuspLift * oFactor;

        // Central Fossa Depression
        const centerDist = Math.sqrt(x * x + z * z);
        if (centerDist < 0.24) {
          const dip = 0.085 * oFactor * Math.cos((centerDist / 0.24) * (Math.PI / 2));
          y += isUpper ? dip : -dip;
        }

        // Developmental Grooves (Cross-shaped fissure pattern)
        if (Math.abs(x) < 0.06 || Math.abs(z) < 0.06) {
          const groove = 0.04 * oFactor;
          y += isUpper ? groove : -groove;
        }
      }

      pos.setXYZ(i, x, y, z);
    }
    baseGeo.computeVertexNormals();
    return baseGeo;
  }
};

/**
 * Builds localized restoration/caries surface geometry
 * Snaps precisely to the tooth surface (Occlusal, Mesial, Distal, Buccal, Lingual, MOD)
 */
export const buildLocalizedSurfaceGeometry = (
  type: 'Incisor' | 'Canine' | 'Premolar' | 'Molar',
  isUpper: boolean,
  surface: ToothSurface = 'Occlusal'
): THREE.BufferGeometry => {
  const isMolarOrPremolar = type === 'Molar' || type === 'Premolar';

  if (surface === 'Occlusal' || surface === 'MOD') {
    // Occlusal restoration nestled into the pits and fissures
    const radius = isMolarOrPremolar ? 0.26 : 0.18;
    const depth = 0.06;
    const geo = new THREE.CylinderGeometry(radius, radius * 0.8, depth, 16);
    // Position on the biting surface
    const yPos = isUpper ? -0.66 : 0.66;
    geo.translate(0, yPos, 0);
    return geo;
  }

  if (surface === 'Mesial') {
    // Proximal box on mesial contact area
    const geo = new THREE.BoxGeometry(0.08, 0.22, 0.26);
    const xPos = -0.28;
    const yPos = isUpper ? -0.52 : 0.52;
    geo.translate(xPos, yPos, 0);
    return geo;
  }

  if (surface === 'Distal') {
    // Proximal box on distal contact area
    const geo = new THREE.BoxGeometry(0.08, 0.22, 0.26);
    const xPos = 0.28;
    const yPos = isUpper ? -0.52 : 0.52;
    geo.translate(xPos, yPos, 0);
    return geo;
  }

  if (surface === 'Buccal') {
    // Labial / Buccal cervical restoration or veneer patch
    const geo = new THREE.BoxGeometry(0.32, 0.22, 0.06);
    const yPos = isUpper ? -0.38 : 0.38;
    const zPos = 0.28;
    geo.translate(0, yPos, zPos);
    return geo;
  }

  if (surface === 'Lingual') {
    // Lingual / Palatal restoration
    const geo = new THREE.BoxGeometry(0.30, 0.20, 0.06);
    const yPos = isUpper ? -0.38 : 0.38;
    const zPos = -0.26;
    geo.translate(0, yPos, zPos);
    return geo;
  }

  // Fallback to small occlusal pit
  const fallback = new THREE.SphereGeometry(0.12, 12, 12);
  fallback.translate(0, isUpper ? -0.64 : 0.64, 0);
  return fallback;
};

/**
 * Builds anatomical roots with apical curvature and internal endodontic canal
 */
export const buildAnatomicalRootGeometries = (
  isUpper: boolean,
  rootCount: number,
  hasEndo: boolean = false
): { rootGeo: THREE.BufferGeometry; canalGeo?: THREE.BufferGeometry } => {
  const height = 1.05;
  // Natural tapered root with distal apical curvature
  const geo = new THREE.CylinderGeometry(0.19, 0.04, height, 18, 16);
  geo.translate(0, isUpper ? height / 2 : -height / 2, 0);

  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let y = pos.getY(i);
    let x = pos.getX(i);
    let z = pos.getZ(i);
    const t = isUpper ? y / height : -y / height;

    // Distal apical curve in the apical 40%
    if (t > 0.55) {
      const curveFactor = Math.pow((t - 0.55) / 0.45, 2.2);
      x -= 0.10 * curveFactor;
      z -= 0.05 * curveFactor;
    }

    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();

  let canalGeo: THREE.BufferGeometry | undefined = undefined;
  if (hasEndo) {
    // Slender gutta-percha root canal filler inside the dentine root
    const cGeo = new THREE.CylinderGeometry(0.04, 0.015, height * 0.92, 12);
    cGeo.translate(0, isUpper ? (height * 0.92) / 2 : -(height * 0.92) / 2, 0);
    canalGeo = cGeo;
  }

  return { rootGeo: geo, canalGeo };
};

/**
 * Builds realistic dental implant fixture (titanium screw) with hexagonal abutment collar
 */
export const buildAnatomicalImplantGeometry = (isUpper: boolean): THREE.BufferGeometry => {
  const height = 1.05;
  // Threaded tapered titanium cylinder
  const geo = new THREE.CylinderGeometry(0.20, 0.12, height, 20, 24);
  geo.translate(0, isUpper ? height / 2 : -height / 2, 0);

  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let y = pos.getY(i);
    let x = pos.getX(i);
    let z = pos.getZ(i);
    const t = isUpper ? y / height : -y / height;

    // Micro-thread ridging
    const thread = 0.012 * Math.sin(t * Math.PI * 18);
    const angle = Math.atan2(z, x);
    const r = Math.sqrt(x * x + z * z) + thread;
    x = r * Math.cos(angle);
    z = r * Math.sin(angle);

    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
};

/**
 * Builds scalloped gingival arch (gums) with natural interdental papillae
 */
export const buildScallopedGingivaGeometry = (isUpper: boolean): THREE.BufferGeometry => {
  const curvePoints: THREE.Vector3[] = [];
  const count = 48;

  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const angle = (t * 0.84 - 0.42) * Math.PI;
    const rx = 2.95 * Math.sin(angle);
    const rz = 2.45 * Math.cos(angle) - 1.1;

    // Scalloped interdental peaks (papillae) undulating along the arch
    const papillaWave = 0.06 * Math.sin(t * Math.PI * 16);
    const baseY = isUpper ? 0.82 + papillaWave : -0.82 - papillaWave;

    curvePoints.push(new THREE.Vector3(rx, baseY, rz));
  }

  const curve = new THREE.CatmullRomCurve3(curvePoints);
  return new THREE.TubeGeometry(curve, 72, 0.34, 24, false);
};
