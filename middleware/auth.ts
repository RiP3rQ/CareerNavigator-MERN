import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "./catchAsyncError";
import jwt, { JwtPayload } from "jsonwebtoken";
import { redis } from "../utils/redis";
import ErrorHandler from "../utils/errorHandler";

// ------------------------------------------------------------------------ Authenicate User
export const isAuthenticated = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { accessToken } = req.cookies;

    // check if token exists
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: "You are not logged in",
      });
    }

    // verify token
    const decoded = jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN as string
    ) as JwtPayload;

    // check if token is expired
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Access token expired",
      });
    }

    // check if user exists in REDIS
    const user = await redis.get(decoded.id);

    // check if user does not exist in REDIS
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Please login to access this resource!",
      });
    }

    // if exists parse REDIS user data to req.user
    req.user = JSON.parse(user);

    next();
  }
);

// ------------------------------------------------------------------------ Validate user role
export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes((req.user?.role as string) || ""))
      return next(
        new ErrorHandler(
          `User role ${req.user?.role} is not allowed to access this resource`,
          403
        )
      );
    next();
  };
};
