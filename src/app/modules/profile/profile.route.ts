import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { upload } from "../../utils/upload";
import ApiError from "../../errors/ApiError";
import { ProfileController } from "./profile.controller";
import express, { NextFunction, Request, Response } from "express";
import validateRequest from "../../middlewares/validateRequest";
import { profileValidation } from "./profile.validation";

const router = express.Router();

router.post(
  "/create",
  auth(UserRole.JOB_SEEKER),
  upload.fields([
    { name: "achievementFiles", maxCount: 10 },
    { name: "graduationCertificateFiles", maxCount: 10 },
  ]),
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
  ProfileController.createProfile
);
router.get("/resume/:userId", auth(UserRole.JOB_SEEKER, UserRole.ADMIN, UserRole.SUPER_ADMIN), ProfileController.resumeGenerate)
router.patch("/resume/:userId", auth(UserRole.JOB_SEEKER), ProfileController.updatedProfile)

router.get(
  "/get-my-profile",
  auth(UserRole.JOB_SEEKER),
  ProfileController.getMyProfileById
);
router.get(
  "/:userId",
  auth(UserRole.JOB_SEEKER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  ProfileController.getProfileById
);


export const ProfileRoutes = router;
