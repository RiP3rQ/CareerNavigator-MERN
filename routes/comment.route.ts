import express from "express";
import { isAuthenticated } from "../middleware/auth";
import {
  createComment,
  deleteComment,
  editComment,
  getPostComments,
} from "../controllers/comment.controller";

const commentRouter = express.Router();

// ------------------------------------ POST Routes ------------------------------------
commentRouter.post("/create-comment", isAuthenticated, createComment);

// ------------------------------------ PUT Routes ------------------------------------
commentRouter.put("/edit-comment/:commentId", isAuthenticated, editComment);

// ------------------------------------ GET Routes ------------------------------------
commentRouter.get("/get-post-comments/:postId", getPostComments);

// ------------------------------------ DELETE Routes ------------------------------------
commentRouter.delete("/delete-comment/:id", isAuthenticated, deleteComment);

export default commentRouter;
