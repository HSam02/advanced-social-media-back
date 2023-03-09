import { Request, Response } from "express";
import multer from "multer";
import fs from "fs";

import PostModel, { IPost } from "../models/post.js";
import mongoose, { HydratedDocument } from "mongoose";
import { IUser } from "../models/user.js";

const postsMediaStorage = multer.diskStorage({
	destination: (req, __, callback) => {
		const userDir = `./src/uploads/${req.userId}`;

    if (!fs.existsSync("./src/uploads")) {
      fs.mkdirSync("./src/uploads");
    }

    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir);
    }

    if (!fs.existsSync(`${userDir}/posts`)) {
      fs.mkdirSync(`${userDir}/posts`);
    }

    callback(null, `${userDir}/posts`);
  },
  filename: (req, file, callback) => {
    const fileName = `${req.userId}_${Math.random()
      .toString()
      .replace("0.", "")
      .substring(0, 6)}_${Date.now()}.${file.originalname.split(".").pop()}`;
    req.on("error", () => {
			const dest = `./src/uploads/${req.userId}/posts/${fileName}`;
      if (fs.existsSync(dest)) {
        fs.unlinkSync(dest);
      }
      const err = new Error("Image was not upload");
      err.name = "stop";
      callback(err, fileName);
    });
    callback(null, fileName);
  },
});
const uploadPostMedia = multer({
  storage: postsMediaStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_, file, callback) => {
    if (file.mimetype !== "image/jpeg" && file.mimetype !== "image/png" && file.mimetype !== "video/mp4") {
      callback(null, false);
      const err = new Error("Only .png, .jpg, .jpeg and .mp4 format allowed!");
      err.name = "ExtensionError";
      return callback(err);
    }
    callback(null, true);
  },
}).array("post_media", 10);

export const create = (req: Request, res: Response) => {
  uploadPostMedia(req, res, async (error) => {
    if (error) {
      return res.status(400).json({
        message: "Images were not upload",
        error,
      });
    }
    try {
      const data: IPost = JSON.parse(req.body.data);

      const files = req.files as Express.Multer.File[];
      const filesDest = files.map((file) => file.destination + '/' + file.filename);

      data.media.forEach((media, i) => (media.dest = filesDest[i]));
      data.user = req.userId as unknown as mongoose.Schema.Types.ObjectId;

      const doc: HydratedDocument<IPost> = new PostModel(data);
      const newPost: IPost = await doc.save();

      const post: IPost | null = await PostModel.findById(newPost._id).populate({path: "user", select: ["username", "avatarUrl"]}).exec();

      res.json({
        post,
      });
    } catch (error) {
      res.status(400).json({
				message: "The post didn't create",
				error
			})
    }
  });
};
