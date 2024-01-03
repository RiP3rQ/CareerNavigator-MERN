import { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/errorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import PostModel, { IPost } from "../models/post.model";
import cloudinary from "cloudinary";
import { redis } from "../utils/redis";
import CommentModel from "../models/postComment.model";

// ------------------------------------------------------------------------ Create a post
export const createPost = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, description, postImage, tags, username, userId } =
        req.body as IPost;

      // Check if all the fields are filled
      if (
        !title ||
        !description ||
        !postImage ||
        !tags ||
        !username ||
        !userId
      ) {
        return next(new ErrorHandler("Please fill all the fields", 400));
      }

      // upload post image to cloudinary and fetch the url and public_id
      if (postImage.url) {
        const myCloud = await cloudinary.v2.uploader.upload(postImage.url, {
          folder: "posts-images",
          width: 150,
          crop: "scale",
        });
        postImage.url = myCloud.secure_url;
        postImage.public_id = myCloud.public_id;
      }

      const post = {
        title,
        description,
        postImage,
        tags,
        username,
        userId,
      };

      const createdPost = await PostModel.create(post);

      res.status(200).json({
        success: true,
        createdPost,
      });
    } catch (error: any) {
      console.log(error);
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------------------------------------------------------------ Edit a post
export const editPost = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, description, postImage, tags, username, userId } =
        req.body as IPost;

      // Check if all the fields are filled
      if (!title || !description || !tags || !username || !userId) {
        return next(new ErrorHandler("Please fill all the fields", 400));
      }

      const image = postImage;

      const postId = req.params.id;

      if (!postId) {
        return next(new ErrorHandler("Please provide a post id", 400));
      }

      const oldPost = await PostModel.findById(postId);

      if (!oldPost) {
        return next(new ErrorHandler("Post not found", 404));
      }

      // if postImage contains a url same as the previous one,
      // then don't upload it again
      if (
        image.url !== oldPost.postImage.url &&
        image.public_id !== oldPost.postImage.public_id
      ) {
        // first delete the previous photo
        await cloudinary.v2.uploader.destroy(oldPost?.postImage?.public_id);
        const myCloud = await cloudinary.v2.uploader.upload(postImage.url, {
          folder: "Posts_images",
          width: 150,
          crop: "scale",
        });
        image.url = myCloud.secure_url;
        image.public_id = myCloud.public_id;
      }

      const editedPost = await PostModel.findByIdAndUpdate(
        req.params.id,
        {
          title,
          description,
          postImage: image,
          tags,
          username,
          userId,
        },
        { new: true }
      );

      res.status(201).json({
        success: true,
        editedPost,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------------------------------------------------------------ Delete a post
export const deletePost = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const postId = req.params.id;

      // TODO: better redis cache using

      if (!postId) {
        return next(new ErrorHandler("Please provide a post id", 400));
      }

      await PostModel.findByIdAndDelete(postId);

      // Delete the comments associated with the post
      await CommentModel.deleteMany({ postId });

      res.status(200).json({
        success: true,
        message: "Post deleted successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------------------------------------------------------------ Get all posts
export const getAllPosts = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { searchFilter } = req.body as any;

      // if searchFilter is provided, search for posts with that title
      let posts = [];
      if (searchFilter) {
        posts = await PostModel.find({
          title: { $regex: searchFilter, $options: "i" },
        });
      } else {
        posts = await PostModel.find();
      }

      // set redis cache
      await redis.set("allPosts", JSON.stringify(posts));

      res.status(201).json({
        success: true,
        posts,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------------------------------------------------------------ Get post by id
export const getPostById = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.params.id) {
        return next(new ErrorHandler("Please provide a post id", 400));
      }

      // TODO: better redis cache using

      const post = await PostModel.findById(req.params.id);

      res.status(201).json({
        success: true,
        post,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------------------------------------------------------------ Get posts by userId
export const getPostsByUserId = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.params.userId) {
        return next(new ErrorHandler("Please provide a user id", 400));
      }

      const posts = await PostModel.find({ userId: req.params.userId });

      res.status(201).json({
        success: true,
        posts,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
