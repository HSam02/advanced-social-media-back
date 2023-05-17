import { NextFunction, Request, Response } from "express";
import UserModel, { IUser } from "../models/user.js";

declare module "express" {
  interface Request {
    userId?: string;
  }
}

export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await UserModel.findOne<IUser>({ username: req.params.username });
    
    if (!user) {
      throw new Error("There are not user with this username");
    }

    req.userId = user._id.toString();

    next();
  } catch (error) {
    console.log(error);
    res.status(404).json({
      message: "User didn't find",
    });
  }
};
