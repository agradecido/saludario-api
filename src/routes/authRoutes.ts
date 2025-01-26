// src/routes/authRoutes.ts
// Defines endpoints for user registration and login

import { Router } from 'express';
import { registerUser, loginUser } from '../controllers/authController';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);

export default router;
