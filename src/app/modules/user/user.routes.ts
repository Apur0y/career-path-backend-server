import status from "http-status";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { upload } from "../../utils/upload";
import ApiError from "../../errors/ApiError";
import { UserValidation } from "./user.validation";
import { UserController } from "./user.controller";
import validateRequest from "../../middlewares/validateRequest";
import { NextFunction, Request, Response, Router } from "express";

const router = Router();

router.get(
  "/",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  UserController.getAllUser
);

router.get(
  "/:userId",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  UserController.getSingleUserById
);

router.post(
  "/register",
  validateRequest(UserValidation.createUserValidationSchema),
  UserController.createUser
);

router.patch(
  "/update",
  auth(),
  upload.single("file"),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.body?.data) {
        req.body = JSON.parse(req.body.data);
      }
      next();
    } catch {
      next(new ApiError(status.BAD_REQUEST, "Invalid JSON in 'data' field"));
    }
  },
  auth(),
  validateRequest(UserValidation.updateUserValidationSchema),
  UserController.updateUser
);

router.patch(
  "/update/:userId",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  upload.single("file"),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.body?.data) {
        req.body = JSON.parse(req.body.data);
      }
      next();
    } catch {
      next(new ApiError(status.BAD_REQUEST, "Invalid JSON in 'data' field"));
    }
  },
  validateRequest(UserValidation.updateUserValidationSchema),
  UserController.updateUserByAdmin
);

router.delete(
  "/:userId",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  UserController.deleteUser
);

router.patch(
  "/make-admin/:email",
  auth(UserRole.SUPER_ADMIN),
  UserController.makeAdmin
);

router.patch(
  "/contact-info",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(UserValidation.updateContactInfoValidationSchema),
  UserController.updateContactInfo
);

router.patch(
  "/delete/:userId",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  UserController.deleteUserStatus
);

router.patch(
  "/suspend/:userId",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  UserController.suspendUserStatus
);

router.delete(
  "/remove/:userId",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  UserController.removeUser
);

export const UserRoutes = router;
