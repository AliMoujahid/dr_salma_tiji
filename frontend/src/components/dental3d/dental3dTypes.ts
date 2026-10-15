import { ToothStatusType } from '../../types';

export type ToothSurface =
  | 'Global'
  | 'Occlusal'
  | 'Mesial'
  | 'Distal'
  | 'Buccal'
  | 'Lingual'
  | 'MOD'
  | 'Cervical';

export interface SurfaceAnnotation {
  surface: ToothSurface;
  status: ToothStatusType;
  notes?: string;
  cost?: number;
  date?: string;
}

export type ArchType = 'Adult' | 'Child';
export type JawFilterType = 'All' | 'Maxillary' | 'Mandibular';

export interface ToothGeometryData {
  crownGeo: any;
  rootGeos: any[];
  implantGeo: any;
  surfaceOverlays?: Record<string, any>;
}

export interface GLTFNodeMap {
  [fdiNumber: number]: string; // Maps FDI number e.g. 11 to GLTF node name e.g. "Tooth_11"
}
