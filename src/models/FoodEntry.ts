// src/models/FoodEntry.ts

import { Schema, model, Document, Types } from 'mongoose';

interface IFoodEntry extends Document {
  user: Types.ObjectId; // Referencia al ID de usuario
  name: string;
  category: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  timestamp: Date;
  notes?: string; // Nota opcional
}

const foodEntrySchema = new Schema<IFoodEntry>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  category: {
    type: String,
    enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
    required: true
  },
  timestamp: { type: Date, default: Date.now },
  notes: { type: String }
});

const FoodEntry = model<IFoodEntry>('FoodEntry', foodEntrySchema);

export default FoodEntry;
