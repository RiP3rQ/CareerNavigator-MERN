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
  getSingleJobOffer,
} from "../controllers/jobOffer.controller";

const jobOfferRouter = express.Router();

// ------------------------------------ POST Routes ------------------------------------
jobOfferRouter.post("/create-job-offer", isAuthenticated, createJobOffer);

// ------------------------------------ PUT Routes ------------------------------------
jobOfferRouter.put("/edit-job-offer/:id", isAuthenticated, editJobOffer);

// ------------------------------------ GET Routes ------------------------------------
jobOfferRouter.get("/get-all-job-offers", getAllJobOffers);
jobOfferRouter.get("/get-job-offer/:id", getSingleJobOffer);
jobOfferRouter.get(
  "/filter-all-job-offer-by-tag/:tag",
  filterJobOffersBySkills
);
jobOfferRouter.get(
  "/filter-all-job-offer-by-title/:title",
  filterJobOffersByTitle
);
// -- apply to job offer
jobOfferRouter.get("/apply-to-job-offer/:id", isAuthenticated, applyToJobOffer);

// ------------------------------------ DELETE Routes ------------------------------------
jobOfferRouter.delete("/delete-job-offer/:id", isAuthenticated, deleteJobOffer);

export default jobOfferRouter;
