import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Edit2,
  Printer,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Hand,
  ZoomIn,
  Sun,
  Camera,
  Compass,
  Ruler,
  Scan,
  UserCheck,
  Sparkles,
  Grid,
  Square,
  Circle,
  Pencil,
  X,
  ChevronDown,
  Check,
  Radio,
  Wifi,
  WifiOff,
  ExternalLink,
  Zap,
  Activity,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLiveSync } from '../context/LiveSyncContext';
import { BASE_URL, API_URL, getUploadUrl } from '../config/api';
import { generateNanoPixPDF } from '../utils/nanoPixPdfGenerator';

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
  const { toast } = useToast();
  const navigate = useNavigate();

  // --- MAIN TABS (Patient | Acquisition | Viewer | Report) ---
  const [activeTab, setActiveTab] = useState<'Patient' | 'Acquisition' | 'Viewer' | 'Report'>('Patient');

  // --- MENU BAR STATE ---
  const [activeMenu, setActiveMenu] = useState<'file' | 'tools' | 'help' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // --- SETTINGS POPUP MODAL STATE ---
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsCategory, setSettingsCategory] = useState<'Environment' | 'Patient' | 'Acquisition' | 'Viewer' | 'Report'>('Environment');
  const [viewerSettingsSubTab, setViewerSettingsSubTab] = useState<'General' | 'Tools' | 'Measurement' | 'Annotation' | 'Memo'>('General');

  // Settings values
  const [settingLanguage, setSettingLanguage] = useState('Default');
  const [settingIconSize, setSettingIconSize] = useState<'Small' | 'Medium' | 'Big'>('Medium');
  const [settingClinicName, setSettingClinicName] = useState('Cabinet Dentaire Dr. Salma Tijini');
  const [settingClinicAddress, setSettingClinicAddress] = useState('Avenue Hassan II, Rabat');
  const [settingClinicPhone, setSettingClinicPhone] = useState('06 61 00 00 00');
  const [settingViewerFullScreen, setSettingViewerFullScreen] = useState<'On' | 'Off'>('On');
  const [settingViewerLayoutPref, setSettingViewerLayoutPref] = useState('1x1');

  // Acquisition Settings values (from Eighteeth Screenshots)
  const [acquisitionSettingsSubTab, setAcquisitionSettingsSubTab] = useState<'General' | 'Image'>('General');
  const [settingAcqTriggerMode, setSettingAcqTriggerMode] = useState<'DC' | 'AC'>('DC');
  const [settingAcqKV, setSettingAcqKV] = useState<number>(70);
  const [settingAcqMA, setSettingAcqMA] = useState<string>('1.0');
  const [settingAcqImagePref, setSettingAcqImagePref] = useState<'Endodontic' | 'Periodontic' | 'Restorative'>('Endodontic');
  const [settingAcqTeethLayoutPref, setSettingAcqTeethLayoutPref] = useState<'Adult' | 'Child'>('Adult');
  const [settingAcqCalibration, setSettingAcqCalibration] = useState<string>('0.020');
  const [settingAcqStorageDir, setSettingAcqStorageDir] = useState<string>('C:\\PatientData');

  // Viewer Settings values (from Eighteeth Screenshots)
  const [settingMagnifierSize, setSettingMagnifierSize] = useState<string>('150x150');
  const [settingMagnifierRatio, setSettingMagnifierRatio] = useState<string>('1.5');
  const [settingCaptureBorderColor, setSettingCaptureBorderColor] = useState<string>('#fa6e59');
  const [settingGridSpacing, setSettingGridSpacing] = useState<string>('2mm');
  const [settingGridLineColor, setSettingGridLineColor] = useState<string>('#808080');
  const [settingGridLineThickness, setSettingGridLineThickness] = useState<string>('1px');
  const [settingGridOpacity, setSettingGridOpacity] = useState<string>('40%');

  const [settingLengthLineColor, setSettingLengthLineColor] = useState<string>('#ff0000');
  const [settingLengthLineThickness, setSettingLengthLineThickness] = useState<string>('1px');
  const [settingLengthUnitMm, setSettingLengthUnitMm] = useState<'On' | 'Off'>('On');
  const [settingAngleLineColor, setSettingAngleLineColor] = useState<string>('#ff0000');
  const [settingAngleLineThickness, setSettingAngleLineThickness] = useState<string>('1px');
  const [settingAngleUnitDeg, setSettingAngleUnitDeg] = useState<'On' | 'Off'>('On');

  const [settingDrawColor, setSettingDrawColor] = useState<string>('#ffff00');
  const [settingDrawThickness, setSettingDrawThickness] = useState<string>('3px');
  const [settingLineColor, setSettingLineColor] = useState<string>('#ffff00');
  const [settingLineThickness, setSettingLineThickness] = useState<string>('3px');
  const [settingRectColor, setSettingRectColor] = useState<string>('#ffff00');
  const [settingRectThickness, setSettingRectThickness] = useState<string>('3px');
  const [settingEllipseColor, setSettingEllipseColor] = useState<string>('#ffff00');
  const [settingEllipseThickness, setSettingEllipseThickness] = useState<string>('3px');

  const [settingMemoOutterColor, setSettingMemoOutterColor] = useState<string>('#00ff00');
  const [settingMemoTextColor, setSettingMemoTextColor] = useState<string>('#00ff00');
  const [settingMemoPresets, setSettingMemoPresets] = useState<string[]>([
    'Caries',
    'Bone Loss',
    'Absent',
    'Preset1',
    'Preset2',
    'Preset3',
    'Preset4',
  ]);

  // Report Settings values (from Eighteeth Screenshots)
  const [reportSettingsSubTab, setReportSettingsSubTab] = useState<'General' | 'Print'>('General');
  const [settingReportBorderColor, setSettingReportBorderColor] = useState<string>('#00ff00');
  const [settingReportBorderThickness, setSettingReportBorderThickness] = useState<string>('1px');
  const [settingReportFont, setSettingReportFont] = useState<string>('Microsoft YaHei UI');
  const [settingReportFontSize, setSettingReportFontSize] = useState<string>('10.5');
  const [settingReportFontColor, setSettingReportFontColor] = useState<string>('#000000');
  const [settingReportPaperSize, setSettingReportPaperSize] = useState<string>('A4');
  const [settingReportOrientation, setSettingReportOrientation] = useState<string>('Portrait');
  const [settingReportHeaderDisplay, setSettingReportHeaderDisplay] = useState<'On' | 'Off'>('On');
  const [settingReportFooterDisplay, setSettingReportFooterDisplay] = useState<'On' | 'Off'>('On');
  const [isPrinterSettingsOpen, setIsPrinterSettingsOpen] = useState(false);

  // Patient screen thumbnail slider zoom state (Screenshots 1, 2, 3)
  const [patientThumbnailZoom, setPatientThumbnailZoom] = useState<number>(140);

  // Date filter popup state (Screenshot)
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState('All Dates');
  const [tempDateFilter, setTempDateFilter] = useState('All Dates');
  const [customStartYear, setCustomStartYear] = useState('2026');
  const [customStartMonth, setCustomStartMonth] = useState('10');
  const [customStartDay, setCustomStartDay] = useState('03');
  const [customEndYear, setCustomEndYear] = useState('2026');
  const [customEndMonth, setCustomEndMonth] = useState('10');
  const [customEndDay, setCustomEndDay] = useState('03');
  const dateDropdownRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside or pressing Escape / Alt+F4
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target as Node)) {
        setIsDateDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + F4 -> Close NanoPix
      if (e.altKey && (e.key === 'F4' || e.keyCode === 115)) {
        e.preventDefault();
        navigate('/dashboard');
        return;
      }
      // Escape -> Close modal or dropdowns
      if (e.key === 'Escape') {
        if (isSettingsOpen) {
          setIsSettingsOpen(false);
        } else if (activeMenu) {
          setActiveMenu(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMenu, isSettingsOpen, navigate]);

  // Fetch real clinic config to prefill settings
  useEffect(() => {
    fetch(`${API_URL}/clinic/config`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          if (data.name) setSettingClinicName(data.name);
          if (data.address) setSettingClinicAddress(data.address);
          if (data.phone) setSettingClinicPhone(data.phone);
        }
      })
      .catch(() => {});
  }, [token]);

  // --- SENSOR & HARDWARE BRIDGE STATUS ---
  const location = useLocation();
  const [sensorConnected, setSensorConnected] = useState(false);
  const [sensorModel, setSensorModel] = useState<string>('Eighteeth NanoPix 1 (Size 1 - EN1)');
  const [isAppRunning, setIsAppRunning] = useState(false);
  const [isWaitingForShot, setIsWaitingForShot] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState<any>(null);

  const fetchBridgeStatus = () => {
    fetch(`${API_URL}/nanopix/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setBridgeStatus(data);
        setSensorConnected(Boolean(data.isSensorConnected));
        setIsAppRunning(Boolean(data.isAppRunning));
        if (data.isWaitingForShot !== undefined) {
          setIsWaitingForShot(Boolean(data.isWaitingForShot));
        }
        if (data.sensorModel) {
          setSensorModel(data.sensorModel);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchBridgeStatus();
    const interval = setInterval(fetchBridgeStatus, 4000);
    return () => clearInterval(interval);
  }, [token]);

  // Handle incoming patientId / tooth from navigation state (e.g. from PatientProfile)
  useEffect(() => {
    if (location.state && (location.state as any).patientId) {
      setSelectedPatientId((location.state as any).patientId);
      if ((location.state as any).tooth) {
        setSelectedTooth((location.state as any).tooth);
      }
      setActiveTab('Acquisition');
    }
  }, [location]);

  // --- PATIENTS DATA ---
  const [patients, setPatients] = useState<NanoPixPatient[]>([
    {
      id: 'p_default_1',
      chartNo: '20260904_191218',
      name: 'ALI MOUJAHID',
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
      name: 'FATIMA ZAHRA MANSOURI',
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

  // Load real clinic patients from backend API
  useEffect(() => {
    fetch(`${API_URL}/patients?limit=100`, {
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
  const [zoomLevel] = useState<number>(1);
  const [showGrid, setShowGrid] = useState<boolean>(false);

  // Measurements & Annotations State
  const [rulerPoints] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>({
    x1: 160,
    y1: 100,
    x2: 160,
    y2: 340,
  });
  const [loupePos, setLoupePos] = useState<{ x: number; y: number } | null>(null);

  // --- REPORT STUDIO CONTROLS ---
  const [reportTemplate, setReportTemplate] = useState<'Template A' | 'Template B' | 'Template C'>('Template A');
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [reportSelectedStudy, setReportSelectedStudy] = useState<StudyImage | null>(null);
  const [isReportImageSelected, setIsReportImageSelected] = useState<boolean>(true);
  const [isReportTextSelected, setIsReportTextSelected] = useState<boolean>(false);
  const [reportZoomScale, setReportZoomScale] = useState<number>(1);
  const [reportCurrentPage, setReportCurrentPage] = useState<number>(1);
  const [reportDiagnosis, setReportDiagnosis] = useState<string>('');

  // Load real radiographs for selected patient from MERN database
  useEffect(() => {
    if (!selectedPatientId || selectedPatientId.startsWith('p_default_')) return;
    fetch(`${API_URL}/nanopix/studies/${selectedPatientId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((docs) => {
        if (Array.isArray(docs) && docs.length > 0) {
          const realStudies: StudyImage[] = docs.map((d: any) => {
            const dateStr = d.uploadedAt ? d.uploadedAt.split('T')[0] : '2026-10-11';
            const toothMatch = d.fileName.match(/Dent_(\d+)/i) || d.fileName.match(/_(\d+)_/i);
            const toothNum = toothMatch ? parseInt(toothMatch[1], 10) : 18;
            return {
              id: d._id,
              tooth: toothNum,
              timestamp: new Date(d.uploadedAt).toLocaleString('fr-FR'),
              date: dateStr,
              url: getUploadUrl(d.filePath),
              exposureMode: 'Endodontic',
              sensorModel: 'Eighteeth NanoPix 1 (Size 1 - EN1)',
              notes: `Radio RVG Numérique (${d.fileName})`,
            };
          });

          setPatients((prev) =>
            prev.map((p) => {
              if (p.id === selectedPatientId) {
                const realIds = new Set(realStudies.map((rs) => rs.id));
                const filtered = p.studies.filter((s) => !realIds.has(s.id) && !s.id.startsWith('study_'));
                return {
                  ...p,
                  studies: [...realStudies, ...filtered],
                };
              }
              return p;
            })
          );

          if (realStudies.length > 0) {
            setSelectedStudyId(realStudies[0].id);
          }
        }
      })
      .catch(() => {});
  }, [selectedPatientId, token]);

  // Real-time synchronization when a new radiograph is taken by the Eighteeth sensor
  useLiveSync('DOCUMENTS_CHANGED', (payload) => {
    if (payload.data && (payload.data.filePath || payload.data.url)) {
      const doc = payload.data;
      const targetPId = doc.patientId || selectedPatientId;
      const toothNum = doc.tooth || selectedTooth || 18;
      const dateStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toLocaleTimeString('fr-FR');
      const newStudyId = payload.entityId || `rvg_${Date.now()}`;

      const newStudy: StudyImage = {
        id: newStudyId,
        tooth: toothNum,
        timestamp: `${dateStr} ${timeStr}`,
        date: dateStr,
        url: doc.url ? `${BASE_URL}${doc.url}` : getUploadUrl(doc.filePath),
        exposureMode: imageProcessingMode,
        sensorModel: doc.sensorModel || 'Eighteeth NanoPix 1 (Size 1 - EN1)',
        notes: `Radiographie RVG capturée le ${dateStr} à ${timeStr}`,
      };

      setPatients((prev) =>
        prev.map((p) => {
          if (p.id === targetPId) {
            return {
              ...p,
              studies: [newStudy, ...p.studies.filter((s) => s.id !== newStudyId)],
            };
          }
          return p;
        })
      );

      setSelectedPatientId(targetPId);
      setSelectedStudyId(newStudyId);
      setIsWaitingForShot(false);
      setIsExposing(false);
      toast.success(
        'Cliché RVG Reçu !',
        `Nouvelle radiographie importée avec succès (Dent #${toothNum}) depuis le capteur Eighteeth NanoPix.`
      );
      setActiveTab('Viewer');
    }
  });

  // Trigger Real RVG Sensor Acquisition Session
  const handleTriggerAcquisition = async () => {
    if (!selectedPatientId) {
      toast.error('Patient Requis', 'Veuillez sélectionner un patient avant de lancer l\'acquisition.');
      return;
    }

    try {
      setIsExposing(true);
      toast.info(
        'Capteur NanoPix Armé',
        `Prêt pour ${selectedPatient?.name} (Dent #${selectedTooth}). Tirez la radiographie avec le générateur X-Ray...`
      );

      const res = await fetch(`${API_URL}/nanopix/start-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId: selectedPatientId,
          tooth: selectedTooth,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsWaitingForShot(true);
      }
    } catch (err: any) {
      console.warn('Erreur armement session NanoPix:', err);
    } finally {
      setIsExposing(false);
    }
  };

  const handleCancelAcquisition = async () => {
    try {
      await fetch(`${API_URL}/nanopix/cancel-session`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsWaitingForShot(false);
      toast.info('Session Annulée', 'Attente d\'acquisition réinitialisée.');
    } catch {}
  };

  const handleLaunchOfficialApp = async () => {
    try {
      const res = await fetch(`${API_URL}/nanopix/launch-app`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Eighteeth NanoPix', 'Application Eighteeth NanoPix lancée.');
        fetchBridgeStatus();
      } else {
        toast.warning('NanoPix', data.message || 'Impossible de lancer l\'application.');
      }
    } catch {
      toast.error('Erreur', 'Impossible de contacter le serveur local.');
    }
  };

  const handleSimulateShot = () => {
    setIsExposing(true);
    toast.info('Mode Démo', `Simulation d'un tir radio RVG (Dent #${selectedTooth})...`);

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
        sensorModel: 'Eighteeth NanoPix 1 (Simulation)',
        notes: `Cliché RVG Démo IO ${selectedTooth} (${imageProcessingMode})`,
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
      setIsWaitingForShot(false);
      toast.success('Cliché Simulé', `Cliché de démonstration dent #${selectedTooth} créé !`);
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
    toast.info('Réinitialisation', 'Filtres et réglages visuels réinitialisés.');
  };

  // Save Settings handler
  const handleSaveSettings = () => {
    setIsSettingsOpen(false);
    toast.success('Configuration NanoPix', 'Paramètres de l\'environnement Eighteeth enregistrés.');
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
    <div className="nanopix-studio flex flex-col h-full w-full bg-[#0a0f1d] dark:bg-[#03060f] text-slate-100 font-sans select-none overflow-hidden relative print:bg-white print:overflow-visible print:h-auto">
      {/* 1. TOP NANOPIX MENU BAR (File, Tools, Help) */}
      <div ref={menuRef} className="flex items-center justify-between px-3 h-6 bg-[#0e172a] border-b border-[#1e2d4a] text-[11px] text-slate-300 shrink-0 select-none relative z-50 print:hidden">
        <div className="flex items-center gap-1">
          {/* File Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
              className={`px-2.5 py-0.5 rounded cursor-pointer transition-colors ${
                activeMenu === 'file' ? 'bg-[#1864cc] text-white font-bold' : 'hover:bg-[#1e2d4a] hover:text-white'
              }`}
            >
              File
            </button>
            {activeMenu === 'file' && (
              <div className="absolute top-full left-0 mt-0.5 w-44 bg-[#0e172a] border border-[#2a4370] rounded shadow-2xl py-1 z-50">
                <button
                  onClick={() => {
                    setActiveMenu(null);
                    navigate('/dashboard');
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#1864cc] hover:text-white flex justify-between items-center cursor-pointer transition-colors"
                >
                  <span>Close</span>
                  <span className="text-[10px] text-slate-400 font-mono">Alt+F4</span>
                </button>
              </div>
            )}
          </div>

          {/* Tools Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveMenu(activeMenu === 'tools' ? null : 'tools')}
              className={`px-2.5 py-0.5 rounded cursor-pointer transition-colors ${
                activeMenu === 'tools' ? 'bg-[#1864cc] text-white font-bold' : 'hover:bg-[#1e2d4a] hover:text-white'
              }`}
            >
              Tools
            </button>
            {activeMenu === 'tools' && (
              <div className="absolute top-full left-0 mt-0.5 w-40 bg-[#0e172a] border border-[#2a4370] rounded shadow-2xl py-1 z-50">
                <button
                  onClick={() => {
                    setActiveMenu(null);
                    setIsSettingsOpen(true);
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs bg-[#1864cc] text-white font-medium flex justify-between items-center cursor-pointer"
                >
                  <span>Settings</span>
                </button>
              </div>
            )}
          </div>

          {/* Help Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveMenu(activeMenu === 'help' ? null : 'help')}
              className={`px-2.5 py-0.5 rounded cursor-pointer transition-colors ${
                activeMenu === 'help' ? 'bg-[#1864cc] text-white font-bold' : 'hover:bg-[#1e2d4a] hover:text-white'
              }`}
            >
              Help
            </button>
            {activeMenu === 'help' && (
              <div className="absolute top-full left-0 mt-0.5 w-48 bg-[#0e172a] border border-[#2a4370] rounded shadow-2xl py-1 z-50">
                <button
                  onClick={() => {
                    setActiveMenu(null);
                    toast.info('À propos', 'Eighteeth Medical Digital Imaging v3.4.2 - Intégration RVG Dr. Salma Tijini.');
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#1864cc] hover:text-white cursor-pointer"
                >
                  About NanoPix
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
          <span>Eighteeth Medical Digital Imaging v3.4.2</span>
        </div>
      </div>

      {/* 2. TOP EIGHTEETH NANOPIX APPLICATION HEADER */}
      <header className="flex items-center justify-between px-3 h-11 bg-[#09101f] border-b border-[#1a2b4a] z-20 shrink-0 print:hidden">
        <div className="flex items-center gap-5">
          {/* Eighteeth Brand Logo (White Silhouette Tooth inside Eighteeth Wordmark) */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full text-white fill-current">
                <path d="M50,10 C32,10 20,25 20,45 C20,62 28,78 35,90 C38,95 42,95 44,88 C47,78 48,68 50,68 C52,68 53,78 56,88 C58,95 62,95 65,90 C72,78 80,62 80,45 C80,25 68,10 50,10 Z M50,22 C58,22 62,30 62,38 C62,48 56,54 50,54 C44,54 38,48 38,38 C38,30 42,22 50,22 Z" />
              </svg>
            </div>
            <span className="text-base font-black tracking-tight text-white">Eighteeth</span>
          </div>

          {/* 4 MAIN WORKFLOW TABS (Exact Pill Buttons from NanoPix) */}
          <div className="flex items-center bg-[#070b16] p-0.5 rounded-lg border border-[#1e3052] gap-0.5 shadow-inner">
            {(['Patient', 'Acquisition', 'Viewer', 'Report'] as const).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-[#004bb4] shadow font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* Top Right Header: Sensor Hardware Pill & Active Patient Badge */}
        <div className="flex items-center gap-3">
          {/* Hardware Sensor Status Pill */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
              sensorConnected
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-700'
            }`}
            title={sensorConnected ? 'Capteur Eighteeth NanoPix 1 branché et prêt (FTDI Hi-Speed FIFO)' : 'Capteur NanoPix 1 débranché du port USB'}
          >
            <Radio className={`w-3 h-3 ${sensorConnected ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
            <span>{sensorConnected ? 'NanoPix 1 Prêt' : 'Capteur Débranché'}</span>
          </div>

          {/* Launcher Shortcut Button */}
          <button
            onClick={handleLaunchOfficialApp}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border cursor-pointer transition-colors ${
              isAppRunning
                ? 'bg-blue-950/60 text-blue-300 border-blue-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600'
            }`}
            title="Lancer ou basculer sur l'application Eighteeth NanoPix officielle"
          >
            <ExternalLink className="w-2.5 h-2.5" />
            <span>{isAppRunning ? 'Moteur Actif' : 'Lancer NanoPix'}</span>
          </button>

          {selectedPatient ? (
            <div className="text-right flex items-center gap-2 text-xs border-l border-[#1e3052] pl-3">
              <span className="font-mono text-cyan-400 font-bold text-[11px]">{selectedPatient.chartNo}</span>
              <span className="font-bold text-white uppercase">{selectedPatient.name}</span>
              <span className="text-slate-400 font-medium">({selectedPatient.age}Y)</span>
            </div>
          ) : (
            <span className="text-xs text-slate-400 italic">Please select a patient.</span>
          )}
        </div>
      </header>

      {/* 3. SUB-ACTION BAR */}
      <div className="flex items-center justify-between px-3 h-9 bg-[#0b1426] border-b border-[#1a2b4a] text-xs shrink-0 print:hidden">
        {/* Left Sub-tools */}
        <div className="flex items-center gap-2">
          {activeTab === 'Patient' && (
            <div className="flex items-center gap-1.5">
              {/* Button 1: Add Patient */}
              <button
                onClick={() => toast.info('Nouveau Patient', 'Création d\'un nouveau dossier patient.')}
                className="w-7 h-7 bg-[#142340] hover:bg-[#1d335c] rounded border border-[#2a4a80] text-cyan-300 flex items-center justify-center cursor-pointer shadow transition-colors"
                title="Ajouter Patient"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="16" y1="11" x2="22" y2="11" />
                </svg>
              </button>
              {/* Button 2: Search / Filter Patient */}
              <button
                onClick={() => toast.info('Recherche Patient', 'Filtrage et recherche avancée.')}
                className="w-7 h-7 bg-[#142340] hover:bg-[#1d335c] rounded border border-[#2a4a80] text-cyan-300 flex items-center justify-center cursor-pointer shadow transition-colors"
                title="Rechercher Patient"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <circle cx="17" cy="11" r="3" />
                  <line x1="19" y1="13" x2="22" y2="16" />
                </svg>
              </button>
              {/* Button 3: Delete Patient */}
              <button
                onClick={() => toast.warning('Supprimer', 'Supprimer la fiche patient sélectionnée.')}
                className="w-7 h-7 bg-[#142340] hover:bg-[#1d335c] rounded border border-[#2a4a80] text-cyan-300 flex items-center justify-center cursor-pointer shadow transition-colors"
                title="Supprimer Patient"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="17" y1="9" x2="22" y2="14" />
                  <line x1="22" y1="9" x2="17" y2="14" />
                </svg>
              </button>
              {/* Button 4: Patient Medical Card */}
              <button
                onClick={() => toast.info('Carte Patient', 'Affichage de la carte d\'identité médicale du patient.')}
                className="w-7 h-7 bg-[#142340] hover:bg-[#1d335c] rounded border border-[#2a4a80] text-cyan-300 flex items-center justify-center cursor-pointer shadow transition-colors"
                title="Carte Médicale Patient"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <circle cx="8" cy="11" r="2.5" />
                  <line x1="14" y1="9" x2="18" y2="9" />
                  <line x1="14" y1="13" x2="18" y2="13" />
                  <line x1="6" y1="17" x2="10" y2="17" />
                </svg>
              </button>
            </div>
          )}

          {activeTab === 'Acquisition' && (
            <div className="flex items-center gap-1.5">
              <button onClick={() => setRotationAngle((p) => p - 90)} className="w-7 h-7 bg-[#142340] hover:bg-[#1d335c] rounded border border-[#2a4a80] text-slate-200 flex items-center justify-center cursor-pointer" title="Rotation Anti-horaire">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setRotationAngle((p) => p + 90)} className="w-7 h-7 bg-[#142340] hover:bg-[#1d335c] rounded border border-[#2a4a80] text-slate-200 flex items-center justify-center cursor-pointer" title="Rotation Horaire">
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setFlipH((p) => !p)} className="w-7 h-7 bg-[#142340] hover:bg-[#1d335c] rounded border border-[#2a4a80] text-slate-200 flex items-center justify-center cursor-pointer" title="Miroir Horizontal">
                <FlipHorizontal className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setFlipV((p) => !p)} className="w-7 h-7 bg-[#142340] hover:bg-[#1d335c] rounded border border-[#2a4a80] text-slate-200 flex items-center justify-center cursor-pointer" title="Miroir Vertical">
                <FlipVertical className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {activeTab === 'Viewer' && (
            <div className="flex items-center gap-1.5">
              <button onClick={() => setRotationAngle((p) => p - 90)} className="w-7 h-7 bg-[#142340] hover:bg-[#1d335c] rounded border border-[#2a4a80] text-slate-200 flex items-center justify-center cursor-pointer" title="Rotate CCW"><RotateCcw className="w-3.5 h-3.5" /></button>
              <button onClick={() => setRotationAngle((p) => p + 90)} className="w-7 h-7 bg-[#142340] hover:bg-[#1d335c] rounded border border-[#2a4a80] text-slate-200 flex items-center justify-center cursor-pointer" title="Rotate CW"><RotateCw className="w-3.5 h-3.5" /></button>
              <button onClick={() => setFlipH((p) => !p)} className="w-7 h-7 bg-[#142340] hover:bg-[#1d335c] rounded border border-[#2a4a80] text-slate-200 flex items-center justify-center cursor-pointer" title="Flip H"><FlipHorizontal className="w-3.5 h-3.5" /></button>
              <button onClick={() => setFlipV((p) => !p)} className="w-7 h-7 bg-[#142340] hover:bg-[#1d335c] rounded border border-[#2a4a80] text-slate-200 flex items-center justify-center cursor-pointer" title="Flip V"><FlipVertical className="w-3.5 h-3.5" /></button>
              <button onClick={() => setViewerTool('pan')} className={`w-7 h-7 rounded border flex items-center justify-center cursor-pointer ${viewerTool === 'pan' ? 'bg-[#1864cc] text-white border-blue-400' : 'bg-[#142340] text-slate-200 border-[#2a4a80]'}`} title="Pan"><Hand className="w-3.5 h-3.5" /></button>
              <button onClick={() => setViewerTool('zoom')} className={`w-7 h-7 rounded border flex items-center justify-center cursor-pointer ${viewerTool === 'zoom' ? 'bg-[#1864cc] text-white border-blue-400' : 'bg-[#142340] text-slate-200 border-[#2a4a80]'}`} title="Zoom"><ZoomIn className="w-3.5 h-3.5" /></button>
              <button onClick={() => setIsInverted((p) => !p)} className={`w-7 h-7 rounded border flex items-center justify-center cursor-pointer ${isInverted ? 'bg-amber-600 text-white border-amber-400' : 'bg-[#142340] text-slate-200 border-[#2a4a80]'}`} title="Invert"><Sun className="w-3.5 h-3.5" /></button>
              <button onClick={() => setViewerTool('ruler')} className={`w-7 h-7 rounded border flex items-center justify-center cursor-pointer ${viewerTool === 'ruler' ? 'bg-[#1864cc] text-white border-blue-400' : 'bg-[#142340] text-slate-200 border-[#2a4a80]'}`} title="Ruler"><Ruler className="w-3.5 h-3.5" /></button>
              <button onClick={() => setViewerTool('angle')} className={`w-7 h-7 rounded border flex items-center justify-center cursor-pointer ${viewerTool === 'angle' ? 'bg-[#1864cc] text-white border-blue-400' : 'bg-[#142340] text-slate-200 border-[#2a4a80]'}`} title="Angle"><Compass className="w-3.5 h-3.5" /></button>
              <button onClick={() => setViewerTool('draw')} className={`w-7 h-7 rounded border flex items-center justify-center cursor-pointer ${viewerTool === 'draw' ? 'bg-[#1864cc] text-white border-blue-400' : 'bg-[#142340] text-slate-200 border-[#2a4a80]'}`} title="Pen"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => setViewerTool('rect')} className={`w-7 h-7 rounded border flex items-center justify-center cursor-pointer ${viewerTool === 'rect' ? 'bg-[#1864cc] text-white border-blue-400' : 'bg-[#142340] text-slate-200 border-[#2a4a80]'}`} title="Rectangle"><Square className="w-3.5 h-3.5" /></button>
              <button onClick={() => setViewerTool('circle')} className={`w-7 h-7 rounded border flex items-center justify-center cursor-pointer ${viewerTool === 'circle' ? 'bg-[#1864cc] text-white border-blue-400' : 'bg-[#142340] text-slate-200 border-[#2a4a80]'}`} title="Circle"><Circle className="w-3.5 h-3.5" /></button>
              <button onClick={() => setViewerTool('loupe')} className={`w-7 h-7 rounded border flex items-center justify-center cursor-pointer ${viewerTool === 'loupe' ? 'bg-[#1864cc] text-white border-blue-400' : 'bg-[#142340] text-slate-200 border-[#2a4a80]'}`} title="Loupe"><Sparkles className="w-3.5 h-3.5" /></button>
              <button onClick={() => setShowGrid((p) => !p)} className={`w-7 h-7 rounded border flex items-center justify-center cursor-pointer ${showGrid ? 'bg-[#1864cc] text-white border-blue-400' : 'bg-[#142340] text-slate-200 border-[#2a4a80]'}`} title="Grid"><Grid className="w-3.5 h-3.5" /></button>
            </div>
          )}

          {activeTab === 'Report' && (
            <div className="flex items-center gap-1.5">
              {/* Button 1: New Report */}
              <button
                onClick={() => {
                  setReportSelectedStudy(null);
                  setReportDiagnosis('');
                  setIsReportImageSelected(false);
                  setIsReportTextSelected(false);
                  toast.info('Nouveau Rapport', 'Création d\'un nouveau modèle de rapport vierge.');
                }}
                className="w-7 h-7 bg-[#142340] hover:bg-[#1d335c] rounded border border-[#2a4a80] text-cyan-300 flex items-center justify-center cursor-pointer shadow transition-colors"
                title="Nouveau Rapport"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              </button>

              {/* Button 2: Edit Report / Template */}
              <button
                onClick={() => toast.info('Modifier Modèle', 'Mode édition du modèle de rapport activé.')}
                className="w-7 h-7 bg-[#142340] hover:bg-[#1d335c] rounded border border-[#2a4a80] text-cyan-300 flex items-center justify-center cursor-pointer shadow transition-colors"
                title="Modifier Modèle"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <path d="M9 13h6" />
                  <path d="M9 17h6" />
                </svg>
              </button>

              {/* Button 3: Delete Template */}
              <button
                onClick={() => {
                  setReportSelectedStudy(null);
                  setReportDiagnosis('');
                  toast.warning('Supprimer', 'Contenu du rapport réinitialisé.');
                }}
                className="w-7 h-7 bg-[#142340] hover:bg-[#1d335c] rounded border border-[#2a4a80] text-cyan-300 flex items-center justify-center cursor-pointer shadow transition-colors"
                title="Supprimer Modèle / Contenu"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                </svg>
              </button>

              {/* Button 4: Add Image Box */}
              <button
                onClick={() => {
                  setIsReportImageSelected(true);
                  setIsReportTextSelected(false);
                  toast.info('Zone Image', 'Zone de cliché radiologique sélectionnée.');
                }}
                className="w-7 h-7 bg-[#142340] hover:bg-[#1d335c] rounded border border-[#2a4a80] text-cyan-300 flex items-center justify-center cursor-pointer shadow transition-colors"
                title="Ajouter / Sélectionner Cadre Image"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2">
                  <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="2 2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                  <line x1="12" y1="8" x2="12" y2="14" />
                  <line x1="9" y1="11" x2="15" y2="11" />
                </svg>
              </button>

              {/* Button 5: Add Text Box */}
              <button
                onClick={() => {
                  setIsReportTextSelected(true);
                  setIsReportImageSelected(false);
                  toast.info('Zone Texte', 'Zone de texte / diagnostic sélectionnée.');
                }}
                className="w-7 h-7 bg-[#142340] hover:bg-[#1d335c] rounded border border-[#2a4a80] text-cyan-300 flex items-center justify-center cursor-pointer shadow transition-colors"
                title="Ajouter / Sélectionner Cadre Texte"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2">
                  <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="2 2" />
                  <line x1="8" y1="8" x2="16" y2="8" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                </svg>
              </button>

              {/* Button 6: Print (Printer with Tooth Badge) */}
              <button
                onClick={async () => {
                  toast.info('Génération PDF NanoPix', 'Génération du rapport vectoriel en haute définition...');
                  try {
                    await generateNanoPixPDF({
                      patient: {
                        chartNo: selectedPatient?.chartNo || '20260904_191218',
                        name: selectedPatient?.name || 'ali moujahid',
                        gender: selectedPatient?.gender || 'Male',
                        birthDate: selectedPatient?.birthDate || '2026-09-04',
                        age: selectedPatient?.age || 0,
                      },
                      studyUrl: reportSelectedStudy?.url,
                      tooth: reportSelectedStudy?.tooth || 18,
                      timestamp: reportSelectedStudy?.timestamp,
                      diagnosis: reportDiagnosis,
                      orientation: settingReportOrientation.toLowerCase() as any,
                      paperSize: settingReportPaperSize,
                      showHeader: settingReportHeaderDisplay === 'On',
                      showFooter: settingReportFooterDisplay === 'On',
                      action: 'print',
                    });
                    toast.success('Rapport Prêt', 'PDF vectoriel Eighteeth NanoPix prêt pour impression.');
                  } catch (err) {
                    console.error('PDF error:', err);
                    toast.error('Erreur PDF', 'Impossible de générer le fichier PDF.');
                  }
                }}
                className="w-7 h-7 bg-[#142340] hover:bg-[#1d335c] rounded border border-[#2a4a80] text-cyan-300 flex items-center justify-center cursor-pointer shadow transition-colors relative"
                title="Print"
              >
                <div className="flex items-center justify-center relative">
                  <Printer className="w-3.5 h-3.5 text-white" />
                  <span className="absolute -bottom-1 -right-1 text-[7px] font-bold bg-[#1864cc] text-white rounded-xs px-0.5 leading-none">🦷</span>
                </div>
              </button>

              {/* Button 7: Print Setting (Printer with Gear Badge) */}
              <button
                onClick={() => setIsPrinterSettingsOpen(true)}
                className="w-7 h-7 bg-[#142340] hover:bg-[#1d335c] rounded border border-[#2a4a80] text-cyan-300 flex items-center justify-center cursor-pointer shadow transition-colors relative"
                title="Print Setting"
              >
                <div className="flex items-center justify-center relative">
                  <Printer className="w-3.5 h-3.5 text-white" />
                  <span className="absolute -bottom-1 -right-1 text-[7px] font-bold bg-[#1864cc] text-white rounded-xs px-0.5 leading-none">⚙</span>
                </div>
              </button>

              {/* Button 8: Fit Width */}
              <button
                onClick={() => {
                  setReportZoomScale(1.15);
                  toast.info('Ajuster', 'Ajuster à la largeur de l\'écran.');
                }}
                className="w-7 h-7 bg-[#142340] hover:bg-[#1d335c] rounded border border-[#2a4a80] text-cyan-300 flex items-center justify-center cursor-pointer shadow transition-colors"
                title="Ajuster Largeur"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2">
                  <line x1="3" y1="4" x2="3" y2="20" />
                  <line x1="21" y1="4" x2="21" y2="20" />
                  <polyline points="8 9 5 12 8 15" />
                  <polyline points="16 9 19 12 16 15" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>

              {/* Button 9: Fit Height */}
              <button
                onClick={() => {
                  setReportZoomScale(0.9);
                  toast.info('Ajuster', 'Ajuster à la hauteur de l\'écran.');
                }}
                className="w-7 h-7 bg-[#142340] hover:bg-[#1d335c] rounded border border-[#2a4a80] text-cyan-300 flex items-center justify-center cursor-pointer shadow transition-colors"
                title="Ajuster Hauteur"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2">
                  <line x1="4" y1="3" x2="20" y2="3" />
                  <line x1="4" y1="21" x2="20" y2="21" />
                  <polyline points="9 8 12 5 15 8" />
                  <polyline points="9 16 12 19 15 16" />
                  <line x1="12" y1="5" x2="12" y2="19" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Right Sub-tools */}
        <div className="flex items-center gap-3">
          {activeTab === 'Patient' && (
            <div ref={dateDropdownRef} className="relative flex items-center gap-2">
              <label
                onClick={() => {
                  setTempDateFilter(dateFilter);
                  setIsDateDropdownOpen((p) => !p);
                }}
                className="flex items-center gap-1.5 cursor-pointer select-none"
              >
                <div className="w-3.5 h-3.5 rounded-full border border-blue-400 bg-blue-500 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
                <span className="text-xs text-slate-300 font-medium">Date</span>
              </label>

              {/* Dropdown Button */}
              <button
                onClick={() => {
                  setTempDateFilter(dateFilter);
                  setIsDateDropdownOpen((p) => !p);
                }}
                className="bg-[#132038] hover:bg-[#192b4c] border border-[#264478] text-white text-xs px-2.5 py-0.5 rounded flex items-center justify-between gap-2 cursor-pointer shadow transition-colors min-w-[110px]"
              >
                <span className="truncate">{dateFilter}</span>
                <div className="w-4 h-4 bg-[#1864cc] rounded-xs flex items-center justify-center pointer-events-none -mr-1">
                  <ChevronDown className="w-3 h-3 text-white" />
                </div>
              </button>

              {/* Dropdown Popup Modal (Exact match to Screenshot) */}
              {isDateDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 w-64 bg-[#0e172a] border border-[#264478] rounded-md shadow-2xl p-3 z-50 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-100">
                  {/* Radio options list */}
                  <div className="flex flex-col gap-1.5">
                    {(['All Dates', 'Today', 'Yesterday', 'Three Days', 'Last Week', 'Last Month', 'Three Months'] as const).map((opt) => {
                      const isSelected = tempDateFilter === opt;
                      return (
                        <label
                          key={opt}
                          onClick={() => setTempDateFilter(opt)}
                          className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-200 hover:text-white select-none py-0.5"
                        >
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-blue-400 bg-blue-500' : 'border-[#2a4570] bg-[#09101d]'}`}>
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <span>{opt}</span>
                        </label>
                      );
                    })}

                    {/* Custom Date Range Option */}
                    <div className="flex flex-col gap-1.5 pt-1">
                      <div className="flex items-center gap-2.5">
                        <label
                          onClick={() => setTempDateFilter('Custom')}
                          className="flex items-center gap-2.5 cursor-pointer select-none"
                        >
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${tempDateFilter === 'Custom' ? 'border-blue-400 bg-blue-500' : 'border-[#2a4570] bg-[#09101d]'}`}>
                            {tempDateFilter === 'Custom' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </label>

                        {/* Row 1: Start Date [ 2026 ] [ 10 ] [ 03 ] */}
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={customStartYear}
                            onChange={(e) => setCustomStartYear(e.target.value)}
                            className="w-14 bg-[#132038] border border-[#264478] rounded px-1.5 py-0.5 text-center text-xs text-white focus:outline-none focus:border-blue-400 font-mono"
                          />
                          <input
                            type="text"
                            value={customStartMonth}
                            onChange={(e) => setCustomStartMonth(e.target.value)}
                            className="w-9 bg-[#132038] border border-[#264478] rounded px-1 py-0.5 text-center text-xs text-white focus:outline-none focus:border-blue-400 font-mono"
                          />
                          <input
                            type="text"
                            value={customStartDay}
                            onChange={(e) => setCustomStartDay(e.target.value)}
                            className="w-9 bg-[#132038] border border-[#264478] rounded px-1 py-0.5 text-center text-xs text-white focus:outline-none focus:border-blue-400 font-mono"
                          />
                        </div>
                      </div>

                      {/* Row 2: ~ [ 2026 ] [ 10 ] [ 03 ] */}
                      <div className="flex items-center gap-2.5 pl-6">
                        <span className="text-slate-400 font-bold -ml-4">~</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={customEndYear}
                            onChange={(e) => setCustomEndYear(e.target.value)}
                            className="w-14 bg-[#132038] border border-[#264478] rounded px-1.5 py-0.5 text-center text-xs text-white focus:outline-none focus:border-blue-400 font-mono"
                          />
                          <input
                            type="text"
                            value={customEndMonth}
                            onChange={(e) => setCustomEndMonth(e.target.value)}
                            className="w-9 bg-[#132038] border border-[#264478] rounded px-1 py-0.5 text-center text-xs text-white focus:outline-none focus:border-blue-400 font-mono"
                          />
                          <input
                            type="text"
                            value={customEndDay}
                            onChange={(e) => setCustomEndDay(e.target.value)}
                            className="w-9 bg-[#132038] border border-[#264478] rounded px-1 py-0.5 text-center text-xs text-white focus:outline-none focus:border-blue-400 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#1a2d4c] mt-1">
                    <button
                      onClick={() => {
                        setDateFilter(tempDateFilter);
                        setIsDateDropdownOpen(false);
                        toast.info('Filtre Date', `Filtre appliqué : ${tempDateFilter}`);
                      }}
                      className="flex-1 py-1 bg-[#1864cc] hover:bg-blue-600 rounded text-xs text-white font-bold cursor-pointer transition-colors shadow"
                    >
                      Search
                    </button>
                    <button
                      onClick={() => setIsDateDropdownOpen(false)}
                      className="flex-1 py-1 bg-[#1b3254] hover:bg-[#254675] border border-[#2a4e7e] rounded text-xs text-white font-medium cursor-pointer transition-colors shadow"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'Acquisition' && (
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${sensorConnected ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'}`} />
              <span className="text-xs font-mono text-slate-300">{sensorConnected ? 'Ready for Exposure' : 'Offline'}</span>
            </div>
          )}
        </div>
      </div>

      {/* 4. MAIN VIEWPORT (Patient | Acquisition | Viewer | Report) */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* ========================================================================= */}
        {/* TAB 1: PATIENT MANAGER MODULE (Exact Match to Screenshots 1, 2, 3)         */}
        {/* ========================================================================= */}
        {activeTab === 'Patient' && (
          <div className="flex-1 flex overflow-hidden min-h-0 bg-black">
            {/* Left Panel: Search & Patient Info & Table (Screenshot 1) */}
            <div className="w-[380px] bg-[#070b16] border-r border-[#1a2b4a] flex flex-col justify-between p-2.5 shrink-0 overflow-y-auto no-scrollbar gap-2">
              {/* Top Search Controls */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SEARCH</span>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="flex-1 bg-[#0e172a] border border-[#2a4370] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-400"
                  />
                  <button
                    onClick={() => toast.info('Ajouter un filtre', 'Filtre de recherche avancé.')}
                    className="px-2.5 py-1 bg-[#142340] hover:bg-[#1d335c] rounded text-white text-xs border border-[#2a4370] cursor-pointer font-bold"
                  >
                    +
                  </button>
                  <button
                    onClick={() => toast.info('Recherche', `Recherche de patients : ${searchQuery || 'Tous'}`)}
                    className="px-3.5 py-1 bg-[#1864cc] hover:bg-blue-600 rounded text-white text-xs font-semibold cursor-pointer shadow"
                  >
                    Search
                  </button>
                </div>

                {/* Quick Search */}
                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">QUICK SEARCH</span>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => toast.info('Récents', 'Affichage des clichés récemment acquis.')}
                      className="w-full py-1 px-3 text-left rounded bg-[#0e172a] hover:bg-[#142340] border border-[#2a4370] text-xs text-slate-200 font-medium transition-all cursor-pointer"
                    >
                      Recently Acquired
                    </button>
                    <button
                      onClick={() => toast.info('Impression', 'Affichage des rapports récemment imprimés.')}
                      className="w-full py-1 px-3 text-left rounded bg-[#0e172a] hover:bg-[#142340] border border-[#2a4370] text-xs text-slate-200 font-medium transition-all cursor-pointer"
                    >
                      Recently Printed
                    </button>
                  </div>
                </div>

                {/* Selected Patient Detail Box (Exact Match to Screenshot 1) */}
                {selectedPatient && (
                  <div className="bg-[#0e172a] border border-[#2a4370] rounded p-2 flex flex-col gap-1.5 mt-1">
                    <div className="flex items-start gap-2.5">
                      <div className="w-12 h-12 rounded-full bg-[#d0d7e2] border border-white/20 shrink-0 flex items-center justify-center font-bold text-slate-800 text-base shadow">
                        {selectedPatient.name.charAt(0).toUpperCase()}
                      </div>
                      <table className="flex-1 text-[11px] text-slate-300 border-collapse">
                        <tbody>
                          <tr className="border-b border-[#1c2e4f]">
                            <td className="py-0.5 text-slate-400 font-semibold w-24">Chart No.</td>
                            <td className="py-0.5 font-mono font-bold text-cyan-400">{selectedPatient.chartNo}</td>
                          </tr>
                          <tr className="border-b border-[#1c2e4f]">
                            <td className="py-0.5 text-slate-400 font-semibold">Name</td>
                            <td className="py-0.5 uppercase font-bold text-white truncate max-w-[140px]">{selectedPatient.name}</td>
                          </tr>
                          <tr className="border-b border-[#1c2e4f]">
                            <td className="py-0.5 text-slate-400 font-semibold">Gender/Age</td>
                            <td className="py-0.5">{selectedPatient.gender} / {selectedPatient.age}Y</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-400 font-semibold">Date of Birth</td>
                            <td className="py-0.5 font-mono">{selectedPatient.birthDate}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => setActiveTab('Viewer')}
                        className="px-4 py-1 bg-[#1864cc] hover:bg-blue-600 text-white rounded text-xs font-bold cursor-pointer transition-all shadow"
                      >
                        Show Detail
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Patient List Table Container */}
              <div className="flex-1 min-h-[140px] bg-[#0e172a] border border-[#2a4370] rounded overflow-hidden flex flex-col mt-1">
                <div className="overflow-y-auto flex-1 no-scrollbar">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#070b16] text-slate-400 font-bold sticky top-0 border-b border-[#2a4370]">
                      <tr>
                        <th className="py-1.5 px-2 font-semibold">Chart No.</th>
                        <th className="py-1.5 px-2 font-semibold">▲ Name</th>
                        <th className="py-1.5 px-2 font-semibold">Date of Birth</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#182845]">
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
                                isSelected
                                  ? 'bg-[#1864cc] text-white font-bold'
                                  : 'hover:bg-white/5 text-slate-300'
                              }`}
                            >
                              <td className="py-1.5 px-2 font-mono">{p.chartNo}</td>
                              <td className="py-1.5 px-2 uppercase truncate max-w-[110px]">{p.name}</td>
                              <td className="py-1.5 px-2 font-mono text-slate-400">{p.birthDate}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Side: Date-Grouped Study Gallery & Bottom Zoom Bar (Screenshots 1, 2, 3) */}
            <div className="flex-1 bg-black flex flex-col justify-between overflow-hidden min-h-0 relative">
              {/* Studies Gallery Workspace */}
              <div className="flex-1 p-3 overflow-y-auto no-scrollbar flex flex-col gap-4">
                {selectedPatient && selectedPatient.studies && selectedPatient.studies.length > 0 ? (
                  // Group studies by date according to dateFilter
                  Object.entries(
                    selectedPatient.studies
                      .filter((study) => {
                        if (dateFilter === 'All Dates') return true;
                        const studyDate = new Date(study.date || '2026-09-04');
                        const now = new Date('2026-10-03');
                        const diffDays = Math.floor((now.getTime() - studyDate.getTime()) / (1000 * 3600 * 24));
                        if (dateFilter === 'Today') return diffDays <= 0;
                        if (dateFilter === 'Yesterday') return diffDays <= 1;
                        if (dateFilter === 'Three Days') return diffDays <= 3;
                        if (dateFilter === 'Last Week') return diffDays <= 7;
                        if (dateFilter === 'Last Month') return diffDays <= 30;
                        if (dateFilter === 'Three Months') return diffDays <= 90;
                        if (dateFilter === 'Custom') {
                          const start = new Date(`${customStartYear}-${customStartMonth.padStart(2, '0')}-${customStartDay.padStart(2, '0')}`);
                          const end = new Date(`${customEndYear}-${customEndMonth.padStart(2, '0')}-${customEndDay.padStart(2, '0')}`);
                          return studyDate >= start && studyDate <= end;
                        }
                        return true;
                      })
                      .reduce((acc, study) => {
                        const d = study.date || '2026-09-04';
                        if (!acc[d]) acc[d] = [];
                        acc[d].push(study);
                        return acc;
                      }, {} as Record<string, StudyImage[]>)
                  ).map(([date, studies]) => (
                    <div key={date} className="flex flex-col gap-2">
                      {/* Date Group Header Bar (Screenshots 1, 2, 3) */}
                      <div className="bg-[#2a2d34] border border-[#383d47] text-slate-200 text-xs px-3 py-1 font-mono font-medium rounded-xs shadow-xs">
                        {date}
                      </div>

                      {/* Radiograph Thumbnails Grid */}
                      <div className="flex flex-wrap gap-3 pl-1 pt-1">
                        {studies.map((st) => {
                          const isSelected = st.id === selectedStudyId;
                          const thumbWidth = patientThumbnailZoom;
                          const thumbHeight = Math.round(patientThumbnailZoom * 0.75);

                          return (
                            <div
                              key={st.id}
                              onClick={() => setSelectedStudyId(st.id)}
                              onDoubleClick={() => setActiveTab('Viewer')}
                              style={{ width: `${thumbWidth}px`, height: `${thumbHeight}px` }}
                              className={`bg-black rounded-xs overflow-hidden cursor-pointer transition-all flex items-center justify-center relative select-none ${
                                isSelected
                                  ? 'border-2 border-[#2b7fff] shadow-lg shadow-blue-500/20 ring-1 ring-blue-400'
                                  : 'border border-[#263147] hover:border-slate-400 opacity-90 hover:opacity-100'
                              }`}
                            >
                              <img
                                src={st.url}
                                alt="Radiograph Thumbnail"
                                className="w-full h-full object-cover grayscale contrast-125 brightness-95 pointer-events-none"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2">
                    <Grid className="w-12 h-12 opacity-30" />
                    <span className="text-xs">Aucun cliché radiologique pour ce patient.</span>
                    <button
                      onClick={() => setActiveTab('Acquisition')}
                      className="px-3 py-1 bg-[#1864cc] hover:bg-blue-600 text-white rounded text-xs font-semibold cursor-pointer shadow"
                    >
                      + Prendre un cliché RVG
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom Zoom & Thumbnail Slider Bar (Screenshots 1, 2, 3) */}
              <div className="h-10 bg-[#070b14] border-t border-[#1a2b4a] px-3 flex items-center justify-between gap-3 shrink-0">
                {/* Left: Zoom Out / Small Grid Button */}
                <button
                  onClick={() => setPatientThumbnailZoom((z) => Math.max(70, z - 25))}
                  className="w-6 h-6 bg-[#1864cc] hover:bg-blue-600 rounded flex items-center justify-center text-white cursor-pointer shadow transition-colors"
                  title="Réduire les vignettes"
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>

                {/* Center: Interactive Zoom / Size Slider */}
                <div className="flex-1 max-w-2xl h-5 bg-[#0b1426] border border-[#1a2d4c] rounded px-1 flex items-center relative shadow-inner">
                  <input
                    type="range"
                    min="70"
                    max="240"
                    value={patientThumbnailZoom}
                    onChange={(e) => setPatientThumbnailZoom(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer h-2 bg-transparent"
                    title={`Taille des vignettes: ${patientThumbnailZoom}px`}
                  />
                </div>

                {/* Right: Zoom In / Large Grid Button */}
                <button
                  onClick={() => setPatientThumbnailZoom((z) => Math.min(240, z + 25))}
                  className="w-6 h-6 bg-[#1864cc] hover:bg-blue-600 rounded flex items-center justify-center text-white cursor-pointer shadow transition-colors"
                  title="Agrandir les vignettes"
                >
                  <Scan className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}

        {/* ========================================================================= */}
        {/* TAB 2: ACQUISITION MODULE                                                 */}
        {/* ========================================================================= */}
        {activeTab === 'Acquisition' && (
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Left Controls */}
            <div className="w-56 bg-[#070b16] border-r border-[#1a2b4a] p-2.5 flex flex-col justify-between shrink-0 overflow-y-auto no-scrollbar gap-2 text-xs">
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">NEW STUDY</span>
                  <select
                    value={studyType}
                    onChange={(e) => setStudyType(e.target.value)}
                    className="bg-[#0e172a] border border-[#2a4370] text-white text-xs px-2 py-1 rounded focus:outline-none"
                  >
                    <option>IO Sensor</option>
                    <option>Bitewing</option>
                    <option>Panoramic</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TEETH LAYOUT</span>
                  <select
                    value={teethLayout}
                    onChange={(e) => setTeethLayout(e.target.value as any)}
                    className="bg-[#0e172a] border border-[#2a4370] text-white text-xs px-2 py-1 rounded focus:outline-none"
                  >
                    <option value="Adult">Adult</option>
                    <option value="Child">Child</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 pt-2 border-t border-[#1a2b4a]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">IMAGE PROCESSING</span>
                  <select
                    value={imageProcessingMode}
                    onChange={(e) => setImageProcessingMode(e.target.value as any)}
                    className="bg-[#0e172a] border border-[#2a4370] text-cyan-400 font-bold text-xs px-2 py-1 rounded focus:outline-none"
                  >
                    <option value="Endodontic">Endodontic</option>
                    <option value="Periodontic">Periodontic</option>
                    <option value="Caries">Caries</option>
                    <option value="Standard">Standard</option>
                  </select>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">Smart Contrast</span>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setSmartContrastLevel((p) => Math.max(1, p - 1))} className="w-5 h-5 rounded bg-[#142340] text-white font-bold flex items-center justify-center text-xs">-</button>
                      <span className="w-4 text-center font-bold text-cyan-400 text-xs">{smartContrastLevel}</span>
                      <button onClick={() => setSmartContrastLevel((p) => Math.min(5, p + 1))} className="w-5 h-5 rounded bg-[#142340] text-white font-bold flex items-center justify-center text-xs">+</button>
                    </div>
                  </div>

                  <button
                    onClick={() => setSmartSharpen((p) => !p)}
                    className={`w-full py-1 text-xs font-semibold rounded border cursor-pointer ${
                      smartSharpen ? 'bg-[#1864cc] text-white border-blue-400' : 'bg-[#0e172a] text-slate-300 border-[#2a4370]'
                    }`}
                  >
                    Smart Sharpen
                  </button>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setIsSmoothed((p) => !p)}
                      className={`py-1 text-[10px] font-semibold rounded border cursor-pointer ${
                        isSmoothed ? 'bg-[#1864cc] text-white border-blue-400' : 'bg-[#0e172a] text-slate-300 border-[#2a4370]'
                      }`}
                    >
                      Smooth
                    </button>
                    <button
                      onClick={() => setIsInverted((p) => !p)}
                      className={`py-1 text-[10px] font-semibold rounded border cursor-pointer ${
                        isInverted ? 'bg-amber-600 text-white border-amber-400' : 'bg-[#0e172a] text-slate-300 border-[#2a4370]'
                      }`}
                    >
                      Inverse
                    </button>
                  </div>

                  <button
                    onClick={handleResetFilters}
                    className="w-full py-1 text-xs text-slate-300 bg-[#0e172a] hover:bg-[#142340] border border-[#2a4370] rounded cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Trigger Button & Status Controls */}
              <div className="flex flex-col gap-1.5 shrink-0">
                <button
                  onClick={handleTriggerAcquisition}
                  disabled={isExposing || isWaitingForShot}
                  className={`w-full py-2.5 rounded-lg font-bold text-xs shadow cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                    isWaitingForShot
                      ? 'bg-emerald-600 text-white animate-pulse'
                      : 'bg-[#1864cc] hover:bg-blue-600 text-white'
                  }`}
                >
                  <Camera className={`w-4 h-4 ${isExposing ? 'animate-spin' : ''}`} />
                  <span>
                    {isWaitingForShot
                      ? 'Capteur Armé (Tirez la radio)'
                      : isExposing
                      ? 'Exposition...'
                      : `Acquérir Dent #${selectedTooth}`}
                  </span>
                </button>

                {isWaitingForShot && (
                  <button
                    onClick={handleCancelAcquisition}
                    className="w-full py-1 text-[11px] bg-red-950/60 hover:bg-red-900/80 border border-red-500/40 text-red-200 rounded font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <X className="w-3 h-3" />
                    <span>Annuler l'attente</span>
                  </button>
                )}

                <button
                  onClick={handleSimulateShot}
                  className="w-full py-1 text-[10px] text-slate-400 hover:text-slate-200 bg-[#070b16] hover:bg-[#101b30] border border-[#1a2b4a] rounded flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  title="Simuler un cliché si le capteur physique n'est pas branché"
                >
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Test Tir Démo (Sans Capteur)</span>
                </button>
              </div>
            </div>

            {/* Central Area: Live View & Bottom FDI Teeth Grid */}
            <div className="flex-1 flex flex-col bg-black justify-between overflow-hidden min-h-0">
              <div className="flex-1 flex items-center justify-center p-3 relative min-h-0 overflow-hidden">
                {isWaitingForShot ? (
                  <div className="flex flex-col items-center gap-4 p-8 bg-[#070b16]/95 border border-cyan-500/50 rounded-2xl max-w-md text-center shadow-2xl animate-pulse">
                    <div className="w-16 h-16 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center">
                      <Radio className="w-8 h-8 text-cyan-400 animate-spin" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                        <span className="text-sm font-extrabold text-white tracking-wide uppercase">Capteur NanoPix 1 Armé</span>
                      </div>
                      <p className="text-xs text-cyan-200">
                        Patient : <strong className="text-white">{selectedPatient?.name}</strong> • <strong>Dent #{selectedTooth}</strong>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-2">
                        Positionnez le capteur RVG et déclenchez votre générateur de rayons X. Le cliché sera automatiquement importé et affiché ici.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={handleLaunchOfficialApp}
                        className="px-3 py-1.5 text-xs bg-[#142340] hover:bg-[#1d3560] text-cyan-300 border border-cyan-500/40 rounded-lg flex items-center gap-1.5 font-semibold cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Ouvrir Eighteeth NanoPix</span>
                      </button>
                      <button
                        onClick={handleCancelAcquisition}
                        className="px-3 py-1.5 text-xs bg-red-950/60 hover:bg-red-900/80 text-red-200 border border-red-500/40 rounded-lg flex items-center gap-1.5 font-semibold cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Annuler</span>
                      </button>
                    </div>
                  </div>
                ) : isExposing ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full border-3 border-cyan-400 border-t-transparent animate-spin flex items-center justify-center">
                      <Scan className="w-5 h-5 text-cyan-400 animate-pulse" />
                    </div>
                    <span className="text-xs font-bold text-white">Traitement du cliché...</span>
                  </div>
                ) : (
                  <div className="max-h-[35vh] aspect-[4/3] w-auto max-w-[420px] bg-black rounded-xl border border-[#1a2b4a] overflow-hidden relative flex items-center justify-center shadow-2xl">
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
                    <div className="absolute top-2 left-2 bg-black/80 px-2 py-0.5 rounded text-[9px] font-mono text-cyan-400 border border-white/15">
                      IO {selectedTooth} • {selectedPatient?.name}
                    </div>
                  </div>
                )}
              </div>

              {/* Teeth Selector */}
              <div className="bg-[#070b16] border-t border-[#1a2b4a] px-3 py-2 flex flex-col gap-1 shrink-0">
                <div className="flex items-center justify-center gap-1 overflow-x-auto no-scrollbar">
                  {upperAdultTeeth.map((tooth, idx) => {
                    const isSelected = tooth === selectedTooth;
                    const tag = idx < 8 ? `R${8 - idx}` : `L${idx - 7}`;
                    return (
                      <button
                        key={tooth}
                        onClick={() => setSelectedTooth(tooth)}
                        className={`w-[28px] h-[32px] rounded-md flex flex-col items-center justify-between p-0.5 border text-[8px] font-bold cursor-pointer transition-all shrink-0 ${
                          isSelected
                            ? 'bg-[#1864cc] text-white border-blue-400 shadow'
                            : 'bg-[#0e172a] text-slate-300 border-[#2a4370] hover:bg-[#142340]'
                        }`}
                      >
                        <span>{tooth}</span>
                        <div className={`w-2 h-2.5 rounded-t-xs ${isSelected ? 'bg-cyan-200' : 'bg-slate-500'}`} />
                        <span className="text-[6.5px] opacity-70 font-mono">{tag}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-center gap-1 overflow-x-auto no-scrollbar">
                  {lowerAdultTeeth.map((tooth, idx) => {
                    const isSelected = tooth === selectedTooth;
                    const tag = idx < 8 ? `R${8 - idx}` : `L${idx - 7}`;
                    return (
                      <button
                        key={tooth}
                        onClick={() => setSelectedTooth(tooth)}
                        className={`w-[28px] h-[32px] rounded-md flex flex-col items-center justify-between p-0.5 border text-[8px] font-bold cursor-pointer transition-all shrink-0 ${
                          isSelected
                            ? 'bg-[#1864cc] text-white border-blue-400 shadow'
                            : 'bg-[#0e172a] text-slate-300 border-[#2a4370] hover:bg-[#142340]'
                        }`}
                      >
                        <span className="text-[6.5px] opacity-70 font-mono">{tag}</span>
                        <div className={`w-2 h-2.5 rounded-b-xs ${isSelected ? 'bg-cyan-200' : 'bg-slate-500'}`} />
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
        {/* TAB 3: VIEWER MODULE                                                      */}
        {/* ========================================================================= */}
        {activeTab === 'Viewer' && (
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Left Adjustment Sidebar */}
            <div className="w-56 bg-[#070b16] border-r border-[#1a2b4a] p-2.5 flex flex-col gap-2.5 shrink-0 overflow-y-auto no-scrollbar text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">IMAGE PROCESSING</span>
              <select
                value={imageProcessingMode}
                onChange={(e) => setImageProcessingMode(e.target.value as any)}
                className="bg-[#0e172a] border border-[#2a4370] text-cyan-400 font-bold text-xs px-2 py-1 rounded focus:outline-none"
              >
                <option value="Endodontic">Endodontic</option>
                <option value="Periodontic">Periodontic</option>
                <option value="Caries">Caries</option>
                <option value="Standard">Standard</option>
              </select>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Smart Contrast</span>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setSmartContrastLevel((p) => Math.max(1, p - 1))} className="w-5 h-5 rounded bg-[#142340] text-white font-bold flex items-center justify-center text-xs">-</button>
                  <span className="w-4 text-center font-bold text-cyan-400 text-xs">{smartContrastLevel}</span>
                  <button onClick={() => setSmartContrastLevel((p) => Math.min(5, p + 1))} className="w-5 h-5 rounded bg-[#142340] text-white font-bold flex items-center justify-center text-xs">+</button>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-[#1a2b4a]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">BRIGHTNESS & CONTRAST</span>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Brightness</span>
                    <span className="font-mono text-white">{brightness} %</span>
                  </div>
                  <input type="range" min="-50" max="50" value={brightness} onChange={(e) => setBrightness(parseInt(e.target.value, 10))} className="w-full accent-blue-500 h-1.5 bg-[#0e172a] rounded cursor-pointer" />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Contrast</span>
                    <span className="font-mono text-white">{contrast} %</span>
                  </div>
                  <input type="range" min="-50" max="50" value={contrast} onChange={(e) => setContrast(parseInt(e.target.value, 10))} className="w-full accent-blue-500 h-1.5 bg-[#0e172a] rounded cursor-pointer" />
                </div>
              </div>

              <div className="p-2.5 bg-[#0e172a] border border-[#2a4370] rounded text-xs flex flex-col gap-1 mt-auto">
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
                  className="rounded-lg object-contain max-h-[70vh] shadow-2xl"
                />

                <div className="absolute top-2 left-2 text-[11px] font-mono font-bold text-slate-200 drop-shadow-md">
                  {selectedStudy?.timestamp || '2026-09-04 19:14:29'} IO {selectedStudy?.tooth || 18}
                </div>

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

            {/* Right Series Strip */}
            <div className="w-40 bg-[#070b16] border-l border-[#1a2b4a] p-2 flex flex-col gap-2 shrink-0 overflow-y-auto no-scrollbar">
              {selectedPatient?.studies.map((study) => (
                <div
                  key={study.id}
                  onClick={() => setSelectedStudyId(study.id)}
                  className={`rounded-lg border overflow-hidden cursor-pointer transition-all shadow ${
                    study.id === selectedStudyId ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-[#2a4370]'
                  }`}
                >
                  <div className="h-20 bg-black">
                    <img src={study.url} alt="Series" className="w-full h-full object-cover grayscale" />
                  </div>
                  <div className="p-1 bg-[#0e172a] text-[9px] font-mono text-slate-300 truncate">
                    {study.timestamp} IO {study.tooth}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: REPORT MODULE (Exact Match to Screenshots 1, 2, 3)                */}
        {/* ========================================================================= */}
        {activeTab === 'Report' && (
          <div className="flex-1 flex overflow-hidden min-h-0 bg-black print:bg-white print:overflow-visible print:block">
            {/* 1. LEFT SIDEBAR: Search, Template Selector & History (Screenshots 1, 2, 3) */}
            <div className="w-56 bg-[#070b16] border-r border-[#1a2b4a] p-2.5 flex flex-col gap-3 shrink-0 overflow-y-auto no-scrollbar select-none print:hidden">
              {/* SEARCH BLOCK */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SEARCH</span>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={reportSearchQuery}
                    onChange={(e) => setReportSearchQuery(e.target.value)}
                    placeholder=""
                    className="flex-1 bg-[#0e172a] border border-[#2a4370] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-400 font-medium"
                  />
                  <button
                    onClick={() => toast.info('Recherche Avancée', 'Critères de filtre de rapport.')}
                    className="px-2.5 py-1 bg-[#142340] hover:bg-[#1d335c] rounded text-white text-xs border border-[#2a4370] cursor-pointer font-bold"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => toast.info('Recherche', 'Recherche de rapports et modèles.')}
                  className="w-full py-1 bg-[#1864cc] hover:bg-blue-600 rounded text-white text-xs font-bold cursor-pointer shadow transition-colors"
                >
                  Search
                </button>
              </div>

              {/* TEMPLATE DROPDOWN BLOCK */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TEMPLATE</span>
                <div className="relative w-full">
                  <select
                    value={reportTemplate}
                    onChange={(e) => {
                      setReportTemplate(e.target.value as any);
                      toast.info('Modèle', `Modèle sélectionné : ${e.target.value}`);
                    }}
                    className="w-full bg-[#132038] border border-[#264478] rounded text-white text-xs px-2.5 py-1 focus:outline-none focus:border-blue-400 appearance-none cursor-pointer pr-8 font-medium shadow"
                  >
                    <option value="Template A">Template A</option>
                    <option value="Template B">Template B</option>
                    <option value="Template C">Template C</option>
                  </select>
                  <div className="absolute right-0 top-0 bottom-0 w-7 bg-[#1864cc] rounded-r flex items-center justify-center pointer-events-none">
                    <ChevronDown className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
              </div>

              {/* REPORT HISTORY BLOCK */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">REPORT HISTORY</span>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={async () => {
                      toast.info('Sauvegarde', 'Enregistrement du rapport NanoPix en cours...');
                      try {
                        await generateNanoPixPDF({
                          patient: {
                            chartNo: selectedPatient?.chartNo || '20260904_191218',
                            name: selectedPatient?.name || 'ali moujahid',
                            gender: selectedPatient?.gender || 'Male',
                            birthDate: selectedPatient?.birthDate || '2026-09-04',
                            age: selectedPatient?.age || 0,
                          },
                          studyUrl: reportSelectedStudy?.url,
                          tooth: reportSelectedStudy?.tooth || 18,
                          timestamp: reportSelectedStudy?.timestamp,
                          diagnosis: reportDiagnosis,
                          orientation: settingReportOrientation.toLowerCase() as any,
                          paperSize: settingReportPaperSize,
                          showHeader: settingReportHeaderDisplay === 'On',
                          showFooter: settingReportFooterDisplay === 'On',
                          action: 'download',
                        });
                        toast.success('Rapport Sauvegardé', 'Fichier PDF vectoriel enregistré.');
                      } catch (err) {
                        console.error('PDF error:', err);
                        toast.error('Erreur', 'Impossible d\'enregistrer le fichier PDF.');
                      }
                    }}
                    className="w-full py-1.5 bg-[#1864cc] hover:bg-blue-600 rounded text-xs font-bold text-white cursor-pointer shadow transition-colors"
                  >
                    Save Report
                  </button>
                  <button
                    onClick={async () => {
                      toast.info('Aperçu PDF', 'Ouverture de l\'aperçu vectoriel...');
                      try {
                        await generateNanoPixPDF({
                          patient: {
                            chartNo: selectedPatient?.chartNo || '20260904_191218',
                            name: selectedPatient?.name || 'ali moujahid',
                            gender: selectedPatient?.gender || 'Male',
                            birthDate: selectedPatient?.birthDate || '2026-09-04',
                            age: selectedPatient?.age || 0,
                          },
                          studyUrl: reportSelectedStudy?.url,
                          tooth: reportSelectedStudy?.tooth || 18,
                          timestamp: reportSelectedStudy?.timestamp,
                          diagnosis: reportDiagnosis,
                          orientation: settingReportOrientation.toLowerCase() as any,
                          paperSize: settingReportPaperSize,
                          showHeader: settingReportHeaderDisplay === 'On',
                          showFooter: settingReportFooterDisplay === 'On',
                          action: 'preview',
                        });
                      } catch (err) {
                        console.error('PDF preview error:', err);
                      }
                    }}
                    className="w-full py-1.5 bg-[#1864cc] hover:bg-blue-600 rounded text-xs font-bold text-white cursor-pointer shadow transition-colors"
                  >
                    Load Report
                  </button>
                </div>
              </div>
            </div>

            {/* 2. CENTER WORKSPACE: Sage Grey Background + Centered A4 Report + Pagination (Screenshots 1, 2, 3) */}
            <div className="flex-1 bg-[#76877c] flex flex-col justify-between overflow-hidden min-h-0 relative select-none print:bg-white print:overflow-visible print:h-auto print:p-0 print:m-0 print:w-full">
              {/* Canvas Viewport */}
              <div className="flex-1 overflow-y-auto no-scrollbar flex items-center justify-center p-4 print:p-0 print:overflow-visible print:block">
                {/* A4 White Sheet (Portrait or Landscape Aspect Ratio) */}
                <div
                  style={{ transform: `scale(${reportZoomScale})`, transformOrigin: 'center top' }}
                  className={`${
                    settingReportOrientation === 'Landscape' ? 'w-[680px] min-h-[480px]' : 'w-[520px] min-h-[690px]'
                  } bg-white text-black p-5 shadow-2xl flex flex-col justify-between gap-2.5 transition-transform duration-150 print:shadow-none print:w-full print:max-w-none print:p-6 print:m-0 print:transform-none print:border-0`}
                >
                  {/* TOP HEADER BOX (Green Border #00ea00) */}
                  {settingReportHeaderDisplay === 'On' && (
                    <div className="border border-[#00ea00] p-1 flex items-stretch gap-1 bg-white print:border-[#00ea00]">
                      {/* Left: Date Box */}
                      <div className="border border-[#00ea00] px-2 py-1 flex items-center justify-center min-w-[75px] text-[10px] font-mono font-medium text-black print:border-[#00ea00]">
                        2026-10-03
                      </div>
                      {/* Right: Patient Info Box */}
                      <div className="flex-1 border border-[#00ea00] px-2 py-0.5 text-[9.5px] text-black font-sans leading-tight flex flex-col justify-center text-center print:border-[#00ea00]">
                        <div>
                          Chart No.: <span className="font-mono">{selectedPatient?.chartNo || '20260904_191218'}</span> &nbsp; Gender: {selectedPatient?.gender || 'Male'}
                        </div>
                        <div className="font-medium">
                          Name: {selectedPatient?.name?.toLowerCase() || 'ali moujahid'}
                        </div>
                        <div>
                          Date of Birth: <span className="font-mono">{selectedPatient?.birthDate || '2026-09-04'}</span> &nbsp; Age: {selectedPatient?.age || 0}Y
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MIDDLE 1: RADIOGRAPH IMAGE BOX (Screenshot 1: Empty, Screenshot 2: Selected Grey, Screenshot 3: Populated) */}
                  <div
                    onClick={() => {
                      setIsReportImageSelected(true);
                      setIsReportTextSelected(false);
                    }}
                    className={`relative border border-[#00ea00] ${
                      settingReportOrientation === 'Landscape' ? 'h-[160px]' : 'h-[220px]'
                    } flex flex-col items-center justify-center cursor-pointer transition-colors print:border-[#00ea00] print:bg-white ${
                      isReportImageSelected ? (reportSelectedStudy ? 'bg-white' : 'bg-[#c4c4c4]') : 'bg-white'
                    }`}
                  >
                    {/* 4 Green Corner Square Handles when Image Box is Selected (Screenshots 2 & 3) */}
                    {isReportImageSelected && (
                      <>
                        <div className="absolute -top-1 -left-1 w-2 h-2 bg-[#00ea00] border border-[#008800] print:hidden" />
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#00ea00] border border-[#008800] print:hidden" />
                        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-[#00ea00] border border-[#008800] print:hidden" />
                        <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-[#00ea00] border border-[#008800] print:hidden" />
                      </>
                    )}

                    {/* Content of Image Box */}
                    {reportSelectedStudy ? (
                      <div className="w-full h-full p-2 flex flex-col items-center justify-center">
                        <div className="flex-1 max-h-[175px] max-w-[90%] bg-black flex items-center justify-center overflow-hidden border border-black shadow-xs">
                          <img
                            src={reportSelectedStudy.url}
                            alt="Radiograph Study"
                            className="w-full h-full object-cover grayscale contrast-125 brightness-95"
                          />
                        </div>
                        <span className="text-[9px] font-mono text-black font-semibold mt-1">
                          IO_{reportSelectedStudy.tooth || 18}_{reportSelectedStudy.timestamp?.replace(/[^0-9]/g, '') || '20260904_191429'}
                        </span>
                      </div>
                    ) : (
                      <span className="absolute top-1 left-1.5 text-[9.5px] text-black font-sans select-none print:hidden">
                        Image
                      </span>
                    )}
                  </div>

                  {/* MIDDLE 2: CLINICAL NOTES TEXT BOX (100% Blank by default for handwritten notes) */}
                  <div
                    onClick={() => {
                      setIsReportTextSelected(true);
                      setIsReportImageSelected(false);
                    }}
                    className={`relative border border-[#00ea00] min-h-[170px] p-2 bg-white flex flex-col cursor-pointer print:border-[#00ea00] ${
                      isReportTextSelected ? 'ring-1 ring-[#00ea00] print:ring-0' : ''
                    }`}
                  >
                    {/* 4 Green Corner Square Handles when Text Box is Selected */}
                    {isReportTextSelected && (
                      <>
                        <div className="absolute -top-1 -left-1 w-2 h-2 bg-[#00ea00] border border-[#008800] print:hidden" />
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#00ea00] border border-[#008800] print:hidden" />
                        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-[#00ea00] border border-[#008800] print:hidden" />
                        <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-[#00ea00] border border-[#008800] print:hidden" />
                      </>
                    )}

                    <textarea
                      value={reportDiagnosis}
                      onChange={(e) => setReportDiagnosis(e.target.value)}
                      rows={6}
                      className="w-full flex-1 text-[10.5px] text-black border-0 focus:outline-none resize-none font-sans bg-transparent leading-relaxed"
                      placeholder=""
                    />
                  </div>

                  {/* BOTTOM FOOTER BOX (Green Border #00ea00) */}
                  {settingReportFooterDisplay === 'On' && (
                    <div className="border border-[#00ea00] p-1 flex items-stretch gap-1 bg-white print:border-[#00ea00]">
                      {/* Left: Date Box */}
                      <div className="border border-[#00ea00] px-2 py-1 flex items-center justify-center min-w-[75px] text-[10px] font-mono font-medium text-black print:border-[#00ea00]">
                        2026-10-03
                      </div>
                      {/* Right: Patient Info Box */}
                      <div className="flex-1 border border-[#00ea00] px-2 py-0.5 text-[9.5px] text-black font-sans leading-tight flex flex-col justify-center text-center print:border-[#00ea00]">
                        <div>
                          Chart No.: <span className="font-mono">{selectedPatient?.chartNo || '20260904_191218'}</span> &nbsp; Gender: {selectedPatient?.gender || 'Male'}
                        </div>
                        <div className="font-medium">
                          Name: {selectedPatient?.name?.toLowerCase() || 'ali moujahid'}
                        </div>
                        <div>
                          Date of Birth: <span className="font-mono">{selectedPatient?.birthDate || '2026-09-04'}</span> &nbsp; Age: {selectedPatient?.age || 0}Y
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Pagination Bar: < 1 / 1 > (Screenshots 1, 2, 3) */}
              <div className="h-9 bg-[#0b1426] border-t border-[#1a2b4a] px-3 flex items-center justify-center gap-3 shrink-0 select-none print:hidden">
                <button
                  onClick={() => setReportCurrentPage((p) => Math.max(1, p - 1))}
                  className="w-7 h-5 bg-[#1864cc] hover:bg-blue-600 rounded flex items-center justify-center text-white cursor-pointer shadow text-xs font-bold"
                  title="Page précédente"
                >
                  &lt;
                </button>
                <span className="text-xs text-white font-mono font-bold px-2">
                  {reportCurrentPage} / 1
                </span>
                <button
                  onClick={() => setReportCurrentPage((p) => Math.min(1, p + 1))}
                  className="w-7 h-5 bg-[#1864cc] hover:bg-blue-600 rounded flex items-center justify-center text-white cursor-pointer shadow text-xs font-bold"
                  title="Page suivante"
                >
                  &gt;
                </button>
              </div>
            </div>

            {/* 3. RIGHT SIDEBAR: Available Radiographs Strip on Pure Black Background (Screenshots 1, 2, 3) */}
            <div className="w-52 bg-black border-l border-[#1a2b4a] p-2.5 overflow-y-auto no-scrollbar flex flex-col gap-3 shrink-0 select-none print:hidden">
              {selectedPatient && selectedPatient.studies && selectedPatient.studies.length > 0 ? (
                selectedPatient.studies.map((st) => {
                  const isSelectedInReport = reportSelectedStudy?.id === st.id;
                  return (
                    <div
                      key={st.id}
                      onClick={() => {
                        setReportSelectedStudy(st);
                        setIsReportImageSelected(true);
                        setIsReportTextSelected(false);
                        toast.info('Cliché Inséré', `Cliché IO dent #${st.tooth} inséré dans le rapport.`);
                      }}
                      className="cursor-pointer flex flex-col gap-1 group"
                    >
                      {/* Radiograph Thumbnail Box */}
                      <div
                        className={`h-28 bg-black rounded-xs overflow-hidden transition-all flex items-center justify-center ${
                          isSelectedInReport
                            ? 'border-2 border-[#2b7fff] shadow-lg shadow-blue-500/20 ring-1 ring-blue-400'
                            : 'border border-[#263147] hover:border-slate-400 opacity-90 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={st.url}
                          alt="Thumbnail Series"
                          className="w-full h-full object-cover grayscale contrast-125 brightness-95"
                        />
                      </div>
                      {/* Label below: 2026-09-04 19:14:29 IO */}
                      <div className="text-[10px] font-mono text-slate-300 font-medium tracking-tight">
                        {st.timestamp || `${st.date} 19:14:29`} IO
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-1 text-center p-2">
                  <span className="text-xs">Aucun cliché disponible.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* NANOPIX SETTINGS MODAL (Exact Match to Screenshots 3, 4, 5)              */}
      {/* ========================================================================= */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-[620px] bg-[#111622] border border-[#223659] rounded-lg shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Title Bar */}
            <div className="h-9 bg-gradient-to-r from-[#184580] to-[#0f2b54] px-3.5 flex items-center justify-between text-xs font-bold text-white border-b border-[#264e88]">
              <span>NanoPix Settings</span>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="w-5 h-5 rounded hover:bg-white/20 flex items-center justify-center cursor-pointer text-white/80 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex min-h-[340px] bg-[#111622]">
              {/* Left Category Sidebar */}
              <div className="w-36 bg-[#0b0f19] border-r border-[#1a263e] flex flex-col py-2 shrink-0">
                {(['Environment', 'Patient', 'Acquisition', 'Viewer', 'Report'] as const).map((cat) => {
                  const isCatSelected = settingsCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSettingsCategory(cat)}
                      className={`w-full px-3 py-1.5 text-left text-xs font-medium transition-colors cursor-pointer ${
                        isCatSelected
                          ? 'bg-[#184580] text-white font-bold'
                          : 'text-slate-400 hover:text-white hover:bg-[#131d30]'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Right Settings Content */}
              <div className="flex-1 p-3.5 flex flex-col justify-between overflow-y-auto no-scrollbar">
                {/* 1. ENVIRONMENT CATEGORY (Screenshot 4 & 5) */}
                {settingsCategory === 'Environment' && (
                  <div className="flex flex-col gap-3">
                    {/* Top Pill Tab */}
                    <div className="flex">
                      <span className="px-3 py-0.5 rounded bg-[#1864cc] text-white text-[11px] font-bold shadow-xs">
                        General
                      </span>
                    </div>

                    {/* Section 1: LOCALIZATION */}
                    <div className="border border-[#1e2d4a] rounded p-2 flex flex-col gap-1.5 bg-[#0d1322]/60">
                      <span className="text-[9.5px] font-bold text-slate-300 uppercase tracking-wider">LOCALIZATION</span>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">Language</span>
                        <div className="relative w-56">
                          <select
                            value={settingLanguage}
                            onChange={(e) => setSettingLanguage(e.target.value)}
                            className="w-full bg-[#132038] border border-[#264478] rounded text-white text-xs px-2.5 py-1 focus:outline-none focus:border-blue-400 appearance-none cursor-pointer pr-8 font-medium"
                          >
                            <option value="Default">Default</option>
                            <option value="English">English</option>
                            <option value="Chinese">Chinese</option>
                            <option value="Spanish">Spanish</option>
                            <option value="French">French</option>
                            <option value="Turkish">Turkish</option>
                            <option value="Vietnamese">Vietnamese</option>
                            <option value="Portuguese">Portuguese</option>
                          </select>
                          <div className="absolute right-0 top-0 bottom-0 w-7 bg-[#1864cc] rounded-r flex items-center justify-center pointer-events-none">
                            <ChevronDown className="w-3.5 h-3.5 text-white" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: USER STYLE */}
                    <div className="border border-[#1e2d4a] rounded p-2 flex flex-col gap-1.5 bg-[#0d1322]/60">
                      <span className="text-[9.5px] font-bold text-slate-300 uppercase tracking-wider">USER STYLE</span>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">Icon Size</span>
                        <div className="flex items-center gap-4">
                          {(['Small', 'Medium', 'Big'] as const).map((size) => {
                            const isChecked = settingIconSize === size;
                            return (
                              <label key={size} onClick={() => setSettingIconSize(size)} className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isChecked ? 'border-blue-400 bg-blue-500' : 'border-[#264478] bg-[#0b0f19]'}`}>
                                  {isChecked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                                <span className="text-xs">{size}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Section 3: CLINIC INFORMATION */}
                    <div className="border border-[#1e2d4a] rounded p-2 flex flex-col gap-2 bg-[#0d1322]/60">
                      <span className="text-[9.5px] font-bold text-slate-300 uppercase tracking-wider">CLINIC INFORMATION</span>
                      <div className="flex flex-col gap-1.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-300 w-24 shrink-0">Clinic Name</span>
                          <input
                            type="text"
                            value={settingClinicName}
                            onChange={(e) => setSettingClinicName(e.target.value)}
                            className="flex-1 bg-[#0b1224] border border-[#1e3a5f] rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-blue-400 font-medium"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-300 w-24 shrink-0">Address</span>
                          <input
                            type="text"
                            value={settingClinicAddress}
                            onChange={(e) => setSettingClinicAddress(e.target.value)}
                            className="flex-1 bg-[#0b1224] border border-[#1e3a5f] rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-blue-400 font-medium"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-300 w-24 shrink-0">Phone Number</span>
                          <input
                            type="text"
                            value={settingClinicPhone}
                            onChange={(e) => setSettingClinicPhone(e.target.value)}
                            className="flex-1 bg-[#0b1224] border border-[#1e3a5f] rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-blue-400 font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. VIEWER CATEGORY (Screenshots 1 to 5) */}
                {settingsCategory === 'Viewer' && (
                  <div className="flex flex-col gap-3">
                    {/* Sub-tabs: General | Tools | Measurement | Annotation | Memo */}
                    <div className="flex items-center gap-1 border-b border-[#1e2d4a] pb-1">
                      {(['General', 'Tools', 'Measurement', 'Annotation', 'Memo'] as const).map((subTab) => {
                        const isSubActive = viewerSettingsSubTab === subTab;
                        return (
                          <button
                            key={subTab}
                            onClick={() => setViewerSettingsSubTab(subTab)}
                            className={`px-2.5 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
                              isSubActive
                                ? 'bg-[#1864cc] text-white'
                                : 'bg-[#15233c] text-slate-300 hover:text-white'
                            }`}
                          >
                            {subTab}
                          </button>
                        );
                      })}
                    </div>

                    {/* SUBTAB 1: General (Screenshot 1) */}
                    {viewerSettingsSubTab === 'General' && (
                      <div className="flex flex-col gap-2.5">
                        {/* Box 1: FULL SCREEN */}
                        <div className="border border-[#1e2d4a] rounded p-2 flex flex-col gap-1.5 bg-[#0d1322]/60">
                          <span className="text-[9.5px] font-bold text-slate-300 uppercase tracking-wider">FULL SCREEN</span>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">Enable</span>
                            <div className="flex items-center gap-4">
                              <label onClick={() => setSettingViewerFullScreen('On')} className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${settingViewerFullScreen === 'On' ? 'border-blue-400 bg-blue-500' : 'border-[#264478] bg-[#0b0f19]'}`}>
                                  {settingViewerFullScreen === 'On' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                                <span className="text-xs">On</span>
                              </label>
                              <label onClick={() => setSettingViewerFullScreen('Off')} className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${settingViewerFullScreen === 'Off' ? 'border-blue-400 bg-blue-500' : 'border-[#264478] bg-[#0b0f19]'}`}>
                                  {settingViewerFullScreen === 'Off' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                                <span className="text-xs">Off</span>
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Box 2: IMAGE LAYOUT PREFERENCE SETTING */}
                        <div className="border border-[#1e2d4a] rounded p-2 flex flex-col gap-1.5 bg-[#0d1322]/60">
                          <span className="text-[9.5px] font-bold text-slate-300 uppercase tracking-wider">IMAGE LAYOUT PREFERENCE SETTING</span>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">Preference</span>
                            <div className="relative w-72">
                              <select
                                value={settingViewerLayoutPref}
                                onChange={(e) => setSettingViewerLayoutPref(e.target.value)}
                                className="w-full bg-[#132038] border border-[#264478] rounded text-white text-xs px-2.5 py-1 focus:outline-none focus:border-blue-400 appearance-none cursor-pointer pr-8 font-medium"
                              >
                                <option value="1x1">1x1</option>
                                <option value="1x2">1x2</option>
                                <option value="2x2">2x2</option>
                                <option value="2x4">2x4</option>
                                <option value="FMX Full Mouth">FMX Full Mouth</option>
                              </select>
                              <div className="absolute right-0 top-0 bottom-0 w-7 bg-[#1864cc] rounded-r flex items-center justify-center pointer-events-none">
                                <ChevronDown className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SUBTAB 2: Tools (Screenshot 2) */}
                    {viewerSettingsSubTab === 'Tools' && (
                      <div className="flex flex-col gap-2.5">
                        {/* Box 1: MAGNIFIER */}
                        <div className="border border-[#1e2d4a] rounded p-2 flex flex-col gap-1.5 bg-[#0d1322]/60">
                          <span className="text-[9.5px] font-bold text-slate-300 uppercase tracking-wider">MAGNIFIER</span>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">Size</span>
                            <div className="relative w-72">
                              <select
                                value={settingMagnifierSize}
                                onChange={(e) => setSettingMagnifierSize(e.target.value)}
                                className="w-full bg-[#132038] border border-[#264478] rounded text-white text-xs px-2.5 py-1 focus:outline-none focus:border-blue-400 appearance-none cursor-pointer pr-8 font-medium"
                              >
                                <option value="100x100">100x100</option>
                                <option value="150x150">150x150</option>
                                <option value="200x200">200x200</option>
                                <option value="250x250">250x250</option>
                              </select>
                              <div className="absolute right-0 top-0 bottom-0 w-7 bg-[#1864cc] rounded-r flex items-center justify-center pointer-events-none">
                                <ChevronDown className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">Ratio</span>
                            <div className="relative w-72">
                              <select
                                value={settingMagnifierRatio}
                                onChange={(e) => setSettingMagnifierRatio(e.target.value)}
                                className="w-full bg-[#132038] border border-[#264478] rounded text-white text-xs px-2.5 py-1 focus:outline-none focus:border-blue-400 appearance-none cursor-pointer pr-8 font-medium"
                              >
                                <option value="1.2">1.2</option>
                                <option value="1.5">1.5</option>
                                <option value="2.0">2.0</option>
                                <option value="2.5">2.5</option>
                                <option value="3.0">3.0</option>
                              </select>
                              <div className="absolute right-0 top-0 bottom-0 w-7 bg-[#1864cc] rounded-r flex items-center justify-center pointer-events-none">
                                <ChevronDown className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Box 2: CAPTURE */}
                        <div className="border border-[#1e2d4a] rounded p-2 flex flex-col gap-1.5 bg-[#0d1322]/60">
                          <span className="text-[9.5px] font-bold text-slate-300 uppercase tracking-wider">CAPTURE</span>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300 w-24 shrink-0">Border Color</span>
                            <div className="relative flex-1 max-w-[288px] h-5 rounded overflow-hidden border border-[#264478] cursor-pointer">
                              <div className="w-full h-full" style={{ backgroundColor: settingCaptureBorderColor }} />
                              <input
                                type="color"
                                value={settingCaptureBorderColor}
                                onChange={(e) => setSettingCaptureBorderColor(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Box 3: GRID */}
                        <div className="border border-[#1e2d4a] rounded p-2 flex flex-col gap-1.5 bg-[#0d1322]/60">
                          <span className="text-[9.5px] font-bold text-slate-300 uppercase tracking-wider">GRID</span>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">Spacing</span>
                            <div className="relative w-72">
                              <select
                                value={settingGridSpacing}
                                onChange={(e) => setSettingGridSpacing(e.target.value)}
                                className="w-full bg-[#132038] border border-[#264478] rounded text-white text-xs px-2.5 py-1 focus:outline-none focus:border-blue-400 appearance-none cursor-pointer pr-8 font-medium"
                              >
                                <option value="1mm">1mm</option>
                                <option value="2mm">2mm</option>
                                <option value="3mm">3mm</option>
                                <option value="5mm">5mm</option>
                                <option value="10mm">10mm</option>
                              </select>
                              <div className="absolute right-0 top-0 bottom-0 w-7 bg-[#1864cc] rounded-r flex items-center justify-center pointer-events-none">
                                <ChevronDown className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300 w-24 shrink-0">Line Color</span>
                            <div className="relative flex-1 max-w-[288px] h-5 rounded overflow-hidden border border-[#264478] cursor-pointer">
                              <div className="w-full h-full" style={{ backgroundColor: settingGridLineColor }} />
                              <input
                                type="color"
                                value={settingGridLineColor}
                                onChange={(e) => setSettingGridLineColor(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">Line Thickness</span>
                            <div className="relative w-72">
                              <select
                                value={settingGridLineThickness}
                                onChange={(e) => setSettingGridLineThickness(e.target.value)}
                                className="w-full bg-[#132038] border border-[#264478] rounded text-white text-xs px-2.5 py-1 focus:outline-none focus:border-blue-400 appearance-none cursor-pointer pr-8 font-medium"
                              >
                                <option value="1px">1px</option>
                                <option value="2px">2px</option>
                                <option value="3px">3px</option>
                                <option value="4px">4px</option>
                              </select>
                              <div className="absolute right-0 top-0 bottom-0 w-7 bg-[#1864cc] rounded-r flex items-center justify-center pointer-events-none">
                                <ChevronDown className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">Opacity</span>
                            <div className="relative w-72">
                              <select
                                value={settingGridOpacity}
                                onChange={(e) => setSettingGridOpacity(e.target.value)}
                                className="w-full bg-[#132038] border border-[#264478] rounded text-white text-xs px-2.5 py-1 focus:outline-none focus:border-blue-400 appearance-none cursor-pointer pr-8 font-medium"
                              >
                                <option value="20%">20%</option>
                                <option value="40%">40%</option>
                                <option value="60%">60%</option>
                                <option value="80%">80%</option>
                                <option value="100%">100%</option>
                              </select>
                              <div className="absolute right-0 top-0 bottom-0 w-7 bg-[#1864cc] rounded-r flex items-center justify-center pointer-events-none">
                                <ChevronDown className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SUBTAB 3: Measurement (Screenshot 3) */}
                    {viewerSettingsSubTab === 'Measurement' && (
                      <div className="flex flex-col gap-2.5">
                        {/* Box 1: LENGTH */}
                        <div className="border border-[#1e2d4a] rounded p-2 flex flex-col gap-1.5 bg-[#0d1322]/60">
                          <span className="text-[9.5px] font-bold text-slate-300 uppercase tracking-wider">LENGTH</span>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300 w-24 shrink-0">Line Color</span>
                            <div className="relative flex-1 max-w-[288px] h-5 rounded overflow-hidden border border-[#264478] cursor-pointer">
                              <div className="w-full h-full" style={{ backgroundColor: settingLengthLineColor }} />
                              <input
                                type="color"
                                value={settingLengthLineColor}
                                onChange={(e) => setSettingLengthLineColor(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">Line Thickness</span>
                            <div className="relative w-72">
                              <select
                                value={settingLengthLineThickness}
                                onChange={(e) => setSettingLengthLineThickness(e.target.value)}
                                className="w-full bg-[#132038] border border-[#264478] rounded text-white text-xs px-2.5 py-1 focus:outline-none focus:border-blue-400 appearance-none cursor-pointer pr-8 font-medium"
                              >
                                <option value="1px">1px</option>
                                <option value="2px">2px</option>
                                <option value="3px">3px</option>
                                <option value="4px">4px</option>
                              </select>
                              <div className="absolute right-0 top-0 bottom-0 w-7 bg-[#1864cc] rounded-r flex items-center justify-center pointer-events-none">
                                <ChevronDown className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">Unit ( mm )</span>
                            <div className="flex items-center gap-4">
                              <label onClick={() => setSettingLengthUnitMm('On')} className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${settingLengthUnitMm === 'On' ? 'border-blue-400 bg-blue-500' : 'border-[#264478] bg-[#0b0f19]'}`}>
                                  {settingLengthUnitMm === 'On' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                                <span className="text-xs">On</span>
                              </label>
                              <label onClick={() => setSettingLengthUnitMm('Off')} className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${settingLengthUnitMm === 'Off' ? 'border-blue-400 bg-blue-500' : 'border-[#264478] bg-[#0b0f19]'}`}>
                                  {settingLengthUnitMm === 'Off' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                                <span className="text-xs">Off</span>
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Box 2: ANGLE */}
                        <div className="border border-[#1e2d4a] rounded p-2 flex flex-col gap-1.5 bg-[#0d1322]/60">
                          <span className="text-[9.5px] font-bold text-slate-300 uppercase tracking-wider">ANGLE</span>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300 w-24 shrink-0">Line Color</span>
                            <div className="relative flex-1 max-w-[288px] h-5 rounded overflow-hidden border border-[#264478] cursor-pointer">
                              <div className="w-full h-full" style={{ backgroundColor: settingAngleLineColor }} />
                              <input
                                type="color"
                                value={settingAngleLineColor}
                                onChange={(e) => setSettingAngleLineColor(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">Line Thickness</span>
                            <div className="relative w-72">
                              <select
                                value={settingAngleLineThickness}
                                onChange={(e) => setSettingAngleLineThickness(e.target.value)}
                                className="w-full bg-[#132038] border border-[#264478] rounded text-white text-xs px-2.5 py-1 focus:outline-none focus:border-blue-400 appearance-none cursor-pointer pr-8 font-medium"
                              >
                                <option value="1px">1px</option>
                                <option value="2px">2px</option>
                                <option value="3px">3px</option>
                                <option value="4px">4px</option>
                              </select>
                              <div className="absolute right-0 top-0 bottom-0 w-7 bg-[#1864cc] rounded-r flex items-center justify-center pointer-events-none">
                                <ChevronDown className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">Unit ( ° )</span>
                            <div className="flex items-center gap-4">
                              <label onClick={() => setSettingAngleUnitDeg('On')} className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${settingAngleUnitDeg === 'On' ? 'border-blue-400 bg-blue-500' : 'border-[#264478] bg-[#0b0f19]'}`}>
                                  {settingAngleUnitDeg === 'On' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                                <span className="text-xs">On</span>
                              </label>
                              <label onClick={() => setSettingAngleUnitDeg('Off')} className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${settingAngleUnitDeg === 'Off' ? 'border-blue-400 bg-blue-500' : 'border-[#264478] bg-[#0b0f19]'}`}>
                                  {settingAngleUnitDeg === 'Off' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                                <span className="text-xs">Off</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SUBTAB 4: Annotation (Screenshot 4) */}
                    {viewerSettingsSubTab === 'Annotation' && (
                      <div className="flex flex-col gap-2 max-h-[290px] overflow-y-auto no-scrollbar pr-1">
                        {/* Box 1: DRAW */}
                        <div className="border border-[#1e2d4a] rounded p-2 flex flex-col gap-1.5 bg-[#0d1322]/60">
                          <span className="text-[9.5px] font-bold text-slate-300 uppercase tracking-wider">DRAW</span>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300 w-24 shrink-0">Line Color</span>
                            <div className="relative flex-1 max-w-[288px] h-5 rounded overflow-hidden border border-[#264478] cursor-pointer">
                              <div className="w-full h-full" style={{ backgroundColor: settingDrawColor }} />
                              <input
                                type="color"
                                value={settingDrawColor}
                                onChange={(e) => setSettingDrawColor(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">Line Thickness</span>
                            <div className="relative w-72">
                              <select
                                value={settingDrawThickness}
                                onChange={(e) => setSettingDrawThickness(e.target.value)}
                                className="w-full bg-[#132038] border border-[#264478] rounded text-white text-xs px-2.5 py-1 focus:outline-none focus:border-blue-400 appearance-none cursor-pointer pr-8 font-medium"
                              >
                                <option value="1px">1px</option>
                                <option value="2px">2px</option>
                                <option value="3px">3px</option>
                                <option value="4px">4px</option>
                                <option value="5px">5px</option>
                              </select>
                              <div className="absolute right-0 top-0 bottom-0 w-7 bg-[#1864cc] rounded-r flex items-center justify-center pointer-events-none">
                                <ChevronDown className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Box 2: LINE */}
                        <div className="border border-[#1e2d4a] rounded p-2 flex flex-col gap-1.5 bg-[#0d1322]/60">
                          <span className="text-[9.5px] font-bold text-slate-300 uppercase tracking-wider">LINE</span>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300 w-24 shrink-0">Line Color</span>
                            <div className="relative flex-1 max-w-[288px] h-5 rounded overflow-hidden border border-[#264478] cursor-pointer">
                              <div className="w-full h-full" style={{ backgroundColor: settingLineColor }} />
                              <input
                                type="color"
                                value={settingLineColor}
                                onChange={(e) => setSettingLineColor(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">Line Thickness</span>
                            <div className="relative w-72">
                              <select
                                value={settingLineThickness}
                                onChange={(e) => setSettingLineThickness(e.target.value)}
                                className="w-full bg-[#132038] border border-[#264478] rounded text-white text-xs px-2.5 py-1 focus:outline-none focus:border-blue-400 appearance-none cursor-pointer pr-8 font-medium"
                              >
                                <option value="1px">1px</option>
                                <option value="2px">2px</option>
                                <option value="3px">3px</option>
                                <option value="4px">4px</option>
                                <option value="5px">5px</option>
                              </select>
                              <div className="absolute right-0 top-0 bottom-0 w-7 bg-[#1864cc] rounded-r flex items-center justify-center pointer-events-none">
                                <ChevronDown className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Box 3: RECTANGLE */}
                        <div className="border border-[#1e2d4a] rounded p-2 flex flex-col gap-1.5 bg-[#0d1322]/60">
                          <span className="text-[9.5px] font-bold text-slate-300 uppercase tracking-wider">RECTANGLE</span>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300 w-24 shrink-0">Line Color</span>
                            <div className="relative flex-1 max-w-[288px] h-5 rounded overflow-hidden border border-[#264478] cursor-pointer">
                              <div className="w-full h-full" style={{ backgroundColor: settingRectColor }} />
                              <input
                                type="color"
                                value={settingRectColor}
                                onChange={(e) => setSettingRectColor(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">Line Thickness</span>
                            <div className="relative w-72">
                              <select
                                value={settingRectThickness}
                                onChange={(e) => setSettingRectThickness(e.target.value)}
                                className="w-full bg-[#132038] border border-[#264478] rounded text-white text-xs px-2.5 py-1 focus:outline-none focus:border-blue-400 appearance-none cursor-pointer pr-8 font-medium"
                              >
                                <option value="1px">1px</option>
                                <option value="2px">2px</option>
                                <option value="3px">3px</option>
                                <option value="4px">4px</option>
                                <option value="5px">5px</option>
                              </select>
                              <div className="absolute right-0 top-0 bottom-0 w-7 bg-[#1864cc] rounded-r flex items-center justify-center pointer-events-none">
                                <ChevronDown className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Box 4: ELLIPSE */}
                        <div className="border border-[#1e2d4a] rounded p-2 flex flex-col gap-1.5 bg-[#0d1322]/60">
                          <span className="text-[9.5px] font-bold text-slate-300 uppercase tracking-wider">ELLIPSE</span>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300 w-24 shrink-0">Line Color</span>
                            <div className="relative flex-1 max-w-[288px] h-5 rounded overflow-hidden border border-[#264478] cursor-pointer">
                              <div className="w-full h-full" style={{ backgroundColor: settingEllipseColor }} />
                              <input
                                type="color"
                                value={settingEllipseColor}
                                onChange={(e) => setSettingEllipseColor(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">Line Thickness</span>
                            <div className="relative w-72">
                              <select
                                value={settingEllipseThickness}
                                onChange={(e) => setSettingEllipseThickness(e.target.value)}
                                className="w-full bg-[#132038] border border-[#264478] rounded text-white text-xs px-2.5 py-1 focus:outline-none focus:border-blue-400 appearance-none cursor-pointer pr-8 font-medium"
                              >
                                <option value="1px">1px</option>
                                <option value="2px">2px</option>
                                <option value="3px">3px</option>
                                <option value="4px">4px</option>
                                <option value="5px">5px</option>
                              </select>
                              <div className="absolute right-0 top-0 bottom-0 w-7 bg-[#1864cc] rounded-r flex items-center justify-center pointer-events-none">
                                <ChevronDown className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SUBTAB 5: Memo (Screenshot 5) */}
                    {viewerSettingsSubTab === 'Memo' && (
                      <div className="flex flex-col gap-2 max-h-[290px] overflow-y-auto no-scrollbar pr-1">
                        {/* Box 1: MEMO STYLE */}
                        <div className="border border-[#1e2d4a] rounded p-2 flex flex-col gap-1.5 bg-[#0d1322]/60">
                          <span className="text-[9.5px] font-bold text-slate-300 uppercase tracking-wider">MEMO STYLE</span>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300 w-24 shrink-0">Outter Color</span>
                            <div className="relative flex-1 max-w-[288px] h-5 rounded overflow-hidden border border-[#264478] cursor-pointer">
                              <div className="w-full h-full" style={{ backgroundColor: settingMemoOutterColor }} />
                              <input
                                type="color"
                                value={settingMemoOutterColor}
                                onChange={(e) => setSettingMemoOutterColor(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300 w-24 shrink-0">Text Color</span>
                            <div className="relative flex-1 max-w-[288px] h-5 rounded overflow-hidden border border-[#264478] cursor-pointer">
                              <div className="w-full h-full" style={{ backgroundColor: settingMemoTextColor }} />
                              <input
                                type="color"
                                value={settingMemoTextColor}
                                onChange={(e) => setSettingMemoTextColor(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Box 2: TEXT PRESET */}
                        <div className="border border-[#1e2d4a] rounded p-2 flex flex-col gap-1.5 bg-[#0d1322]/60">
                          <span className="text-[9.5px] font-bold text-slate-300 uppercase tracking-wider">TEXT PRESET</span>
                          <div className="flex flex-col gap-1 text-xs">
                            {settingMemoPresets.map((preset, idx) => (
                              <div key={idx} className="flex items-center justify-between">
                                <span className="text-slate-300 w-24 shrink-0">Preset {idx + 1}</span>
                                <input
                                  type="text"
                                  value={preset}
                                  onChange={(e) => {
                                    const next = [...settingMemoPresets];
                                    next[idx] = e.target.value;
                                    setSettingMemoPresets(next);
                                  }}
                                  className="flex-1 max-w-[288px] bg-[#132038] border border-[#264478] rounded px-2.5 py-0.5 text-xs text-white focus:outline-none focus:border-blue-400 font-medium"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. ACQUISITION CATEGORY (Screenshots 1, 2, 3, 4) */}
                {settingsCategory === 'Acquisition' && (
                  <div className="flex flex-col gap-3">
                    {/* Sub-tabs: General | Image */}
                    <div className="flex items-center gap-1 border-b border-[#1e2d4a] pb-1">
                      {(['General', 'Image'] as const).map((subTab) => {
                        const isSubActive = acquisitionSettingsSubTab === subTab;
                        return (
                          <button
                            key={subTab}
                            onClick={() => setAcquisitionSettingsSubTab(subTab)}
                            className={`px-3 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
                              isSubActive
                                ? 'bg-[#1864cc] text-white'
                                : 'bg-[#15233c] text-slate-300 hover:text-white'
                            }`}
                          >
                            {subTab}
                          </button>
                        );
                      })}
                    </div>

                    {/* SUBTAB 1: General */}
                    {acquisitionSettingsSubTab === 'General' && (
                      <div className="flex flex-col gap-2.5">
                        {/* Box 1: TRIGGER SETTING */}
                        <div className="border border-[#1e2d4a] rounded p-2.5 flex flex-col gap-2 bg-[#0d1322]/60">
                          <span className="text-[9.5px] font-bold text-slate-300 uppercase tracking-wider">TRIGGER SETTING</span>
                          
                          {/* Mode Row: DC | AC */}
                          <div className="flex items-center text-xs">
                            <span className="text-slate-300 w-16 shrink-0">Mode</span>
                            <div className="flex items-center gap-8">
                              {(['DC', 'AC'] as const).map((mode) => {
                                const isChecked = settingAcqTriggerMode === mode;
                                return (
                                  <label
                                    key={mode}
                                    onClick={() => setSettingAcqTriggerMode(mode)}
                                    className="flex items-center gap-1.5 cursor-pointer text-slate-300"
                                  >
                                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isChecked ? 'border-blue-400 bg-blue-500' : 'border-[#264478] bg-[#0b0f19]'}`}>
                                      {isChecked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </div>
                                    <span className="text-xs">{mode}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>

                          {/* KV Row: 60 | 65 | 70 | 75 | 80 */}
                          <div className="flex items-center text-xs">
                            <span className="text-slate-300 w-16 shrink-0">KV</span>
                            <div className="flex items-center gap-4">
                              {[60, 65, 70, 75, 80].map((kv) => {
                                const isChecked = settingAcqKV === kv;
                                return (
                                  <label
                                    key={kv}
                                    onClick={() => setSettingAcqKV(kv)}
                                    className="flex items-center gap-1.5 cursor-pointer text-slate-300"
                                  >
                                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isChecked ? 'border-blue-400 bg-blue-500' : 'border-[#264478] bg-[#0b0f19]'}`}>
                                      {isChecked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </div>
                                    <span className="text-xs">{kv}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>

                          {/* MA Row: <=0.2 | 0.5 | 1.0 | 2.0 | 3.0 | >3.0 */}
                          <div className="flex items-center text-xs">
                            <span className="text-slate-300 w-16 shrink-0">MA</span>
                            <div className="flex items-center gap-3">
                              {['<=0.2', '0.5', '1.0', '2.0', '3.0', '>3.0'].map((ma) => {
                                const isChecked = settingAcqMA === ma;
                                return (
                                  <label
                                    key={ma}
                                    onClick={() => setSettingAcqMA(ma)}
                                    className="flex items-center gap-1.5 cursor-pointer text-slate-300"
                                  >
                                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isChecked ? 'border-blue-400 bg-blue-500' : 'border-[#264478] bg-[#0b0f19]'}`}>
                                      {isChecked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </div>
                                    <span className="text-xs">{ma}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Box 2: IMAGE PREFERENCE SETTING (Screenshot 3) */}
                        <div className="border border-[#1e2d4a] rounded p-2 flex flex-col gap-1.5 bg-[#0d1322]/60">
                          <span className="text-[9.5px] font-bold text-slate-300 uppercase tracking-wider">IMAGE PREFERENCE SETTING</span>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">Preference</span>
                            <div className="relative w-72">
                              <select
                                value={settingAcqImagePref}
                                onChange={(e) => setSettingAcqImagePref(e.target.value as any)}
                                className="w-full bg-[#132038] border border-[#264478] rounded text-white text-xs px-2.5 py-1 focus:outline-none focus:border-blue-400 appearance-none cursor-pointer pr-8 font-medium"
                              >
                                <option value="Endodontic">Endodontic</option>
                                <option value="Periodontic">Periodontic</option>
                                <option value="Restorative">Restorative</option>
                              </select>
                              <div className="absolute right-0 top-0 bottom-0 w-7 bg-[#1864cc] rounded-r flex items-center justify-center pointer-events-none">
                                <ChevronDown className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Box 3: TEETH LAYOUT PREFERENCE SETTING (Screenshot 4) */}
                        <div className="border border-[#1e2d4a] rounded p-2 flex flex-col gap-1.5 bg-[#0d1322]/60">
                          <span className="text-[9.5px] font-bold text-slate-300 uppercase tracking-wider">TEETH LAYOUT PREFERENCE SETTING</span>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">Preference</span>
                            <div className="relative w-72">
                              <select
                                value={settingAcqTeethLayoutPref}
                                onChange={(e) => setSettingAcqTeethLayoutPref(e.target.value as any)}
                                className="w-full bg-[#132038] border border-[#264478] rounded text-white text-xs px-2.5 py-1 focus:outline-none focus:border-blue-400 appearance-none cursor-pointer pr-8 font-medium"
                              >
                                <option value="Adult">Adult</option>
                                <option value="Child">Child</option>
                              </select>
                              <div className="absolute right-0 top-0 bottom-0 w-7 bg-[#1864cc] rounded-r flex items-center justify-center pointer-events-none">
                                <ChevronDown className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SUBTAB 2: Image (Screenshot 2) */}
                    {acquisitionSettingsSubTab === 'Image' && (
                      <div className="flex flex-col gap-2.5">
                        {/* Box 1: IMAGE CALIBRATION */}
                        <div className="border border-[#1e2d4a] rounded p-2 flex flex-col gap-1.5 bg-[#0d1322]/60">
                          <span className="text-[9.5px] font-bold text-slate-300 uppercase tracking-wider">IMAGE CALIBRATION</span>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">IO Sensor</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={settingAcqCalibration}
                                onChange={(e) => setSettingAcqCalibration(e.target.value)}
                                className="w-60 bg-[#132038] border border-[#264478] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-400 font-mono font-medium"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const val = parseFloat(settingAcqCalibration) || 0.02;
                                  setSettingAcqCalibration(Math.max(0.001, val - 0.001).toFixed(3));
                                }}
                                className="w-6 h-6 bg-[#1b3254] hover:bg-[#254675] border border-[#2a4e7e] rounded text-white font-bold flex items-center justify-center cursor-pointer transition-colors text-xs"
                              >
                                -
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const val = parseFloat(settingAcqCalibration) || 0.02;
                                  setSettingAcqCalibration((val + 0.001).toFixed(3));
                                }}
                                className="w-6 h-6 bg-[#1b3254] hover:bg-[#254675] border border-[#2a4e7e] rounded text-white font-bold flex items-center justify-center cursor-pointer transition-colors text-xs"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Box 2: IMAGE STORAGE */}
                        <div className="border border-[#1e2d4a] rounded p-2 flex flex-col gap-1.5 bg-[#0d1322]/60">
                          <span className="text-[9.5px] font-bold text-slate-300 uppercase tracking-wider">IMAGE STORAGE</span>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">Directory</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={settingAcqStorageDir}
                                onChange={(e) => setSettingAcqStorageDir(e.target.value)}
                                className="w-60 bg-[#132038] border border-[#264478] rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-400 font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => toast.info('Parcourir', 'Dossier de stockage: C:\\PatientData')}
                                className="w-6 h-6 bg-[#1b3254] hover:bg-[#254675] border border-[#2a4e7e] rounded text-white font-bold flex items-center justify-center cursor-pointer transition-colors text-xs"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. REPORT CATEGORY (Screenshots 1 & 2) */}
                {settingsCategory === 'Report' && (
                  <div className="flex flex-col gap-3">
                    {/* Sub-tabs: General | Print */}
                    <div className="flex items-center gap-1 border-b border-[#1e2d4a] pb-1">
                      {(['General', 'Print'] as const).map((subTab) => {
                        const isSubActive = reportSettingsSubTab === subTab;
                        return (
                          <button
                            key={subTab}
                            onClick={() => setReportSettingsSubTab(subTab)}
                            className={`px-3 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
                              isSubActive
                                ? 'bg-[#1864cc] text-white'
                                : 'bg-[#15233c] text-slate-300 hover:text-white'
                            }`}
                          >
                            {subTab}
                          </button>
                        );
                      })}
                    </div>

                    {/* SUBTAB 1: General (Screenshot 1) */}
                    {reportSettingsSubTab === 'General' && (
                      <div className="flex flex-col gap-2.5">
                        {/* Box 1: BORDER STYLE */}
                        <div className="border border-[#1e2d4a] rounded p-2 flex flex-col gap-1.5 bg-[#0d1322]/60">
                          <span className="text-[9.5px] font-bold text-slate-300 uppercase tracking-wider">BORDER STYLE</span>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300 w-24 shrink-0">Line Color</span>
                            <div className="relative flex-1 max-w-[288px] h-5 rounded overflow-hidden border border-[#264478] cursor-pointer">
                              <div className="w-full h-full" style={{ backgroundColor: settingReportBorderColor }} />
                              <input
                                type="color"
                                value={settingReportBorderColor}
                                onChange={(e) => setSettingReportBorderColor(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">Line Thickness</span>
                            <div className="relative w-72">
                              <select
                                value={settingReportBorderThickness}
                                onChange={(e) => setSettingReportBorderThickness(e.target.value)}
                                className="w-full bg-[#132038] border border-[#264478] rounded text-white text-xs px-2.5 py-1 focus:outline-none focus:border-blue-400 appearance-none cursor-pointer pr-8 font-medium"
                              >
                                <option value="1px">1px</option>
                                <option value="2px">2px</option>
                                <option value="3px">3px</option>
                                <option value="4px">4px</option>
                              </select>
                              <div className="absolute right-0 top-0 bottom-0 w-7 bg-[#1864cc] rounded-r flex items-center justify-center pointer-events-none">
                                <ChevronDown className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Box 2: TEXT BOX STYLE */}
                        <div className="border border-[#1e2d4a] rounded p-2 flex flex-col gap-1.5 bg-[#0d1322]/60">
                          <span className="text-[9.5px] font-bold text-slate-300 uppercase tracking-wider">TEXT BOX STYLE</span>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">Font</span>
                            <div className="relative w-72">
                              <select
                                value={settingReportFont}
                                onChange={(e) => setSettingReportFont(e.target.value)}
                                className="w-full bg-[#132038] border border-[#264478] rounded text-white text-xs px-2.5 py-1 focus:outline-none focus:border-blue-400 appearance-none cursor-pointer pr-8 font-medium"
                              >
                                <option value="Microsoft YaHei UI">Microsoft YaHei UI</option>
                                <option value="Segoe UI">Segoe UI</option>
                                <option value="Arial">Arial</option>
                                <option value="Calibri">Calibri</option>
                                <option value="Times New Roman">Times New Roman</option>
                              </select>
                              <div className="absolute right-0 top-0 bottom-0 w-7 bg-[#1864cc] rounded-r flex items-center justify-center pointer-events-none">
                                <ChevronDown className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">Font Size</span>
                            <div className="relative w-72">
                              <select
                                value={settingReportFontSize}
                                onChange={(e) => setSettingReportFontSize(e.target.value)}
                                className="w-full bg-[#132038] border border-[#264478] rounded text-white text-xs px-2.5 py-1 focus:outline-none focus:border-blue-400 appearance-none cursor-pointer pr-8 font-medium"
                              >
                                <option value="8">8</option>
                                <option value="9">9</option>
                                <option value="10">10</option>
                                <option value="10.5">10.5</option>
                                <option value="11">11</option>
                                <option value="12">12</option>
                                <option value="14">14</option>
                                <option value="16">16</option>
                              </select>
                              <div className="absolute right-0 top-0 bottom-0 w-7 bg-[#1864cc] rounded-r flex items-center justify-center pointer-events-none">
                                <ChevronDown className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300 w-24 shrink-0">Font Color</span>
                            <div className="relative flex-1 max-w-[288px] h-5 rounded overflow-hidden border border-[#264478] cursor-pointer">
                              <div className="w-full h-full" style={{ backgroundColor: settingReportFontColor }} />
                              <input
                                type="color"
                                value={settingReportFontColor}
                                onChange={(e) => setSettingReportFontColor(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SUBTAB 2: Print (Screenshot 2) */}
                    {reportSettingsSubTab === 'Print' && (
                      <div className="flex flex-col gap-2.5">
                        {/* Box 1: PAPER PREFERENCE SETTING */}
                        <div className="border border-[#1e2d4a] rounded p-2 flex flex-col gap-1.5 bg-[#0d1322]/60">
                          <span className="text-[9.5px] font-bold text-slate-300 uppercase tracking-wider">PAPER PREFERENCE SETTING</span>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">Size</span>
                            <div className="relative w-72">
                              <select
                                value={settingReportPaperSize}
                                onChange={(e) => setSettingReportPaperSize(e.target.value)}
                                className="w-full bg-[#132038] border border-[#264478] rounded text-white text-xs px-2.5 py-1 focus:outline-none focus:border-blue-400 appearance-none cursor-pointer pr-8 font-medium"
                              >
                                <option value="A4">A4</option>
                                <option value="A5">A5</option>
                                <option value="Letter">Letter</option>
                                <option value="Legal">Legal</option>
                              </select>
                              <div className="absolute right-0 top-0 bottom-0 w-7 bg-[#1864cc] rounded-r flex items-center justify-center pointer-events-none">
                                <ChevronDown className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">Orientation</span>
                            <div className="relative w-72">
                              <select
                                value={settingReportOrientation}
                                onChange={(e) => setSettingReportOrientation(e.target.value)}
                                className="w-full bg-[#132038] border border-[#264478] rounded text-white text-xs px-2.5 py-1 focus:outline-none focus:border-blue-400 appearance-none cursor-pointer pr-8 font-medium"
                              >
                                <option value="Portrait">Portrait</option>
                                <option value="Landscape">Landscape</option>
                              </select>
                              <div className="absolute right-0 top-0 bottom-0 w-7 bg-[#1864cc] rounded-r flex items-center justify-center pointer-events-none">
                                <ChevronDown className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Box 2: HEADER PREFERENCE SETTING */}
                        <div className="border border-[#1e2d4a] rounded p-2 flex flex-col gap-1.5 bg-[#0d1322]/60">
                          <span className="text-[9.5px] font-bold text-slate-300 uppercase tracking-wider">HEADER PREFERENCE SETTING</span>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">Display</span>
                            <div className="flex items-center gap-4">
                              <label onClick={() => setSettingReportHeaderDisplay('On')} className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${settingReportHeaderDisplay === 'On' ? 'border-blue-400 bg-blue-500' : 'border-[#264478] bg-[#0b0f19]'}`}>
                                  {settingReportHeaderDisplay === 'On' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                                <span className="text-xs">On</span>
                              </label>
                              <label onClick={() => setSettingReportHeaderDisplay('Off')} className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${settingReportHeaderDisplay === 'Off' ? 'border-blue-400 bg-blue-500' : 'border-[#264478] bg-[#0b0f19]'}`}>
                                  {settingReportHeaderDisplay === 'Off' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                                <span className="text-xs">Off</span>
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Box 3: FOOTER PREFERENCE SETTING */}
                        <div className="border border-[#1e2d4a] rounded p-2 flex flex-col gap-1.5 bg-[#0d1322]/60">
                          <span className="text-[9.5px] font-bold text-slate-300 uppercase tracking-wider">FOOTER PREFERENCE SETTING</span>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">Display</span>
                            <div className="flex items-center gap-4">
                              <label onClick={() => setSettingReportFooterDisplay('On')} className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${settingReportFooterDisplay === 'On' ? 'border-blue-400 bg-blue-500' : 'border-[#264478] bg-[#0b0f19]'}`}>
                                  {settingReportFooterDisplay === 'On' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                                <span className="text-xs">On</span>
                              </label>
                              <label onClick={() => setSettingReportFooterDisplay('Off')} className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${settingReportFooterDisplay === 'Off' ? 'border-blue-400 bg-blue-500' : 'border-[#264478] bg-[#0b0f19]'}`}>
                                  {settingReportFooterDisplay === 'Off' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                                <span className="text-xs">Off</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. PATIENT CATEGORY */}
                {settingsCategory === 'Patient' && (
                  <div className="flex flex-col gap-3">
                    <span className="px-3 py-0.5 rounded bg-[#1864cc] text-white text-[11px] font-bold shadow-xs w-fit">
                      Patient Settings
                    </span>
                    <div className="border border-[#1e2d4a] rounded p-3 bg-[#0d1322]/60 text-xs text-slate-300 flex flex-col gap-2">
                      <p>Paramètres de la base de données <strong className="text-cyan-400">Patients</strong> Eighteeth NanoPix synchronisés avec le système du cabinet Dr. Salma Tijini.</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-300 font-mono text-[11px]">Synchronisation en direct (MongoDB & WebSocket) active.</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom Footer Actions (Exact match to Screenshots) */}
                <div className="flex items-center justify-between pt-3 border-t border-[#1a263e] mt-3">
                  <button
                    onClick={() => {
                      setSettingLanguage('Default');
                      setSettingIconSize('Medium');
                      setSettingViewerFullScreen('On');
                      setSettingViewerLayoutPref('1x1');
                      setSettingMagnifierSize('150x150');
                      setSettingMagnifierRatio('1.5');
                      setSettingCaptureBorderColor('#fa6e59');
                      setSettingGridSpacing('2mm');
                      setSettingGridLineColor('#808080');
                      setSettingGridLineThickness('1px');
                      setSettingGridOpacity('40%');
                      setSettingLengthLineColor('#ff0000');
                      setSettingLengthLineThickness('1px');
                      setSettingLengthUnitMm('On');
                      setSettingAngleLineColor('#ff0000');
                      setSettingAngleLineThickness('1px');
                      setSettingAngleUnitDeg('On');
                      setSettingDrawColor('#ffff00');
                      setSettingDrawThickness('3px');
                      setSettingLineColor('#ffff00');
                      setSettingLineThickness('3px');
                      setSettingRectColor('#ffff00');
                      setSettingRectThickness('3px');
                      setSettingEllipseColor('#ffff00');
                      setSettingEllipseThickness('3px');
                      setSettingMemoOutterColor('#00ff00');
                      setSettingMemoTextColor('#00ff00');
                      setSettingMemoPresets(['Caries', 'Bone Loss', 'Absent', 'Preset1', 'Preset2', 'Preset3', 'Preset4']);
                      setSettingAcqTriggerMode('DC');
                      setSettingAcqKV(70);
                      setSettingAcqMA('1.0');
                      setSettingAcqImagePref('Endodontic');
                      setSettingAcqTeethLayoutPref('Adult');
                      setSettingAcqCalibration('0.020');
                      setSettingAcqStorageDir('C:\\PatientData');
                      setSettingReportBorderColor('#00ff00');
                      setSettingReportBorderThickness('1px');
                      setSettingReportFont('Microsoft YaHei UI');
                      setSettingReportFontSize('10.5');
                      setSettingReportFontColor('#000000');
                      setSettingReportPaperSize('A4');
                      setSettingReportOrientation('Portrait');
                      setSettingReportHeaderDisplay('On');
                      setSettingReportFooterDisplay('On');
                      toast.info('Réinitialisation', 'Paramètres NanoPix remis aux valeurs par défaut.');
                    }}
                    className="px-4 py-1.5 bg-[#1b3254] hover:bg-[#254675] border border-[#2a4e7e] rounded text-xs text-white font-medium cursor-pointer shadow transition-colors"
                  >
                    Reset Settings
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveSettings}
                      className="px-6 py-1.5 bg-[#1864cc] hover:bg-blue-600 border border-[#2678ea] rounded text-xs text-white font-bold cursor-pointer shadow transition-colors"
                    >
                      Ok
                    </button>
                    <button
                      onClick={() => setIsSettingsOpen(false)}
                      className="px-5 py-1.5 bg-[#1b3254] hover:bg-[#254675] border border-[#2a4e7e] rounded text-xs text-white font-medium cursor-pointer shadow transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* PRINTER SETTINGS MODAL (Exact Match to Screenshot 3)                     */}
      {/* ========================================================================= */}
      {isPrinterSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-[360px] bg-[#161c28] border border-[#2a3a54] rounded shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100 select-none">
            {/* Title Bar */}
            <div className="h-7 bg-[#23467b] px-3 flex items-center text-xs font-semibold text-white tracking-wide">
              <span>PRINTER SETTINGS</span>
            </div>

            {/* Modal Body */}
            <div className="p-3 flex flex-col gap-2.5 bg-[#161c28]">
              {/* 1. PAPER SETTING */}
              <div className="border border-[#263750] rounded p-2 flex flex-col gap-2 bg-[#0e1420]/60">
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">PAPER SETTING</span>
                <div className="flex items-center justify-between text-xs text-slate-200">
                  <span className="w-16 shrink-0">Size</span>
                  <div className="relative flex-1">
                    <select
                      value={settingReportPaperSize}
                      onChange={(e) => setSettingReportPaperSize(e.target.value)}
                      className="w-full bg-[#132038] border border-[#264478] rounded text-white text-xs px-2.5 py-0.5 focus:outline-none focus:border-blue-400 appearance-none cursor-pointer pr-8 font-medium"
                    >
                      <option value="A4">A4</option>
                      <option value="A5">A5</option>
                      <option value="Letter">Letter</option>
                      <option value="Legal">Legal</option>
                    </select>
                    <div className="absolute right-0 top-0 bottom-0 w-6 bg-[#1864cc] rounded-r flex items-center justify-center pointer-events-none">
                      <ChevronDown className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center text-xs text-slate-200">
                  <span className="w-16 shrink-0">Orientation</span>
                  <div className="flex items-center gap-6">
                    {(['Portrait', 'Landscape'] as const).map((orient) => {
                      const isChecked = settingReportOrientation === orient;
                      return (
                        <label
                          key={orient}
                          onClick={() => setSettingReportOrientation(orient)}
                          className="flex items-center gap-1.5 cursor-pointer text-slate-300"
                        >
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isChecked ? 'border-blue-400 bg-blue-500' : 'border-[#264478] bg-[#0b0f19]'}`}>
                            {isChecked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <span className="text-xs">{orient}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 2. HEADER SETTING */}
              <div className="border border-[#263750] rounded p-2 flex flex-col gap-1.5 bg-[#0e1420]/60">
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">HEADER SETTING</span>
                <div className="flex items-center text-xs text-slate-200">
                  <span className="w-16 shrink-0">Display</span>
                  <div className="flex items-center gap-6">
                    {(['On', 'Off'] as const).map((dsp) => {
                      const isChecked = settingReportHeaderDisplay === dsp;
                      return (
                        <label
                          key={dsp}
                          onClick={() => setSettingReportHeaderDisplay(dsp)}
                          className="flex items-center gap-1.5 cursor-pointer text-slate-300"
                        >
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isChecked ? 'border-blue-400 bg-blue-500' : 'border-[#264478] bg-[#0b0f19]'}`}>
                            {isChecked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <span className="text-xs">{dsp}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. FOOTER SETTING */}
              <div className="border border-[#263750] rounded p-2 flex flex-col gap-1.5 bg-[#0e1420]/60">
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">FOOTER SETTING</span>
                <div className="flex items-center text-xs text-slate-200">
                  <span className="w-16 shrink-0">Display</span>
                  <div className="flex items-center gap-6">
                    {(['On', 'Off'] as const).map((dsp) => {
                      const isChecked = settingReportFooterDisplay === dsp;
                      return (
                        <label
                          key={dsp}
                          onClick={() => setSettingReportFooterDisplay(dsp)}
                          className="flex items-center gap-1.5 cursor-pointer text-slate-300"
                        >
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isChecked ? 'border-blue-400 bg-blue-500' : 'border-[#264478] bg-[#0b0f19]'}`}>
                            {isChecked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <span className="text-xs">{dsp}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Ok / Cancel */}
              <div className="flex items-center justify-center gap-4 pt-1">
                <button
                  onClick={() => {
                    setIsPrinterSettingsOpen(false);
                    toast.success('Paramètres', 'Configuration d\'impression enregistrée.');
                  }}
                  className="px-8 py-1 bg-[#254b82] hover:bg-[#3162a8] border border-[#3b72bf] rounded text-xs font-bold text-white shadow cursor-pointer transition-colors"
                >
                  Ok
                </button>
                <button
                  onClick={() => setIsPrinterSettingsOpen(false)}
                  className="px-8 py-1 bg-[#254b82] hover:bg-[#3162a8] border border-[#3b72bf] rounded text-xs font-bold text-white shadow cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NanoPixStudio;

