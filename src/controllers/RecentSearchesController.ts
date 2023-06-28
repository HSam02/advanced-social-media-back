import { Request, Response } from "express";
import RecentSearchesModel from "../models/recentSearches.js";

export const addToRecent = async (req: Request, res: Response) => {
  try {
    await RecentSearchesModel.findOneAndDelete({ user: req.myId, search: req.params.id });
    const doc = new RecentSearchesModel({
      user: req.myId,
      search: req.params.id,
    });
    await doc.save();

    res.json({
      success: true,
    });
  } catch (error) {
    res.status(400).json({
      message: "Server Error",
      error,
    });
  }
};

export const getRecents = async (req: Request, res: Response) => {
  try {
    const recents = await RecentSearchesModel.find({ user: req.myId })
      .populate({ path: "search", select: ["username", "fullname", "avatarDest"] })
      .select("search")
      .sort("-createdAt")
      .limit(25);
    if (!recents) {
      return res.status(400).json({
        message: "Error when getting recents",
      });
    }
    res.json(recents);
  } catch (error) {
    res.status(400).json({
      message: "Server Error",
      error,
    });
  }
};

export const removeRecent = async (req: Request, res: Response) => {
  try {
    await RecentSearchesModel.findOneAndDelete({ user: req.myId, search: req.params.id });
    res.json({
      success: true,
    });
  } catch (error) {
    res.status(400).json({
      message: "Server Error",
      error,
    });
  }
};

export const removeAll = async (req: Request, res: Response) => {
  try {
    await RecentSearchesModel.deleteMany({ user: req.myId });
    res.json({
      success: true,
    });
  } catch (error) {
    res.status(400).json({
      message: "Server Error",
      error,
    });
  }
};
