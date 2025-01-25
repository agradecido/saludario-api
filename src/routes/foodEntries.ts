// src/routes/foodEntries.ts 

import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import { addFoodEntry, getFoodEntries } from '../controllers/foodEntriesController';

const router = Router();

// Usar 'protect' para asegurar que solo usuarios autenticados accedan
router.post('/', protect, addFoodEntry);
router.get('/', protect, getFoodEntries);

export default router;
