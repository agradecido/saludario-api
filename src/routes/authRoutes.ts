// src/routes/authRoutes.ts
// Defines endpoints for user registration and login

import { Router } from 'express';
import { registerUser, loginUser } from '../controllers/authController';
import { AddFoodEntryComponent } from '../../src/app/components/add-food-entry/add-food-entry.component';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);

export default router;




export const routes: Routes = [
  { path: 'add-food-entry', component: AddFoodEntryComponent },
  { path: '', redirectTo: '/add-food-entry', pathMatch: 'full' }
];
