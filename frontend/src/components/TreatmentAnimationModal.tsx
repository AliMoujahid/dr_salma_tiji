import React, { useState } from 'react';
import { X, Play, Pause, RotateCcw, CheckCircle2, ChevronRight, Activity } from 'lucide-react';

interface TreatmentAnimationModalProps {
  treatmentType: string;
  toothNumber: number;
  onClose: () => void;
}

interface Step {
  title: string;
  desc: string;
  duration: string;
}

const treatmentDetails: Record<string, { title: string; steps: Step[]; color: string }> = {
  Implant: {
    title: 'Pose d\'Implant Dentaire en Titane',
    color: '#3b82f6',
    steps: [
      { title: '1. Préparation Ostéotomie', desc: 'Forage de précision du logement de l\'implant dans l\'os alvéolaire sous anesthésie.', duration: '20-30 min' },
      { title: '2. Insertion de l\'Implant en Titane', desc: 'Vissage de l\'implant biocompatible pour initier l\'ostéointégration.', duration: '15 min' },
      { title: '3. Pose du Pilar & Empreinte', desc: 'Fixation du pilier prothétique après cicatrisation osseuse.', duration: '10 min' },
      { title: '4. Scellement de la Couronne', desc: 'Fixation finale de la couronne céramique sur mesure.', duration: '15 min' },
    ],
  },
  'Root Canal': {
    title: 'Traitement Endodontique (Dévitalisation)',
    color: '#ec4899',
    steps: [
      { title: '1. Ouverture de la Chambre Pulpaire', desc: 'Élimination de la carie et accès aux canaux radiculaires.', duration: '15 min' },
      { title: '2. Nettoyage & Désinfection', desc: 'Mise en forme des canaux avec limes en NiTi et désinfection à l\'hypochlorite.', duration: '25 min' },
      { title: '3. Obturation des Canaux', desc: 'Comblement étanche avec cônes de gutta-percha et ciment biocéramique.', duration: '15 min' },
      { title: '4. Reconstitution coronaire', desc: 'Pose d\'un composite ou inlay-core pour consolider la dent.', duration: '15 min' },
    ],
  },
  Extracted: {
    title: 'Avulsion / Extraction Dentaire',
    color: '#ef4444',
    steps: [
      { title: '1. Syndesmotomie & Anesthésie', desc: 'Anesthésie locorégionale et séparation de l\'attache épithéliale.', duration: '10 min' },
      { title: '2. Luxation à l\'Élévateur', desc: 'Mobilisation douce de la racine hors de son alvéole.', duration: '10 min' },
      { title: '3. Extraction & Curetage', desc: 'Retrait de la dent et nettoyage alvéolaire minutieux.', duration: '5 min' },
      { title: '4. Hémostase & Sutures', desc: 'Compression avec compresse stérile et sutures résorbables.', duration: '10 min' },
    ],
  },
  Crown: {
    title: 'Pose de Couronne Céramo-Prothétique',
    color: '#f59e0b',
    steps: [
      { title: '1. Taille Prothétique (Préparation)', desc: 'Taille homothétique de la dent avec limite cervicale nette.', duration: '30 min' },
      { title: '2. Empreinte Optique 3D', desc: 'Numérisation haute précision de la préparation et de l\'antagoniste.', duration: '10 min' },
      { title: '3. Couronne Provisoire', desc: 'Pose d\'une couronne résine provisoire en attente du laboratoire.', duration: '10 min' },
      { title: '4. Assemblage & Scellement', desc: 'Essayage, réglage de l\'occlusion et scellement définitif.', duration: '20 min' },
    ],
  },
};

export const TreatmentAnimationModal: React.FC<TreatmentAnimationModalProps> = ({
  treatmentType,
  toothNumber,
  onClose,
}) => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  const info = treatmentDetails[treatmentType] || {
    title: `Intervention Clinique - ${treatmentType}`,
    color: '#6366f1',
    steps: [
      { title: '1. Examen & Préparation', desc: 'Diagnostic clinique et préparation de la zone d\'intervention.', duration: '10 min' },
      { title: '2. Réalisation de l\'acte', desc: 'Exécution de la procédure thérapeutique avec précision.', duration: '30 min' },
      { title: '3. Contrôle & Recommandations', desc: 'Vérification occlusale et conseils post-opératoires.', duration: '10 min' },
    ],
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 text-white">
      <div className="w-full max-w-4xl rounded-3xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Interactive 3D Canvas / Visual Area */}
        <div className="flex-1 bg-slate-950 p-6 flex flex-col justify-between relative min-h-[340px]">
          {/* Header Badge */}
          <div className="flex justify-between items-center z-10">
            <div className="flex items-center gap-2.5">
              <div
                className="w-3 h-3 rounded-full animate-pulse"
                style={{ backgroundColor: info.color }}
              />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Dent N° {toothNumber} — Simulation 3D
              </span>
            </div>
            <span className="text-xxs px-2.5 py-1 rounded-full bg-white/10 text-slate-300 font-mono">
              Étape {activeStep + 1} / {info.steps.length}
            </span>
          </div>

          {/* 3D Visual Mesh Simulation Placeholder */}
          <div className="my-auto flex flex-col items-center justify-center gap-4 text-center py-8">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <div
                className="absolute inset-0 rounded-full blur-xl opacity-40 animate-pulse"
                style={{ backgroundColor: info.color }}
              />
              <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                <Activity className="w-10 h-10 text-blue-400 animate-bounce" />
              </div>
            </div>
            <div>
              <h4 className="text-base font-extrabold text-white mb-1">
                {info.steps[activeStep].title}
              </h4>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed mx-auto">
                {info.steps[activeStep].desc}
              </p>
            </div>
          </div>

          {/* Animation playback controls */}
          <div className="flex items-center justify-between border-t border-white/10 pt-4 z-10">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white transition-all cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setActiveStep(0)}
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={activeStep === 0}
                onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                className="px-3 h-9 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-xs font-semibold cursor-pointer"
              >
                Précédent
              </button>
              <button
                disabled={activeStep === info.steps.length - 1}
                onClick={() => setActiveStep(Math.min(info.steps.length - 1, activeStep + 1))}
                className="px-3 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-xs font-semibold cursor-pointer flex items-center gap-1"
              >
                Suivant <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Info Sidebar */}
        <div className="w-full md:w-80 p-6 bg-slate-900 border-t md:border-t-0 md:border-l border-white/10 flex flex-col justify-between gap-6">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-base font-bold text-white leading-snug">{info.title}</h3>
                <p className="text-xs text-slate-400">Guide Thérapeutique & Pédagogique</p>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sequence steps timeline */}
            <div className="flex flex-col gap-3">
              {info.steps.map((s, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    activeStep === idx
                      ? 'bg-blue-600/15 border-blue-500/50 text-white'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {activeStep === idx ? (
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-slate-800 text-xxs flex items-center justify-center font-mono shrink-0 mt-0.5 text-slate-400">
                      {idx + 1}
                    </span>
                  )}
                  <div>
                    <h5 className="text-xs font-bold text-slate-200">{s.title}</h5>
                    <p className="text-xxs text-slate-400 mt-0.5">{s.duration}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full h-10 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-all cursor-pointer"
          >
            Fermer la Simulation
          </button>
        </div>

      </div>
    </div>
  );
};
