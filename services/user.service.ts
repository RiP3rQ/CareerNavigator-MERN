import { Response } from "express";
import { redis } from "../utils/redis";
import UserModel from "../models/user.model";

// ------------------------------------------------------------------------ Get User By Id
export const getUserByIdFromRedisService = async (
  id: string,
  res: Response
) => {
  const userJson = await redis.get(id);

  if (!userJson) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }
  const user = JSON.parse(userJson);
  res.status(200).json({
    success: true,
    user,
  });
};

// ------------------------------------------------------------------------ Get All Users
export const getAllUsersService = async (res: Response) => {
  const users = await UserModel.find().sort({ createdAt: -1 });

  res.status(201).json({
    success: true,
    users,
  });
};

// ------------------------------------------------------------------------ Update User Role
export const updateUserRoleService = async (
  id: string,
  role: string,
  res: Response
) => {
  const user = await UserModel.findByIdAndUpdate(
    id,
    {
      role,
    },
    { new: true }
  );

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  res.status(201).json({
    success: true,
    user,
  });
};
