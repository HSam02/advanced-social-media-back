import mongoose from "mongoose";

export interface IPost {
  readonly _id: mongoose.Schema.Types.ObjectId;
  image: {
    id: string;
    url: string;
  }[];
  likes: mongoose.Schema.Types.ObjectId[];
  text?: string;
  comments: mongoose.Schema.Types.ObjectId[];
  readonly user: mongoose.Schema.Types.ObjectId;
  allowComments: boolean;
  hideLikes: boolean;
}

const PostSchema = new mongoose.Schema<IPost>(
  {
    text: String,
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
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
        default: [],
      },
    ],
    image: [
      {
        type: {
          id: {
            type: String,
            required: true,
          },
          url: {
            type: String,
            required: true,
          },
        },
        required: true,
      },
    ],
    allowComments: {
      type: Boolean,
      default: true,
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

export default mongoose.model<IPost>("Post", PostSchema);
