import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  Printer,
  Save,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Hand,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Sun,
  Contrast,
  Sliders,
  Sparkles,
  Camera,
  Activity,
  FileText,
  Layers,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Eye,
  Settings,
  Grid,
  Square,
  Circle,
  Pencil,
  Type,
  Maximize,
  Compass,
  Ruler,
  Scan,
  RefreshCw,
  X,
  UserCheck,
  Calendar,
  Share2,
  HelpCircle,
  FolderOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_URL } from '../config/api';

// --- SAMPLE DEFAULT RADIOGRAPHS (Realistic RVG Dental X-rays in High Definition) ---
const DEFAULT_RVG_XRAYS: Record<string, string> = {
  '18': 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80',
  '16': 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80',
  '36': 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80',
  '11': 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80',
};

interface StudyImage {
  id: string;
  tooth: number;
  timestamp: string;
  date: string;
  url: string;
  exposureMode: string;
  sensorModel: string;
  notes?: string;
}

interface NanoPixPatient {
  id: string;
  chartNo: string;
  name: string;
  gender: 'Male' | 'Female';
  birthDate: string;
  age: number;
  studies: StudyImage[];
}

export const NanoPixStudio: React.FC = () => {
  const { token } = useAuth();
  const { showToast } = useToast();

  // --- MAIN TABS (Patient | Acquisition | Viewer | Report) ---
  const [activeTab, setActiveTab] = useState<'Patient' | 'Acquisition' | 'Viewer' | 'Report'>('Patient');

  // --- SENSOR STATUS ---
  const [sensorConnected, setSensorConnected] = useState(true);
  const [sensorModel, setSensorModel] = useState<'NanoPix 1' | 'NanoPix 2'>('NanoPix 2');

  // --- PATIENTS DATA ---
  const [patients, setPatients] = useState<NanoPixPatient[]>([
    {
      id: 'p_default_1',
      chartNo: '20260904_191218',
      name: 'ali moujahid',
      gender: 'Male',
      birthDate: '2026-09-04',
      age: 0,
      studies: [
        {
          id: 's_1',
          tooth: 18,
          timestamp: '2026-09-04 19:14:29',
          date: '2026-09-04',
          url: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80',
          exposureMode: 'Endodontic',
          sensorModel: 'NanoPix 2 (High Res)',
          notes: 'Contrôle rétro-alvéolaire dent #18',
        },
        {
          id: 's_2',
          tooth: 16,
          timestamp: '2026-09-04 19:22:10',
          date: '2026-09-04',
          url: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80',
          exposureMode: 'Periodontic',
          sensorModel: 'NanoPix 2 (High Res)',
          notes: 'Sondage parodontal et niveau osseux #16',
        },
      ],
    },
    {
      id: 'p_default_2',
      chartNo: '20260908_114002',
      name: 'Fatima Zahra Mansouri',
      gender: 'Female',
      birthDate: '1992-05-14',
      age: 34,
      studies: [
        {
          id: 's_3',
          tooth: 36,
          timestamp: '2026-09-08 11:45:00',
          date: '2026-09-08',
          url: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80',
          exposureMode: 'Endodontic',
          sensorModel: 'NanoPix 2 (High Res)',
          notes: 'Traitement canalaire racine mésiale #36',
        },
      ],
    },
  ]);

  const [selectedPatientId, setSelectedPatientId] = useState<string>('p_default_1');
  const [selectedStudyId, setSelectedStudyId] = useState<string>('s_1');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('All Dates');

  // Load real clinic patients from backend API
  useEffect(() => {
    fetch(`${API_URL}/patients?limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.patients && Array.isArray(data.patients) && data.patients.length > 0) {
          const mapped: NanoPixPatient[] = data.patients.map((p: any, idx: number) => {
            const birth = p.birthDate ? p.birthDate.split('T')[0] : '1990-01-01';
            const birthYear = new Date(birth).getFullYear();
            const age = new Date().getFullYear() - birthYear;
            const chartNo = `20260904_${191200 + idx}`;
            return {
              id: p._id,
              chartNo,
              name: p.name,
              gender: p.gender === 'Female' ? 'Female' : 'Male',
              birthDate: birth,
              age: isNaN(age) ? 30 : age,
              studies: [
                {
                  id: `study_${p._id}_1`,
                  tooth: 18,
                  timestamp: '2026-09-04 19:14:29',
                  date: '2026-09-04',
                  url: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80',
                  exposureMode: 'Endodontic',
                  sensorModel: 'NanoPix 2',
                },
              ],
            };
          });

          setPatients((prev) => {
            const existingIds = new Set(mapped.map((m) => m.id));
            const filteredPrev = prev.filter((pr) => !existingIds.has(pr.id));
            return [...mapped, ...filteredPrev];
          });
        }
      })
      .catch(() => console.log('NanoPix using local store.'));
  }, [token]);

  const selectedPatient = useMemo(() => {
    return patients.find((p) => p.id === selectedPatientId) || patients[0];
  }, [patients, selectedPatientId]);

  const selectedStudy = useMemo(() => {
    if (!selectedPatient) return null;
    return selectedPatient.studies.find((s) => s.id === selectedStudyId) || selectedPatient.studies[0] || null;
  }, [selectedPatient, selectedStudyId]);

  // --- ACQUISITION CONTROLS ---
  const [selectedTooth, setSelectedTooth] = useState<number>(18);
  const [studyType, setStudyType] = useState('IO Sensor');
  const [teethLayout, setTeethLayout] = useState<'Adult' | 'Child'>('Adult');
  const [imageProcessingMode, setImageProcessingMode] = useState<
    'Endodontic' | 'Periodontic' | 'Caries' | 'Standard'
  >('Endodontic');
  const [smartContrastLevel, setSmartContrastLevel] = useState<number>(3);
  const [smartSharpen, setSmartSharpen] = useState(true);
  const [isSmoothed, setIsSmoothed] = useState(false);
  const [isInverted, setIsInverted] = useState(false);
  const [colorizeMode, setColorizeMode] = useState<'Normal' | 'Heatmap' | 'Bone' | 'Sepia'>('Normal');
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(0);
  const [isExposing, setIsExposing] = useState(false);

  // --- VIEWER INTERACTIVE TOOLS ---
  const [viewerTool, setViewerTool] = useState<
    'select' | 'pan' | 'zoom' | 'ruler' | 'angle' | 'draw' | 'rect' | 'circle' | 'text' | 'loupe'
  >('select');
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState<boolean>(false);

  // Measurements & Annotations State
  const [rulerPoints, setRulerPoints] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>({
    x1: 160,
    y1: 100,
    x2: 160,
    y2: 340,
  });
  const [loupePos, setLoupePos] = useState<{ x: number; y: number } | null>(null);

  // --- REPORT STUDIO CONTROLS ---
  const [reportTemplate, setReportTemplate] = useState<'Template A' | 'Template B' | 'Template C'>('Template A');
  const [reportDiagnosis, setReportDiagnosis] = useState<string>(
    'Examen radiologique rétro-alvéolaire numérique (Capteur NanoPix 2 - Haute Définition).\n\n' +
    'Observations cliniques :\n' +
    '- Dent ciblée : #18 (Maxillaire Droit)\n' +
    '- Chambre pulpaire dégagée, pas d\'atteinte de la furcation visible.\n' +
    '- Longueur canalaire estimée : 19.4 mm.\n' +
    '- Trame osseuse trabéculaire et lamina dura intactes sans lésion péri-apicale active.\n\n' +
    'Conclusion & Conduite à tenir : Poursuite du protocole de soins conservateurs.'
  );

  // Trigger simulated RVG Sensor Shot
  const handleTriggerAcquisition = () => {
    if (!sensorConnected) {
      showToast('error', 'Capteur RVG Eighteeth NanoPix hors-ligne. Branchez le câble USB.');
      return;
    }

    setIsExposing(true);
    showToast('info', `Capture en cours sur le capteur NanoPix 2 (Dent #${selectedTooth})...`);

    setTimeout(() => {
      setIsExposing(false);
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0];
      const newStudyId = `s_${Date.now()}`;

      const newStudy: StudyImage = {
        id: newStudyId,
        tooth: selectedTooth,
        timestamp: `${dateStr} ${timeStr}`,
        date: dateStr,
        url: DEFAULT_RVG_XRAYS[String(selectedTooth)] || DEFAULT_RVG_XRAYS['18'],
        exposureMode: imageProcessingMode,
        sensorModel: sensorModel,
        notes: `Cliché RVG IO ${selectedTooth} (${imageProcessingMode})`,
      };

      setPatients((prev) =>
        prev.map((p) => {
          if (p.id === selectedPatientId) {
            return {
              ...p,
              studies: [newStudy, ...p.studies],
            };
          }
          return p;
        })
      );

      setSelectedStudyId(newStudyId);
      showToast('success', `Cliché RVG dent #${selectedTooth} acquis avec succès !`);
      setActiveTab('Viewer');
    }, 1200);
  };

  // Reset visual adjustments
  const handleResetFilters = () => {
    setBrightness(0);
    setContrast(0);
    setSmartContrastLevel(3);
    setSmartSharpen(true);
    setIsSmoothed(false);
    setIsInverted(false);
    setColorizeMode('Normal');
    setRotationAngle(0);
    setFlipH(false);
    setFlipV(false);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    showToast('info', 'Filtres et réglages réinitialisés.');
  };

  // Adult teeth FDI notation array
  const upperAdultTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const lowerAdultTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

  // Ruler length calculation
  const rulerDistanceMm = useMemo(() => {
    if (!rulerPoints) return 0;
    const dx = rulerPoints.x2 - rulerPoints.x1;
    const dy = rulerPoints.y2 - rulerPoints.y1;
    const pixelDistance = Math.sqrt(dx * dx + dy * dy);
    return (pixelDistance * 0.08).toFixed(1);
  }, [rulerPoints]);

  return (
    <div className="flex flex-col h-full w-full bg-[#03060f] text-slate-100 font-sans select-none overflow-hidden">
      {/* 1. TOP NANOPIX MENU BAR (File, Tools, Help) */}
      <div className="flex items-center justify-between px-3 h-5 bg-[#090d1a] border-b border-[#141d33] text-[10px] text-slate-400 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-white font-bold tracking-wider text-[11px]">NanoPix</span>
          <button className="hover:text-white cursor-pointer transition-colors">File</button>
          <button className="hover:text-white cursor-pointer transition-colors">Tools</button>
          <button className="hover:text-white cursor-pointer transition-colors">Help</button>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-slate-500 font-mono">
          <span>Eighteeth Medical Digital Imaging v3.4.2</span>
        </div>
      </div>

      {/* 2. TOP EIGHTEETH NANOPIX APPLICATION HEADER */}
      <header className="flex items-center justify-between px-3 h-9 bg-[#070b16] border-b border-[#141d33] z-20 shrink-0">
        <div className="flex items-center gap-4">
          {/* Eighteeth Brand Logo */}
          <div className="flex items-center gap-1.5">
            <div className="w-5.5 h-5.5 rounded-full bg-white flex items-center justify-center p-0.5 shadow">
              <div className="w-full h-full bg-[#004bb4] rounded-full flex items-center justify-center text-white font-black text-[10px]">
                8
              </div>
            </div>
            <span className="text-xs font-extrabold tracking-tight text-white">Eighteeth</span>
          </div>

          {/* 4 MAIN WORKFLOW TABS (Exact match to NanoPix pill buttons) */}
          <div className="flex items-center bg-[#0d1424] p-0.5 rounded-lg border border-[#1b2a47] gap-0.5">
            {(['Patient', 'Acquisition', 'Viewer', 'Report'] as const).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#1864cc] text-white shadow-sm font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* Top Right Header: Active Patient Badge */}
        <div className="flex items-center gap-2">
          {selectedPatient ? (
            <div className="text-right flex items-center gap-2 text-[11px]">
              <span className="font-mono text-slate-400 text-[10px]">{selectedPatient.chartNo}</span>
              <span className="font-bold text-white uppercase">{selectedPatient.name}</span>
              <span className="text-slate-400 font-medium">({selectedPatient.birthDate})</span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400 italic">Please select a patient.</span>
          )}
        </div>
      </header>

      {/* 3. SUB-ACTION BAR (Specific to Active Tab) */}
      <div className="flex items-center justify-between px-3 h-7 bg-[#090e1c] border-b border-[#141d33] text-xs shrink-0">
        {/* Left Sub-tools */}
        <div className="flex items-center gap-1.5">
          {activeTab === 'Patient' && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => showToast('info', 'Formulaire de création patient radio.')}
                className="p-1 bg-[#121c33] hover:bg-[#1b2b4d] rounded text-slate-200 border border-[#1d2d50] cursor-pointer"
                title="Ajouter Patient"
              >
                <Plus className="w-3 h-3" />
              </button>
              <button
                onClick={() => showToast('info', 'Édition fiche patient.')}
                className="p-1 bg-[#121c33] hover:bg-[#1b2b4d] rounded text-slate-200 border border-[#1d2d50] cursor-pointer"
                title="Modifier"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={() => showToast('warning', 'Suppression.')}
                className="p-1 bg-[#121c33] hover:bg-[#1b2b4d] rounded text-slate-200 border border-[#1d2d50] cursor-pointer"
                title="Supprimer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
              <button
                onClick={() => showToast('info', 'Carte d\'identité médicale.')}
                className="p-1 bg-[#121c33] hover:bg-[#1b2b4d] rounded text-slate-200 border border-[#1d2d50] cursor-pointer"
                title="Carte Patient"
              >
                <UserCheck className="w-3 h-3" />
              </button>
            </div>
          )}

          {activeTab === 'Acquisition' && (
            <div className="flex items-center gap-1">
              <button onClick={() => setRotationAngle((p) => p - 90)} className="p-1 bg-[#121c33] hover:bg-[#1b2b4d] rounded text-slate-200 border border-[#1d2d50] cursor-pointer">
                <RotateCcw className="w-3 h-3" />
              </button>
              <button onClick={() => setRotationAngle((p) => p + 90)} className="p-1 bg-[#121c33] hover:bg-[#1b2b4d] rounded text-slate-200 border border-[#1d2d50] cursor-pointer">
                <RotateCw className="w-3 h-3" />
              </button>
              <button onClick={() => setFlipH((p) => !p)} className="p-1 bg-[#121c33] hover:bg-[#1b2b4d] rounded text-slate-200 border border-[#1d2d50] cursor-pointer">
                <FlipHorizontal className="w-3 h-3" />
              </button>
              <button onClick={() => setFlipV((p) => !p)} className="p-1 bg-[#121c33] hover:bg-[#1b2b4d] rounded text-slate-200 border border-[#1d2d50] cursor-pointer">
                <FlipVertical className="w-3 h-3" />
              </button>
            </div>
          )}

          {activeTab === 'Viewer' && (
            <div className="flex items-center gap-1">
              <button onClick={() => setRotationAngle((p) => p - 90)} className="p-1 bg-[#121c33] hover:bg-[#1b2b4d] rounded text-slate-200 border border-[#1d2d50] cursor-pointer" title="Rotate CCW"><RotateCcw className="w-3 h-3" /></button>
              <button onClick={() => setRotationAngle((p) => p + 90)} className="p-1 bg-[#121c33] hover:bg-[#1b2b4d] rounded text-slate-200 border border-[#1d2d50] cursor-pointer" title="Rotate CW"><RotateCw className="w-3 h-3" /></button>
              <button onClick={() => setFlipH((p) => !p)} className="p-1 bg-[#121c33] hover:bg-[#1b2b4d] rounded text-slate-200 border border-[#1d2d50] cursor-pointer" title="Flip H"><FlipHorizontal className="w-3 h-3" /></button>
              <button onClick={() => setFlipV((p) => !p)} className="p-1 bg-[#121c33] hover:bg-[#1b2b4d] rounded text-slate-200 border border-[#1d2d50] cursor-pointer" title="Flip V"><FlipVertical className="w-3 h-3" /></button>
              <button onClick={() => setViewerTool('pan')} className={`p-1 rounded border cursor-pointer ${viewerTool === 'pan' ? 'bg-blue-600 text-white border-blue-400' : 'bg-[#121c33] text-slate-200 border-[#1d2d50]'}`} title="Pan"><Hand className="w-3 h-3" /></button>
              <button onClick={() => setViewerTool('zoom')} className={`p-1 rounded border cursor-pointer ${viewerTool === 'zoom' ? 'bg-blue-600 text-white border-blue-400' : 'bg-[#121c33] text-slate-200 border-[#1d2d50]'}`} title="Zoom"><ZoomIn className="w-3 h-3" /></button>
              <button onClick={() => setIsInverted((p) => !p)} className={`p-1 rounded border cursor-pointer ${isInverted ? 'bg-amber-600 text-white border-amber-400' : 'bg-[#121c33] text-slate-200 border-[#1d2d50]'}`} title="Invert"><Sun className="w-3 h-3" /></button>
              <button onClick={() => setViewerTool('ruler')} className={`p-1 rounded border cursor-pointer ${viewerTool === 'ruler' ? 'bg-blue-600 text-white border-blue-400' : 'bg-[#121c33] text-slate-200 border-[#1d2d50]'}`} title="Ruler"><Ruler className="w-3 h-3" /></button>
              <button onClick={() => setViewerTool('angle')} className={`p-1 rounded border cursor-pointer ${viewerTool === 'angle' ? 'bg-blue-600 text-white border-blue-400' : 'bg-[#121c33] text-slate-200 border-[#1d2d50]'}`} title="Angle"><Compass className="w-3 h-3" /></button>
              <button onClick={() => setViewerTool('draw')} className={`p-1 rounded border cursor-pointer ${viewerTool === 'draw' ? 'bg-blue-600 text-white border-blue-400' : 'bg-[#121c33] text-slate-200 border-[#1d2d50]'}`} title="Pen"><Pencil className="w-3 h-3" /></button>
              <button onClick={() => setViewerTool('rect')} className={`p-1 rounded border cursor-pointer ${viewerTool === 'rect' ? 'bg-blue-600 text-white border-blue-400' : 'bg-[#121c33] text-slate-200 border-[#1d2d50]'}`} title="Rectangle"><Square className="w-3 h-3" /></button>
              <button onClick={() => setViewerTool('circle')} className={`p-1 rounded border cursor-pointer ${viewerTool === 'circle' ? 'bg-blue-600 text-white border-blue-400' : 'bg-[#121c33] text-slate-200 border-[#1d2d50]'}`} title="Circle"><Circle className="w-3 h-3" /></button>
              <button onClick={() => setViewerTool('loupe')} className={`p-1 rounded border cursor-pointer ${viewerTool === 'loupe' ? 'bg-blue-600 text-white border-blue-400' : 'bg-[#121c33] text-slate-200 border-[#1d2d50]'}`} title="Loupe"><Sparkles className="w-3 h-3" /></button>
              <button onClick={() => setShowGrid((p) => !p)} className={`p-1 rounded border cursor-pointer ${showGrid ? 'bg-blue-600 text-white border-blue-400' : 'bg-[#121c33] text-slate-200 border-[#1d2d50]'}`} title="Grid"><Grid className="w-3 h-3" /></button>
            </div>
          )}

          {activeTab === 'Report' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-semibold">Report Format :</span>
              <span className="text-blue-400 font-mono font-bold">Standard A4 Format</span>
            </div>
          )}
        </div>

        {/* Right Sub-tools (Date selector or Sensor bulb) */}
        <div className="flex items-center gap-2">
          {activeTab === 'Patient' && (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1">
                <input type="radio" checked readOnly className="accent-blue-500 w-2.5 h-2.5" />
                <span className="text-[11px] text-slate-300">Date</span>
              </div>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-[#0f172a] border border-[#1d2d50] text-slate-200 text-[10px] px-1.5 py-0.5 rounded focus:outline-none"
              >
                <option>All Dates</option>
                <option>Aujourd'hui</option>
                <option>Cette Semaine</option>
                <option>Ce Mois</option>
              </select>
            </div>
          )}

          {activeTab === 'Acquisition' && (
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${sensorConnected ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'}`} />
              <span className="text-[10px] font-mono text-slate-300">{sensorConnected ? 'Ready for Exposure' : 'Offline'}</span>
            </div>
          )}
        </div>
      </div>

      {/* 4. MAIN VIEWPORT (Patient | Acquisition | Viewer | Report) */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* ========================================================================= */}
        {/* TAB 1: PATIENT MANAGER MODULE (Exact Match to Screenshot 1)               */}
        {/* ========================================================================= */}
        {activeTab === 'Patient' && (
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Left Panel: Search & Patient Info & Table */}
            <div className="w-72 bg-[#050914] border-r border-[#141d33] flex flex-col justify-between p-2 shrink-0 overflow-y-auto no-scrollbar gap-1.5">
              {/* Top Search Controls */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">SEARCH</span>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="flex-1 bg-[#0b1224] border border-[#1a2947] rounded px-2 py-0.5 text-[11px] text-white focus:outline-none focus:border-blue-500"
                  />
                  <button className="px-1.5 py-0.5 bg-[#142342] hover:bg-[#1d325e] rounded text-white text-[11px] border border-[#1a2947] cursor-pointer">
                    +
                  </button>
                  <button className="px-2.5 py-0.5 bg-[#1864cc] hover:bg-blue-600 rounded text-white text-[11px] font-semibold cursor-pointer">
                    Search
                  </button>
                </div>

                {/* Quick Search */}
                <div className="flex flex-col gap-0.5 mt-0.5">
                  <span className="text-[8.5px] font-bold uppercase tracking-wider text-slate-500">QUICK SEARCH</span>
                  <div className="flex flex-col gap-0.5">
                    <button className="w-full py-1 px-2 text-left rounded bg-[#0d162b] hover:bg-[#13203f] border border-[#162544] text-[10px] text-slate-300 font-medium transition-all cursor-pointer">
                      Recently Acquired
                    </button>
                    <button className="w-full py-1 px-2 text-left rounded bg-[#0d162b] hover:bg-[#13203f] border border-[#162544] text-[10px] text-slate-300 font-medium transition-all cursor-pointer">
                      Recently Printed
                    </button>
                  </div>
                </div>

                {/* Selected Patient Detail Card */}
                {selectedPatient && (
                  <div className="bg-[#0b1224] border border-[#1a2947] rounded p-1.5 flex flex-col gap-1 mt-0.5">
                    <div className="flex items-start gap-2">
                      <div className="w-10 h-10 rounded-full bg-slate-200 border border-white/20 shrink-0 flex items-center justify-center font-bold text-slate-800 text-xs">
                        {selectedPatient.name.charAt(0).toUpperCase()}
                      </div>
                      <table className="flex-1 text-[9.5px] text-slate-300">
                        <tbody>
                          <tr className="border-b border-white/5">
                            <td className="py-0.5 text-slate-400 font-semibold w-16">Chart No.</td>
                            <td className="py-0.5 font-mono font-bold text-blue-400">{selectedPatient.chartNo}</td>
                          </tr>
                          <tr className="border-b border-white/5">
                            <td className="py-0.5 text-slate-400 font-semibold">Name</td>
                            <td className="py-0.5 uppercase font-bold text-white truncate max-w-[110px]">{selectedPatient.name}</td>
                          </tr>
                          <tr className="border-b border-white/5">
                            <td className="py-0.5 text-slate-400 font-semibold">Gender/Age</td>
                            <td className="py-0.5">{selectedPatient.gender}/{selectedPatient.age}Y</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-400 font-semibold">Date of Birth</td>
                            <td className="py-0.5">{selectedPatient.birthDate}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <button
                      onClick={() => setActiveTab('Viewer')}
                      className="w-full py-0.5 bg-[#1864cc] hover:bg-blue-600 text-white rounded text-[10px] font-bold cursor-pointer transition-all text-center"
                    >
                      Show Detail
                    </button>
                  </div>
                )}
              </div>

              {/* Patient List Table Container */}
              <div className="flex-1 min-h-[90px] bg-[#0b1224] border border-[#1a2947] rounded overflow-hidden flex flex-col mt-1">
                <div className="overflow-y-auto flex-1 no-scrollbar">
                  <table className="w-full text-left text-[9.5px]">
                    <thead className="bg-[#080d1a] text-slate-400 font-bold sticky top-0 border-b border-[#1a2947]">
                      <tr>
                        <th className="py-1 px-1.5">Chart No. ▲</th>
                        <th className="py-1 px-1.5">Name</th>
                        <th className="py-1 px-1.5">DOB</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#142038]">
                      {patients
                        .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.chartNo.includes(searchQuery))
                        .map((p) => {
                          const isSelected = p.id === selectedPatientId;
                          return (
                            <tr
                              key={p.id}
                              onClick={() => setSelectedPatientId(p.id)}
                              onDoubleClick={() => setActiveTab('Viewer')}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? 'bg-[#1864cc] text-white font-bold' : 'hover:bg-white/5 text-slate-300'
                              }`}
                            >
                              <td className="py-1 px-1.5 font-mono">{p.chartNo}</td>
                              <td className="py-1 px-1.5 uppercase truncate max-w-[85px]">{p.name}</td>
                              <td className="py-1 px-1.5 text-slate-400">{p.birthDate}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Large Main Display Canvas */}
            <div className="flex-1 bg-[#02040a] flex flex-col justify-between p-2 relative overflow-hidden min-h-0">
              {/* Radiograph View Area */}
              <div className="flex-1 flex items-center justify-center relative min-h-0 overflow-hidden">
                <div className="max-h-[50vh] aspect-[4/3] bg-black rounded-lg border border-[#141d33] overflow-hidden relative flex items-center justify-center shadow-2xl">
                  <img
                    src={selectedStudy?.url || DEFAULT_RVG_XRAYS['18']}
                    alt="X-ray Study"
                    className="w-full h-full object-contain grayscale contrast-125 brightness-95"
                  />
                  <div className="absolute top-1.5 left-1.5 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-mono text-cyan-400 border border-white/10">
                    {selectedStudy?.timestamp || '2026-09-04 19:14:29'} IO {selectedStudy?.tooth || 18}
                  </div>
                </div>
              </div>

              {/* Bottom Thumbnails Strip */}
              <div className="h-14 bg-[#070b16] border border-[#141d33] rounded px-2 py-1 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-1.5 overflow-x-auto flex-1 no-scrollbar">
                  {selectedPatient?.studies.map((study) => (
                    <div
                      key={study.id}
                      onClick={() => {
                        setSelectedStudyId(study.id);
                        setActiveTab('Viewer');
                      }}
                      className="w-14 h-10 bg-black rounded border border-[#1b2b47] hover:border-blue-400 overflow-hidden cursor-pointer relative shrink-0"
                    >
                      <img src={study.url} alt="Study" className="w-full h-full object-cover grayscale" />
                      <span className="absolute bottom-0 right-0 bg-blue-600 text-white font-mono text-[7px] px-1 font-bold">
                        #{study.tooth}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setActiveTab('Acquisition')}
                    className="px-2.5 py-1 bg-[#1864cc] hover:bg-blue-600 text-white rounded text-[11px] font-bold transition-all cursor-pointer"
                  >
                    + Prise de Cliché
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ACQUISITION MODULE (Exact Match to Screenshot 2)                   */}
        {/* ========================================================================= */}
        {activeTab === 'Acquisition' && (
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Left Controls & Image Processing Panel */}
            <div className="w-48 bg-[#050914] border-r border-[#141d33] p-1.5 flex flex-col justify-between shrink-0 overflow-y-auto no-scrollbar gap-1 text-[10px]">
              <div className="flex flex-col gap-1">
                {/* NEW STUDY Dropdown */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8.5px] font-bold uppercase tracking-wider text-slate-400">NEW STUDY</span>
                  <select
                    value={studyType}
                    onChange={(e) => setStudyType(e.target.value)}
                    className="bg-[#0b1224] border border-[#1a2947] text-white text-[10px] px-1.5 py-0.5 rounded focus:outline-none"
                  >
                    <option>IO Sensor</option>
                    <option>Bitewing</option>
                    <option>Panoramic</option>
                  </select>
                </div>

                {/* TEETH LAYOUT Dropdown */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8.5px] font-bold uppercase tracking-wider text-slate-400">TEETH LAYOUT</span>
                  <select
                    value={teethLayout}
                    onChange={(e) => setTeethLayout(e.target.value as any)}
                    className="bg-[#0b1224] border border-[#1a2947] text-white text-[10px] px-1.5 py-0.5 rounded focus:outline-none"
                  >
                    <option value="Adult">Adult</option>
                    <option value="Child">Child</option>
                  </select>
                </div>

                {/* IMAGE PROCESSING */}
                <div className="flex flex-col gap-1 pt-1 border-t border-[#141d33]">
                  <span className="text-[8.5px] font-bold uppercase tracking-wider text-slate-400">IMAGE PROCESSING</span>
                  <select
                    value={imageProcessingMode}
                    onChange={(e) => setImageProcessingMode(e.target.value as any)}
                    className="bg-[#0b1224] border border-[#1a2947] text-blue-400 font-bold text-[10px] px-1.5 py-0.5 rounded focus:outline-none"
                  >
                    <option value="Endodontic">Endodontic</option>
                    <option value="Periodontic">Periodontic</option>
                    <option value="Caries">Caries</option>
                    <option value="Standard">Standard</option>
                  </select>

                  {/* Smart Contrast Stepper */}
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-300 text-[9.5px]">Smart Contrast</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSmartContrastLevel((p) => Math.max(1, p - 1))}
                        className="w-3.5 h-3.5 rounded bg-[#142342] text-white font-bold flex items-center justify-center text-[9px]"
                      >
                        -
                      </button>
                      <span className="w-3 text-center font-bold text-blue-400 text-[10px]">{smartContrastLevel}</span>
                      <button
                        onClick={() => setSmartContrastLevel((p) => Math.min(5, p + 1))}
                        className="w-3.5 h-3.5 rounded bg-[#142342] text-white font-bold flex items-center justify-center text-[9px]"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => setSmartSharpen((p) => !p)}
                    className={`w-full py-0.5 text-[10px] font-semibold rounded border cursor-pointer ${
                      smartSharpen ? 'bg-[#1864cc] text-white border-blue-400' : 'bg-[#0d162b] text-slate-300 border-[#1a2947]'
                    }`}
                  >
                    Smart Sharpen
                  </button>

                  <div className="grid grid-cols-2 gap-1">
                    <button
                      onClick={() => setIsSmoothed((p) => !p)}
                      className={`py-0.5 text-[9px] font-semibold rounded border cursor-pointer ${
                        isSmoothed ? 'bg-[#1864cc] text-white border-blue-400' : 'bg-[#0d162b] text-slate-300 border-[#1a2947]'
                      }`}
                    >
                      Smooth
                    </button>
                    <button
                      onClick={() => setIsInverted((p) => !p)}
                      className={`py-0.5 text-[9px] font-semibold rounded border cursor-pointer ${
                        isInverted ? 'bg-amber-600 text-white border-amber-400' : 'bg-[#0d162b] text-slate-300 border-[#1a2947]'
                      }`}
                    >
                      Inverse
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[9.5px]">
                    <span className="text-slate-400">Colorize</span>
                    <select
                      value={colorizeMode}
                      onChange={(e) => setColorizeMode(e.target.value as any)}
                      className="bg-[#0b1224] border border-[#1a2947] text-slate-200 text-[9px] px-1 py-0.5 rounded focus:outline-none"
                    >
                      <option value="Normal">Normal</option>
                      <option value="Heatmap">Heatmap</option>
                      <option value="Bone">Bone</option>
                      <option value="Sepia">Sepia</option>
                    </select>
                  </div>

                  <button
                    onClick={handleResetFilters}
                    className="w-full py-0.5 text-[9px] text-slate-300 bg-[#0d162b] hover:bg-[#13203f] border border-[#1a2947] rounded cursor-pointer"
                  >
                    Reset
                  </button>
                </div>

                {/* BRIGHTNESS & CONTRAST */}
                <div className="flex flex-col gap-1 pt-1 border-t border-[#141d33]">
                  <span className="text-[8.5px] font-bold uppercase tracking-wider text-slate-400">BRIGHTNESS & CONTRAST</span>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex justify-between text-[8.5px] text-slate-400">
                      <span>Brightness</span>
                      <span className="font-mono text-white">{brightness} %</span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={brightness}
                      onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
                      className="w-full accent-blue-500 h-1 bg-[#0b1224] rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <div className="flex justify-between text-[8.5px] text-slate-400">
                      <span>Contrast</span>
                      <span className="font-mono text-white">{contrast} %</span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={contrast}
                      onChange={(e) => setContrast(parseInt(e.target.value, 10))}
                      className="w-full accent-blue-500 h-1 bg-[#0b1224] rounded cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-1">
                    <button onClick={() => { setBrightness(0); setContrast(0); }} className="py-0.5 text-[9px] bg-[#0d162b] border border-[#1a2947] rounded text-slate-300 cursor-pointer">
                      Auto
                    </button>
                    <button onClick={() => { setBrightness(0); setContrast(0); }} className="py-0.5 text-[9px] bg-[#0d162b] border border-[#1a2947] rounded text-slate-300 cursor-pointer">
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              {/* Trigger Button */}
              <button
                onClick={handleTriggerAcquisition}
                disabled={isExposing}
                className="w-full py-1.5 bg-[#1864cc] hover:bg-blue-600 text-white rounded font-bold text-[11px] shadow cursor-pointer transition-all flex items-center justify-center gap-1 shrink-0"
              >
                <Camera className={`w-3 h-3 ${isExposing ? 'animate-spin' : ''}`} />
                <span>{isExposing ? 'Exposition...' : `Acquérir Dent #${selectedTooth}`}</span>
              </button>
            </div>

            {/* Central Area: Live View & Bottom FDI Teeth Grid */}
            <div className="flex-1 flex flex-col bg-[#02040a] justify-between overflow-hidden min-h-0">
              {/* Central Viewport */}
              <div className="flex-1 flex items-center justify-center p-1.5 relative min-h-0 overflow-hidden">
                {isExposing ? (
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin flex items-center justify-center">
                      <Scan className="w-4 h-4 text-cyan-400 animate-pulse" />
                    </div>
                    <span className="text-[11px] font-bold text-white">Capture en cours...</span>
                  </div>
                ) : (
                  <div className="max-h-[30vh] sm:max-h-[34vh] aspect-[4/3] w-auto max-w-[380px] bg-black rounded border border-[#141d33] overflow-hidden relative flex items-center justify-center shadow-2xl">
                    <img
                      src={selectedStudy?.url || DEFAULT_RVG_XRAYS['18']}
                      alt="X-ray Live"
                      style={{
                        filter: `
                          brightness(${100 + brightness}%)
                          contrast(${100 + contrast + smartContrastLevel * 8}%)
                          ${isInverted ? 'invert(1)' : ''}
                        `,
                      }}
                      className="w-full h-full object-contain grayscale"
                    />
                    <div className="absolute top-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[8.5px] font-mono text-cyan-400 border border-white/10">
                      IO {selectedTooth} • {selectedPatient?.name}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Anatomical FDI Teeth Selector Grid */}
              <div className="bg-[#050914] border-t border-[#141d33] px-2 py-1 flex flex-col gap-0.5 shrink-0">
                {/* Upper Teeth Row */}
                <div className="flex items-center justify-center gap-0.5 overflow-x-auto no-scrollbar">
                  {upperAdultTeeth.map((tooth, idx) => {
                    const isSelected = tooth === selectedTooth;
                    const tag = idx < 8 ? `R${8 - idx}` : `L${idx - 7}`;
                    return (
                      <button
                        key={tooth}
                        onClick={() => setSelectedTooth(tooth)}
                        className={`w-[25px] h-[28px] rounded flex flex-col items-center justify-between p-0.5 border text-[7.5px] font-bold cursor-pointer transition-all shrink-0 ${
                          isSelected ? 'bg-[#1864cc] text-white border-blue-400' : 'bg-[#0d162b] text-slate-300 border-[#1a2947] hover:bg-[#13203f]'
                        }`}
                      >
                        <span>{tooth}</span>
                        <div className={`w-1.5 h-2 rounded-t-xs ${isSelected ? 'bg-cyan-200' : 'bg-slate-500'}`} />
                        <span className="text-[6px] text-slate-400 font-mono">{tag}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Lower Teeth Row */}
                <div className="flex items-center justify-center gap-0.5 overflow-x-auto no-scrollbar">
                  {lowerAdultTeeth.map((tooth, idx) => {
                    const isSelected = tooth === selectedTooth;
                    const tag = idx < 8 ? `R${8 - idx}` : `L${idx - 7}`;
                    return (
                      <button
                        key={tooth}
                        onClick={() => setSelectedTooth(tooth)}
                        className={`w-[25px] h-[28px] rounded flex flex-col items-center justify-between p-0.5 border text-[7.5px] font-bold cursor-pointer transition-all shrink-0 ${
                          isSelected ? 'bg-[#1864cc] text-white border-blue-400' : 'bg-[#0d162b] text-slate-300 border-[#1a2947] hover:bg-[#13203f]'
                        }`}
                      >
                        <span className="text-[6px] text-slate-400 font-mono">{tag}</span>
                        <div className={`w-1.5 h-2 rounded-b-xs ${isSelected ? 'bg-cyan-200' : 'bg-slate-500'}`} />
                        <span>{tooth}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}


        {/* ========================================================================= */}
        {/* TAB 3: VIEWER MODULE (Exact Match to Screenshot 3)                         */}
        {/* ========================================================================= */}
        {activeTab === 'Viewer' && (
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Left Adjustment Sidebar */}
            <div className="w-52 bg-[#050914] border-r border-[#141d33] p-2 flex flex-col gap-2 shrink-0 overflow-y-auto no-scrollbar text-[10px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">IMAGE PROCESSING</span>
              <select
                value={imageProcessingMode}
                onChange={(e) => setImageProcessingMode(e.target.value as any)}
                className="bg-[#0b1224] border border-[#1a2947] text-blue-400 font-bold text-xs px-2 py-1 rounded focus:outline-none"
              >
                <option value="Endodontic">Endodontic</option>
                <option value="Periodontic">Periodontic</option>
                <option value="Caries">Caries</option>
                <option value="Standard">Standard</option>
              </select>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 text-[11px]">Smart Contrast</span>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setSmartContrastLevel((p) => Math.max(1, p - 1))} className="w-5 h-5 rounded bg-[#142342] text-white font-bold flex items-center justify-center text-xs">-</button>
                  <span className="w-4 text-center font-bold text-blue-400 text-xs">{smartContrastLevel}</span>
                  <button onClick={() => setSmartContrastLevel((p) => Math.min(5, p + 1))} className="w-5 h-5 rounded bg-[#142342] text-white font-bold flex items-center justify-center text-xs">+</button>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-[#141d33]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">BRIGHTNESS & CONTRAST</span>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Brightness</span>
                    <span className="font-mono text-white">{brightness} %</span>
                  </div>
                  <input type="range" min="-50" max="50" value={brightness} onChange={(e) => setBrightness(parseInt(e.target.value, 10))} className="w-full accent-blue-500 h-1 bg-[#0b1224] rounded" />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Contrast</span>
                    <span className="font-mono text-white">{contrast} %</span>
                  </div>
                  <input type="range" min="-50" max="50" value={contrast} onChange={(e) => setContrast(parseInt(e.target.value, 10))} className="w-full accent-blue-500 h-1 bg-[#0b1224] rounded" />
                </div>
              </div>

              {/* Ruler readout box */}
              <div className="p-2.5 bg-[#0b1224] border border-[#1a2947] rounded text-xs flex flex-col gap-1 mt-auto">
                <span className="text-[10px] font-bold text-slate-400">Mesure Canalaire :</span>
                <span className="text-cyan-400 font-mono font-bold text-sm">{rulerDistanceMm} mm</span>
              </div>
            </div>

            {/* Central Canvas */}
            <div
              className="flex-1 bg-black flex items-center justify-center relative overflow-hidden select-none"
              onMouseMove={(e) => {
                if (viewerTool === 'loupe') {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setLoupePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                }
              }}
              onMouseLeave={() => setLoupePos(null)}
            >
              <div
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotationAngle}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                  transition: 'transform 0.1s ease-out',
                }}
                className="max-w-3xl max-h-[75vh] relative"
              >
                <img
                  src={selectedStudy?.url || DEFAULT_RVG_XRAYS['18']}
                  alt="Viewer"
                  style={{
                    filter: `
                      brightness(${100 + brightness}%)
                      contrast(${100 + contrast + smartContrastLevel * 10}%)
                      ${isInverted ? 'invert(1)' : ''}
                    `,
                  }}
                  className="rounded object-contain max-h-[70vh] shadow-2xl"
                />

                {/* Exact Screenshot 3 Metadata Tag: 2026-09-04 19:14:29 IO 18 */}
                <div className="absolute top-2 left-2 text-[11px] font-mono font-bold text-slate-200 drop-shadow-md">
                  {selectedStudy?.timestamp || '2026-09-04 19:14:29'} IO {selectedStudy?.tooth || 18}
                </div>

                {/* SVG Ruler Overlay */}
                {viewerTool === 'ruler' && rulerPoints && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <line x1={rulerPoints.x1} y1={rulerPoints.y1} x2={rulerPoints.x2} y2={rulerPoints.y2} stroke="#00f0ff" strokeWidth="2" strokeDasharray="4 2" />
                    <circle cx={rulerPoints.x1} cy={rulerPoints.y1} r="4" fill="#00f0ff" />
                    <circle cx={rulerPoints.x2} cy={rulerPoints.y2} r="4" fill="#00f0ff" />
                    <rect x={(rulerPoints.x1 + rulerPoints.x2) / 2 + 10} y={(rulerPoints.y1 + rulerPoints.y2) / 2 - 10} width="60" height="20" rx="4" fill="#050914" stroke="#00f0ff" strokeWidth="1" />
                    <text x={(rulerPoints.x1 + rulerPoints.x2) / 2 + 40} y={(rulerPoints.y1 + rulerPoints.y2) / 2 + 4} fill="#00f0ff" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                      {rulerDistanceMm} mm
                    </text>
                  </svg>
                )}
              </div>

              {/* Loupe */}
              {viewerTool === 'loupe' && loupePos && (
                <div
                  style={{
                    left: loupePos.x - 60,
                    top: loupePos.y - 60,
                    backgroundImage: `url(${selectedStudy?.url || DEFAULT_RVG_XRAYS['18']})`,
                    backgroundSize: '700px 500px',
                    backgroundPosition: `-${loupePos.x * 1.6}px -${loupePos.y * 1.6}px`,
                  }}
                  className="w-32 h-32 rounded-full border-2 border-cyan-400 absolute pointer-events-none shadow-2xl bg-black z-30"
                />
              )}
            </div>

            {/* Right Series Strip (Screenshot 3 Right Column) */}
            <div className="w-36 bg-[#050914] border-l border-[#141d33] p-2 flex flex-col gap-2 shrink-0 overflow-y-auto no-scrollbar">
              {selectedPatient?.studies.map((study) => (
                <div
                  key={study.id}
                  onClick={() => setSelectedStudyId(study.id)}
                  className={`rounded border overflow-hidden cursor-pointer transition-all ${
                    study.id === selectedStudyId ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-[#1a2947]'
                  }`}
                >
                  <div className="h-20 bg-black">
                    <img src={study.url} alt="Series" className="w-full h-full object-cover grayscale" />
                  </div>
                  <div className="p-1 bg-[#090e1c] text-[9px] font-mono text-slate-400 truncate">
                    {study.timestamp} IO {study.tooth}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: REPORT MODULE (Exact Match to Screenshot 4)                        */}
        {/* ========================================================================= */}
        {activeTab === 'Report' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Controls */}
            <div className="w-64 bg-[#050914] border-r border-[#141d33] p-3 flex flex-col gap-3 shrink-0 overflow-y-auto no-scrollbar">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TEMPLATE</span>
              <select
                value={reportTemplate}
                onChange={(e) => setReportTemplate(e.target.value as any)}
                className="bg-[#0b1224] border border-[#1a2947] text-white text-xs px-2.5 py-1 rounded focus:outline-none"
              >
                <option value="Template A">Template A</option>
                <option value="Template B">Template B</option>
                <option value="Template C">Template C</option>
              </select>

              <div className="flex flex-col gap-1.5 pt-2 border-t border-[#141d33]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">REPORT HISTORY</span>
                <button onClick={() => showToast('success', 'Rapport sauvegardé.')} className="w-full py-1.5 bg-[#0d162b] border border-[#1a2947] rounded text-xs text-slate-300 hover:bg-[#13203f] cursor-pointer">
                  Save Report
                </button>
                <button onClick={() => showToast('info', 'Rapport chargé.')} className="w-full py-1.5 bg-[#0d162b] border border-[#1a2947] rounded text-xs text-slate-300 hover:bg-[#13203f] cursor-pointer">
                  Load Report
                </button>
                <button onClick={() => window.print()} className="w-full py-2 bg-[#1864cc] hover:bg-blue-600 rounded text-xs font-bold text-white shadow cursor-pointer mt-2 flex items-center justify-center gap-1.5">
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer</span>
                </button>
              </div>
            </div>

            {/* Center A4 Sheet with Green Boundary Frames (Screenshot 4) */}
            <div className="flex-1 bg-[#617482] overflow-y-auto p-4 flex justify-center print:p-0 print:bg-white">
              <div className="w-[190mm] min-h-[265mm] bg-white text-slate-900 p-8 shadow-2xl flex flex-col justify-between print:shadow-none print:p-4">
                <div className="flex flex-col gap-4">
                  {/* Green Box 1: Header */}
                  <div className="border border-green-500 p-3 rounded bg-transparent flex justify-between items-center text-xs">
                    <div className="text-[10px] font-mono text-slate-500">2026-09-15</div>
                    <div className="text-right text-[10px] leading-tight">
                      <div className="font-mono">Chart No: {selectedPatient?.chartNo} • Gender: {selectedPatient?.gender}</div>
                      <div className="font-bold uppercase">Name: {selectedPatient?.name}</div>
                      <div>Date of Birth: {selectedPatient?.birthDate} • Age: {selectedPatient?.age}Y</div>
                    </div>
                  </div>

                  {/* Green Box 2: Radio Image */}
                  <div className="border border-green-500 p-3 rounded bg-black flex flex-col items-center justify-center">
                    <div className="w-[100mm] h-[75mm] relative">
                      <img src={selectedStudy?.url || DEFAULT_RVG_XRAYS['18']} alt="Report" className="w-full h-full object-cover grayscale contrast-125" />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 mt-1">
                      IO_{selectedStudy?.tooth || 18}_{selectedStudy?.timestamp?.replace(/[^0-9]/g, '_') || '20260904'}
                    </span>
                  </div>

                  {/* Green Box 3: Text diagnosis area */}
                  <div className="border border-green-500 p-3 rounded">
                    <span className="text-[10px] font-bold text-slate-500 block mb-1">Text</span>
                    <textarea
                      rows={6}
                      value={reportDiagnosis}
                      onChange={(e) => setReportDiagnosis(e.target.value)}
                      className="w-full text-xs text-slate-900 border-0 focus:outline-none resize-none font-sans"
                    />
                  </div>
                </div>

                {/* Footer Box */}
                <div className="border border-green-500 p-2 rounded text-[10px] flex justify-between text-slate-600">
                  <span>Dr. Salma Tijini — Chirurgien Dentiste</span>
                  <span>Signature & Cachet</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NanoPixStudio;
