import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
  createJobOffer,
  editJobOffer,
  getAllJobOffers,
} from "../controllers/jobOffer.controller";

const jobOfferRouter = express.Router();

// ------------------------------------ POST Routes ------------------------------------
jobOfferRouter.post("/create-job-offer", isAuthenticated, createJobOffer);

// ------------------------------------ PUT Routes ------------------------------------
jobOfferRouter.put("/edit-job-offer/:id", isAuthenticated, editJobOffer);

// ------------------------------------ GET Routes ------------------------------------
jobOfferRouter.get("/get-all-job-offers", getAllJobOffers);

// ------------------------------------ DELETE Routes ------------------------------------

export default jobOfferRouter;
