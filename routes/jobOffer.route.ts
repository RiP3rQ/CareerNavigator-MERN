import express from "express";
import { isAuthenticated } from "../middleware/auth";
import {
  addToFavoritesJobOffers,
  applyToJobOffer,
  createJobOffer,
  deleteJobOffer,
  editJobOffer,
  filterJobOffersBySkills,
  filterJobOffersByTitle,
  getAllApplicantsOfAJobOffer,
  getAllAppliedToJobOffersByUser,
  getAllFavoritedJobOffersByUser,
  getAllJobOffers,
  getAllJobOffersOfARecruiter,
  getSingleJobOffer,
  recruiterClickOnApplicant,
} from "../controllers/jobOffer.controller";

const jobOfferRouter = express.Router();

// ------------------------------------ POST Routes ------------------------------------
jobOfferRouter.post("/create-job-offer", isAuthenticated, createJobOffer);
jobOfferRouter.post(
  "/apply-for-job-offer/:id",
  isAuthenticated,
  applyToJobOffer
);

// ------------------------------------ PUT Routes ------------------------------------
jobOfferRouter.put("/edit-job-offer/:id", isAuthenticated, editJobOffer);
jobOfferRouter.put(
  "/add-to-favorites-job-offers/:id",
  isAuthenticated,
  addToFavoritesJobOffers
);
jobOfferRouter.put(
  "/recruiter-click-on-applicant/:id",
  isAuthenticated,
  recruiterClickOnApplicant
);

// ------------------------------------ GET Routes ------------------------------------
jobOfferRouter.get("/get-all-job-offers", getAllJobOffers);
jobOfferRouter.get("/get-job-offer/:id", getSingleJobOffer);
jobOfferRouter.get(
  "/get-job-offers-by-user/:id",
  isAuthenticated,
  getAllJobOffersOfARecruiter
);
jobOfferRouter.get(
  "/filter-all-job-offer-by-tag/:tag",
  filterJobOffersBySkills
);
jobOfferRouter.get(
  "/filter-all-job-offer-by-title/:title",
  filterJobOffersByTitle
);
jobOfferRouter.get(
  "/get-all-favorited-job-offers-by-user/:id",
  isAuthenticated,
  getAllFavoritedJobOffersByUser
);
jobOfferRouter.get(
  "/get-all-applied-to-job-offers-by-user/:id",
  isAuthenticated,
  getAllAppliedToJobOffersByUser
);
jobOfferRouter.get(
  "/get-all-applicants-of-a-job-offer/:id",
  isAuthenticated,
  getAllApplicantsOfAJobOffer
);

// ------------------------------------ DELETE Routes ------------------------------------
jobOfferRouter.delete("/delete-job-offer/:id", isAuthenticated, deleteJobOffer);

export default jobOfferRouter;
