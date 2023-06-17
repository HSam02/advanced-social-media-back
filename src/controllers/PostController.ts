import { Request, Response } from "express";
import mongoose from "mongoose";
import multer from "multer";
import fs from "fs";
import PostModel, { IPostSchema } from "../models/post.js";
import UserModel from "../models/user.js";
import { deleteCommentsByPostId, getCommentsCount } from "./CommentController.js";

// const getResPosts = (
//   userId: string | undefined,
//   posts: Omit<
//     mongoose.Document<unknown, any, IPostSchema> &
//       IPostSchema &
//       Required<{
//         _id: mongoose.Schema.Types.ObjectId;
//       }>,
//     never
//   >[],
// ) => {
//   return posts.map((post) => {
//     const liked = Boolean(post.likes.find((like) => like.user.toString() === userId));
//     const saved = Boolean(post.saves.find((save) => save.user.toString() === userId));
//     const { saves, ...halfPost } = post.toObject();
//     return {
//       liked,
//       saved,
//       ...halfPost,
//     };
//   });
// };

const getResPosts = async (
  userId: string | undefined,
  posts: Omit<
    mongoose.Document<unknown, any, IPostSchema> &
      IPostSchema &
      Required<{
        _id: mongoose.Schema.Types.ObjectId;
      }>,
    never
  >[],
) => {
  try {
    const updatedPosts = await Promise.all(
      posts.map(async (post) => {
        const liked = Boolean(post.likes.find((like) => like.user.toString() === userId));
        const saved = Boolean(post.saves.find((save) => save.user.toString() === userId));
        const commentsCount = await getCommentsCount(post._id.toString());
        const { saves, ...halfPost } = post.toObject();

        return {
          liked,
          saved,
          commentsCount,
          ...halfPost,
        };
      }),
    );

    return updatedPosts;
  } catch (error) {
    console.error(error);
    return [];
  }
};

const postsMediaStorage = multer.diskStorage({
  destination: (req, __, callback) => {
    const userDir = `./src/uploads/${req.myId}`;

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
    const fileName = `${req.myId}_${Math.random()
      .toString()
      .replace("0.", "")
      .substring(0, 6)}_${Date.now()}.${file.originalname.split(".").pop()}`;
    req.on("error", () => {
      const dest = `./src/uploads/${req.myId}/posts/${fileName}`;
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
      data.text = data.text.trim();

      const files = req.files as Express.Multer.File[];
      const filesDest = files.map((file) => file.destination.slice(5) + "/" + file.filename);

      data.media.forEach((media, i) => (media.dest = filesDest[i]));
      data.user = req.myId as unknown as mongoose.Schema.Types.ObjectId;

      const doc = new PostModel(data);
      const post = await doc.save();
      const user = await UserModel.findOneAndUpdate({ _id: req.myId }).select(["username", "avatarDest"]);

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

export const remove = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    const post = await PostModel.findById(id);
    if (!post) {
      return res.status(400).json({
        message: "Post didn't find",
      });
    }

    if (post.user.toString() !== req.myId) {
      return res.status(403).json({
        message: "No access!",
      });
    }

    const deletedPost = await PostModel.findByIdAndDelete(id);
    if (!deletedPost) {
      return res.status(403).json({
        message: "Post didn't delete",
      });
    }
    deletedPost.media.forEach((el) => fs.existsSync(`./src${el.dest}`) && fs.unlinkSync(`./src${el.dest}`));
    await deleteCommentsByPostId(id);
    res.json({
      success: true,
    });
  } catch (error) {
    res.status(400).json({
      message: "The post didn't delete",
      error,
    });
  }
};

export const getUserPosts = async (req: Request, res: Response) => {
  try {
    const lastId = req.query.lastId;
    const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 10;

    const postsCount = await PostModel.countDocuments({ user: req.userId });

    const query: { user?: string; _id?: { $lt: string } } = {
      user: req.userId,
    };

    if (lastId) {
      query._id = { $lt: lastId as string };
    }

    const posts = await PostModel.find(query)
      .sort("-createdAt")
      .limit(limit)
      .populate({ path: "user", select: ["username", "avatarDest"] })
      .exec();

    if (!posts) {
      return res.status(404).json({
        message: "The posts didn't find",
      });
    }

    const newData = await getResPosts(req.myId, posts);

    res.json({ posts: newData, postsCount });
  } catch (error) {
    res.status(400).json({
      message: "The post didn't find",
      error,
    });
  }
};

export const getUserSavedPosts = async (req: Request, res: Response) => {
  try {
    const lastId = req.query.lastId;
    const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 10;

    const postsCount = await PostModel.countDocuments({
      "saves.user": req.myId,
    });

    const query: { "saves.user"?: string; "saves._id"?: { $lt: string } } = {
      "saves.user": req.myId,
    };

    if (lastId) {
      query["saves._id"] = { $lt: lastId as string };
    }

    const posts = await PostModel.find(query)
      .sort({ "saves._id": -1 })
      .limit(limit)
      .populate({ path: "user", select: ["username", "avatarDest"] })
      .exec();

    if (!posts) {
      return res.status(404).json({
        message: "The posts didn't find",
      });
    }

    const newData = await getResPosts(req.myId, posts);

    res.json({ posts: newData, postsCount });
  } catch (error) {
    res.status(400).json({
      message: "The post didn't find",
      error,
    });
  }
};

export const getUserReels = async (req: Request, res: Response) => {
  try {
    const lastId = req.query.lastId;
    const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 10;

    const postsCount = await PostModel.countDocuments({
      user: req.userId,
      media: {
        $size: 1,
        $elemMatch: {
          type: "video",
        },
      },
    });

    const query: {
      user?: string;
      media: {
        $size: number;
        $elemMatch: {
          type: string;
        };
      };
      _id?: { $lt: string };
    } = {
      user: req.userId,
      media: {
        $size: 1,
        $elemMatch: {
          type: "video",
        },
      },
    };

    if (lastId) {
      query._id = { $lt: lastId as string };
    }

    const posts = await PostModel.find(query)
      .sort("-createdAt")
      .limit(limit)
      .populate({ path: "user", select: ["username", "avatarDest"] })
      .exec();

    if (!posts) {
      return res.status(404).json({
        message: "The posts didn't find",
      });
    }

    const newData = await getResPosts(req.myId, posts);

    res.json({ posts: newData, postsCount });
  } catch (error) {
    res.status(400).json({
      message: "The post didn't find",
      error,
    });
  }
};

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
      { $addToSet: { likes: { user: req.myId } } },
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
      { $pull: { likes: { user: req.myId } } },
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
      { $addToSet: { saves: { user: req.myId } } },
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

export const removeSaved = async (req: Request, res: Response) => {
  try {
    const post = await PostModel.findByIdAndUpdate(
      req.params.id,
      { $pull: { saves: { user: req.myId } } },
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

export const edit = async (req: Request, res: Response) => {
  try {
    const post = await PostModel.findById(req.params.id);
    if (!post) {
      return res.status(400).json({
        message: "Post didn't find",
      });
    }
    if (post.user.toString() !== req.myId) {
      return res.status(403).json({
        message: "No access!",
      });
    }
    const data = req.body;
    if (data.text) {
      data.text = data.text.trim();
    }
    await PostModel.findByIdAndUpdate(req.params.id, { $set: data });
    res.json({
      success: true,
    });
  } catch (error) {
    res.status(400).json({
      message: "The post didn't update",
      error,
    });
  }
};
