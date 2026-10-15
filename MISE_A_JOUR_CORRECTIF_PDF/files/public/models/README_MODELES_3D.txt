====================================================================================================
GUIDE DES MODÈLES 3D ANATOMIQUES - CABINET DR. SALMA TIJINI
====================================================================================================

L'application intègre un système hybride à double moteur pour le rendu 3D de l'odontogramme :

1. MOTEUR ACTIF PAR DÉFAUT : Moteur Anatomique Procédural Haute Fidélité PBR
   - Fonctionne immédiatement sans aucun fichier supplémentaire (100% autonome et hors-ligne).
   - Intègre les morphologies réelles : incisives en pelle, canines avec arête labiale,
     prémolaires bicuspides, molaires quadricuspides avec sillons et fossettes.
   - Restorations ciblées par face dentaire (Occlusale, Mésiale, Distale, Vestibulaire, Linguale, MOD).
   - Gencives festonnées (papilles interdentaires) et racines anatomiques avec canaux endodontiques.

2. MOTEUR PRO / STUDIO : Importation d'un Modèle 3D Réel (GLB / GLTF)
   Pour utiliser un scan 3D médical haute définition ou un modèle d'arcade issu de votre laboratoire :

   A. Emplacement des fichiers :
      - Arcade Adulte (32 dents) : frontend/public/models/dental_arch_adult.glb
      - Arcade Enfant (20 dents) : frontend/public/models/dental_arch_child.glb

   B. Convention de nommage des nœuds (Meshes) dans le fichier .GLB :
      Chaque dent doit être un objet/nœud séparé nommé selon sa numérotation FDI :
      - Maxillaire Supérieur : Tooth_18, Tooth_17, Tooth_16, Tooth_15, Tooth_14, Tooth_13, Tooth_12, Tooth_11,
                               Tooth_21, Tooth_22, Tooth_23, Tooth_24, Tooth_25, Tooth_26, Tooth_27, Tooth_28
      - Mandibule Inférieure : Tooth_48, Tooth_47, Tooth_46, Tooth_45, Tooth_44, Tooth_43, Tooth_42, Tooth_41,
                               Tooth_31, Tooth_32, Tooth_33, Tooth_34, Tooth_35, Tooth_36, Tooth_37, Tooth_38
      - Gencives (optionnel) : Gingiva_Maxillary, Gingiva_Mandibular

   C. Détection automatique :
      Dès qu'un fichier "dental_arch_adult.glb" est déposé dans ce dossier, le visualiseur 3D
      détecte automatiquement le fichier, extrait chaque dent et active le badge "Modèle GLTF Studio".
      Si le fichier est absent ou corrompu, le système bascule gracieusement et instantanément
      sur le moteur procédural sans aucune erreur ni écran blanc.

====================================================================================================
