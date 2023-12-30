import { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/errorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import { redis } from "../utils/redis";
import cloudinary from "cloudinary";
import JobOfferModel, { IJobOffer } from "../models/jobOffer.model";

// ------------------------------------------------------------------------ Create a job offer
export const createJobOffer = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        title,
        description,
        salaryRange,
        remote,
        company,
        contractType,
        recruiter,
        jobOfferSkills,
      } = req.body as IJobOffer;

      // Check if all the fields are filled
      if (
        !title ||
        !description ||
        !salaryRange ||
        !remote ||
        !contractType ||
        !recruiter ||
        !jobOfferSkills
      ) {
        return next(new ErrorHandler("Please fill all the fields", 400));
      }

      const jobOffer = await JobOfferModel.create({
        title,
        description,
        salaryRange,
        remote,
        company,
        contractType,
        recruiter,
        jobOfferSkills,
      });

      res.status(201).json({
        success: true,
        jobOffer,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------------------------------------------------------------ Edit a job offer
export const editJobOffer = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        title,
        description,
        salaryRange,
        remote,
        company,
        contractType,
        recruiter,
        jobOfferSkills,
      } = req.body as IJobOffer;

      // Check if user is the creator of the job offer
      const jobOfferOld = await JobOfferModel.findById(req.params.id);

      if (
        jobOfferOld?.recruiter.recruiterId.toString() !==
          req.user?._id.toString() &&
        req.user?.role !== "admin"
      ) {
        return next(
          new ErrorHandler("You are not authorized to edit this job offer", 403)
        );
      }

      // Check if all the fields are filled
      if (
        !title ||
        !description ||
        !salaryRange ||
        !remote ||
        !contractType ||
        !recruiter ||
        !jobOfferSkills
      ) {
        return next(new ErrorHandler("Please fill all the fields", 400));
      }

      const data = {
        title,
        description,
        salaryRange,
        remote,
        company,
        contractType,
        recruiter,
        jobOfferSkills,
      };

      const jobOffer = await JobOfferModel.findByIdAndUpdate(
        req.params.id,
        {
          $set: data,
        },
        { new: true }
      );

      res.status(201).json({
        success: true,
        jobOffer,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------------------------------------------------------------ Get all job offers
export const getAllJobOffers = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isCachedExist = await redis.get("allJobOffers");
      if (isCachedExist) {
        const jobOffers = JSON.parse(isCachedExist);
        return res.status(201).json({
          success: true,
          jobOffers,
        });
      } else {
        const jobOffers = await JobOfferModel.find().select(
          "-jobOfferApplicants"
        );

        // set redis cache
        await redis.set("allJobOffers", JSON.stringify(jobOffers));

        res.status(201).json({
          success: true,
          jobOffers,
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
