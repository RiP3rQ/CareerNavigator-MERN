import express from "express";
import { isAuthenticated } from "../middleware/auth";
import {
  applyToJobOffer,
  createJobOffer,
  deleteJobOffer,
  editJobOffer,
  filterJobOffersBySkills,
  filterJobOffersByTitle,
  getAllJobOffers,
  getAllJobOffersOfARecruiter,
  getSingleJobOffer,
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

// ------------------------------------ DELETE Routes ------------------------------------
jobOfferRouter.delete("/delete-job-offer/:id", isAuthenticated, deleteJobOffer);

export default jobOfferRouter;
