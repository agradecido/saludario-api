// src/controllers/foodEntriesController.ts

import { Request, Response } from 'express';
import FoodEntry from '../models/FoodEntry';

export const addFoodEntry = async (req: Request, res: Response) => {
	try {
		const { name, category, timestamp, notes } = req.body;
		const foodEntry = new FoodEntry({
			user: req.user?.id,
			name,
			category,
			timestamp,
			notes
		});
		await foodEntry.save();
		res.status(201).json(foodEntry);
	} catch (error) {
		console.error(error);
		res.status(400).json({ message: 'Error adding food entry' });
	}
};

export const getFoodEntries = async (req: Request, res: Response) => {
	try {
		const foodEntries = await FoodEntry.find({ user: req.user?.id });
		res.status(200).json(foodEntries);
	} catch (error) {
		console.error(error);
		res.status(400).json({ message: 'Error fetching food entries' });
	}
};

export const getFoodEntry = async (req: Request, res: Response) => {
	try {
		const foodEntry = await FoodEntry.findOne({ _id: req.params.id, user: req.user?.id });
		if (!foodEntry) {
			return res.status(404).json({ message: 'Food entry not found' });
		}
		res.status(200).json(foodEntry);
	} catch (error) {
		console.error(error);
		res.status(400).json({ message: 'Error fetching food entry' });
	}
};

export const updateFoodEntry = async (req: Request, res: Response) => {
	try {
		const { name, category, timestamp, notes } = req.body;
		const foodEntry = await FoodEntry.findOneAndUpdate(
			{ _id: req.params.id, user: req.user?.id },
			{ name, category, timestamp, notes },
			{ new: true }
		);
		if (!foodEntry) {
			return res.status(404).json({ message: 'Food entry not found' });
		}
		res.status(200).json(foodEntry);
	} catch (error) {
		console.error(error);
		res.status(400).json({ message: 'Error updating food entry' });
	}
};

export const deleteFoodEntry = async (req: Request, res: Response) => {
	try {
		const foodEntry = await FoodEntry.findOneAndDelete({ _id: req.params.id, user: req.user?.id });
		if (!foodEntry) {
			return res.status(404).json({ message: 'Food entry not found' });
		}
		res.status(204).json({ message: 'Food entry deleted' });
	} catch (error) {
		console.error(error);
		res.status(400).json({ message: 'Error deleting food entry' });
	}
};
