import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ErrorMiddleware } from "./middleware/error";
require("dotenv").config();

// App init
export const app = express();

// body parser
app.use(express.json({ limit: "50mb" }));

// cookie parser
app.use(cookieParser());

// cors
app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  })
);

//// ROUTES -----------------------------------------------------------

// all routes
// app.use(
//   "/api/v1",
//   userRouter,
// );

// unknown route
app.all("*", (req: Request, res: Response, next: NextFunction) => {
  const error = new Error("Route not found");
  res.status(404).json({ message: error.message });
});

//// Error Handling -----------------------------------------------------------

// error middleware
app.use(ErrorMiddleware);
