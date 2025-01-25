// server.ts
// Entry point for the application server

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db';
import authRoutes from './routes/authRoutes';
import foodEntriesRoutes from './routes/foodEntries';
import listEndpoints from 'express-list-routes';


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

app.use('/api/auth', authRoutes);
app.use('/api/food-entries', foodEntriesRoutes);

// Listar rutas al iniciar el servidor
console.log('Registered Routes:');
listEndpoints(app);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
