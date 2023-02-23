import { Request, Response } from "express";
import PostModel, { IPost } from "../models/post.js";
import { HydratedDocument } from "mongoose";
import { IUser } from "../models/user.js";

export const create = async (req: Request, res: Response) => {
  try {
		const doc: HydratedDocument<IPost> = new PostModel({
			image: req.body.image,
			text: req.body.text,
			user: req.userId
		});
		const newPost: IPost = await doc.save();
		const post: IPost | null = await PostModel.findById(newPost._id).populate("user").exec();
  } catch (error) {}
};
