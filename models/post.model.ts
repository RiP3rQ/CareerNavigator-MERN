import mongoose, { Document, Model, Schema } from "mongoose";
require("dotenv").config();

export interface IPost extends Document {
  title: string;
  description: string;
  postImage: {
    public_id: string;
    url: string;
  };
  tags: Array<string>;
  username: string;
  userId: string;
}

const postSchema: Schema<IPost> = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please enter a title for the post"],
    },
    description: {
      type: String,
      required: [true, "Please enter a description for the post"],
    },
    postImage: {
      public_id: {
        type: String,
      },
      url: {
        type: String,
      },
    },
    tags: {
      type: [String],
      required: [true, "Please enter tags for the post"],
    },
    username: {
      type: String,
      required: [true, "Please enter a username for the post"],
    },
    userId: {
      type: String,
      required: [true, "Please enter a userId for the post"],
    },
  },
  { timestamps: true }
);

const PostModel: Model<IPost> = mongoose.model("Post", postSchema);

export default PostModel;
