import mongoose, { Document, Model, Schema } from "mongoose";
import bcrypt from "bcryptjs";
require("dotenv").config();
import jwt from "jsonwebtoken";

const emailRegexPattern: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface IUser extends Document {
  firstName: string;
  secondName: string;
  email: string;
  password: string;
  avatar: {
    public_id: string;
    url: string;
  };
  role: string;
  isVerified: boolean;
  jobsOffersCreated: Array<{ jobOfferId: string }>;
  jobsOffersApplied: {
    jobOfferId: string;
    status: string;
  }[];

  comparePassword: (password: string) => Promise<boolean>;
  SignAccessToken: () => string;
  SignRefreshToken: () => string;
}

const userSchema: Schema<IUser> = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "Please enter your name"],
    },
    secondName: {
      type: String,
      required: [true, "Please enter your surname"],
    },
    email: {
      type: String,
      required: [true, "Please enter your email"],
      unique: true,
      validate: {
        validator: function (value: string): boolean {
          return emailRegexPattern.test(value);
        },
        message: "Please enter a valid email",
      },
    },
    password: {
      type: String,
      required: [true, "Please enter your password"],
      minLength: [6, "Your password must be longer than 6 characters"],
      select: false,
    },
    avatar: {
      public_id: String,
      url: String,
    },
    role: {
      type: String,
      default: "user",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    jobsOffersCreated: [
      {
        jobOfferId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "JobOffer",
        },
      },
    ],
    jobsOffersApplied: [
      {
        jobOfferId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "JobOffer",
        },
        status: {
          type: String,
          default: "Pending",
        },
      },
    ],
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (
  enteredPassword: string
): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Sign access token
userSchema.methods.SignAccessToken = function (): string {
  return jwt.sign({ id: this._id }, process.env.ACCESS_TOKEN || "");
};

// Sign refresh token
userSchema.methods.SignRefreshToken = function (): string {
  return jwt.sign({ id: this._id }, process.env.REFRESH_TOKEN || "", {
    expiresIn: "3d",
  });
};

const UserModel: Model<IUser> = mongoose.model("User", userSchema);
export default UserModel;
