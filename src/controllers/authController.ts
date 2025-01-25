// src/controllers/authController.ts
// Handles user registration and login

import { RequestHandler } from 'express';
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';

export const registerUser: RequestHandler = async (req: Request, res: Response) => {
	try {
		const { name, email, password } = req.body;

		// Check if user already exists
		const existingUser = await User.findOne({ email });
		if (existingUser) {
			res.status(400).json({ msg: 'User already exists.' });
		}

		// Hash the password
		const saltRounds = 10;
		const hashedPassword = await bcrypt.hash(password, saltRounds);

		// Create the user
		const newUser = new User<IUser>({
			name,
			email,
			password: hashedPassword,
		} as IUser);
		
		await newUser.save();

		// Generate JWT
		const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET as string, {
			expiresIn: '1d',
		});

		res.status(201).json({
			msg: 'User registered successfully.',
			token,
			user: {
				id: newUser._id,
				name: newUser.name,
				email: newUser.email,
			},
		});
	} catch (error) {
		console.error('Error in registerUser:', error);
		res.status(500).json({ msg: 'Server error.' });
	}
};

export const loginUser: RequestHandler = async (req: Request, res: Response) => {
	try {
		const { email, password } = req.body;

		// Check if user exists
		const user = await User.findOne({ email });
		if (!user) {
			res.status(400).json({ msg: 'Invalid credentials.' });
			return;
		}

		// Compare password
		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			res.status(400).json({ msg: 'Invalid credentials.' });
		}

		// Generate JWT
		const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET as string, {
			expiresIn: '1d',
		});

		res.status(200).json({
			msg: 'Login successful.',
			token,
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
			},
		});
	} catch (error) {
		console.error('Error in loginUser:', error);
		res.status(500).json({ msg: 'Server error.' });
	}
};
