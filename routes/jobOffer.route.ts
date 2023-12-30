import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
  createJobOffer,
  editJobOffer,
  getAllJobOffers,
} from "../controllers/jobOffer.controller";

const jobOfferRouter = express.Router();

jobOfferRouter.post("/create-job-offer", isAuthenticated, createJobOffer);

jobOfferRouter.put("/edit-job-offer/:id", isAuthenticated, editJobOffer);

jobOfferRouter.get("/get-all-job-offers", getAllJobOffers);

export default jobOfferRouter;
