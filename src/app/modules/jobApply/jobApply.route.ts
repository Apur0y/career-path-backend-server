import { Router } from "express";
import { JobApplyController } from "./jobApply.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import validateRequest from "../../middlewares/validateRequest";
import { JobApplyValidation } from "./jobApply.validation";

const router = Router();

// Job application routes
router.post(
  "/apply-job",
  auth(UserRole.JOB_SEEKER),
  validateRequest(JobApplyValidation.jobApplyValidationSchema),
  JobApplyController.applyJob
);

router.get(
  "/apply-job",
  auth(UserRole.JOB_SEEKER),
  JobApplyController.getJobApply
);

router.get(
  "/apply-job/:id",
  auth(UserRole.JOB_SEEKER),
  JobApplyController.getJobApplyById
);

router.get(
  "/my-applied-jobs",
  auth(UserRole.JOB_SEEKER),
  JobApplyController.getMyAppliedJobList
);

// Candidate management routes
router.get(
  "/candidates",
  auth(UserRole.EMPLOYEE),
  JobApplyController.getAllCandidate
);

router.get(
  "/candidates/:applyId",
  auth(UserRole.EMPLOYEE),
  JobApplyController.getCandidateById
);

router.get(
  "/my-candidates",
  auth(UserRole.EMPLOYEE),
  JobApplyController.getMyCandidatesList
);

router.get(
  "/recent-applied-candidates",
  auth(UserRole.EMPLOYEE),
  JobApplyController.getRecentAppliedCandidates
);

// Application management routes - Put specific routes first
router.delete(
  "/delete-job-applicant/:applicationId",
  auth(UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  JobApplyController.deleteJobApplicant
);

// Put the more general route last to avoid conflicts
router.patch(
  "/:applicationId/status",
  auth(UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(JobApplyValidation.updateStatusZodSchema),
  JobApplyController.changeApplicationStatus
);

export const JobApplyRoutes = router;
