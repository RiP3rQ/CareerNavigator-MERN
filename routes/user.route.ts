import {
  activateUser,
  loginUser,
  logoutUser,
  registrationUser,
  updateAccessToken,
} from "../controllers/user.controller";
import express from "express";
import { isAuthenticated } from "../middleware/auth";

const userRouter = express.Router();

userRouter.post("/registration", registrationUser);

userRouter.post("/activate-user", activateUser);

userRouter.post("/login-user", loginUser);

userRouter.get("/logout", isAuthenticated, logoutUser);

userRouter.get("/refresh-token", updateAccessToken);

export default userRouter;
