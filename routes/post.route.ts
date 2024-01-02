import express from "express";
import { isAuthenticated } from "../middleware/auth";
import {
  createPost,
  deletePost,
  editPost,
  getAllPosts,
  getPostById,
  getPostsByUserId,
} from "../controllers/post.controller";

const postRouter = express.Router();

// ------------------------------------ POST Routes ------------------------------------
postRouter.post("/create-post", isAuthenticated, createPost);
postRouter.post("/get-all-posts", getAllPosts);

// ------------------------------------ PUT Routes ------------------------------------
postRouter.put("/edit-post/:id", isAuthenticated, editPost);

// ------------------------------------ GET Routes ------------------------------------
postRouter.get("/get-post-by-id/:id", getPostById);
postRouter.get("/get-posts-by-user/:userId", isAuthenticated, getPostsByUserId);

// ------------------------------------ DELETE Routes ------------------------------------
postRouter.delete("/delete-post/:id", isAuthenticated, deletePost);

export default postRouter;
