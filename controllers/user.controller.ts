import { Request, Response, NextFunction } from "express";
import UserModel, { IUser } from "../models/user.model";
import ErrorHandler from "../utils/errorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import sendMail from "../utils/sendMail";
import {
  accessTokenOptions,
  refreshTokenOptions,
  sendToken,
} from "../utils/jwt";
import { redis } from "../utils/redis";

// Register user
interface IRegistrationBody {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

// ------------------------------------------------------------------------ Register User (only send activation email)
export const registrationUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { firstName, lastName, email, password } = req.body;

      // Check if email already exists
      const isEmailInDatabase = await UserModel.findOne({ email });
      if (isEmailInDatabase)
        return next(new ErrorHandler("Email already exists", 400));

      const user: IRegistrationBody = {
        firstName,
        lastName,
        email,
        password,
      };

      // Create activation token
      const activationToken = createActivationToken(user);
      const activationCode = activationToken.activationCode;

      // Send data to email template
      const data = {
        user: { firstName: user.firstName, lastName: user.lastName },
        activationCode,
      };

      try {
        await sendMail({
          email: user.email,
          subject: "Activate your account",
          template: "activation-mail.ejs",
          data,
        });

        res.status(200).json({
          success: true,
          message: "Please check your email to activate your account",
          activationToken: activationToken.token,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ------------------------------------------------------------------------ Create activation token function
interface IActivationToken {
  token: string;
  activationCode: string;
}

export const createActivationToken = (
  user: IRegistrationBody
): IActivationToken => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString();
  const token = jwt.sign(
    { user, activationCode },
    process.env.ACTIVATION_SECRET as Secret,
    {
      expiresIn: "5min",
    }
  );
  return { token, activationCode };
};

// ------------------------------------------------------------------------ Activate User via Activation Token (actually create user)
interface IActivationRequest {
  activation_token: string;
  activation_code: string;
}
export const activateUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { activation_token, activation_code } =
        req.body as IActivationRequest;

      const newUser: { user: IUser; activationCode: string } = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET as string
      ) as { user: IUser; activationCode: string };

      if (newUser.activationCode !== activation_code)
        return next(new ErrorHandler("Invalid activation code", 400));

      const { firstName, lastName, email, password } = newUser.user;

      // Check if email already exists
      const isEmailInDatabase = await UserModel.findOne({ email });

      if (isEmailInDatabase)
        return next(new ErrorHandler("Email already exists", 400));

      // Create new user
      await UserModel.create({
        firstName,
        lastName,
        email,
        password,
      });

      res.status(201).json({
        success: true,
        message: "Account has been created and activated",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ------------------------------------------------------------------------ Login User
interface ILoginRequest {
  email: string;
  password: string;
}

export const loginUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as ILoginRequest;

      // Check if email and password is entered
      if (!email || !password)
        return next(new ErrorHandler("Please enter email & password", 400));

      // Check if email exists
      const user = await UserModel.findOne({ email }).select("+password");

      if (!user)
        return next(new ErrorHandler("Invalid email or password", 400));

      // Check if password is correct
      const isPasswordCorrect = await user.comparePassword(password);

      if (!isPasswordCorrect)
        return next(new ErrorHandler("Invalid email or password", 400));

      // delete password from user object
      if (user.password) {
        user.password = "";
      }

      // send token
      sendToken(user, 200, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ------------------------------------------------------------------------ Logout User
export const logoutUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Clear cookies
      res.cookie("accessToken", "", {
        maxAge: 1,
      });
      res.cookie("refreshToken", "", {
        maxAge: 1,
      });

      // Delete user from redis cache
      redis.del(req.user?._id || "");

      // send response
      res.status(201).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ------------------------------------------------------------------------ Update Access Token
export const updateAccessToken = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refresh_token = req.cookies.refreshToken as string;

      // Check if refresh token exists
      if (!refresh_token)
        return next(new ErrorHandler("Please login to continue", 400));

      // Verify refresh token
      const decoded = jwt.verify(
        refresh_token,
        process.env.REFRESH_TOKEN as string
      ) as JwtPayload;

      // Check if decoded exists
      const msg = "Could not refresh access token";
      if (!decoded) return next(new ErrorHandler(msg, 400));

      // Check if user session exists
      const session = await redis.get(decoded.id as string);
      if (!session)
        return next(
          new ErrorHandler("Please login to access this resource", 400)
        );

      // Get user
      const user = JSON.parse(session);

      // send token
      const accessToken = jwt.sign(
        { id: user._id },
        process.env.ACCESS_TOKEN as string,
        { expiresIn: "5m" }
      );

      const refreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN as string,
        { expiresIn: "3d" }
      );

      req.user = user;

      // send tokens in cookies to client
      res.cookie("accessToken", accessToken, accessTokenOptions);
      res.cookie("refreshToken", refreshToken, refreshTokenOptions);

      // Update user in redis cache with new access token and refresh token with 7 days expiry
      await redis.set(user._id, JSON.stringify(user), "EX", 60 * 60 * 24 * 7);

      res.status(200).json({
        status: "success",
        success: true,
        accessToken,
        refreshToken,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
