import mongoose, { Document, Model, Schema } from "mongoose";
import bcrypt from "bcryptjs";
require("dotenv").config();
import jwt from "jsonwebtoken";

const emailRegexPattern: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface IEducation extends Document {
  school: string;
  degree: string;
  fieldOfStudy: string;
  from: Date;
  to: Date;
  description: string;
}

export interface IExperience extends Document {
  title: string;
  company: string;
  description: string;
  location: string;
  from: Date;
  to: Date;
}

export interface IUser extends Document {
  firstName: string;
  lastName: string;
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
  jobsOffersFavorites: Array<{ jobOfferId: string }>;
  // ------- Aditional Info -------
  education: IEducation[];
  experience: IExperience[];
  skills: string[];
  bio: string;
  CV: {
    public_id: string;
    url: string;
  };
  social: {
    website: string;
    linkedIn: string;
    github: string;
  };

  // ------- Methods -------
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
    lastName: {
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
    jobsOffersFavorites: [
      {
        jobOfferId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "JobOffer",
        },
      },
    ],
    // ------- Aditional Info -------
    education: [
      {
        school: {
          type: String,
        },
        degree: {
          type: String,
        },
        fieldOfStudy: {
          type: String,
        },
        from: {
          type: Date,
        },
        to: {
          type: Date,
        },
        description: {
          type: String,
        },
      },
    ],
    experience: [
      {
        title: {
          type: String,
        },
        company: {
          type: String,
        },
        location: {
          type: String,
        },
        from: {
          type: Date,
        },
        to: {
          type: Date,
        },
        description: {
          type: String,
        },
      },
    ],
    skills: [
      {
        type: String,
      },
    ],
    bio: {
      type: String,
    },
    CV: {
      public_id: String,
      url: String,
    },
    social: {
      website: {
        type: String,
      },
      linkedIn: {
        type: String,
      },
      github: {
        type: String,
      },
    },
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
