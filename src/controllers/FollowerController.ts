import { Request, Response } from "express";
import mongoose, { Document } from "mongoose";
import FollowerModel, { IFollower } from "../models/followerModel.js";
import { IUser, IUserSchema } from "../models/user.js";

export const getFollowData = async (myId: string, userId: string) => {
  const followed = myId ? Boolean(await FollowerModel.findOne({ user: myId, followTo: userId })) : false;
  const following = myId ? Boolean(await FollowerModel.findOne({ user: userId, followTo: myId })) : false;
  const followersCount = await FollowerModel.countDocuments({ followTo: userId });
  const followingCount = await FollowerModel.countDocuments({ user: userId });

  return { followed, following, followersCount, followingCount };
};

export const getUsersFollowData = async (users: IUser[], myId?: string) => {
  const userIds = users.map((user) => user._id);

  const followedArray = await FollowerModel.aggregate<IFollower>([
    {
      $match: {
        user: new mongoose.Types.ObjectId(myId),
        followTo: { $in: userIds },
      },
    },
  ]);

  const followingArray = await FollowerModel.aggregate<IFollower>([
    {
      $match: {
        user: { $in: userIds },
        followTo: new mongoose.Types.ObjectId(myId),
      },
    },
  ]);

  return users.map((user) => ({
    ...(
      user as unknown as
        | (Document<unknown, any, IUserSchema> &
            IUserSchema &
            Required<{
              _id: mongoose.Schema.Types.ObjectId;
            }>)
        | null
    )?.toObject(),
    followData: {
      followed: followedArray.some((followed) => followed.followTo.toString() === user._id.toString()),
      following: followingArray.some((following) => following.user.toString() === user._id.toString()),
    },
  }));
};

export const followTo = async (req: Request, res: Response) => {
  try {
    if (req.myId === req.params.id) {
      return res.status(400).json({
        message: "You can't follow yourself",
      });
    }
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

export const removeFollower = async (req: Request, res: Response) => {
  try {
    await FollowerModel.deleteOne({ user: req.params.id, followTo: req.myId });
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

export const getFollowers = async (req: Request, res: Response) => {
  try {
    const lastId = req.query.lastId;
    const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 10;
    const followersCount = await FollowerModel.countDocuments({ followTo: req.userId });

    const query: { followTo?: string; _id?: { $lt: string } } = {
      followTo: req.userId,
    };

    if (lastId) {
      const lastFollow = await FollowerModel.findOne({ user: lastId, followTo: req.userId });
      if (lastFollow) {
        query._id = { $lt: lastFollow._id.toString() };
      }
    }

    const followers = (
      await FollowerModel.find(query)
        .sort("-createdAt")
        .limit(limit)
        .populate({ path: "user", select: ["username", "fullname", "avatarDest"] })
        .exec()
    ).map((follower) => follower.toObject().user);

    if (!followers) {
      return res.status(404).json({
        message: "Followers didn't find",
      });
    }

    const followersWithFollowingData = await getUsersFollowData(followers as unknown as IUser[], req.myId);

    res.json({ follows: followersWithFollowingData, followsCount: followersCount });
  } catch (error) {
    res.status(400).json({
      message: "Server error",
      error,
    });
  }
};

export const getFollowing = async (req: Request, res: Response) => {
  try {
    const lastId = req.query.lastId;
    const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 10;
    const followingCount = await FollowerModel.countDocuments({ user: req.userId });

    const query: { user?: string; _id?: { $lt: string } } = {
      user: req.userId,
    };

    if (lastId) {
      const lastFollow = await FollowerModel.findOne({ user: req.userId, followTo: req.userId });
      if (lastFollow) {
        query._id = { $lt: lastFollow._id.toString() };
      }
    }

    const followers = (
      await FollowerModel.find(query)
        .limit(limit)
        .populate({ path: "followTo", select: ["username", "fullname", "avatarDest"] })
        .exec()
    ).map((follower) => follower.toObject().followTo);

    if (!followers) {
      return res.status(404).json({
        message: "Follows didn't find",
      });
    }

    const followersWithFollowingData = await getUsersFollowData(followers as unknown as IUser[], req.myId);

    res.json({ follows: followersWithFollowingData, followsCount: followingCount });
  } catch (error) {
    res.status(400).json({
      message: "Server error",
      error,
    });
  }
};
