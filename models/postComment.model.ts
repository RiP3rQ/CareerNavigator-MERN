import mongoose, { Document, Model, Schema } from "mongoose";
require("dotenv").config();

export interface IComment extends Document {
  comment: string;
  author: string;
  postId: string;
  userId: string;
}
const commentSchema: Schema<IComment> = new mongoose.Schema(
  {
    comment: {
      type: String,
      required: [true, "Please enter a comment for the post"],
    },
    author: {
      type: String,
      required: [true, "Please enter a author for the post"],
    },
    postId: {
      type: String,
      required: [true, "Please enter a postId for the post"],
    },
    userId: {
      type: String,
      required: [true, "Please enter a userId for the post"],
    },
  },
  { timestamps: true }
);

const CommentModel: Model<IComment> = mongoose.model("Comment", commentSchema);

export default CommentModel;
