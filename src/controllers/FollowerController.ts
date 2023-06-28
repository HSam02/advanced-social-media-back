import { Request, Response } from "express";
import FollowerModel from "../models/followerModel.js";

export const getFollowing = async (myId: string, userId: string) => {
  const followed = Boolean(await FollowerModel.findOne({ user: myId, followTo: userId }));
  const following = Boolean(await FollowerModel.findOne({ user: userId, followTo: myId }));
  const followersCount = await FollowerModel.countDocuments({ followTo: userId });
  const followingCount = await FollowerModel.countDocuments({ user: userId });

  return { followed, following, followersCount, followingCount };
};

export const followTo = async (req: Request, res: Response) => {
  try {
    const followed = await FollowerModel.findOne({ user: req.myId, followTo: req.params.id });
    if (followed) {
      return res.status(403).json({
        message: "Already followed",
      });
    }

    const doc = new FollowerModel({
      user: req.myId,
      followTo: req.params.id,
    });
    await doc.save();

    res.json({
      success: true,
    });
  } catch (error) {
    res.status(400).json({
      message: "Server error",
      error,
    });
  }
};

export const unfollow = async (req: Request, res: Response) => {
  try {
    await FollowerModel.deleteOne({ user: req.myId, followTo: req.params.id });
    res.json({
      success: true,
    });
  } catch (error) {
    res.status(400).json({
      message: "Server error",
      error,
    });
  }
};
