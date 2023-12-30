import { Redis } from "ioredis";
require("dotenv").config();

const redisClient = () => {
  if (process.env.REDIS_URL) {
    console.log("Redis connected");
    return process.env.REDIS_URL;
  } else {
    throw new Error("Redis URL is not available!!!");
  }
};

export const redis = new Redis(redisClient());
