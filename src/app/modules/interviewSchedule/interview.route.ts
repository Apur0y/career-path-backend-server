import { Router } from "express";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { InterviewValidation } from "./interview.validation";
import { interviewController } from "./interview.controller";
import validateRequest from "../../middlewares/validateRequest";

const router = Router();

// Get my interview schedules - Job seekers only
router.get(
  "/my",
  auth(UserRole.JOB_SEEKER),
  interviewController.getMyInterviewSchedules
);

// Create interview schedule - Only employees can create interviews
router.post(
  "/create-schedule",
  auth(UserRole.EMPLOYEE),
  validateRequest(InterviewValidation.createInterviewZodSchema),
  interviewController.createInterviewSchedule
);

// Get all interviews with filtering - Both employees and users can view
router.get(
  "/",
  auth(UserRole.EMPLOYEE),
  validateRequest(InterviewValidation.getAllInterviewsZodSchema),
  interviewController.getAllInterviews
);

// Get upcoming interviews for the logged-in user
router.get(
  "/upcoming",
  auth(UserRole.EMPLOYEE),
  interviewController.getUpcomingInterviews
);

// Get all interview schedules for company owner/employee
router.get(
  "/company",
  auth(UserRole.EMPLOYEE),
  interviewController.getCompanyInterviews
);

// Get interview by ID - Both employees and users can view
router.get(
  "/:id",
  auth(UserRole.EMPLOYEE),
  validateRequest(InterviewValidation.getInterviewByIdZodSchema),
  interviewController.getInterviewById
);

// Update interview schedule - Only employees can update
// router.patch(
//   "/:id",
//   auth(UserRole.EMPLOYEE),
//   validateRequest(InterviewValidation.updateInterviewZodSchema),
//   interviewController.updateInterviewSchedule
// );

// Delete interview schedule - Only employees can delete
router.delete(
  "/:id",
  auth(UserRole.EMPLOYEE),
  validateRequest(InterviewValidation.deleteInterviewZodSchema),
  interviewController.deleteInterviewSchedule
);

export const InterviewRoutes = router;
