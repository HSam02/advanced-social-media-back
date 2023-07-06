import mongoose from "mongoose";

interface IRecentSearches {
  readonly _id: mongoose.Schema.Types.ObjectId;
  user: mongoose.Schema.Types.ObjectId;
  search: mongoose.Schema.Types.ObjectId;
}

const RecentSearchesSchema = new mongoose.Schema<IRecentSearches>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    search: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<IRecentSearches>("RecentSearches", RecentSearchesSchema);
