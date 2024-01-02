import { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/errorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import CommentModel from "../models/postComment.model";
import PostModel from "../models/post.model";

// ------------------------------------------------------------------------ Create a comment
export const createComment = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { comment, author, userId } = req.body as any;

      const postId = req.params.postId;

      if (!comment || !author || !userId || !postId) {
        return next(new ErrorHandler("Please fill all the fields", 400));
      }

      const commentCreated = await CommentModel.create({
        comment,
        author,
        userId,
        postId,
      });

      res.status(200).json({
        success: true,
        commentCreated,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------------------------------------------------------------ Edit a comment
export const editComment = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { comment, author, userId, postId } = req.body as any;

      const commentId = req.params.commentId;

      if (!comment || !author || !userId || !postId || !commentId) {
        return next(new ErrorHandler("Please fill all the fields", 400));
      }

      const commentEdited = await CommentModel.findByIdAndUpdate(
        commentId,
        {
          comment,
          author,
          userId,
          postId,
        },
        { new: true }
      );

      res.status(201).json({
        success: true,
        commentEdited,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------------------------------------------------------------ Delete a comment
export const deleteComment = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.params.id) {
        return next(new ErrorHandler("Please provide a comment id", 400));
      }

      await CommentModel.findByIdAndDelete(req.params.id);

      res.status(200).json({
        success: true,
        message: "Comment deleted successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------------------------------------------------------------ Get all post comments
export const getPostComments = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const postId = req.params.postId;

      const comments = await CommentModel.find({ postId });

      res.status(201).json({
        success: true,
        comments,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
