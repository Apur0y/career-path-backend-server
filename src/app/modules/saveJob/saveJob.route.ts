import { Router } from "express";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { SaveJobController } from "./saveJob.controller";
import { SaveJobValidation } from "./saveJob.validation";
import validateRequest from "../../middlewares/validateRequest";

const router = Router();

// Save Job routes
router.post(
  "/save",
  auth(UserRole.JOB_SEEKER),
  validateRequest(SaveJobValidation.saveJobValidationSchema),
  SaveJobController.saveJob
);

router.get("/", auth(UserRole.JOB_SEEKER), SaveJobController.getSavedJobs);

router.delete(
  "/delete/:jobId",
  auth(UserRole.JOB_SEEKER),
  SaveJobController.removeSavedJob
);

export const SaveJobRoutes = router;
