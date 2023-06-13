import { Request, Response } from "express";
import { Schema, Document } from "mongoose";
import CommentModel, { ICommentSchema } from "../models/comment.js";
import UserModel from "../models/user.js";

const getLikedField = (
  userId: string | undefined,
  comments: Omit<
    Document<unknown, any, ICommentSchema> &
      ICommentSchema &
      Required<{
        _id: Schema.Types.ObjectId;
      }>,
    never
  >[],
) => {
  return comments.map((comment) => {
    const liked = Boolean(comment.likes.find((like) => like.user.toString() === userId));
    return {
      ...comment.toObject(),
      liked,
    };
  });
};

export const deleteCommentsByPostId = async (postId: string) => {
  try {
    await CommentModel.deleteMany({ postId });
  } catch (error) {
    console.log(error);
  }
};

export const getCommentsCount = async (postId: string) => {
  try {
    const commentsCount = await CommentModel.countDocuments({ postId });
    return commentsCount;
  } catch (error) {
    return 0;
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const doc = new CommentModel({
      text: req.body.text,
      user: req.myId,
      postId: req.params.id,
    });
    const comment = await doc.save();
    const user = await UserModel.findById(req.myId).select(["username", "avatarDest"]);
    res.json({ ...comment.toObject(), user: user?.toObject(), repliesCount: 0 });
  } catch (error) {
    res.status(400).json({
      message: "Comment didn't create",
      error,
    });
  }
};

export const reply = async (req: Request, res: Response) => {
  try {
    const comment = await CommentModel.findById(req.params.id).select("postId");
    if (!comment) {
      return res.status(404).json({
        message: "Comment didn't find",
      });
    }
    const doc = new CommentModel({
      text: req.body.text,
      user: req.myId,
      parentId: req.params.id,
      postId: comment.postId,
    });
    const reply = await doc.save();
    const user = await UserModel.findById(req.myId).select(["username", "avatarDest"]);
    res.json({ ...reply.toObject(), user: user?.toObject() });
  } catch (error) {
    res.status(400).json({
      message: "Reply didn't create",
      error,
    });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    const comment = await CommentModel.findById(id);
    if (!comment) {
      return res.status(400).json({
        message: "Comment didn't find",
      });
    }

    if (comment.user.toString() !== req.myId) {
      return res.status(403).json({
        message: "No access!",
      });
    }

    await CommentModel.deleteMany({ $or: [{ _id: id }, { parentId: id }] });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({
      message: "Comment didn't delete",
      error,
    });
  }
};

export const getPostComments = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
    const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 10;

    const commentsCount = await CommentModel.countDocuments({ postId: req.params.id, parentId: undefined });
    const pages = Math.ceil(commentsCount / limit) || 1;

    if (page > pages) {
      return res.status(403).json({
        message: "Page number is bigger than possible",
        pages,
      });
    }

    const comments = await CommentModel.find({ postId: req.params.id, parentId: undefined })
      .sort("-createdAt")
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: "user", select: ["username", "avatarDest"] })
      .exec();

    if (!comments) {
      return res.status(404).json({
        message: "The comments didn't find",
      });
    }

    const commentsWithLikedField = getLikedField(req.myId, comments);

    const commentIds = commentsWithLikedField.map((comment) => comment._id);
    const repliesCount = await CommentModel.aggregate([
      { $match: { parentId: { $in: commentIds } } },
      { $group: { _id: "$parentId", count: { $sum: 1 } } },
    ]);

    const commentsWithRepliesCount = commentsWithLikedField.map((comment) => {
      const replyCount = repliesCount.find((count) => count._id.toString() === comment._id.toString());
      return {
        ...comment,
        repliesCount: replyCount ? replyCount.count : 0,
      };
    });

    res.json({
      postId: req.params.id,
      comments: commentsWithRepliesCount,
      pages,
      commentsCount,
    });
  } catch (error) {
    res.status(400).json({
      message: "Comments didn't find",
      error,
    });
  }
};

export const getCommentReplies = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
    const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 10;

    const repliesCount = await CommentModel.countDocuments({ parentId: req.params.id });
    const pages = Math.ceil(repliesCount / limit) || 1;

    if (page > pages) {
      return res.status(403).json({
        message: "Page number is bigger than possible",
        pages,
      });
    }

    const replies = await CommentModel.find({ parentId: req.params.id })
      .sort("-createdAt")
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: "user", select: ["username", "avatarDest"] })
      .exec();

    if (!replies) {
      return res.status(404).json({
        message: "The replies didn't find",
      });
    }

    const repliesWithLikedField = getLikedField(req.myId, replies);

    res.json({
      parentId: req.params.id,
      replies: repliesWithLikedField,
      pages,
      repliesCount,
    });
  } catch (error) {
    res.status(400).json({
      message: "Replies didn't find",
      error,
    });
  }
};

export const addLike = async (req: Request, res: Response) => {
  try {
    const comment = await CommentModel.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { likes: { user: req.myId } } },
      { returnDocument: "after" },
    );
    if (!comment) {
      return res.status(404).json({
        message: "Comment didn't find",
      });
    }

    res.json({
      success: true,
    });
  } catch (error) {
    res.status(400).json({
      message: "The comment didn't find",
      error,
    });
  }
};

export const removeLike = async (req: Request, res: Response) => {
  try {
    const comment = await CommentModel.findByIdAndUpdate(
      req.params.id,
      { $pull: { likes: { user: req.myId } } },
      { returnDocument: "after" },
    );
    if (!comment) {
      return res.status(404).json({
        message: "Comment didn't find",
      });
    }

    res.json({
      success: true,
    });
  } catch (error) {
    res.status(400).json({
      message: "The comment didn't find",
      error,
    });
  }
};