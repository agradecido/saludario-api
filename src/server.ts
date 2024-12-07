// server.ts
// Entry point for the application server

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db';

dotenv.config();

const app = express();

// Connect to the database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Basic route (for testing)
app.get('/', (req, res) => {
    res.send('Food Diary API is running.');
});

// Define routes (will be implemented later)
// Example: app.use('/api/food-entries', require('./routes/foodEntries'));
// Example: app.use('/api/auth', require('./routes/auth'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
