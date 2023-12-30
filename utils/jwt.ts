import { Response } from "express";
require("dotenv").config();
import { IUser } from "../models/user.model";
import { redis } from "./redis";

interface ITokenOptions {
  expires: Date;
  maxAge: number;
  httpOnly: boolean;
  sameSite: "none" | "strict" | "lax" | undefined;
  secure?: boolean;
}

// parse env variables to integrate with fallback values
export const accessTokenExpires = parseInt(
  process.env.ACCESS_TOKEN_EXPIRES || "300",
  10
);
export const refreshTokenExpires = parseInt(
  process.env.REFRESH_TOKEN_EXPIRES || "1200",
  10
);

// options for cookies
export const accessTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + accessTokenExpires * 60 * 60 * 1000),
  maxAge: accessTokenExpires * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: "lax",
};

export const refreshTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + refreshTokenExpires * 24 * 60 * 60 * 1000),
  maxAge: refreshTokenExpires * 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: "lax",
};

// ------------------------------------------------------------------------ Create Access Token
export const sendToken = (user: IUser, statusCode: number, res: Response) => {
  const accessToken = user.SignAccessToken();
  const refreshToken = user.SignRefreshToken();

  // upload session to redis
  redis.set(user._id, JSON.stringify(user) as any);

  // only send cookies in production
  if (process.env.NODE_ENV === "production") {
    accessTokenOptions.secure = true;
    refreshTokenOptions.secure = true;
  }

  // send cookies
  res.cookie("accessToken", accessToken, accessTokenOptions);
  res.cookie("refreshToken", refreshToken, refreshTokenOptions);

  // send response
  res.status(statusCode).json({
    success: true,
    message: "Logged in successfully",
    user,
    accessToken,
  });
};
