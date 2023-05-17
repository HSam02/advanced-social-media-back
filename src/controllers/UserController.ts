import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import multer from "multer";
import fs from "fs";
import UserModel, { IUser, IUserSchema } from "../models/user.js";

const avatarImageStorage = multer.diskStorage({
  destination: (req, __, callback) => {
    const userDir = `./src/uploads/${req.myId}`;

    if (!fs.existsSync("./src/uploads")) {
      fs.mkdirSync("./src/uploads");
    }

    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir);
    }

    callback(null, `${userDir}`);
  },
  filename: (req, file, callback) => {
    const fileName = `${Math.random().toString().replace("0.", "").substring(0, 6)}_${Date.now()}.${file.originalname
      .split(".")
      .pop()}`;
    req.on("error", () => {
      const dest = `./src/uploads/${req.myId}/${fileName}`;
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
const uploadAvatarMedia = multer({
  storage: avatarImageStorage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_, file, callback) => {
    if (file.mimetype !== "image/jpeg" && file.mimetype !== "image/png") {
      callback(null, false);
      const err = new Error("Only .png, .jpg and .jpeg format allowed!");
      err.name = "ExtensionError";
      return callback(err);
    }
    callback(null, true);
  },
}).single("image");

export const register = async (req: Request, res: Response) => {
  try {
    interface IRegisterUser extends IUser {
      password: string;
    }
    const { password, ...newUser } = <IRegisterUser>req.body;

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    newUser.passwordHash = hash;

    const doc = new UserModel(newUser);

    const user = await doc.save();

    const token = jwt.sign(
      {
        _id: user._id,
      },
      process.env.SECRET_KEY || "secret",
      {
        expiresIn: "10d",
      },
    );

    const userData: Partial<IUser> = user.toObject();
    delete userData["passwordHash"];

    res.json({
      user: userData,
      token,
    });
  } catch (error) {
    res.status(400).json({
      message: "User didn't create",
      error,
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    interface IloginUser {
      login: string;
      password: string;
    }
    const { login, password } = <IloginUser>req.body;
    const user = await UserModel.findOne({
      $or: [{ email: login }, { username: login }],
    })
      // .populate({ path: "posts", populate: { path: "user", select: ["username", "avatarDest"] } })
      // .populate({ path: "saved", populate: { path: "user", select: ["username", "avatarDest"] } })
      // .exec();

    if (!user) {
      return res.status(403).json({
        message: "Sorry, your login or password was incorrect.",
      });
    }

    const isValidPass = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPass) {
      return res.status(403).json({
        message: "Sorry, your login or password was incorrect.",
      });
    }

    const userData: Partial<IUser> = user.toObject();
    delete userData["passwordHash"];
    // userData.posts?.reverse();
    // userData.saved?.reverse();

    const token = jwt.sign(
      {
        _id: user._id,
      },
      process.env.SECRET_KEY || "secret",
      {
        expiresIn: "10d",
      },
    );

    res.json({ user: userData, token });
  } catch (error) {
    res.status(500).json({
      message: "Please, try later.",
      error,
    });
  }
};

export const getUser = async (req: Request, res: Response) => {
  try {
    const user = await UserModel.findById<IUserSchema>(req.myId)
      .select("-passwordHash")
      // .populate({ path: "posts", populate: { path: "user", select: ["username", "avatarDest"] } })
      // .populate({ path: "saved", populate: { path: "user", select: ["username", "avatarDest"] } })
      // .exec();

    if (!user) {
      return res.status(404).json({
        message: "User didn't find",
      });
    }

    // user.saved.reverse();
    // user.posts.reverse();
    res.json(user);
  } catch (error) {
    res.status(500).json({
      message: "Can't get info",
      error,
    });
  }
};

export const checkIsFree = async (req: Request, res: Response) => {
  try {
    const user = await UserModel.findOne<IUser>(req.body);
    res.json({
      isFree: !Boolean(user),
    });
  } catch (error) {
    res.status(500).json({
      message: "Can't get info",
    });
  }
};

export const uploadAvatar = (req: Request, res: Response) => {
  uploadAvatarMedia(req, res, async (error) => {
    if (error) {
      return res.status(400).json({
        message: "Images were not upload",
        error,
      });
    }
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "Images were not upload",
          error,
        });
      }
      const dest = req.file.destination.slice(5) + "/" + req.file.filename;
      const oldUser = await UserModel.findById(req.myId).select("avatarDest");
      const user = await UserModel.findOneAndUpdate(
        { _id: req.myId },
        { $set: { avatarDest: dest } },
        { returnDocument: "after" },
      );
      if (!user) {
        return res.status(400).json({
          message: "DB error",
        });
      }
      if (oldUser?.avatarDest && fs.existsSync(`./src${oldUser?.avatarDest}`)) {
        fs.unlinkSync(`./src${oldUser?.avatarDest}`);
      }
      res.json(user.avatarDest);
    } catch (error) {
      res.status(500).json({
        message: "Avatar didn't upload",
        error,
      });
    }
  });
};

export const removeAvatar = async (req: Request, res: Response) => {
  try {
    const user = await UserModel.findByIdAndUpdate({ _id: req.myId }, { $set: { avatarDest: "" } }).select(
      "avatarDest",
    );
    if (!user) {
      return res.status(400).json({
        message: "User not found",
      });
    }
    if (fs.existsSync(`./src${user.avatarDest}`)) {
      fs.unlinkSync(`./src${user.avatarDest}`);
    }
    res.json({
      success: true,
    });
  } catch (error) {
    res.status(400).json({
      message: "Avatar didn't removed",
      error,
    });
  }
};
