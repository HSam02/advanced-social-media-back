import mongoose from "mongoose";
import { IPost } from "./post.js";
//??????????????????????
export interface IUser extends Omit<IUserSchema, "posts" | "saved"> {
  posts: IPost[];
  saved: IPost[];
}

export interface IUserSchema {
  readonly _id: mongoose.Schema.Types.ObjectId;
  email: string;
  username: string;
  passwordHash: string;
  fullname?: string;
  avatarDest?: string;
  privateAccount: boolean;
  bio?: string;
  followers: mongoose.Schema.Types.ObjectId[];
  following: mongoose.Schema.Types.ObjectId[];
  recentSearch: mongoose.Schema.Types.ObjectId[];
  // chats: mongoose.Schema.Types.ObjectId[];
  notifications: mongoose.Schema.Types.ObjectId[];
}

const UserSchema = new mongoose.Schema<IUserSchema>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    fullname: String,
    avatarDest: String,
    bio: String,
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
      },
    ],
    recentSearch: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
      },
    ],
    // chats: [
    //   {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: "Chat",
    //     default: [],
    //   },
    // ],
    privateAccount: {
      type: Boolean,
      default: false,
    },
    notifications: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Notification",
        default: [],
      },
    ],
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<IUserSchema>("User", UserSchema);
