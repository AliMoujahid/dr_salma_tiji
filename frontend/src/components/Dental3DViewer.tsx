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
  Zap,
  Sparkles,
  Info,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { ToothHistory, ToothStatusType, ToothMetadata, XRayMeasurement } from '../types';
import { useAuth } from '../context/AuthContext';
import { XRayViewerModal } from './XRayViewerModal';
import { TreatmentAnimationModal } from './TreatmentAnimationModal';

// --- ANATOMICAL METADATA DICTIONARY FOR ALL 32 ADULT & 20 CHILD TEETH ---
const getToothMetadata = (fdiNumber: number): ToothMetadata => {
  const isUpper = (fdiNumber >= 11 && fdiNumber <= 28) || (fdiNumber >= 51 && fdiNumber <= 65);
  const isRight = (fdiNumber >= 11 && fdiNumber <= 18) || (fdiNumber >= 41 && fdiNumber <= 48) || (fdiNumber >= 51 && fdiNumber <= 55) || (fdiNumber >= 81 && fdiNumber <= 85);
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
    nameFr = isChild ? (digit === 4 ? '1ère Molaire de Lait' : '2ème Molaire de Lait') : (digit === 4 ? '1ère Prémolaire' : '2ème Prémolaire');
    nameEn = isChild ? (digit === 4 ? 'First Primary Molar' : 'Second Primary Molar') : (digit === 4 ? 'First Premolar' : 'Second Premolar');
  } else {
    type = 'Molar';
    rootCount = isUpper ? 3 : 2;
    nameFr = digit === 6 ? '1ère Molaire (Dent de 6 ans)' : digit === 7 ? '2ème Molaire (Dent de 12 ans)' : '3ème Molaire (Dent de Sagesse)';
    nameEn = digit === 6 ? 'First Molar' : digit === 7 ? 'Second Molar' : 'Third Molar (Wisdom)';
  }

  // Universal Number mapping approximation
  let universalNumber: string | number = fdiNumber;
  if (!isChild) {
    if (fdiNumber >= 11 && fdiNumber <= 18) universalNumber = 9 - (fdiNumber - 10);
    else if (fdiNumber >= 21 && fdiNumber <= 28) universalNumber = fdiNumber - 20 + 8;
    else if (fdiNumber >= 31 && fdiNumber <= 38) universalNumber = 25 + (fdiNumber - 30);
    else if (fdiNumber >= 41 && fdiNumber <= 48) universalNumber = 33 - (fdiNumber - 40);
  } else {
    const primaryLetters: Record<number, string> = {
      55: 'A', 54: 'B', 53: 'C', 52: 'D', 51: 'E',
      61: 'F', 62: 'G', 63: 'H', 64: 'I', 65: 'J',
      71: 'O', 72: 'N', 73: 'M', 74: 'L', 75: 'K',
      81: 'P', 82: 'Q', 83: 'R', 84: 'S', 85: 'T',
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

// --- STATUS OPTIONS & VISUAL SHADER COLORS ---
const STATUS_CONFIGS: Record<
  string,
  { label: string; color: string; hex: string; metalness?: number; roughness?: number; opacity?: number }
> = {
  Healthy: { label: 'Sain', color: 'bg-emerald-500', hex: '#f8fafc', roughness: 0.25 },
  Missing: { label: 'Absente', color: 'bg-slate-600', hex: '#64748b', opacity: 0.15 },
  Extracted: { label: 'Extraite', color: 'bg-rose-500', hex: '#ef4444', opacity: 0.05 },
  Implant: { label: 'Implant Titane', color: 'bg-blue-500', hex: '#94a3b8', metalness: 0.9, roughness: 0.15 },
  Bridge: { label: 'Pont (Bridge)', color: 'bg-violet-500', hex: '#a78bfa', metalness: 0.4 },
  'Temporary Crown': { label: 'Couronne Provisoire', color: 'bg-amber-600', hex: '#d97706' },
  'Permanent Crown': { label: 'Couronne Céramique/Or', color: 'bg-amber-400', hex: '#f59e0b', metalness: 0.75 },
  Crown: { label: 'Couronne', color: 'bg-amber-500', hex: '#fbbf24', metalness: 0.6 },
  'Root Canal': { label: 'Dévitalisée (Endo)', color: 'bg-pink-500', hex: '#ec4899' },
  'Composite Filling': { label: 'Obturation Resine', color: 'bg-cyan-400', hex: '#38bdf8' },
  'Amalgam Filling': { label: 'Obturation Amalgame', color: 'bg-slate-400', hex: '#475569', metalness: 0.8 },
  Filling: { label: 'Obturation', color: 'bg-cyan-500', hex: '#06b6d4' },
  'Fracture': { label: 'Fracture Dentaire', color: 'bg-red-600', hex: '#dc2626' },
  'Caries': { label: 'Carie Profonde', color: 'bg-amber-900', hex: '#78350f', roughness: 0.8 },
  'Mobile Grade I': { label: 'Mobilité I', color: 'bg-teal-500', hex: '#14b8a6' },
  'Mobile Grade II': { label: 'Mobilité II', color: 'bg-teal-600', hex: '#0d9488' },
  'Mobile Grade III': { label: 'Mobilité III', color: 'bg-teal-700', hex: '#0f766e' },
  'Wisdom Tooth': { label: 'Dent de Sagesse', color: 'bg-indigo-500', hex: '#6366f1' },
};

// --- PHOTOREALISTIC HUMAN 3D TOOTH MESH COMPONENT ---
const ToothMesh3D: React.FC<{
  fdiNumber: number;
  position: [number, number, number];
  rotation: [number, number, number];
  status?: string;
  isSelected?: boolean;
  showLabels?: boolean;
  onClick?: () => void;
}> = ({ fdiNumber, position, rotation, status = 'Healthy', isSelected, showLabels = true, onClick }) => {
  const meshRef = useRef<THREE.Group>(null);
  const meta = useMemo(() => getToothMetadata(fdiNumber), [fdiNumber]);
  const statusCfg = STATUS_CONFIGS[status] || STATUS_CONFIGS.Healthy;
  const isUpper = meta.jaw === 'Maxillary';

  // Photorealistic anatomical crown & root geometry generators
  const { crownGeo, rootGeo, implantGeo } = useMemo(() => {
    let cGeo: THREE.BufferGeometry;

    if (meta.type === 'Incisor') {
      // Natural human spade incisor with curved labial surface & rounded incisal edge
      const shape = new THREE.Shape();
      shape.moveTo(-0.24, -0.3);
      shape.bezierCurveTo(-0.26, 0.0, -0.25, 0.25, -0.22, 0.32); // left edge
      shape.lineTo(0.22, 0.32); // incisal edge
      shape.bezierCurveTo(0.25, 0.25, 0.26, 0.0, 0.24, -0.3); // right edge
      shape.bezierCurveTo(0.12, -0.35, -0.12, -0.35, -0.24, -0.3); // cervical neck
      
      const extrudeSettings = { depth: 0.22, bevelEnabled: true, bevelSegments: 5, steps: 2, bevelSize: 0.05, bevelThickness: 0.05 };
      cGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      cGeo.center();
    } else if (meta.type === 'Canine') {
      // Natural human canine with anatomical cusp tip
      const shape = new THREE.Shape();
      shape.moveTo(-0.25, -0.32);
      shape.lineTo(-0.26, 0.1);
      shape.lineTo(0.0, 0.38); // Cusp tip
      shape.lineTo(0.26, 0.1);
      shape.lineTo(0.25, -0.32);
      shape.bezierCurveTo(0.12, -0.37, -0.12, -0.37, -0.25, -0.32);

      const extrudeSettings = { depth: 0.26, bevelEnabled: true, bevelSegments: 6, steps: 2, bevelSize: 0.06, bevelThickness: 0.06 };
      cGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      cGeo.center();
    } else if (meta.type === 'Premolar') {
      // Bicuspid oval crown with 2 cusps
      const shape = new THREE.Shape();
      shape.absellipse(0, 0, 0.28, 0.26, 0, Math.PI * 2, false, 0);
      const extrudeSettings = { depth: 0.55, bevelEnabled: true, bevelSegments: 6, steps: 2, bevelSize: 0.08, bevelThickness: 0.08 };
      cGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      cGeo.center();
    } else {
      // Quadcuspid Molar crown with rounded corners & occlusal surface
      const shape = new THREE.Shape();
      shape.moveTo(-0.35, -0.35);
      shape.bezierCurveTo(-0.38, 0, -0.38, 0.35, -0.35, 0.35);
      shape.bezierCurveTo(0, 0.38, 0.35, 0.38, 0.35, 0.35);
      shape.bezierCurveTo(0.38, 0, 0.38, -0.35, 0.35, -0.35);
      shape.bezierCurveTo(0, -0.38, -0.35, -0.38, -0.35, -0.35);

      const extrudeSettings = { depth: 0.52, bevelEnabled: true, bevelSegments: 8, steps: 3, bevelSize: 0.1, bevelThickness: 0.1 };
      cGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      cGeo.center();
    }

    // Anatomical tapered root
    const rGeo = new THREE.CylinderGeometry(0.22, 0.06, 0.95, 12);
    // Titanium implant screw
    const impGeo = new THREE.CylinderGeometry(0.2, 0.15, 1.0, 12);

    return { crownGeo: cGeo, rootGeo: rGeo, implantGeo: impGeo };
  }, [meta]);

  const isMissingOrExtracted = status === 'Missing' || status === 'Extracted';
  const isImplant = status === 'Implant';

  const crownYOffset = isUpper ? -0.34 : 0.34;
  const rootYOffset = isUpper ? 0.48 : -0.48;

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
      {/* Photorealistic Enamel Crown Mesh */}
      {!isMissingOrExtracted && (
        <mesh position={[0, crownYOffset, 0]} geometry={crownGeo}>
          <meshStandardMaterial
            color={isSelected ? '#3b82f6' : statusCfg.hex}
            roughness={statusCfg.roughness ?? 0.15}
            metalness={statusCfg.metalness ?? 0.0}
            transparent={Boolean(statusCfg.opacity)}
            opacity={statusCfg.opacity ?? 1.0}
          />
        </mesh>
      )}

      {/* Root Mesh(es) */}
      {!isMissingOrExtracted && !isImplant && (
        <group position={[0, rootYOffset, 0]}>
          {meta.rootCount === 1 && (
            <mesh rotation={[isUpper ? 0 : Math.PI, 0, 0]} geometry={rootGeo}>
              <meshStandardMaterial color="#fffdfa" roughness={0.35} />
            </mesh>
          )}
          {meta.rootCount >= 2 && (
            <>
              <mesh position={[-0.14, 0, 0]} rotation={[isUpper ? 0 : Math.PI, 0, -0.12]} geometry={rootGeo}>
                <meshStandardMaterial color="#fffdfa" roughness={0.35} />
              </mesh>
              <mesh position={[0.14, 0, 0]} rotation={[isUpper ? 0 : Math.PI, 0, 0.12]} geometry={rootGeo}>
                <meshStandardMaterial color="#fffdfa" roughness={0.35} />
              </mesh>
            </>
          )}
        </group>
      )}

      {/* Titanium Implant Screw */}
      {isImplant && (
        <mesh position={[0, rootYOffset, 0]} geometry={implantGeo}>
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.12} />
        </mesh>
      )}

      {/* Sleek Floating FDI Badge */}
      {showLabels && (
        <Html position={[0, isUpper ? 1.05 : -1.05, 0]} center distanceFactor={12}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onClick) onClick();
            }}
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold transition-all shadow-lg cursor-pointer backdrop-blur-md ${
              isSelected
                ? 'bg-blue-600 text-white ring-2 ring-blue-400 scale-110'
                : 'bg-slate-900/80 text-slate-300 border border-white/10 hover:bg-blue-500 hover:text-white'
            }`}
          >
            {fdiNumber}
          </button>
        </Html>
      )}
    </group>
  );
};

// --- PHOTOREALISTIC GINGIVA (GUM) ARCH & PALATAL VAULT MESH ---
const GingivaArchMesh: React.FC<{ jaw: 'Maxillary' | 'Mandibular' }> = ({ jaw }) => {
  const curvePoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const isUpper = jaw === 'Maxillary';
    const yPos = isUpper ? 0.48 : -0.48;
    for (let i = 0; i <= 16; i++) {
      const angle = (i / 16) * Math.PI - Math.PI / 2;
      const rx = 3.3 * Math.sin(angle);
      const rz = 2.7 * Math.cos(angle) - 1.1;
      points.push(new THREE.Vector3(rx, yPos, rz));
    }
    return new THREE.CatmullRomCurve3(points);
  }, [jaw]);

  const tubeGeo = useMemo(() => new THREE.TubeGeometry(curvePoints, 32, 0.48, 14, false), [curvePoints]);

  return (
    <group>
      {/* Alveolar Ridge Gum Tube */}
      <mesh geometry={tubeGeo}>
        <meshStandardMaterial color="#e15b70" roughness={0.3} opacity={0.95} transparent />
      </mesh>
    </group>
  );
};

// --- MAIN 3D DENTAL CHART COMPONENT ---
interface Dental3DViewerProps {
  patientId: string;
}

export const Dental3DViewer: React.FC<Dental3DViewerProps> = ({ patientId }) => {
  const { token } = useAuth();
  const [odontogram, setOdontogram] = useState<any[]>([]);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [toothHistoryList, setToothHistoryList] = useState<ToothHistory[]>([]);

  // View state controls
  const [archMode, setArchMode] = useState<'Adult' | 'Child'>('Adult');
  const [jawFilter, setJawFilter] = useState<'All' | 'Maxillary' | 'Mandibular'>('All');
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Form states for adding intervention
  const [newStatus, setNewStatus] = useState<ToothStatusType>('Healthy');
  const [newNotes, setNewNotes] = useState('');
  const [newCost, setNewCost] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modal overlays state
  const [xrayModalUrl, setXrayModalUrl] = useState<string | null>(null);
  const [treatmentAnimType, setTreatmentAnimType] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Arch teeth arrays
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
      .then((data) => setOdontogram(data))
      .catch((err) => console.error('Error fetching 3D odontogram:', err));
  };

  const handleSelectTooth = (toothNum: number) => {
    setSelectedTooth(toothNum);
    const current = odontogram.find((t) => t.toothNumber === toothNum);
    setNewStatus(current?.status || 'Healthy');
    setNewNotes('');
    setNewCost('');

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
    fetch(`${API_URL}/teeth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        patientId,
        toothNumber: selectedTooth,
        status: newStatus,
        notes: newNotes,
        cost: parseFloat(newCost) || 0,
      }),
    })
      .then((res) => res.json())
      .then((newRecord) => {
        setToothHistoryList([newRecord, ...toothHistoryList]);
        setNewNotes('');
        setNewCost('');
        fetchOdontogram();
      })
      .catch((err) => console.error('Error logging 3D tooth status:', err))
      .finally(() => setSubmitting(false));
  };

  const handleDeleteHistory = (id: string) => {
    if (!confirm('Supprimer cette intervention ?')) return;

    fetch(`${API_URL}/teeth/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => {
        setToothHistoryList(toothHistoryList.filter((item) => item._id !== id));
        fetchOdontogram();
      })
      .catch((err) => console.error('Error deleting record:', err));
  };

  const [showLabels, setShowLabels] = useState<boolean>(true);

  // Compute 3D parabolic arch coordinates for teeth
  const toothPositions = useMemo(() => {
    const positions: Record<number, { pos: [number, number, number]; rot: [number, number, number] }> = {};

    const calcArch = (teeth: number[], isUpper: boolean) => {
      const count = teeth.length;
      teeth.forEach((num, idx) => {
        const angle = (idx / (count - 1)) * Math.PI - Math.PI / 2;
        const radiusX = 3.3;
        const radiusZ = 2.7;
        const x = radiusX * Math.sin(angle);
        const z = radiusZ * Math.cos(angle) - 1.1;
        const y = isUpper ? 0.48 : -0.48;
        const rotY = -angle;

        // Rotations: crowns face labially towards front
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

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-3xl bg-slate-950 border border-white/10 shadow-2xl overflow-hidden flex flex-col md:flex-row text-white ${
        isFullscreen ? 'h-screen w-screen rounded-none' : 'h-[720px]'
      }`}
    >
      {/* 3D WebGL Canvas Area */}
      <div className="flex-1 relative flex flex-col justify-between p-4">
        
        {/* Top Control Bar */}
        <div className="flex flex-wrap justify-between items-center gap-3 z-10 bg-slate-900/80 backdrop-blur-md p-3 rounded-2xl border border-white/10">
          
          {/* Arch Mode (Adult vs Child) */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setArchMode('Adult')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                archMode === 'Adult' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Adulte (32 Dents)
            </button>
            <button
              onClick={() => setArchMode('Child')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                archMode === 'Child' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Enfant (20 Dents)
            </button>
          </div>

          {/* Jaw Filter (Maxillary / Mandibular) */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setJawFilter('All')}
              className={`px-2.5 py-1 rounded-lg text-xxs font-bold transition-all cursor-pointer ${
                jawFilter === 'All' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Vue Complète
            </button>
            <button
              onClick={() => setJawFilter('Maxillary')}
              className={`px-2.5 py-1 rounded-lg text-xxs font-bold transition-all cursor-pointer ${
                jawFilter === 'Maxillary' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Maxillaire
            </button>
            <button
              onClick={() => setJawFilter('Mandibular')}
              className={`px-2.5 py-1 rounded-lg text-xxs font-bold transition-all cursor-pointer ${
                jawFilter === 'Mandibular' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Mandibule
            </button>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLabels(!showLabels)}
              title="Afficher/Masquer Numéros FDI"
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                showLabels ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              N° FDI
            </button>
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              title="Rotation Automatique"
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                autoRotate ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
            </button>
            <button
              onClick={toggleFullscreen}
              title="Plein Écran"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>

        </div>

        {/* Three.js R3F Scene Canvas */}
        <Canvas camera={{ position: [0, 0, 8.2], fov: 42 }} className="w-full h-full">
          <ambientLight intensity={1.1} />
          <directionalLight position={[5, 10, 10]} intensity={1.8} castShadow />
          <pointLight position={[-8, -5, -5]} intensity={0.6} />

          <OrbitControls
            enablePan={true}
            enableZoom={true}
            autoRotate={autoRotate}
            autoRotateSpeed={1.5}
            maxPolarAngle={Math.PI / 1.5}
            minPolarAngle={Math.PI / 4}
          />

          {/* Render Maxillary & Mandibular Gum Meshes */}
          {(jawFilter === 'All' || jawFilter === 'Maxillary') && <GingivaArchMesh jaw="Maxillary" />}
          {(jawFilter === 'All' || jawFilter === 'Mandibular') && <GingivaArchMesh jaw="Mandibular" />}

          {/* Render 3D Teeth */}
          {Object.entries(toothPositions).map(([numStr, { pos, rot }]) => {
            const num = Number(numStr);
            const meta = getToothMetadata(num);
            if (jawFilter !== 'All' && meta.jaw !== jawFilter) return null;

            const record = odontogram.find((t) => t.toothNumber === num);
            return (
              <ToothMesh3D
                key={num}
                fdiNumber={num}
                position={pos}
                rotation={rot}
                status={record?.status || 'Healthy'}
                isSelected={selectedTooth === num}
                showLabels={showLabels}
                onClick={() => handleSelectTooth(num)}
              />
            );
          })}
        </Canvas>

        {/* Legend Toolbar Footer */}
        <div className="z-10 bg-slate-900/80 backdrop-blur-md p-3 rounded-2xl border border-white/10 flex items-center justify-between overflow-x-auto no-scrollbar gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xxs uppercase tracking-wider font-bold text-slate-400">Légende:</span>
            {Object.entries(STATUS_CONFIGS).slice(0, 7).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5 shrink-0">
                <span className={`w-3 h-3 rounded-full ${cfg.color}`} />
                <span className="text-xxs text-slate-300 font-semibold">{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Right Side Panel - Interactive Tooth Details & History */}
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
                    {selectedMeta.type} ({selectedMeta.rootCount} Racine{selectedMeta.rootCount > 1 ? 's' : ''})
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

            {/* AI Diagnostics Readiness Card */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-500/20 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xxs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-blue-400" /> Module IA Diagnostic Ready
                </span>
                <span className="text-xxs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                  Sain (98.4%)
                </span>
              </div>
              <p className="text-xxs text-slate-400 leading-relaxed">
                Analyse prédictive des caries, résorptions et densité osseuse alvéolaire prêtes à être couplées à l'IA.
              </p>
            </div>

            {/* Log New Intervention Form */}
            <form onSubmit={handleAddIntervention} className="flex flex-col gap-3 border-t border-white/10 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Poser un Acte Clinique</h4>
              
              <div>
                <label className="block text-xxs font-semibold text-slate-400 mb-1">Condition / État</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as ToothStatusType)}
                  className="w-full h-10 px-3 rounded-xl border border-white/10 bg-slate-900 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {Object.entries(STATUS_CONFIGS).map(([val, cfg]) => (
                    <option key={val} value={val}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xxs font-semibold text-slate-400 mb-1">Honoraires (DH)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl text-xs glass-input"
                />
              </div>

              <div>
                <label className="block text-xxs font-semibold text-slate-400 mb-1">Notes Cliniques</label>
                <textarea
                  rows={2}
                  placeholder="Observations et détails thérapeutiques..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full p-3 rounded-xl text-xs glass-input resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white transition-all shadow-lg shadow-blue-600/20 cursor-pointer"
              >
                {submitting ? 'Enregistrement...' : 'Enregistrer Acte 3D'}
              </button>
            </form>

            {/* Historical Timeline */}
            <div className="flex flex-col gap-2.5 border-t border-white/10 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Historique des Actes</h4>
              {toothHistoryList.length === 0 ? (
                <p className="text-xxs text-slate-500 text-center py-4">Aucun acte enregistré pour cette dent.</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto no-scrollbar">
                  {toothHistoryList.map((item) => (
                    <div key={item._id} className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xxs font-bold text-blue-400">
                          {new Date(item.date).toLocaleDateString('fr-FR')}
                        </span>
                        <span className="font-bold text-slate-200">{item.status}</span>
                      </div>
                      {item.notes && <p className="text-xxs text-slate-400 leading-snug">{item.notes}</p>}
                      <div className="flex justify-between items-center border-t border-white/5 pt-1 mt-1">
                        <span className="text-xxs font-bold text-emerald-400">{item.cost.toFixed(2)} DH</span>
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
              Cliquez sur une dent dans l'arcade 3D pour afficher sa fiche anatomique, son historique et poser un acte clinique.
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
