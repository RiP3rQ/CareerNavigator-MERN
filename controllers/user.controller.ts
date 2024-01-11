import { Request, Response, NextFunction } from "express";
import UserModel, {
  IEducation,
  IExperience,
  IUser,
} from "../models/user.model";
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
import {
  getAllUsersService,
  getUserByIdFromRedisService,
  updateUserRoleService,
} from "../services/user.service";
import cloudinary from "cloudinary";

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
      expiresIn: "5h",
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

// ------------------------------------------------------------------------ Get User Info
export const getUserInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?._id as string;

      getUserByIdFromRedisService(userId, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ------------------------------------------------------------------------ Social Auth
interface ISocialAuthRequest {
  firstName: string;
  lastName: string;
  email: string;
  avatar: string;
}

export const socialAuth = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { firstName, lastName, email, avatar } =
        req.body as ISocialAuthRequest;

      // Check if email already exists
      const user = await UserModel.findOne({ email });

      if (user) {
        // send token
        sendToken(user, 200, res);
      } else {
        // Create new user
        const newUser = await UserModel.create({
          firstName,
          lastName,
          email,
          avatar: {
            public_id: "Google_avatar",
            url: avatar,
          },
        });

        // send token
        sendToken(newUser, 200, res);
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ------------------------------------------------------------------------ Update Basic User Profile Info
interface IUpdateUserProfileRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  bio?: string;
  website?: string;
  linkedIn?: string;
  github?: string;
}

export const updateUserProfile = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?._id;

      const { firstName, lastName, email, bio, website, linkedIn, github } =
        req.body as IUpdateUserProfileRequest;

      const user = await UserModel.findById(userId);

      if (!user) return next(new ErrorHandler("User not found", 404));

      if (email && user) {
        user.email = email;
      }

      if (firstName && user) {
        user.firstName = firstName;
      }

      if (lastName && user) {
        user.lastName = lastName;
      }

      if (bio && user) {
        user.bio = bio;
      }

      if (website && user) {
        user.social.website = website;
      }

      if (linkedIn && user) {
        user.social.linkedIn = linkedIn;
      }

      if (github && user) {
        user.social.github = github;
      }

      await user?.save();

      // delete password from user object
      if (user?.password) {
        user.password = "";
      }

      // Update user in redis cache
      await redis.set(userId, JSON.stringify(user));

      res.status(201).json({
        success: true,
        message: "User updated successfully",
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ------------------------------------------------------------------------ Update User Password
interface IUpdateUserPasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export const updateUserPassword = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?._id;

      const { currentPassword, newPassword } =
        req.body as IUpdateUserPasswordRequest;

      if (!currentPassword || !newPassword)
        return next(
          new ErrorHandler(
            "Please enter current password and new password",
            400
          )
        );

      const user = await UserModel.findById(userId).select("+password");

      if (!user) return next(new ErrorHandler("User not found", 404));

      if (user.password === undefined)
        return next(new ErrorHandler("User not found", 404));

      const isPasswordCorrect = await user.comparePassword(currentPassword);

      if (!isPasswordCorrect)
        return next(new ErrorHandler("Invalid password", 400));

      user.password = newPassword;

      await user.save();

      // delete password from user object
      if (user.password) {
        user.password = "";
      }

      // Update user in redis cache
      await redis.set(userId, JSON.stringify(user));

      res.status(201).json({
        success: true,
        message: "Password updated successfully",
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ------------------------------------------------------------------------ Update User Avatar
interface IUpdateUserAvatarRequest {
  avatar: string;
}

export const updateUserAvatar = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { avatar } = req.body as IUpdateUserAvatarRequest;
      const userId = req.user?._id;
      const user = await UserModel.findById(userId);

      if (!user) return next(new ErrorHandler("User not found", 404));

      if (!avatar) return next(new ErrorHandler("No image selected", 400));

      if (avatar && user) {
        if (user?.avatar?.public_id) {
          // first delete the previous avatar
          await cloudinary.v2.uploader.destroy(user?.avatar?.public_id);
          // then upload new avatar
          const myCloud = await cloudinary.v2.uploader.upload(avatar, {
            folder: "User_avatars",
            width: 150,
          });
          user.avatar = {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          };
        } else {
          const myCloud = await cloudinary.v2.uploader.upload(avatar, {
            folder: "User_avatars",
            width: 150,
          });
          user.avatar = {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          };
        }
      }

      await user.save();

      // Delete password from user object
      if (user.password) {
        user.password = "";
      }

      // Update user in redis cache
      await redis.set(userId, JSON.stringify(user));

      res.status(201).json({
        success: true,
        message: "Avatar updated successfully",
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ------------------------------------------------------------------------ Update User Profile Additional Info
interface IUpdateUserProfileAdditionalInfoRequest {
  education?: IEducation;
  experience?: IExperience;
  skills?: string;
  CV?: string;
}
export const updateUserAdditionalInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get user id
      const userId = req.user?._id;

      // Get data from request body
      const { education, experience, skills, CV } =
        req.body as IUpdateUserProfileAdditionalInfoRequest;

      // Check if user exists
      const user = await UserModel.findById(userId);
      if (!user) return next(new ErrorHandler("User not found", 404));

      // Check if user is updating his own profile
      if (user._id.toString() !== userId.toString())
        return next(new ErrorHandler("Unauthorized", 401));

      // Update user if education or experience or skills or CV is provided
      if (education && user) {
        user.education.push(education);
      }

      if (experience && user) {
        user.experience.push(experience);
      }

      // add skill to user profile
      if (skills && user) {
        user.skills.push(skills);
      }

      if (CV && user) {
        if (user?.CV?.public_id) {
          // first delete the previous CV
          await cloudinary.v2.uploader.destroy(user?.CV?.public_id);
          // then upload new CV pdf file
          const myCloud = await cloudinary.v2.uploader.upload(CV, {
            folder: "User_CVs",
          });

          user.CV = {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          };
        } else {
          // then upload new CV pdf file
          const myCloud = await cloudinary.v2.uploader.upload(CV, {
            folder: "User_CVs",
          });

          user.CV = {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          };
        }
      }

      await user.save();

      // delete password from user object
      if (user?.password) {
        user.password = "";
      }

      // Update user in redis cache
      await redis.set(userId, JSON.stringify(user));

      res.status(201).json({
        success: true,
        message: "User updated successfully",
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ------------------------------------------------------------------------ Delete Section Element by id from User Profile Additional Info
interface IDeleteSectionUserProfileAdditionalInfoRequest {
  section: string;
}

export const deleteSectionUserProfileAdditionalInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get user id
      const userId = req.user?._id;

      // Get data from request body
      const { section } =
        req.body as IDeleteSectionUserProfileAdditionalInfoRequest;

      const sectionId = req.params.id as string;

      // Check if user exists
      const user = await UserModel.findById(userId);
      if (!user) return next(new ErrorHandler("User not found", 404));

      // Check if user is updating his own profile
      if (user._id.toString() !== userId.toString())
        return next(new ErrorHandler("Unauthorized", 401));

      if (section === "education" && sectionId && user) {
        user.education = user.education?.filter(
          (edu) => edu._id.toString() !== sectionId.toString()
        );
      }

      if (section === "experience" && sectionId && user) {
        user.experience = user.experience?.filter(
          (exp) => exp._id.toString() !== sectionId.toString()
        );
      }

      if (section === "skills" && sectionId && user) {
        const indexOfSkill = parseInt(sectionId);
        user.skills.splice(indexOfSkill, 1);
      }

      if (section === "CV" && user) {
        if (user?.CV?.public_id) {
          // first delete the previous CV
          await cloudinary.v2.uploader.destroy(user?.CV?.public_id);
          user.CV = {} as { public_id: string; url: string };
        }
      }

      if (section === "social" && user) {
        user.social = {
          website: "",
          linkedIn: "",
          github: "",
        };
      }

      // Delete section in user profile additional info
      await user.save();

      // delete password from user object
      if (user?.password) {
        user.password = "";
      }

      // Update user in redis cache
      await redis.set(userId, JSON.stringify(user));

      res.status(201).json({
        success: true,
        message: "Section element deleted successfully",
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ------------------------------------------------------------------------ Get All Users | -- only for admin
export const getAllUsers = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllUsersService(res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ------------------------------------------------------------------------ Update User Role  | -- only for admin
export const updateUserRole = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, role } = req.body;
      updateUserRoleService(id, role, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ------------------------------------------------------------------------ Delete User | -- only for admin
export const deleteUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.body;

      // Check if user exists
      const user = await UserModel.findById(id);
      if (!user) return next(new ErrorHandler("User not found", 404));

      // Delete user
      await user.deleteOne({ id });

      // Delete user from redis cache
      await redis.del(id);

      res.status(200).json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ------------------------------------------------------------------------ Get Users public profile data by id
export const getUserPublicProfile = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.id;

      console.log(userId);

      // Check if user exists
      const user = await UserModel.findById(userId).select(
        "-password -role -isVerified -jobsOffersCreated -jobsOffersApplied -jobsOffersFavorites -createdAt -updatedAt -__v"
      );
      if (!user) return next(new ErrorHandler("User not found", 404));

      console.log(user);

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
