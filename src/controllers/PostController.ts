import { Request, Response } from "express";
import mongoose from "mongoose";
import multer from "multer";
import fs from "fs";
import PostModel, { IPostSchema } from "../models/post.js";
import UserModel, { IUserSchema } from "../models/user.js";

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
      const data: IPostSchema = JSON.parse(req.body.data);

      const files = req.files as Express.Multer.File[];
      const filesDest = files.map((file) => file.destination.slice(5) + "/" + file.filename);

      data.media.forEach((media, i) => (media.dest = filesDest[i]));
      data.user = req.userId as unknown as mongoose.Schema.Types.ObjectId;

      const doc = new PostModel(data);
      const post = await doc.save();
      const user = await UserModel.findOneAndUpdate({ _id: req.userId }, { $push: { posts: post._id } }).select([
        "username",
        "avatarDest",
      ]);

      res.json({
        ...post.toObject(),
        user,
      });
    } catch (error) {
      res.status(400).json({
        message: "The post didn't create",
        error,
      });
    }
  });
};

// export const getUserPosts = async (req: Request, res: Response) => {
//   try {
//     const user = await UserModel.findById<IUserSchema>(req.userId)
//       .select("-passwordHash")
//       .populate({ path: "posts", populate: { path: "user", select: ["username", "avatarDest"] } })
//       .exec();
//     if (!user) {
//       return res.status(404).json({
//         message: "The user didn't find",
//       });
//     }

//     res.json(user.posts.reverse());
//   } catch (error) {
//     res.status(400).json({
//       message: "The post didn't find",
//       error,
//     });
//   }
// };

export const getOne = async (req: Request, res: Response) => {
  try {
    const post = await PostModel.findById(req.params.id)
      .populate({ path: "user", select: ["username", "avatarDest"] })
      .exec();
    if (!post) {
      return res.status(404).json({
        message: "The post didn't find",
      });
    }
    res.json(post);
  } catch (error) {
    res.status(400).json({
      message: "The post didn't find",
      error,
    });
  }
};

export const addLike = async (req: Request, res: Response) => {
  try {
    const post = await PostModel.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { likes: req.userId } },
      { returnDocument: "after" },
    );
    if (!post) {
      return res.status(404).json({
        message: "Post didn't find",
      });
    }

    res.json({
      success: true,
    });
  } catch (error) {
    res.status(400).json({
      message: "The post didn't find",
      error,
    });
  }
};

export const removeLike = async (req: Request, res: Response) => {
  try {
    const post = await PostModel.findByIdAndUpdate(
      req.params.id,
      { $pull: { likes: req.userId } },
      { returnDocument: "after" },
    );
    if (!post) {
      return res.status(404).json({
        message: "Post didn't find",
      });
    }

    res.json({
      success: true,
    });
  } catch (error) {
    res.status(400).json({
      message: "The post didn't find",
      error,
    });
  }
};

export const addSaved = async (req: Request, res: Response) => {
  try {
    const post = await PostModel.findByIdAndUpdate(
      req.params.id,
      { $inc: { saves: 1 } },
      { returnDocument: "after" },
    );
    if (!post) {
      return res.status(404).json({
        message: "Post didn't find",
      });
    }
    const user = await UserModel.findByIdAndUpdate(
      req.userId,
      { $addToSet: { saved: req.params.id } },
      { returnDocument: "after" },
    );
    if (!user) {
      return res.status(404).json({
        message: "User didn't find",
      });
    }

    res.json({
      success: true,
    });
  } catch (error) {
    res.status(400).json({
      message: "The post didn't find",
      error,
    });
  }
};

export const removeSaved = async (req: Request, res: Response) => {
  try {
    const post = await PostModel.findByIdAndUpdate(
      req.params.id,
      { $inc: { saves: -1 } },
      { returnDocument: "after" },
    );
    if (!post) {
      return res.status(404).json({
        message: "Post didn't find",
      });
    }

    const user = await UserModel.findByIdAndUpdate(
      req.userId,
      { $pull: { saved: req.params.id } },
      { returnDocument: "after" },
    );
    if (!user) {
      return res.status(404).json({
        message: "User didn't find",
      });
    }

    res.json({
      success: true,
    });
  } catch (error) {
    res.status(400).json({
      message: "The post didn't find",
      error,
    });
  }
};