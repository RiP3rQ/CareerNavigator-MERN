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
        jobOfferSkills,
      } = req.body as IJobOffer;

      // let recruiter = {};
      // // Check if user is a recruiter
      // if (req.user?.role !== "recruiter") {
      //   return next(new ErrorHandler("You are not a recruiter", 403));
      // } else {
      //   recruiter = {
      //     recruiterId: req.user._id,
      //   };
      // }

      // set recruiter id without checking if user is a recruiter
      const recruiter = {
        recruiterId: req.user?._id,
      };

      // Check if all the fields are filled
      if (
        !title ||
        !description ||
        !salaryRange ||
        !remote ||
        !company ||
        !recruiter ||
        !contractType ||
        !jobOfferSkills
      ) {
        return next(new ErrorHandler("Please fill all the fields", 400));
      }

      // upload company logo to cloudinary and fetch the url and public_id
      if (company.logo.url) {
        const result = await cloudinary.v2.uploader.upload(company.logo.url, {
          folder: "company-logos",
          width: 150,
          crop: "scale",
        });
        company.logo.url = result.secure_url;
        company.logo.public_id = result.public_id;
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

      // delete redis cache allJobOffers cache
      await redis.del("allJobOffers");

      res.status(200).json({
        success: true,
        jobOffer,
      });
    } catch (error: any) {
      console.log(error);
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

      // delete from redis cache
      await redis.del(req.params.id);
      await redis.del("allJobOffers");

      res.status(201).json({
        success: true,
        jobOffer,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------------------------------------------------------------ Delete a job offer
export const deleteJobOffer = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const jobOfferId = req.params.id;

      // Check if user is the creator of the job offer
      const jobOffer = await JobOfferModel.findById(jobOfferId);

      if (!jobOffer) {
        return next(new ErrorHandler("Job offer not found", 404));
      }

      if (
        jobOffer?.recruiter.recruiterId.toString() !==
          req.user?._id.toString() &&
        req.user?.role !== "admin"
      ) {
        return next(
          new ErrorHandler(
            "You are not authorized to delete this job offer",
            403
          )
        );
      }

      // delete from database
      await JobOfferModel.findByIdAndDelete(jobOfferId);

      // delete from redis cache
      await redis.del(jobOfferId);
      await redis.del("allJobOffers");

      res.status(201).json({
        success: true,
        message: "Job offer deleted successfully",
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

// ------------------------------------------------------------------------ Get a single job offer
export const getSingleJobOffer = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const jobOfferId = req.params.id;

      // check if cached in redis
      const isCachedExist = await redis.get(jobOfferId);

      if (isCachedExist) {
        const jobOffer = JSON.parse(isCachedExist);
        return res.status(201).json({
          success: true,
          jobOffer,
        });
      } else {
        const jobOffer = await JobOfferModel.findById(jobOfferId).select(
          "-jobOfferApplicants"
        );

        if (!jobOffer) {
          return next(new ErrorHandler("Job offer not found", 404));
        }

        // set redis cache
        await redis.set(
          jobOfferId,
          JSON.stringify(jobOffer),
          "EX",
          60 * 60 * 24 * 7
        ); // 7 day cache;

        res.status(201).json({
          success: true,
          jobOffer,
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------------------------------------------------------------ Apply to a job offer
export const applyToJobOffer = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const jobOfferId = req.params.id;

      const jobOffer = await JobOfferModel.findById(jobOfferId);

      if (!jobOffer) {
        return next(new ErrorHandler("Job offer not found", 404));
      }

      // Check if user has already applied to this job offer
      const isApplied = jobOffer.jobOfferApplicants.find(
        (applicant) =>
          applicant.jobOfferApplicantId.toString() === req.user?._id.toString()
      );

      if (isApplied) {
        return next(
          new ErrorHandler("You have already applied to this job offer", 400)
        );
      }

      // add applicant to job offer
      await JobOfferModel.findByIdAndUpdate(jobOfferId, {
        $push: {
          jobOfferApplicants: {
            applicantId: req.user?._id,
            status: "pending",
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "Applied to job offer successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------------------------------------------------------------ Filter job offers by skills
export const filterJobOffersBySkills = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tag = req.params.tag as string;

      if (!tag) {
        return next(new ErrorHandler("Please provide tag", 400));
      }

      const jobOffers = await JobOfferModel.find({
        jobOfferSkills: { $in: tag },
      });

      res.status(201).json({
        success: true,
        jobOffers,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------------------------------------------------------------ Filter job offers by title
export const filterJobOffersByTitle = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const title = req.params.title as string;

      if (!title) {
        return next(new ErrorHandler("Please provide title", 400));
      }

      const jobOffers = await JobOfferModel.find({
        title: { $regex: title, $options: "i" },
      });

      res.status(201).json({
        success: true,
        jobOffers,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
