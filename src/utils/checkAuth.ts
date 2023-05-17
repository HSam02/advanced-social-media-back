import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Schema } from "mongoose";

declare module "jsonwebtoken" {
  export interface UserIDJwtPayload extends jwt.JwtPayload {
    _id: Schema.Types.ObjectId;
  }
}

declare module "express" {
  interface Request {
    myId?: string;
    // myId?: Schema.Types.ObjectId;
  }
}

export default (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace(/Bearer /, ""); //???????????

    if (!token) {
      throw new Error();
    }

    const decoded = <jwt.UserIDJwtPayload>jwt.verify(token, process.env.SECRET_KEY || "secret");
    req.myId = decoded._id.toString();
    return next();
  } catch (error) {
    res.status(403).json({
      message: "No access",
    });
  }
};
