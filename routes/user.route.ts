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
  updateUserAdditionalInfo,
  deleteSectionUserProfileAdditionalInfo,
} from "../controllers/user.controller";
import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";

const userRouter = express.Router();

// ------------------------------------ GET Routes ------------------------------------
userRouter.get("/logout", isAuthenticated, logoutUser);
userRouter.get("/refresh-token", updateAccessToken);
userRouter.get("/me", isAuthenticated, getUserInfo);

// ------------------------------------ POST Routes ------------------------------------
userRouter.post("/registration", registrationUser);
userRouter.post("/activate-user", activateUser);
userRouter.post("/login-user", loginUser);
userRouter.post("/social-auth", socialAuth);

// ------------------------------------ PUT Routes ------------------------------------
userRouter.put("/update-me", isAuthenticated, updateUserProfile);
userRouter.put("/update-user-password", isAuthenticated, updateUserPassword);
userRouter.put("/update-user-avatar", isAuthenticated, updateUserAvatar);
userRouter.put(
  "/update-user-additional-info",
  isAuthenticated,
  updateUserAdditionalInfo
);

// ------------------------------------ DELETE Routes ------------------------------------
userRouter.delete(
  "/delete-section-in-profile/:id",
  isAuthenticated,
  deleteSectionUserProfileAdditionalInfo
);

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
