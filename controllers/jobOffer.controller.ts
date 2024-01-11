import { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/errorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import { redis } from "../utils/redis";
import cloudinary from "cloudinary";
import JobOfferModel, { IJobOffer } from "../models/jobOffer.model";
import UserModel from "../models/user.model";

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
// TODO: check if user is a recruiter or admin
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
        jobOfferSkills,
      } = req.body as IJobOffer;

      // Check if user is the creator of the job offer
      const jobOfferOld = await JobOfferModel.findById(req.params.id);

      // check if old job offer exists
      if (!jobOfferOld) {
        return next(new ErrorHandler("Job offer not found", 404));
      }

      const recruiter = {
        recruiterId: req.user?._id,
      };

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

      // if Company logo contains a url same as the previous one,
      // then don't upload it again
      if (
        company.logo.url !== jobOfferOld?.company.logo?.url &&
        company.logo.public_id !== jobOfferOld?.company.logo.public_id
      ) {
        // first delete the previous photo
        await cloudinary.v2.uploader.destroy(
          jobOfferOld.company.logo.public_id
        );
        const myCloud = await cloudinary.v2.uploader.upload(company.logo.url, {
          folder: "company-logos",
          width: 150,
          crop: "scale",
        });
        company.logo.url = myCloud.secure_url;
        company.logo.public_id = myCloud.public_id;
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
        // get all job offers and sort them by createdAt
        const jobOffers = await JobOfferModel.find().sort("-createdAt");

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
        const jobOffer = await JobOfferModel.findById(jobOfferId);

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

// ------------------------------------------------------------------------ Get all job offers of a recruiter
export const getAllJobOffersOfARecruiter = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // TODO: better redis caching
      const recruiterId = req.params.id;

      const jobOffers = await JobOfferModel.find({
        "recruiter.recruiterId": recruiterId,
      });

      if (!jobOffers) {
        return next(new ErrorHandler("Job offers not found", 404));
      }

      res.status(201).json({
        success: true,
        jobOffers,
      });
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

      console.log(jobOfferId);

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
            jobOfferApplicantId: req.user?._id,
            status: "pending",
          },
        },
      }).then(async () => {
        await JobOfferModel.findById(jobOfferId).then(async (newJobOffer) => {
          await redis.del("allJobOffers");
          await redis.del(jobOfferId);
          await redis.set(
            jobOfferId,
            JSON.stringify(newJobOffer),
            "EX",
            60 * 60 * 24 * 7
          ); // 7 day cache;
        });
      });
      // add aplication to user
      await UserModel.findByIdAndUpdate(req.user?._id, {
        $push: {
          jobsOffersApplied: {
            jobOfferId: jobOfferId,
            status: "pending",
          },
        },
      }).then(async () => {
        await UserModel.findById(req.user?._id).then(async (userNewData) => {
          await redis.del(req.user?._id);
          await redis.set(
            req.user?._id,
            JSON.stringify(userNewData),
            "EX",
            60 * 60 * 24 * 7
          ); // 7 day cache;
        });
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

// ------------------------------------------------------------------------ Add to favorites job offers
export const addToFavoritesJobOffers = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const jobOfferId = req.params.id;
      const userId = req.user?._id;

      const jobOffer = await JobOfferModel.findById(jobOfferId);

      if (!jobOffer) {
        return next(new ErrorHandler("Job offer not found", 404));
      }

      const user = await UserModel.findById(userId);

      // Check if user has already applied to this job offer
      const isFavorite = user?.jobsOffersFavorites.find(
        (userFavorite) =>
          userFavorite.jobOfferId.toString() === jobOfferId.toString()
      );

      if (isFavorite) {
        // delete job offer from user favorites
        await UserModel.findByIdAndUpdate(req.user?._id, {
          $pull: {
            jobsOffersFavorites: {
              jobOfferId: jobOfferId,
            },
          },
        }).then(async () => {
          await UserModel.findById(req.user?._id).then(async (userNewData) => {
            await redis.del(req.user?._id);
            await redis.set(
              req.user?._id,
              JSON.stringify(userNewData),
              "EX",
              60 * 60 * 24 * 7
            ); // 7 day cache;
          });
        });
        res.status(201).json({
          success: true,
          message: "Deleted from favorites successfully",
          favourited: false,
        });
      } else {
        // add job offer to user favorites
        await UserModel.findByIdAndUpdate(req.user?._id, {
          $push: {
            jobsOffersFavorites: {
              jobOfferId: jobOfferId,
            },
          },
        }).then(async () => {
          await UserModel.findById(req.user?._id).then(async (userNewData) => {
            await redis.del(req.user?._id);
            await redis.set(
              req.user?._id,
              JSON.stringify(userNewData),
              "EX",
              60 * 60 * 24 * 7
            ); // 7 day cache;
          });
        });

        res.status(201).json({
          success: true,
          message: "Added to favorites successfully",
          favourited: true,
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------------------------------------------------------------ Get all favorited job offers by user
export const getAllFavoritedJobOffersByUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.id;

      const isUserCachedExist = await redis.get(userId);

      if (isUserCachedExist) {
        const user = JSON.parse(isUserCachedExist);
        const FavouritedJobOffers = user.jobsOffersFavorites;

        const jobOffers = await JobOfferModel.find({
          _id: {
            $in: FavouritedJobOffers.map(
              (jobOffer: any) => jobOffer.jobOfferId
            ),
          },
        });

        console.log(jobOffers);

        return res.status(201).json({
          success: true,
          jobOffers,
        });
      } else {
        const user = await UserModel.findById(userId);

        if (!user) {
          return next(new ErrorHandler("User not found", 404));
        }
        const FavouritedJobOffers = user.jobsOffersFavorites;

        const jobOffers = await JobOfferModel.find({
          _id: {
            $in: FavouritedJobOffers.map(
              (jobOffer: any) => jobOffer.jobOfferId
            ),
          },
        });

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

// ------------------------------------------------------------------------ Get all applied to job offers by user
export const getAllAppliedToJobOffersByUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.id;

      const isUserCachedExist = await redis.get(userId);

      if (isUserCachedExist) {
        const user = JSON.parse(isUserCachedExist);
        const appliedJobOffers = user.jobsOffersApplied;

        const jobOffers = await JobOfferModel.find({
          _id: {
            $in: appliedJobOffers.map((jobOffer: any) => jobOffer.jobOfferId),
          },
        });

        return res.status(201).json({
          success: true,
          jobOffers,
        });
      } else {
        const user = await UserModel.findById(userId);

        if (!user) {
          return next(new ErrorHandler("User not found", 404));
        }
        const appliedJobOffers = user.jobsOffersApplied;

        const jobOffers = await JobOfferModel.find({
          _id: {
            $in: appliedJobOffers.map((jobOffer: any) => jobOffer.jobOfferId),
          },
        });

        // send jobOffers to frontend but without other applicants BUT STILL with proper status from database
        jobOffers.forEach((jobOffer) => {
          jobOffer.jobOfferApplicants = jobOffer.jobOfferApplicants.filter(
            (applicant) =>
              applicant.jobOfferApplicantId.toString() ===
              req.user?._id.toString()
          );
        });

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

// ------------------------------------------------------------------------ Get all applicants of a job offer
export const getAllApplicantsOfAJobOffer = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const jobOfferId = req.params.id;

      const jobOffer = await JobOfferModel.findById(jobOfferId);

      if (!jobOffer) {
        return next(new ErrorHandler("Job offer not found", 404));
      }

      const applicants = jobOffer.jobOfferApplicants;

      // using applicantsId form applicants array, get basic user info like name, email, avatar, bio, socials and send it with status from applicants array
      const applicantsId = applicants.map(
        (applicant: any) => applicant.jobOfferApplicantId
      );

      const users = await UserModel.find({
        _id: {
          $in: applicantsId,
        },
      });

      const applicantsWithUserInfo = users.map((user) => {
        const applicant = applicants.find(
          (applicant: any) =>
            applicant.jobOfferApplicantId.toString() === user._id.toString()
        );
        return {
          status: applicant?.status,
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          avatar: user.avatar,
          bio: user.bio,
          social: user.social,
        };
      });

      res.status(201).json({
        success: true,
        applicantsWithUserInfo,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------------------------------------------------------------ Recruiter click on applicant
export const recruiterClickOnApplicant = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const jobOfferId = req.params.id;
      const { applicantId } = req.body;

      const jobOffer = await JobOfferModel.findById(jobOfferId);

      if (!jobOffer) {
        return next(new ErrorHandler("Job offer not found", 404));
      }

      // Check if user is the creator of the job offer
      if (
        jobOffer?.recruiter.recruiterId.toString() !==
          req.user?._id.toString() &&
        req.user?.role !== "admin"
      ) {
        return next(
          new ErrorHandler(
            "You are not authorized to click on this applicant",
            403
          )
        );
      }

      // Check if applicant exists
      const applicant = jobOffer.jobOfferApplicants.find(
        (applicant) =>
          applicant.jobOfferApplicantId.toString() === applicantId.toString()
      );

      if (!applicant) {
        return next(new ErrorHandler("Applicant not found", 404));
      }

      // update applicant status
      await JobOfferModel.findOneAndUpdate(
        {
          _id: jobOfferId,
          "jobOfferApplicants.jobOfferApplicantId": applicantId,
        },
        {
          $set: {
            "jobOfferApplicants.$.status": "opened",
          },
        }
      ).then(async () => {
        await JobOfferModel.findById(jobOfferId).then(async (newJobOffer) => {
          await redis.del("allJobOffers");
          await redis.del(jobOfferId);
          await redis.set(
            jobOfferId,
            JSON.stringify(newJobOffer),
            "EX",
            60 * 60 * 24 * 7
          ); // 7 day cache;
        });
      });

      // update user status
      await UserModel.findOneAndUpdate(
        {
          _id: applicantId,
          "jobsOffersApplied.jobOfferId": jobOfferId,
        },
        {
          $set: {
            "jobsOffersApplied.$.status": "opened",
          },
        }
      ).then(async () => {
        await UserModel.findById(applicantId).then(async (userNewData) => {
          await redis.del(applicantId);
          await redis.set(
            applicantId,
            JSON.stringify(userNewData),
            "EX",
            60 * 60 * 24 * 7
          ); // 7 day cache;
        });
      });

      res.status(201).json({
        success: true,
        message: "Applicant status updated successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
