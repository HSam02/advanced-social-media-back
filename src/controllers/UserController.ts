import jwt from "jsonwebtoken";
import UserModel, { IUser } from "../models/user.js";
import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { HydratedDocument } from "mongoose";

export const register = async (req: Request, res: Response) => {
  try {
    interface IRegisterUser extends IUser {
      password: string
    }
    const { password, ...newUser } = <IRegisterUser>req.body;

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    newUser.passwordHash = hash;

    const doc: HydratedDocument<IUser> = new UserModel(newUser);

    const user: IUser = await doc.save();

    const token = jwt.sign(
      {
        _id: user._id,
      },
      process.env.SECRET_KEY || "secret",
      {
        expiresIn: "10d",
      },
    );

    const userData: Partial<IUser> = user;    
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
      login: string,
      password: string
    }
    const { login, password } = <IloginUser>req.body;
    const user = await UserModel.findOne<IUser>({
      $or: [{ email: login }, { username: login }],
    });

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

    const userData: Partial<IUser> = user;
    delete userData["passwordHash"];

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
    const user = await UserModel.findById<IUser>(req.userId).select(["email", "username", "fullname"]);

    if (!user) {
      return res.status(404).json({
        message: "User didn't find",
      });
    }

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
