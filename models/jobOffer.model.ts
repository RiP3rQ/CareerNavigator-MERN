import mongoose, { Document, Model, Schema } from "mongoose";
require("dotenv").config();

interface ICompany extends Document {
  name: string;
  description: string;
  website: string;
  logo: {
    url: string;
    public_id: string;
  };
  location: string;
  geoLocation: {
    lat: number;
    lng: number;
  };
}

export interface IJobOffer extends Document {
  title: string;
  description: string;
  salaryRange: string;
  remote: string;
  company: ICompany;
  contractType: string;
  recruiter: {
    recruiterId: string;
  };
  jobOfferSkills: Array<{ title: string }>;
  jobOfferApplicants: {
    jobOfferApplicantId: string;
    status: string;
  }[];
}

const jobOfferSchema: Schema<IJobOffer> = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please enter a title for the job offer"],
    },
    description: {
      type: String,
      required: [true, "Please enter a description for the job offer"],
    },
    salaryRange: {
      type: String,
      required: [true, "Please enter a salary range for the job offer"],
    },
    remote: {
      type: String,
      required: [true, "Please enter a location for the job offer"],
    },
    company: {
      name: {
        type: String,
        required: [true, "Please enter a name for the company"],
      },
      description: {
        type: String,
        required: [true, "Please enter a description for the company"],
      },
      website: {
        type: String,
        required: [true, "Please enter a website for the company"],
      },
      logo: {
        url: {
          type: String,
          required: [true, "Please enter a logo for the company"],
        },
        public_id: {
          type: String,
          required: [true, "Please enter a logo for the company"],
        },
      },
      location: {
        type: String,
        required: [true, "Please enter a location for the company"],
      },
      geoLocation: {
        lat: {
          type: Number,
          required: [true, "Please enter a geoLocation for the company"],
        },
        lng: {
          type: Number,
          required: [true, "Please enter a geoLocation for the company"],
        },
      },
    },
    contractType: {
      type: String,
      required: [true, "Please enter a contract type for the job offer"],
    },
    recruiter: {
      recruiterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Please enter a recruiter for the job offer"],
      },
    },
    jobOfferSkills: [
      {
        title: {
          type: String,
          required: [true, "Please enter a skill for the job offer"],
        },
      },
    ],
    jobOfferApplicants: [
      {
        jobOfferApplicantId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        status: {
          type: String,
          enum: ["Pending", "Accepted", "Rejected"],
          default: "Pending",
        },
      },
    ],
  },
  { timestamps: true }
);

const JobOfferModel: Model<IJobOffer> = mongoose.model(
  "JobOffer",
  jobOfferSchema
);

export default JobOfferModel;
