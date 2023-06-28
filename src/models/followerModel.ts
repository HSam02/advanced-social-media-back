import mongoose from "mongoose";

export interface IFollower {
  readonly _id: mongoose.Schema.Types.ObjectId;
  user: mongoose.Schema.Types.ObjectId;
  followTo: mongoose.Schema.Types.ObjectId;
}

const FollowerSchema = new mongoose.Schema<IFollower>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    followTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Follower", FollowerSchema);
