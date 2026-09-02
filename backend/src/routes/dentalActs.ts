import { Router, Request, Response } from 'express';
import DentalAct from '../models/DentalAct';
import { protect } from '../middleware/auth';

const router = Router();

export const DEFAULT_DENTAL_ACTS = [
  { code: 'ACT-01', name: 'Consultation dentaire', category: 'Consultation & Bilan', defaultPrice: 100, isFavorite: true },
  { code: 'ACT-02', name: 'Radiographie panoramique', category: 'Imagerie & Radiologie', defaultPrice: 200, isFavorite: true },
  { code: 'ACT-03', name: 'Carie simple', category: 'Soins Conservateurs', defaultPrice: 300, isFavorite: true },
  { code: 'ACT-04', name: 'Reconstitution coronaire', category: 'Soins Conservateurs', defaultPrice: 600, isFavorite: true },
  { code: 'ACT-05', name: 'Endodontie (Endo)', category: 'Endodontie', defaultPrice: 600, isFavorite: true },
  { code: 'ACT-06', name: 'Détartrage', category: 'Hygiène & Parodontie', defaultPrice: 400, isFavorite: true },
  { code: 'ACT-07', name: 'Blanchiment dentaire', category: 'Esthétique Dentaire', defaultPrice: 2500, isFavorite: true },
  { code: 'ACT-08', name: 'Extraction (Exo)', category: 'Chirurgie & Extraction', defaultPrice: 500, isFavorite: true },
  { code: 'ACT-09', name: 'Extraction dent de sagesse', category: 'Chirurgie & Extraction', defaultPrice: 1000, isFavorite: true },
  { code: 'ACT-10', name: 'Suture', category: 'Chirurgie & Extraction', defaultPrice: 200, isFavorite: false },
  { code: 'ACT-11', name: 'Couronne zircone', category: 'Prothèses Fixes', defaultPrice: 2500, isFavorite: true },
  { code: 'ACT-12', name: 'Couronne céramique', category: 'Prothèses Fixes', defaultPrice: 1500, isFavorite: true },
  { code: 'ACT-13', name: 'Bridge / Pont dentaire', category: 'Prothèses Fixes', defaultPrice: 3500, isFavorite: true },
  { code: 'ACT-14', name: 'Prothèse totale', category: 'Prothèses Amovibles', defaultPrice: 5000, isFavorite: true },
  { code: 'ACT-15', name: 'Prothèse complète maxillaire', category: 'Prothèses Amovibles', defaultPrice: 3000, isFavorite: false },
  { code: 'ACT-16', name: 'Prothèse complète mandibulaire', category: 'Prothèses Amovibles', defaultPrice: 3000, isFavorite: false },
  { code: 'ACT-17', name: 'Prothèse complète maxillaire et mandibulaire', category: 'Prothèses Amovibles', defaultPrice: 6000, isFavorite: true },
  { code: 'ACT-18', name: 'Facette dentaire (Veneer)', category: 'Esthétique Dentaire', defaultPrice: 2500, isFavorite: false },
  { code: 'ACT-19', name: 'Gouttière occlusale (Bruxisme)', category: 'Orthodontie & Gouttières', defaultPrice: 1200, isFavorite: false },
  { code: 'ACT-20', name: 'Traitement Orthodontique (Semestriel)', category: 'Orthodontie & Gouttières', defaultPrice: 4500, isFavorite: false },
];

// Helper to auto-seed if empty
export async function ensureDefaultActs() {
  try {
    const count = await DentalAct.countDocuments();
    if (count === 0) {
      await DentalAct.insertMany(DEFAULT_DENTAL_ACTS);
      console.log('✅ Default Dental Acts catalog initialized with Moroccan pricing.');
    }
  } catch (err) {
    console.error('Error auto-seeding dental acts:', err);
  }
}

// GET /api/dental-acts
router.get('/', protect, async (req: Request, res: Response) => {
  try {
    let acts = await DentalAct.find({ isActive: true }).sort({ category: 1, name: 1 });
    
    // Auto-seed if empty
    if (acts.length === 0) {
      await ensureDefaultActs();
      acts = await DentalAct.find({ isActive: true }).sort({ category: 1, name: 1 });
    }

    res.json(acts);
  } catch (err) {
    console.error('Error fetching dental acts:', err);
    res.status(500).json({ error: 'Failed to fetch dental acts' });
  }
});

// POST /api/dental-acts (Create Act)
router.post('/', protect, async (req: Request, res: Response) => {
  try {
    const { name, category, defaultPrice, description, isFavorite } = req.body;
    if (!name || defaultPrice === undefined) {
      return res.status(400).json({ error: 'Name and default price are required' });
    }

    const count = await DentalAct.countDocuments();
    const code = `ACT-${String(count + 1).padStart(2, '0')}`;

    const newAct = new DentalAct({
      code,
      name: name.trim(),
      category: category || 'Soins Conservateurs',
      defaultPrice: Number(defaultPrice),
      description: description ? description.trim() : '',
      isFavorite: Boolean(isFavorite),
      isActive: true,
    });

    await newAct.save();
    res.status(201).json(newAct);
  } catch (err) {
    console.error('Error creating dental act:', err);
    res.status(500).json({ error: 'Failed to create dental act' });
  }
});

// PUT /api/dental-acts/:id (Update Act)
router.put('/:id', protect, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, category, defaultPrice, description, isFavorite, isActive } = req.body;

    const updated = await DentalAct.findByIdAndUpdate(
      id,
      {
        ...(name && { name: name.trim() }),
        ...(category && { category }),
        ...(defaultPrice !== undefined && { defaultPrice: Number(defaultPrice) }),
        ...(description !== undefined && { description: description.trim() }),
        ...(isFavorite !== undefined && { isFavorite: Boolean(isFavorite) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Dental act not found' });
    }

    res.json(updated);
  } catch (err) {
    console.error('Error updating dental act:', err);
    res.status(500).json({ error: 'Failed to update dental act' });
  }
});

// DELETE /api/dental-acts/:id (Delete or Soft Delete)
router.delete('/:id', protect, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await DentalAct.findByIdAndDelete(id);
    res.json({ message: 'Dental act deleted successfully' });
  } catch (err) {
    console.error('Error deleting dental act:', err);
    res.status(500).json({ error: 'Failed to delete dental act' });
  }
});

// POST /api/dental-acts/seed (Reset catalog to defaults)
router.post('/seed', protect, async (req: Request, res: Response) => {
  try {
    await DentalAct.deleteMany({});
    const inserted = await DentalAct.insertMany(DEFAULT_DENTAL_ACTS);
    res.json({ message: 'Catalogue réinitialisé avec succès', acts: inserted });
  } catch (err) {
    console.error('Error seeding dental acts:', err);
    res.status(500).json({ error: 'Failed to seed dental acts' });
  }
});

export default router;
