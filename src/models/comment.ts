import mongoose from "mongoose";
import { IUser } from "./user.js";

export interface ICommemt extends Omit<ICommentSchema, "user" | "replies"> {
  user: IUser;
  replies: ICommemt[];
}

export interface ICommentSchema {
  readonly _id: mongoose.Schema.Types.ObjectId;
  text: string;
  parentId?: mongoose.Schema.Types.ObjectId;
  postId: mongoose.Schema.Types.ObjectId;
  user: mongoose.Schema.Types.ObjectId;
  likes: { user: mongoose.Schema.Types.ObjectId; date: number }[];
}

const CommentSchema = new mongoose.Schema<ICommentSchema>(
  {
    text: {
      type: String,
      required: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    likes: [
      {
        type: {
          _id: false,
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          date: {
            type: Number,
            default: () => Date.now(),
          },
        },
        default: [],
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.model<ICommentSchema>("Comment", CommentSchema);
