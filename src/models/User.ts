// src/models/User.ts
// User model

/*
Mongoose: Es una librería/ODM (Object Document Mapper) para Node.js que se conecta a MongoDB. Mongoose proporciona una capa adicional sobre el cliente de MongoDB, facilitando la definición de esquemas, validación, creación de modelos y la interacción con la base de datos. Básicamente, Mongoose ayuda a trabajar con MongoDB de una forma más estructurada y con tipado más estricto, mientras que MongoDB es únicamente la base de datos subyacente.
*/
import { Schema, model, Document } from 'mongoose';

/*
En Mongoose, cuando utilizamos TypeScript, es habitual crear interfaces que describan la forma de los documentos que almacenaremos en la base de datos. Estas interfaces suelen extender de Document (proporcionado por Mongoose) para asegurarnos de que nuestras instancias del modelo tengan no solo las propiedades personalizadas de nuestro esquema, sino también las propiedades y métodos heredados de un documento de Mongoose. En Mongoose, cuando utilizamos TypeScript, es habitual crear interfaces que describan la forma de los documentos que almacenaremos en la base de datos. Estas interfaces suelen extender de Document (proporcionado por Mongoose) para asegurarnos de que nuestras instancias del modelo tengan no solo las propiedades personalizadas de nuestro esquema, sino también las propiedades y métodos heredados de un documento de Mongoose. En Mongoose, cuando utilizamos TypeScript, es habitual crear interfaces que describan la forma de los documentos que almacenaremos en la base de datos. Estas interfaces suelen extender de Document (proporcionado por Mongoose) para asegurarnos de que nuestras instancias del modelo tengan no solo las propiedades personalizadas de nuestro esquema, sino también las propiedades y métodos heredados de un documento de Mongoose.
*/
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default model<IUser>('User', UserSchema);
