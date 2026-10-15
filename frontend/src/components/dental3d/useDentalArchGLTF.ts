import { useState, useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface UseDentalArchGLTFResult {
  hasGLTF: boolean;
  isLoading: boolean;
  error: string | null;
  toothGeometries: Record<number, THREE.BufferGeometry>;
  maxillaryGingivaGeo: THREE.BufferGeometry | null;
  mandibularGingivaGeo: THREE.BufferGeometry | null;
}

/**
 * Robust, fault-tolerant GLTF loader for external anatomical dental arches.
 * Probes for model presence first to prevent Vite HTML 404 fallback crashes,
 * then maps nodes by FDI number (e.g. "Tooth_11", "Tooth11", "11").
 */
export const useDentalArchGLTF = (archType: 'Adult' | 'Child' = 'Adult'): UseDentalArchGLTFResult => {
  const [hasGLTF, setHasGLTF] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toothGeometries, setToothGeometries] = useState<Record<number, THREE.BufferGeometry>>({});
  const [maxillaryGingivaGeo, setMaxillaryGingivaGeo] = useState<THREE.BufferGeometry | null>(null);
  const [mandibularGingivaGeo, setMandibularGingivaGeo] = useState<THREE.BufferGeometry | null>(null);

  const modelPath = archType === 'Adult'
    ? '/models/dental_arch_adult.glb'
    : '/models/dental_arch_child.glb';

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    // 1. Probe if model file actually exists to avoid HTML 404 parsing errors
    fetch(modelPath, { method: 'HEAD' })
      .then((res) => {
        const contentType = res.headers.get('content-type') || '';
        if (!res.ok || contentType.includes('text/html')) {
          // File does not exist yet; trigger graceful fallback
          if (isMounted) {
            setHasGLTF(false);
            setIsLoading(false);
          }
          return null;
        }
        return modelPath;
      })
      .then((validPath) => {
        if (!validPath || !isMounted) return;

        const loader = new GLTFLoader();
        loader.load(
          validPath,
          (gltf) => {
            if (!isMounted) return;
            const extractedGeos: Record<number, THREE.BufferGeometry> = {};
            let maxGingiva: THREE.BufferGeometry | null = null;
            let mandGingiva: THREE.BufferGeometry | null = null;

            gltf.scene.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                const name = mesh.name || '';

                // Match FDI tooth numbering patterns (e.g. Tooth_11, Tooth11, FDI_11, 11)
                const fdiMatch = name.match(/(?:tooth[_-]?|fdi[_-]?)?(\d{2})/i);
                if (fdiMatch) {
                  const num = parseInt(fdiMatch[1], 10);
                  if ((num >= 11 && num <= 48) || (num >= 51 && num <= 85)) {
                    // Clone geometry to isolate from shared scene cache
                    extractedGeos[num] = mesh.geometry.clone();
                  }
                }

                // Match Gingiva / Gum meshes
                if (/gingiva|gum|gencive.*maxill/i.test(name)) {
                  maxGingiva = mesh.geometry.clone();
                } else if (/gingiva|gum|gencive.*mandib/i.test(name)) {
                  mandGingiva = mesh.geometry.clone();
                }
              }
            });

            if (Object.keys(extractedGeos).length > 0) {
              setToothGeometries(extractedGeos);
              setMaxillaryGingivaGeo(maxGingiva);
              setMandibularGingivaGeo(mandGingiva);
              setHasGLTF(true);
            } else {
              setHasGLTF(false);
            }
            setIsLoading(false);
          },
          undefined,
          (err: any) => {
            if (!isMounted) return;
            console.info(`[Dental3D] Modèle GLB ${modelPath} non détecté ou non supporté. Utilisation du moteur anatomique procédural optimisé.`);
            setHasGLTF(false);
            setError(err?.message || 'Failed to load dental model');
            setIsLoading(false);
          }

        );
      })
      .catch((err) => {
        if (!isMounted) return;
        setHasGLTF(false);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [modelPath, archType]);

  return {
    hasGLTF,
    isLoading,
    error,
    toothGeometries,
    maxillaryGingivaGeo,
    mandibularGingivaGeo,
  };
};
