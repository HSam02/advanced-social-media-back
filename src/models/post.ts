import mongoose from "mongoose";
import { IUser } from "./user.js";

export interface IMedia {
  dest: string;
  type: string;
  styles: {
    transform: string;
  };
}

export interface IPost extends Omit<IPostSchema, "user"> {
  user: IUser;
}

export interface IPostSchema {
  readonly _id: mongoose.Schema.Types.ObjectId;
  media: IMedia[];
  aspect: number;
  likes: mongoose.Schema.Types.ObjectId[];
  saves: mongoose.Schema.Types.ObjectId[];
  text: string;
  comments: mongoose.Schema.Types.ObjectId[];
  user: mongoose.Schema.Types.ObjectId;
  hideComments: boolean;
  hideLikes: boolean;
}

const PostSchema = new mongoose.Schema<IPostSchema>(
  {
    text: { type: String, default: "" },
    aspect: {
      type: Number,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
      },
    ],
    saves: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
      },
    ],
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
        default: [],
      },
    ],
    media: {
      type: [
        {
          dest: {
            type: String,
            required: true,
          },
          type: {
            type: String,
            required: true,
          },
          styles: {
            type: {
              transform: String,
            },
            required: true,
          },
        },
      ],
      required: true,
    },
    hideComments: {
      type: Boolean,
      default: false,
    },
    hideLikes: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<IPostSchema>("Post", PostSchema);
