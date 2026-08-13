import React, { useState, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Sliders, Ruler, Eye, Info } from 'lucide-react';
import { XRayMeasurement } from '../types';

interface XRayViewerModalProps {
  imageUrl: string;
  title?: string;
  onClose: () => void;
  onSaveMeasurements?: (measurements: XRayMeasurement[]) => void;
  initialMeasurements?: XRayMeasurement[];
}

export const XRayViewerModal: React.FC<XRayViewerModalProps> = ({
  imageUrl,
  title = 'Radiographie Dentaire (X-Ray)',
  onClose,
  onSaveMeasurements,
  initialMeasurements = [],
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [invert, setInvert] = useState<boolean>(false);
  const [tool, setTool] = useState<'pan' | 'distance' | 'angle' | 'implant'>('pan');

  // Interactive measurement points draft
  const [measurements, setMeasurements] = useState<XRayMeasurement[]>(initialMeasurements);
  const [activePoints, setActivePoints] = useState<{ x: number; y: number }[]>([]);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan position
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (tool === 'pan') {
      setIsDragging(true);
      dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left - pan.x) / zoom;
    const clickY = (e.clientY - rect.top - pan.y) / zoom;

    const newPoints = [...activePoints, { x: clickX, y: clickY }];
    setActivePoints(newPoints);

    // If tool is Distance or Implant (needs 2 points)
    if ((tool === 'distance' || tool === 'implant') && newPoints.length === 2) {
      const p1 = newPoints[0];
      const p2 = newPoints[1];
      const distPx = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      // Standard calibration factor (e.g., 0.08 mm per pixel)
      const distMm = (distPx * 0.08).toFixed(1);

      const newMeasurement: XRayMeasurement = {
        id: Date.now().toString(),
        type: tool === 'implant' ? 'ImplantLength' : 'Distance',
        label: tool === 'implant' ? `Longueur Implant: ${distMm} mm` : `Distance: ${distMm} mm`,
        value: `${distMm} mm`,
        points: newPoints,
        color: tool === 'implant' ? '#3b82f6' : '#10b981',
      };

      setMeasurements([...measurements, newMeasurement]);
      setActivePoints([]);
    }

    // If tool is Angle (needs 3 points)
    if (tool === 'angle' && newPoints.length === 3) {
      const [p1, p2, p3] = newPoints; // p2 is vertex
      const angleRad =
        Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
      let angleDeg = Math.abs((angleRad * 180) / Math.PI);
      if (angleDeg > 180) angleDeg = 360 - angleDeg;

      const newMeasurement: XRayMeasurement = {
        id: Date.now().toString(),
        type: 'Angle',
        label: `Angle: ${angleDeg.toFixed(1)}°`,
        value: `${angleDeg.toFixed(1)}°`,
        points: newPoints,
        color: '#f59e0b',
      };

      setMeasurements([...measurements, newMeasurement]);
      setActivePoints([]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging && tool === 'pan') {
      setPan({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetFilters = () => {
    setZoom(1);
    setBrightness(100);
    setContrast(100);
    setInvert(false);
    setPan({ x: 0, y: 0 });
    setActivePoints([]);
  };

  const deleteMeasurement = (id: string) => {
    setMeasurements(measurements.filter((m) => m.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col overflow-hidden text-white font-sans">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
            XR
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{title}</h2>
            <p className="text-xs text-slate-400">Visualiseur de Radiographie Haute Résolution & Outils de Mesure</p>
          </div>
        </div>

        {/* Action Controls & Close */}
        <div className="flex items-center gap-3">
          {onSaveMeasurements && (
            <button
              onClick={() => onSaveMeasurements(measurements)}
              className="px-4 h-9 bg-blue-600 hover:bg-blue-500 text-xs font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/20 cursor-pointer"
            >
              Enregistrer Mesures
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Canvas Area + Toolbar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <div className="w-72 border-r border-white/10 bg-slate-950/60 p-5 flex flex-col gap-6 overflow-y-auto no-scrollbar">
          
          {/* Tools selection */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Outil de Navigation</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setTool('pan'); setActivePoints([]); }}
                className={`flex items-center gap-2 h-10 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  tool === 'pan' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <Eye className="w-4 h-4" /> Pan / Zoom
              </button>
              <button
                onClick={() => { setTool('distance'); setActivePoints([]); }}
                className={`flex items-center gap-2 h-10 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  tool === 'distance' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <Ruler className="w-4 h-4" /> Distance
              </button>
              <button
                onClick={() => { setTool('angle'); setActivePoints([]); }}
                className={`flex items-center gap-2 h-10 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  tool === 'angle' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <Sliders className="w-4 h-4" /> Angle
              </button>
              <button
                onClick={() => { setTool('implant'); setActivePoints([]); }}
                className={`flex items-center gap-2 h-10 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  tool === 'implant' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <Info className="w-4 h-4" /> Implant
              </button>
            </div>
          </div>

          {/* Image Adjustments */}
          <div className="flex flex-col gap-4 border-t border-white/10 pt-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Ajustements Image</span>
            
            {/* Brightness */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Luminosité</span>
                <span className="font-mono text-blue-400">{brightness}%</span>
              </div>
              <input
                type="range"
                min="30"
                max="200"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Contrast */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Contraste</span>
                <span className="font-mono text-blue-400">{contrast}%</span>
              </div>
              <input
                type="range"
                min="30"
                max="250"
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Invert */}
            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-slate-300 font-semibold">Mode Négatif (Inverser)</span>
              <button
                onClick={() => setInvert(!invert)}
                className={`w-11 h-6 rounded-full transition-all relative p-0.5 cursor-pointer ${
                  invert ? 'bg-blue-600' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white transition-all transform ${
                    invert ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Quick Zoom Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                className="flex-1 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white border border-white/5 cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-slate-300 w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(Math.min(5, zoom + 0.25))}
                className="flex-1 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white border border-white/5 cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={resetFilters}
                className="h-9 w-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white border border-white/5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Measurements List */}
          <div className="flex flex-col gap-2 border-t border-white/10 pt-4 flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Mesures Calibrées ({measurements.length})</span>
            {measurements.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">Cliquez sur l'image pour mesurer une distance ou un angle.</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto no-scrollbar">
                {measurements.map((m) => (
                  <div
                    key={m.id}
                    className="flex justify-between items-center p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color || '#10b981' }} />
                      <span className="font-semibold text-slate-200">{m.label}</span>
                    </div>
                    <button
                      onClick={() => deleteMeasurement(m.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Viewport Canvas */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="flex-1 bg-black relative overflow-hidden flex items-center justify-center cursor-crosshair select-none"
        >
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              filter: `brightness(${brightness}%) contrast(${contrast}%) ${invert ? 'invert(100%)' : ''}`,
              transition: isDragging ? 'none' : 'transform 0.1s linear',
            }}
            className="relative flex items-center justify-center max-w-full max-h-full"
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt="X-Ray Radiography"
              className="max-w-[85vw] max-h-[85vh] object-contain rounded-lg shadow-2xl pointer-events-none"
            />

            {/* Render Overlay Measurements */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {measurements.map((m) => (
                <g key={m.id}>
                  {m.points.length >= 2 && (
                    <line
                      x1={m.points[0].x}
                      y1={m.points[0].y}
                      x2={m.points[1].x}
                      y2={m.points[1].y}
                      stroke={m.color || '#10b981'}
                      strokeWidth="2.5"
                      strokeDasharray={m.type === 'ImplantLength' ? '4,4' : undefined}
                    />
                  )}
                  {m.points.length === 3 && (
                    <line
                      x1={m.points[1].x}
                      y1={m.points[1].y}
                      x2={m.points[2].x}
                      y2={m.points[2].y}
                      stroke={m.color || '#f59e0b'}
                      strokeWidth="2.5"
                    />
                  )}
                  {m.points.map((pt, idx) => (
                    <circle
                      key={idx}
                      cx={pt.x}
                      cy={pt.y}
                      r="4"
                      fill={m.color || '#10b981'}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                  ))}
                  {m.points.length >= 2 && (
                    <text
                      x={(m.points[0].x + m.points[1].x) / 2}
                      y={(m.points[0].y + m.points[1].y) / 2 - 8}
                      fill="#ffffff"
                      fontSize="12"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="bg-slate-900 drop-shadow-md"
                    >
                      {m.value}
                    </text>
                  )}
                </g>
              ))}

              {/* Active drawing draft points */}
              {activePoints.map((pt, idx) => (
                <circle
                  key={`draft-${idx}`}
                  cx={pt.x}
                  cy={pt.y}
                  r="5"
                  fill="#3b82f6"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              ))}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
