import React, { useState, useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  RotateCcw,
  Maximize2,
  Minimize2,
  Eye,
  Plus,
  Trash2,
  X,
  FileText,
  Activity,
  Layers,
  Sparkles,
  Sliders,
  Box,
  CheckCircle2,
} from 'lucide-react';
import { ToothHistory, ToothStatusType, ToothMetadata } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { XRayViewerModal } from './XRayViewerModal';
import { API_URL } from '../config/api';
import { formatDate } from '../utils/dateUtils';
import { TreatmentAnimationModal } from './TreatmentAnimationModal';
import { matchesTooth, mapActToToothStatus } from '../utils/dentalUtils';

// Modular Dental 3D Sub-components
import { ToothSurface, SURFACE_OPTIONS } from '../utils/surfaceUtils';
import { detectToothSurface } from '../utils/surfaceUtils';
import {
  STATUS_PBR_PRESETS,
  createEnamelMaterial,
  createSurfaceRestorationMaterial,
  createGingivaMaterial,
  createRootMaterial,
  createGuttaPerchaMaterial,
  createTitaniumImplantMaterial,
} from './dental3d/dentalMaterials';
import {
  buildRealisticAnatomicalCrown,
  buildLocalizedSurfaceGeometry,
  buildAnatomicalRootGeometries,
  buildAnatomicalImplantGeometry,
  buildScallopedGingivaGeometry,
} from './dental3d/dentalGeometries';
import { useDentalArchGLTF } from './dental3d/useDentalArchGLTF';

// --- ANATOMICAL METADATA DICTIONARY FOR ALL 32 ADULT & 20 CHILD TEETH ---
const getToothMetadata = (fdiNumber: number): ToothMetadata => {
  const isUpper = (fdiNumber >= 11 && fdiNumber <= 28) || (fdiNumber >= 51 && fdiNumber <= 65);
  const isRight =
    (fdiNumber >= 11 && fdiNumber <= 18) ||
    (fdiNumber >= 41 && fdiNumber <= 48) ||
    (fdiNumber >= 51 && fdiNumber <= 55) ||
    (fdiNumber >= 81 && fdiNumber <= 85);
  const isChild = fdiNumber >= 51;

  let type: 'Incisor' | 'Canine' | 'Premolar' | 'Molar' = 'Incisor';
  let rootCount = 1;
  let nameFr = '';
  let nameEn = '';

  const digit = fdiNumber % 10;
  if (digit === 1 || digit === 2) {
    type = 'Incisor';
    rootCount = 1;
    nameFr = digit === 1 ? 'Incisive Centrale' : 'Incisive Latérale';
    nameEn = digit === 1 ? 'Central Incisor' : 'Lateral Incisor';
  } else if (digit === 3) {
    type = 'Canine';
    rootCount = 1;
    nameFr = 'Canine';
    nameEn = 'Canine';
  } else if (digit === 4 || digit === 5) {
    type = isChild ? 'Molar' : 'Premolar';
    rootCount = isUpper ? 2 : 1;
    nameFr = isChild
      ? digit === 4
        ? '1ère Molaire de Lait'
        : '2ème Molaire de Lait'
      : digit === 4
      ? '1ère Prémolaire'
      : '2ème Prémolaire';
    nameEn = isChild
      ? digit === 4
        ? 'First Primary Molar'
        : 'Second Primary Molar'
      : digit === 4
      ? 'First Premolar'
      : 'Second Premolar';
  } else {
    type = 'Molar';
    rootCount = isUpper ? 3 : 2;
    nameFr =
      digit === 6
        ? '1ère Molaire (Dent de 6 ans)'
        : digit === 7
        ? '2ème Molaire (Dent de 12 ans)'
        : '3ème Molaire (Dent de Sagesse)';
    nameEn = digit === 6 ? 'First Molar' : digit === 7 ? 'Second Molar' : 'Third Molar (Wisdom)';
  }

  // Universal Number mapping
  let universalNumber: string | number = fdiNumber;
  if (!isChild) {
    if (fdiNumber >= 11 && fdiNumber <= 18) universalNumber = 9 - (fdiNumber - 10);
    else if (fdiNumber >= 21 && fdiNumber <= 28) universalNumber = fdiNumber - 20 + 8;
    else if (fdiNumber >= 31 && fdiNumber <= 38) universalNumber = 25 + (fdiNumber - 30);
    else if (fdiNumber >= 41 && fdiNumber <= 48) universalNumber = 33 - (fdiNumber - 40);
  } else {
    const primaryLetters: Record<number, string> = {
      55: 'A',
      54: 'B',
      53: 'C',
      52: 'D',
      51: 'E',
      61: 'F',
      62: 'G',
      63: 'H',
      64: 'I',
      65: 'J',
      71: 'O',
      72: 'N',
      73: 'M',
      74: 'L',
      75: 'K',
      81: 'P',
      82: 'Q',
      83: 'R',
      84: 'S',
      85: 'T',
    };
    universalNumber = primaryLetters[fdiNumber] || fdiNumber;
  }

  const jawText = isUpper ? 'Maxillaire Supérieur' : 'Mandibule Inférieure';
  const sideText = isRight ? 'Droit' : 'Gauche';

  return {
    fdiNumber,
    universalNumber,
    nameFr: `${nameFr} (${jawText} ${sideText})`,
    nameEn: `${nameEn} (${isUpper ? 'Upper' : 'Lower'} ${isRight ? 'Right' : 'Left'})`,
    type,
    side: isRight ? 'Right' : 'Left',
    jaw: isUpper ? 'Maxillary' : 'Mandibular',
    archType: isChild ? 'Child' : 'Adult',
    rootCount,
  };
};

// --- PHOTOREALISTIC HUMAN 3D TOOTH COMPONENT (PBR + SURFACE AWARE) ---
const ToothMesh3D: React.FC<{
  fdiNumber: number;
  position: [number, number, number];
  rotation: [number, number, number];
  status?: ToothStatusType;
  surface?: ToothSurface;
  isSelected?: boolean;
  showLabels?: boolean;
  showRoots?: boolean;
  customGeometry?: THREE.BufferGeometry;
  onClick?: () => void;
}> = ({
  fdiNumber,
  position,
  rotation,
  status = 'Healthy',
  surface = 'Global',
  isSelected = false,
  showLabels = true,
  showRoots = false,
  customGeometry,
  onClick,
}) => {
  const meshRef = useRef<THREE.Group>(null);
  const meta = useMemo(() => getToothMetadata(fdiNumber), [fdiNumber]);
  const isUpper = meta.jaw === 'Maxillary';
  const isMissingOrExtracted = status === 'Missing' || status === 'Extracted';
  const isImplant = status === 'Implant';
  const hasEndo = status === 'Root Canal';

  // Geometry generator with anatomical fidelity
  const { crownGeo, rootData, implantGeo, surfaceOverlayGeo } = useMemo(() => {
    // If external GLTF provided geometry for this tooth, use it; otherwise generate high-precision procedural mesh
    const cGeo = customGeometry || buildRealisticAnatomicalCrown(meta.type, isUpper, fdiNumber);
    const rData = buildAnatomicalRootGeometries(isUpper, meta.rootCount, hasEndo);
    const impGeo = buildAnatomicalImplantGeometry(isUpper);

    // Localized surface restoration overlay
    const isLocalizedStatus =
      status === 'Caries' ||
      status === 'Composite Filling' ||
      status === 'Filling' ||
      status === 'Amalgam Filling';

    const sGeo =
      isLocalizedStatus && surface !== 'Global'
        ? buildLocalizedSurfaceGeometry(meta.type, isUpper, surface)
        : null;

    return {
      crownGeo: cGeo,
      rootData: rData,
      implantGeo: impGeo,
      surfaceOverlayGeo: sGeo,
    };
  }, [meta, fdiNumber, isUpper, status, surface, hasEndo, customGeometry]);

  // Materials Isolation
  const enamelMat = useMemo(
    () => createEnamelMaterial(isSelected, status, surface === 'Global'),
    [isSelected, status, surface]
  );

  const surfaceMat = useMemo(
    () => createSurfaceRestorationMaterial(status, surface),
    [status, surface]
  );

  const rootMat = useMemo(
    () => createRootMaterial(hasEndo, showRoots),
    [hasEndo, showRoots]
  );

  const guttaMat = useMemo(() => createGuttaPerchaMaterial(), []);
  const implantMat = useMemo(() => createTitaniumImplantMaterial(), []);

  return (
    <group
      ref={meshRef}
      position={position}
      rotation={rotation}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
    >
      {/* 1. Main Anatomical Crown Mesh */}
      {!isMissingOrExtracted && (
        <mesh geometry={crownGeo} material={enamelMat} castShadow receiveShadow />
      )}

      {/* 2. Localized Surface Restoration Overlay (Caries, Composite, Amalgam) */}
      {!isMissingOrExtracted && surfaceOverlayGeo && (
        <mesh geometry={surfaceOverlayGeo} material={surfaceMat} castShadow receiveShadow />
      )}

      {/* 3. Ghost Holographic Outline for Extracted Teeth */}
      {status === 'Extracted' && (
        <group>
          <mesh geometry={crownGeo}>
            <meshStandardMaterial color="#f43f5e" transparent opacity={0.22} roughness={0.6} />
          </mesh>
          <mesh geometry={crownGeo}>
            <meshBasicMaterial color="#ef4444" wireframe={true} transparent opacity={0.4} />
          </mesh>
        </group>
      )}

      {/* 4. Ghost Grey Outline for Missing Teeth */}
      {status === 'Missing' && (
        <mesh geometry={crownGeo}>
          <meshBasicMaterial color="#64748b" wireframe={true} transparent opacity={0.25} />
        </mesh>
      )}

      {/* 5. Anatomical Roots with Apical Curvature & Endodontic Canals */}
      {!isMissingOrExtracted && !isImplant && (showRoots || meta.rootCount > 0) && (
        <group visible={showRoots}>
          {meta.rootCount === 1 && (
            <group>
              <mesh geometry={rootData.rootGeo} material={rootMat} castShadow />
              {hasEndo && rootData.canalGeo && (
                <mesh geometry={rootData.canalGeo} material={guttaMat} />
              )}
            </group>
          )}

          {meta.rootCount === 2 && (
            <group>
              {/* Mesial Root */}
              <group position={[-0.13, 0, 0]} rotation={[0, 0, isUpper ? -0.12 : 0.12]}>
                <mesh geometry={rootData.rootGeo} material={rootMat} castShadow />
                {hasEndo && rootData.canalGeo && (
                  <mesh geometry={rootData.canalGeo} material={guttaMat} />
                )}
              </group>
              {/* Distal Root */}
              <group position={[0.13, 0, 0]} rotation={[0, 0, isUpper ? 0.12 : -0.12]}>
                <mesh geometry={rootData.rootGeo} material={rootMat} castShadow />
                {hasEndo && rootData.canalGeo && (
                  <mesh geometry={rootData.canalGeo} material={guttaMat} />
                )}
              </group>
            </group>
          )}

          {meta.rootCount >= 3 && (
            <group>
              {/* Mesio-Buccal Root */}
              <group position={[-0.13, 0, 0.08]} rotation={[0.08, -0.08, isUpper ? -0.12 : 0.12]}>
                <mesh geometry={rootData.rootGeo} material={rootMat} castShadow />
                {hasEndo && rootData.canalGeo && (
                  <mesh geometry={rootData.canalGeo} material={guttaMat} />
                )}
              </group>
              {/* Disto-Buccal Root */}
              <group position={[0.13, 0, 0.08]} rotation={[0.08, 0.08, isUpper ? 0.12 : -0.12]}>
                <mesh geometry={rootData.rootGeo} material={rootMat} castShadow />
                {hasEndo && rootData.canalGeo && (
                  <mesh geometry={rootData.canalGeo} material={guttaMat} />
                )}
              </group>
              {/* Palatal Divergent Root (Longest) */}
              <group position={[0, 0, -0.14]} rotation={[-0.14, 0, 0]}>
                <mesh geometry={rootData.rootGeo} material={rootMat} castShadow />
                {hasEndo && rootData.canalGeo && (
                  <mesh geometry={rootData.canalGeo} material={guttaMat} />
                )}
              </group>
            </group>
          )}
        </group>
      )}

      {/* 6. Medical Grade 5 Titanium Implant Fixture */}
      {isImplant && (
        <group>
          <mesh geometry={implantGeo} material={implantMat} castShadow />
        </group>
      )}

      {/* 7. Floating FDI Badge with Micro-interaction */}
      {showLabels && (
        <Html position={[0, isUpper ? 0.95 : -0.95, 0]} center distanceFactor={12}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onClick) onClick();
            }}
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold transition-all shadow-lg cursor-pointer backdrop-blur-md select-none ${
              isSelected
                ? 'bg-blue-600 text-white ring-2 ring-blue-400 scale-110 shadow-blue-500/50'
                : status === 'Extracted'
                ? 'bg-rose-600 text-white border border-rose-400 ring-2 ring-rose-500/50 shadow-rose-950 font-black scale-105'
                : status === 'Missing'
                ? 'bg-slate-700 text-slate-300 border border-slate-500 line-through'
                : status === 'Implant'
                ? 'bg-blue-600 text-white border border-blue-400'
                : status === 'Crown' || status === 'Permanent Crown'
                ? 'bg-amber-500 text-slate-900 border border-amber-300 font-black'
                : status === 'Root Canal'
                ? 'bg-pink-600 text-white border border-pink-400'
                : status === 'Caries'
                ? 'bg-amber-900 text-amber-200 border border-amber-700'
                : status === 'Filling' || status === 'Composite Filling'
                ? 'bg-cyan-600 text-white border border-cyan-400'
                : status === 'Amalgam Filling'
                ? 'bg-slate-500 text-white border border-slate-400'
                : 'bg-slate-900/85 text-slate-200 border border-white/10 hover:bg-blue-500 hover:text-white'
            }`}
          >
            {fdiNumber}
            {status === 'Extracted' ? ' ✕' : ''}
          </button>
        </Html>
      )}
    </group>
  );
};

// --- SCALLOPED GINGIVA ARCH MESHES ---
const MaxillaryGingivaMesh: React.FC<{ showRoots: boolean; customGeo?: THREE.BufferGeometry | null }> = ({
  showRoots,
  customGeo,
}) => {
  const archGeo = useMemo(() => customGeo || buildScallopedGingivaGeometry(true), [customGeo]);
  const material = useMemo(() => createGingivaMaterial(showRoots), [showRoots]);
  return <mesh geometry={archGeo} material={material} receiveShadow castShadow />;
};

const MandibularGingivaMesh: React.FC<{ showRoots: boolean; customGeo?: THREE.BufferGeometry | null }> = ({
  showRoots,
  customGeo,
}) => {
  const archGeo = useMemo(() => customGeo || buildScallopedGingivaGeometry(false), [customGeo]);
  const material = useMemo(() => createGingivaMaterial(showRoots), [showRoots]);
  return <mesh geometry={archGeo} material={material} receiveShadow castShadow />;
};

// --- MAIN 3D DENTAL CHART COMPONENT ---
interface Dental3DViewerProps {
  patientId: string;
  carnetActs?: any[];
  onUpdateCarnet?: () => void;
}

export const Dental3DViewer: React.FC<Dental3DViewerProps> = ({
  patientId,
  carnetActs = [],
  onUpdateCarnet,
}) => {
  const { token } = useAuth();
  const { toast, confirm } = useToast();
  const [odontogram, setOdontogram] = useState<any[]>([]);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [toothHistoryList, setToothHistoryList] = useState<ToothHistory[]>([]);

  // View state controls
  const [archMode, setArchMode] = useState<'Adult' | 'Child'>('Adult');
  const [jawFilter, setJawFilter] = useState<'All' | 'Maxillary' | 'Mandibular'>('All');
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showRoots, setShowRoots] = useState<boolean>(false);
  const [showLabels, setShowLabels] = useState<boolean>(true);

  // Mandible TMJ Opening (0 = closed occlusion, 1 = wide open)
  const [mouthOpening, setMouthOpening] = useState<number>(0.35);

  // Form states for clinical intervention
  const [newStatus, setNewStatus] = useState<ToothStatusType>('Healthy');
  const [selectedSurface, setSelectedSurface] = useState<ToothSurface>('Global');
  const [procedureName, setProcedureName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newCost, setNewCost] = useState('');
  const [syncWithCarnet, setSyncWithCarnet] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal overlays
  const [xrayModalUrl, setXrayModalUrl] = useState<string | null>(null);
  const [treatmentAnimType, setTreatmentAnimType] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Clinic Dental Acts catalogue with official tariffs
  const [dentalActs, setDentalActs] = useState<any[]>([]);

  React.useEffect(() => {
    fetch(`${API_URL}/dental-acts`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setDentalActs(data);
      })
      .catch((err) => console.error('Error fetching dental acts:', err));
  }, [token]);

  // Intelligent price resolver (matches clinic nomenclature or official Moroccan tariffs)
  const resolveDefaultPrice = (
    status: ToothStatusType,
    procName: string = '',
    toothNum?: number | null
  ): number => {
    const isWisdom = toothNum ? toothNum % 10 === 8 : false;
    const searchTerms = [procName, status].filter(Boolean).map((s) => s.toLowerCase());

    // 1. Check in official clinic catalog
    if (dentalActs.length > 0) {
      if (isWisdom && searchTerms.some((s) => s.includes('extrac') || s.includes('exo') || s === 'extraite')) {
        const wisdomAct = dentalActs.find((a) => a.name.toLowerCase().includes('sagesse'));
        if (wisdomAct?.defaultPrice) return wisdomAct.defaultPrice;
      }

      for (const term of searchTerms) {
        if (!term || term === 'healthy' || term === 'sain' || term === 'missing' || term === 'absente') continue;

        const exactMatch = dentalActs.find((a) => a.name.toLowerCase() === term);
        if (exactMatch?.defaultPrice) return exactMatch.defaultPrice;

        const partialMatch = dentalActs.find((a) => {
          const aName = a.name.toLowerCase();
          if (term.includes('extrac') || term === 'extraite') return aName.includes('extraction');
          if (term.includes('couronne') || term.includes('crown')) return aName.includes('couronne');
          if (term.includes('implant')) return aName.includes('implant');
          if (term.includes('endo') || term.includes('dévitalis') || term.includes('root canal')) return aName.includes('endo');
          if (
            term.includes('carie') ||
            term.includes('composite') ||
            term.includes('filling') ||
            term.includes('obturation')
          ) {
            return aName.includes('carie') || aName.includes('reconstitution');
          }
          if (term.includes('détartrage')) return aName.includes('détartrage');
          if (term.includes('bridge') || term.includes('pont')) return aName.includes('bridge');
          return aName.includes(term);
        });
        if (partialMatch?.defaultPrice) return partialMatch.defaultPrice;
      }
    }

    // 2. Moroccan clinic standard tariffs fallback
    const combined = `${procName} ${status}`.toLowerCase();
    if (combined.includes('sagesse')) return 1000;
    if (combined.includes('extrac') || combined.includes('exo') || status === 'Extracted') return 500;
    if (combined.includes('couronne zircone') || status === 'Permanent Crown') return 2500;
    if (combined.includes('couronne') || status === 'Crown') return 1500;
    if (combined.includes('couronne provisoire') || status === 'Temporary Crown') return 500;
    if (combined.includes('implant') || status === 'Implant') return 6000;
    if (combined.includes('bridge') || status === 'Bridge') return 3500;
    if (combined.includes('endo') || status === 'Root Canal') return 600;
    if (
      combined.includes('composite') ||
      combined.includes('carie') ||
      status === 'Filling' ||
      status === 'Composite Filling' ||
      status === 'Caries'
    )
      return 300;
    if (combined.includes('amalgame') || status === 'Amalgam Filling') return 400;
    if (combined.includes('détartrage')) return 400;
    if (combined.includes('blanchiment')) return 2500;

    return 0;
  };

  // Load external GLTF model if present in /models/ with seamless procedural fallback
  const { hasGLTF, toothGeometries, maxillaryGingivaGeo, mandibularGingivaGeo } =
    useDentalArchGLTF(archMode);

  // Arch tooth arrays (FDI standard)
  const adultUpper = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const adultLower = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
  const childUpper = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
  const childLower = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

  // Fetch patient history records
  React.useEffect(() => {
    fetchOdontogram();
  }, [patientId]);

  const fetchOdontogram = () => {
    fetch(`${API_URL}/teeth/patient/${patientId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setOdontogram(data);
      })
      .catch((err) => console.error('Error fetching 3D odontogram:', err));
  };

  // Dynamically resolve tooth clinical state merging Odontogram and Carnet Treatments
  const getToothState = (fdiNumber: number) => {
    const matchingActs = (carnetActs || []).filter((a) => matchesTooth(a.tooth, fdiNumber));
    const record = odontogram.find(
      (t) => t.toothNumber === fdiNumber || (fdiNumber === 11 && t.toothNumber === 1)
    );

    let resolvedStatus: ToothStatusType = (record?.status as ToothStatusType) || 'Healthy';
    let resolvedSurface: ToothSurface = 'Global';

    if (record?.procedureName || record?.notes) {
      resolvedSurface = detectToothSurface(record.procedureName, record.notes);
    }

    if (matchingActs.length > 0) {
      const sortedActs = [...matchingActs].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const latestAct = sortedActs[0];
      const actStatus = mapActToToothStatus(
        latestAct.description || latestAct.actName || '',
        latestAct.category || ''
      );
      if (actStatus !== 'Healthy') {
        resolvedStatus = actStatus;
        const actSurface = detectToothSurface(
          latestAct.description || latestAct.actName,
          latestAct.notes
        );
        if (actSurface !== 'Global') {
          resolvedSurface = actSurface;
        }
      }
    }

    return {
      status: resolvedStatus,
      surface: resolvedSurface,
      matchingActs,
      record,
    };
  };

  const handleSelectTooth = (toothNum: number) => {
    setSelectedTooth(toothNum);
    const toothState = getToothState(toothNum);
    setNewStatus(toothState.status);
    setSelectedSurface(toothState.surface);
    const isWisdom = toothNum % 10 === 8;
    const defaultProc =
      toothState.status === 'Extracted'
        ? isWisdom
          ? 'Extraction dent de sagesse'
          : 'Extraction (Exo)'
        : toothState.status === 'Crown'
        ? 'Couronne céramique'
        : toothState.status === 'Implant'
        ? 'Implant Titane'
        : toothState.status === 'Root Canal'
        ? 'Endodontie (Endo)'
        : toothState.status === 'Filling' || toothState.status === 'Composite Filling'
        ? 'Composite résine'
        : '';
    setProcedureName(defaultProc);
    setNewNotes('');

    const autoPrice = resolveDefaultPrice(toothState.status, defaultProc, toothNum);
    setNewCost(autoPrice > 0 ? autoPrice.toString() : '');

    fetch(`${API_URL}/teeth/patient/${patientId}/tooth/${toothNum}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setToothHistoryList(data))
      .catch((err) => console.error('Error fetching tooth history:', err));
  };

  const handleAddIntervention = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTooth) return;

    setSubmitting(true);

    // Format procedure with surface if localized
    let finalProcedureName = procedureName.trim();
    if (selectedSurface !== 'Global' && !finalProcedureName.includes(`(${selectedSurface})`)) {
      const surfaceTag = `(${selectedSurface})`;
      finalProcedureName = finalProcedureName
        ? `${finalProcedureName} ${surfaceTag}`
        : `${newStatus} ${surfaceTag}`;
    }

    // Auto-resolve price if empty or 0 for clinical procedures (NEVER allow 0 DH unintentionally!)
    let enteredCost = parseFloat(newCost);
    if ((isNaN(enteredCost) || enteredCost <= 0) && newStatus !== 'Healthy' && newStatus !== 'Missing') {
      enteredCost = resolveDefaultPrice(newStatus, finalProcedureName, selectedTooth);
    }
    const finalCost = isNaN(enteredCost) ? 0 : enteredCost;

    fetch(`${API_URL}/teeth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        patientId,
        toothNumber: selectedTooth,
        procedureName: finalProcedureName || undefined,
        status: newStatus,
        notes: newNotes,
        cost: finalCost,
        addToCarnet: syncWithCarnet,
      }),
    })
      .then((res) => res.json())
      .then((newRecord) => {
        setToothHistoryList([newRecord, ...toothHistoryList]);
        setProcedureName('');
        setNewNotes('');
        setNewCost('');
        fetchOdontogram();
        if (syncWithCarnet && onUpdateCarnet) {
          onUpdateCarnet();
        }
        toast.success(
          'Acte enregistré',
          `L'acte sur la dent #${selectedTooth} (${selectedSurface}) a été enregistré (${finalCost} DH).`
        );
      })
      .catch((err) => {
        console.error('Error logging 3D tooth status:', err);
        toast.error('Erreur', "Impossible d'enregistrer l'acte.");
      })
      .finally(() => setSubmitting(false));
  };


  const handleDeleteHistory = async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer cette intervention 3D ?',
      message: "Cette intervention dentaire sera retirée de l'historique 3D du patient.",
      variant: 'danger',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
    });
    if (!confirmed) return;

    fetch(`${API_URL}/teeth/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => {
        setToothHistoryList(toothHistoryList.filter((item) => item._id !== id));
        fetchOdontogram();
        toast.success('Intervention supprimée', "L'acte a été retiré de la vue 3D.");
      })
      .catch((err) => {
        console.error('Error deleting record:', err);
        toast.error('Erreur', "Impossible de supprimer l'intervention.");
      });
  };

  // Parabolic arch positioning in 3D space
  const toothPositions = useMemo(() => {
    const positions: Record<
      number,
      { pos: [number, number, number]; rot: [number, number, number] }
    > = {};

    const calcArch = (teeth: number[], isUpper: boolean) => {
      const count = teeth.length;
      teeth.forEach((num, idx) => {
        const t = idx / (count - 1);
        const angle = (t * 0.84 - 0.42) * Math.PI;
        const radiusX = 2.95;
        const radiusZ = 2.45;
        const x = radiusX * Math.sin(angle);
        const z = radiusZ * Math.cos(angle) - 1.1;
        const y = isUpper ? 0.70 : -0.70;
        const rotY = -angle;

        positions[num] = { pos: [x, y, z], rot: [0, rotY, 0] };
      });
    };

    if (archMode === 'Adult') {
      calcArch(adultUpper, true);
      calcArch(adultLower, false);
    } else {
      calcArch(childUpper, true);
      calcArch(childLower, false);
    }

    return positions;
  }, [archMode]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const selectedMeta = selectedTooth ? getToothMetadata(selectedTooth) : null;

  // Upper & Lower teeth partitions
  const upperTeeth = useMemo(() => {
    return Object.entries(toothPositions).filter(([numStr]) => {
      const num = Number(numStr);
      return getToothMetadata(num).jaw === 'Maxillary';
    });
  }, [toothPositions]);

  const lowerTeeth = useMemo(() => {
    return Object.entries(toothPositions).filter(([numStr]) => {
      const num = Number(numStr);
      return getToothMetadata(num).jaw === 'Mandibular';
    });
  }, [toothPositions]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-3xl bg-slate-950 border border-white/10 shadow-2xl overflow-hidden flex flex-col md:flex-row text-white ${
        isFullscreen ? 'h-screen w-screen rounded-none' : 'h-[740px]'
      }`}
    >
      {/* 3D WebGL Canvas Area */}
      <div className="flex-1 relative flex flex-col justify-between p-4 min-w-0">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between gap-3 z-10 bg-slate-900/90 backdrop-blur-md p-2.5 rounded-2xl border border-white/10 shadow-lg overflow-x-auto no-scrollbar">
          {/* Left: View & Arch Filters */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Arch Mode (Adult vs Child) */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setArchMode('Adult')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  archMode === 'Adult' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                Adulte (32 Dents)
              </button>
              <button
                onClick={() => setArchMode('Child')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  archMode === 'Child' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                Enfant (20 Dents)
              </button>
            </div>

            {/* Jaw Filter (Maxillary / Mandibular) */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setJawFilter('All')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  jawFilter === 'All' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                Arcade Complète
              </button>
              <button
                onClick={() => setJawFilter('Maxillary')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  jawFilter === 'Maxillary' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                Maxillaire
              </button>
              <button
                onClick={() => setJawFilter('Mandibular')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  jawFilter === 'Mandibular' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                Mandibule
              </button>
            </div>

            {/* Renderer Indicator Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-white/10 text-xxs font-mono text-slate-300">
              <Box className="w-3.5 h-3.5 text-blue-400" />
              <span>{hasGLTF ? 'Modèle GLTF Studio' : 'Anatomique HD PBR'}</span>
            </div>
          </div>

          {/* Right: TMJ Jaw Articulator & Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Interactive TMJ Jaw Opening Slider */}
            <div className="flex items-center gap-2.5 bg-slate-950 px-3.5 py-1.5 rounded-xl border border-white/10 shadow-inner">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 select-none whitespace-nowrap">
                <span>Articulateur :</span>
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={mouthOpening}
                onChange={(e) => setMouthOpening(parseFloat(e.target.value))}
                className="w-20 sm:w-28 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
                title="Pivoter la mandibule pour ouvrir/fermer la bouche"
              />
              <button
                onClick={() => setMouthOpening(mouthOpening > 0.1 ? 0 : 0.8)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs ${
                  mouthOpening > 0.1 ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
                }`}
              >
                {mouthOpening > 0.1 ? 'Occlusion' : 'Ouvrir'}
              </button>
            </div>

            {/* Action Toggles */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowRoots(!showRoots)}
                title="Afficher/Masquer Racines & Canaux"
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  showRoots
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                    : 'bg-slate-950 text-slate-300 border-white/10 hover:text-white hover:bg-slate-900'
                }`}
              >
                Racines
              </button>
              <button
                onClick={() => setShowLabels(!showLabels)}
                title="Afficher/Masquer Numéros FDI"
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  showLabels
                    ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                    : 'bg-slate-950 text-slate-300 border-white/10 hover:text-white hover:bg-slate-900'
                }`}
              >
                N° FDI
              </button>
              <button
                onClick={() => setAutoRotate(!autoRotate)}
                title="Rotation Automatique"
                className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  autoRotate
                    ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                    : 'bg-slate-950 text-slate-300 border-white/10 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Sparkles className="w-4 h-4" />
              </button>
              <button
                onClick={toggleFullscreen}
                title="Plein Écran"
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Three.js R3F Scene Canvas with Real Shadows & Clinical Operatory Lighting */}
        <Canvas
          shadows
          camera={{ position: [0, 0.4, 8.5], fov: 40 }}
          className="w-full h-full"
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
        >
          {/* Clinical Dental Studio Lighting */}
          <ambientLight intensity={1.1} />

          {/* Key Scialytic Lamp (casts realistic soft shadows) */}
          <directionalLight
            position={[5, 10, 8]}
            intensity={2.2}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-bias={-0.0001}
          />

          {/* Fill Light (Softens contrast) */}
          <directionalLight position={[-6, 8, 6]} intensity={1.4} />

          {/* Oral Cavity Uplight */}
          <pointLight position={[0, -2, 5]} intensity={0.9} />

          {/* Focused Dental Arch Spot */}
          <spotLight position={[0, 7, 5]} intensity={1.6} angle={0.55} penumbra={0.6} />

          <OrbitControls
            enablePan={true}
            enableZoom={true}
            autoRotate={autoRotate}
            autoRotateSpeed={1.2}
            maxPolarAngle={Math.PI / 1.3}
            minPolarAngle={Math.PI / 4.8}
          />

          {/* MAXILLARY (UPPER JAW & TEETH) GROUP */}
          {(jawFilter === 'All' || jawFilter === 'Maxillary') && (
            <group position={[0, 0, 0]}>
              <MaxillaryGingivaMesh showRoots={showRoots} customGeo={maxillaryGingivaGeo} />
              {upperTeeth.map(([numStr, { pos, rot }]) => {
                const num = Number(numStr);
                const toothState = getToothState(num);
                return (
                  <ToothMesh3D
                    key={num}
                    fdiNumber={num}
                    position={pos}
                    rotation={rot}
                    status={toothState.status}
                    surface={toothState.surface}
                    isSelected={selectedTooth === num}
                    showLabels={showLabels}
                    showRoots={showRoots}
                    customGeometry={toothGeometries[num]}
                    onClick={() => handleSelectTooth(num)}
                  />
                );
              })}
            </group>
          )}

          {/* MANDIBULAR (LOWER JAW & TEETH) GROUP - PIVOTING REALISTICALLY AROUND TMJ CONDYLES */}
          {(jawFilter === 'All' || jawFilter === 'Mandibular') && (
            <group position={[0, 0.4, -3.2]} rotation={[mouthOpening * 0.45, 0, 0]}>
              <group position={[0, -0.4, 3.2]}>
                <MandibularGingivaMesh showRoots={showRoots} customGeo={mandibularGingivaGeo} />
                {lowerTeeth.map(([numStr, { pos, rot }]) => {
                  const num = Number(numStr);
                  const toothState = getToothState(num);
                  return (
                    <ToothMesh3D
                      key={num}
                      fdiNumber={num}
                      position={pos}
                      rotation={rot}
                      status={toothState.status}
                      surface={toothState.surface}
                      isSelected={selectedTooth === num}
                      showLabels={showLabels}
                      showRoots={showRoots}
                      customGeometry={toothGeometries[num]}
                      onClick={() => handleSelectTooth(num)}
                    />
                  );
                })}
              </group>
            </group>
          )}
        </Canvas>

        {/* Legend Toolbar Footer */}
        <div className="z-10 bg-slate-900/85 backdrop-blur-md p-3 rounded-2xl border border-white/10 flex items-center justify-between overflow-x-auto no-scrollbar gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xxs uppercase tracking-wider font-bold text-slate-400">
              Légende Clinique :
            </span>
            {Object.entries(STATUS_PBR_PRESETS)
              .slice(0, 9)
              .map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-1.5 shrink-0">
                  <span className={`w-3 h-3 rounded-full ${cfg.badgeColor}`} />
                  <span className="text-xxs text-slate-300 font-semibold">{cfg.label}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Right Side Panel - Interactive Tooth Details, Surface Selector & History */}
      <div className="w-full md:w-96 border-t md:border-t-0 md:border-l border-white/10 bg-slate-950 p-6 flex flex-col justify-between overflow-y-auto no-scrollbar">
        {selectedTooth && selectedMeta ? (
          <div className="flex flex-col gap-5">
            {/* Header Tooth Title */}
            <div className="flex justify-between items-start border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-blue-600 text-white font-mono font-bold text-xs">
                    FDI {selectedMeta.fdiNumber} / Univ {selectedMeta.universalNumber}
                  </span>
                  <span className="text-xxs font-bold text-indigo-400 uppercase tracking-wider">
                    {selectedMeta.type} ({selectedMeta.rootCount} Racine
                    {selectedMeta.rootCount > 1 ? 's' : ''})
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-1.5">{selectedMeta.nameFr}</h3>
              </div>
              <button
                onClick={() => setSelectedTooth(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Action Simulation Launchers */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTreatmentAnimType(newStatus)}
                className="flex-1 h-9 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Activity className="w-4 h-4 text-indigo-400" /> Simulation 3D
              </button>
              <button
                onClick={() => setXrayModalUrl('/test.pdf')}
                className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <FileText className="w-4 h-4" /> Radio X-Ray
              </button>
            </div>

            {/* Carnet Financier Treatments Display */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-white/10 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xxs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Carnet Financier du Patient
                </span>
                <span
                  className={`text-xxs px-2 py-0.5 rounded-full font-bold border ${
                    getToothState(selectedTooth).status === 'Extracted'
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                      : getToothState(selectedTooth).status !== 'Healthy'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {STATUS_PBR_PRESETS[getToothState(selectedTooth).status]?.label || 'Sain'}
                  {getToothState(selectedTooth).surface !== 'Global' && (
                    <span className="ml-1 opacity-80">
                      ({getToothState(selectedTooth).surface})
                    </span>
                  )}
                </span>
              </div>

              {getToothState(selectedTooth).matchingActs.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {getToothState(selectedTooth).matchingActs.map((act: any) => (
                    <div
                      key={act._id}
                      className="p-2.5 rounded-xl bg-slate-950/80 border border-white/10 flex flex-col gap-1"
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-white truncate max-w-[170px]">
                          {act.description || act.actName}
                        </span>
                        <span className="font-mono text-emerald-400 font-bold shrink-0">
                          {Number(act.amount || act.cost || 0).toFixed(2)} DH
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xxs text-slate-400">
                        <span>{formatDate(act.date)}</span>
                        <span
                          className={`font-semibold ${
                            act.invoiceId ? 'text-purple-400' : 'text-amber-400'
                          }`}
                        >
                          {act.invoiceId ? 'Facturé' : 'À facturer'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xxs text-slate-400 leading-relaxed">
                  Aucun soin consigné dans le carnet pour cette dent ({selectedMeta.fdiNumber}).
                </p>
              )}
            </div>

            {/* Log New Intervention Form with Surface Selection */}
            <form
              onSubmit={handleAddIntervention}
              className="flex flex-col gap-3 border-t border-white/10 pt-4"
            >
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Poser un Acte Clinique
              </h4>

              {/* Status Selector */}
              <div>
                <label className="block text-xxs font-semibold text-slate-400 mb-1">
                  Condition / État 3D
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => {
                    const val = e.target.value as ToothStatusType;
                    setNewStatus(val);
                    const isWisdom = selectedTooth ? selectedTooth % 10 === 8 : false;
                    let defProc = '';
                    if (val === 'Extracted') defProc = isWisdom ? 'Extraction dent de sagesse' : 'Extraction (Exo)';
                    else if (val === 'Crown') defProc = 'Couronne céramique';
                    else if (val === 'Permanent Crown') defProc = 'Couronne zircone';
                    else if (val === 'Temporary Crown') defProc = 'Couronne provisoire';
                    else if (val === 'Implant') defProc = 'Implant Titane';
                    else if (val === 'Root Canal') defProc = 'Endodontie (Endo)';
                    else if (val === 'Filling') defProc = 'Composite résine';
                    else if (val === 'Composite Filling') defProc = 'Composite résine';
                    else if (val === 'Amalgam Filling') defProc = 'Amalgame Métallique';
                    else if (val === 'Caries') defProc = 'Traitement Carie';
                    else if (val === 'Bridge') defProc = 'Pont (Bridge)';

                    if (defProc) setProcedureName(defProc);
                    const autoPrice = resolveDefaultPrice(val, defProc, selectedTooth);
                    if (autoPrice > 0) {
                      setNewCost(autoPrice.toString());
                    } else if (val === 'Healthy' || val === 'Missing') {
                      setNewCost('');
                    }
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-white/10 bg-slate-900 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {Object.entries(STATUS_PBR_PRESETS).map(([val, cfg]) => (
                    <option key={val} value={val}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Acts Pills from Clinic Catalog */}
              {dentalActs.length > 0 && (
                <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-slate-900/90 border border-white/10">
                  <div className="flex items-center justify-between text-xxs font-bold">
                    <span className="text-blue-400 uppercase tracking-wider flex items-center gap-1">
                      ⚡ Actes Fréquents :
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Tarif officiel auto-rempli
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar pt-0.5">
                    {dentalActs.slice(0, 8).map((act: any) => (
                      <button
                        key={act._id || act.name}
                        type="button"
                        onClick={() => {
                          setProcedureName(act.name);
                          setNewCost(act.defaultPrice.toString());
                          const mapped = mapActToToothStatus(act.name, act.category);
                          if (mapped && mapped !== 'Healthy') {
                            setNewStatus(mapped);
                          }
                        }}
                        className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-blue-600/30 border border-white/10 hover:border-blue-400 text-xxs text-slate-200 font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <span className="truncate max-w-[120px]">{act.name}</span>
                        <span className="font-mono text-emerald-400 font-bold shrink-0">
                          {act.defaultPrice} DH
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Surface Selector (Phase Four Feature) */}
              <div>
                <label className="block text-xxs font-semibold text-slate-400 mb-1">
                  Face Dentaire Ciblée (Surface-Aware)
                </label>
                <select
                  value={selectedSurface}
                  onChange={(e) => setSelectedSurface(e.target.value as ToothSurface)}
                  className="w-full h-10 px-3 rounded-xl border border-white/10 bg-slate-900 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {SURFACE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Procedure Name */}
              <div>
                <label className="block text-xxs font-semibold text-slate-400 mb-1">
                  Désignation du Soin (Optionnel)
                </label>
                <input
                  type="text"
                  placeholder="ex: Extraction (Exo), Couronne zircone..."
                  value={procedureName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProcedureName(val);
                    const autoPrice = resolveDefaultPrice(newStatus, val, selectedTooth);
                    if (autoPrice > 0) {
                      setNewCost(autoPrice.toString());
                    }
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-white/10 bg-slate-900 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Cost in MAD / DH */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xxs font-semibold text-slate-400">
                    Honoraires (DH)
                  </label>
                  {resolveDefaultPrice(newStatus, procedureName, selectedTooth) > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const p = resolveDefaultPrice(newStatus, procedureName, selectedTooth);
                        setNewCost(p.toString());
                      }}
                      className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/20 cursor-pointer transition-colors"
                      title="Cliquer pour réappliquer le tarif catalogue"
                    >
                      Tarif officiel : {resolveDefaultPrice(newStatus, procedureName, selectedTooth)} DH
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    placeholder={
                      resolveDefaultPrice(newStatus, procedureName, selectedTooth) > 0
                        ? `${resolveDefaultPrice(newStatus, procedureName, selectedTooth)}`
                        : '0.00'
                    }
                    value={newCost}
                    onChange={(e) => setNewCost(e.target.value)}
                    className="w-full h-10 pl-3 pr-10 rounded-xl text-xs glass-input font-mono font-bold text-emerald-400"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-500 select-none">
                    DH
                  </span>
                </div>
              </div>

              {/* Clinical Notes */}
              <div>
                <label className="block text-xxs font-semibold text-slate-400 mb-1">
                  Notes Cliniques
                </label>
                <textarea
                  rows={2}
                  placeholder="Observations et détails thérapeutiques..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full p-3 rounded-xl text-xs glass-input resize-none"
                />
              </div>

              {/* Sync with Carnet Checkbox */}
              <label className="flex items-center gap-2 text-xxs font-semibold text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={syncWithCarnet}
                  onChange={(e) => setSyncWithCarnet(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-white/10"
                />
                <span>Ajouter également au Carnet Financier du patient</span>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white transition-all shadow-lg shadow-blue-600/20 cursor-pointer mt-1"
              >
                {submitting ? 'Enregistrement...' : 'Enregistrer Acte 3D'}
              </button>
            </form>

            {/* Historical Timeline */}
            <div className="flex flex-col gap-2.5 border-t border-white/10 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Historique des Actes
              </h4>
              {toothHistoryList.length === 0 ? (
                <p className="text-xxs text-slate-500 text-center py-4">
                  Aucun acte enregistré pour cette dent.
                </p>
              ) : (
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto no-scrollbar">
                  {toothHistoryList.map((item) => (
                    <div
                      key={item._id}
                      className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs flex flex-col gap-1"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xxs font-bold text-blue-400 font-mono">
                          {formatDate(item.date)}
                        </span>
                        <span className="font-bold text-slate-200">{item.status}</span>
                      </div>
                      {item.procedureName && (
                        <p className="text-xxs font-semibold text-indigo-300">
                          {item.procedureName}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-xxs text-slate-400 leading-snug">{item.notes}</p>
                      )}
                      <div className="flex justify-between items-center border-t border-white/5 pt-1 mt-1">
                        <span className="text-xxs font-bold text-emerald-400">
                          {item.cost.toFixed(2)} DH
                        </span>
                        <button
                          onClick={() => handleDeleteHistory(item._id)}
                          className="text-slate-500 hover:text-rose-400 p-0.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Layers className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-white">Sélectionnez une Dent</h4>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
              Cliquez sur une dent dans l'arcade 3D pour afficher sa fiche anatomique, son
              historique et poser un acte clinique avec ciblage par surface.
            </p>
          </div>
        )}
      </div>

      {/* Interactive X-Ray DICOM Measurement Viewer Modal */}
      {xrayModalUrl && (
        <XRayViewerModal
          imageUrl="https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&q=80&w=1200"
          title={`Radiographie Dent N° ${selectedTooth}`}
          onClose={() => setXrayModalUrl(null)}
        />
      )}

      {/* Educational 3D Treatment Animation Modal */}
      {treatmentAnimType && selectedTooth && (
        <TreatmentAnimationModal
          treatmentType={treatmentAnimType}
          toothNumber={selectedTooth}
          onClose={() => setTreatmentAnimType(null)}
        />
      )}
    </div>
  );
};
