import {
  activateUser,
  loginUser,
  logoutUser,
  registrationUser,
  updateAccessToken,
  getUserInfo,
  socialAuth,
  updateUserProfile,
  updateUserPassword,
  updateUserAvatar,
  getAllUsers,
  updateUserRole,
  deleteUser,
} from "../controllers/user.controller";
import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";

const userRouter = express.Router();

userRouter.post("/registration", registrationUser);

userRouter.post("/activate-user", activateUser);

userRouter.post("/login-user", loginUser);

userRouter.get("/logout", isAuthenticated, logoutUser);

userRouter.get("/refresh-token", updateAccessToken);

userRouter.post("/social-auth", socialAuth);

userRouter.get("/me", isAuthenticated, getUserInfo);

userRouter.put("/update-me", isAuthenticated, updateUserProfile);

userRouter.put("/update-user-password", isAuthenticated, updateUserPassword);

userRouter.put("/update-user-avatar", isAuthenticated, updateUserAvatar);

// ------------------------------------ Admin Routes ------------------------------------
userRouter.get(
  "/get-all-users",
  isAuthenticated,
  authorizeRoles("admin"),
  getAllUsers
);

userRouter.put(
  "/update-user-role",
  isAuthenticated,
  authorizeRoles("admin"),
  updateUserRole
);

userRouter.delete(
  "/delete-user/:id",
  isAuthenticated,
  authorizeRoles("admin"),
  deleteUser
);

export default userRouter;
