// src/models/User.ts

import { Schema, model, Document } from 'mongoose';

// 1. Interfaz que describe el documento de Mongoose:
export interface IUser extends Document {
	name: string;
	email: string;
	password: string;
	createdAt?: Date; // Opcional si se autogenera
}

// 2. Definición del esquema Mongoose:
const UserSchema = new Schema<IUser>({
	name: { type: String, required: true },
	email: { type: String, required: true, unique: true },
	password: { type: String, required: true },
	createdAt: { type: Date, default: Date.now }
});

// 3. Exportamos el modelo
export default model<IUser>('User', UserSchema);

// Usamos UserDocument como un alias de IUser
export type UserDocument = IUser;
