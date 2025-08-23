import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { upload } from "../../utils/upload";
import { JobController } from "./job.controller";
import { JobPostValidation } from "./job.validation";
import validateRequest from "../../middlewares/validateRequest";
import { NextFunction, Request, Response, Router } from "express";
import ApiError from "../../errors/ApiError";

const router = Router();

router.post(
  "/create-job-post",
  upload.single("file"),
  auth(UserRole.EMPLOYEE),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.body?.data) {
        req.body = JSON.parse(req.body.data);
      }
      next();
    } catch {
      next(new ApiError(400, "Invalid JSON in 'data' field"));
    }
  },
  validateRequest(JobPostValidation.createJobPostSchema),
  JobController.createJobPost
);

router.get(
  "/my-job-posts",
  auth(UserRole.EMPLOYEE),
  JobController.getMyJobPosts
);

router.get("/my-job-list", auth(UserRole.EMPLOYEE), JobController.getMyJobList);

router.get("/posts", JobController.getActiveJobPosts);

router.get(
  "/all-posts",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  JobController.getAllJobPosts
);

router.get("/work-mode", JobController.getWorkMode);

router.get("/departments", JobController.getAllDepartments);

router.get("/locations", JobController.getAllJobLocations);

router.get(
  "/recommended-jobs/:userId",
  auth(UserRole.JOB_SEEKER),
  JobController.getRecommendedJobs
);

router.delete(
  "/:jobPostId",
  auth(UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  JobController.deleteJobPost
);

router.patch(
  "/:jobPostId/suspend",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  JobController.suspendJobPost
);

router.patch(
  "/:jobPostId",
  upload.single("file"),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.body?.data) {
        req.body = JSON.parse(req.body.data);
      }
      next();
    } catch {
      next(new ApiError(400, "Invalid JSON in 'data' field"));
    }
  },
  auth(UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(JobPostValidation.updateJobPostSchema),
  JobController.updateJobPostIntoDB
);

export const JobRoutes = router;
