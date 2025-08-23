import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { upload } from "../../utils/upload";
import ApiError from "../../errors/ApiError";
import { CompanyValidation } from "./company.validation";
import { CompanyController } from "./company.controller";
import validateRequest from "../../middlewares/validateRequest";
import { NextFunction, Request, Response, Router } from "express";

const router = Router();

router.get("/names", CompanyController.getAllCompaniesName);

router.post(
  "/create",
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
  validateRequest(CompanyValidation.createCompanySchema),
  CompanyController.createCompany
);

router.get(
  "/my-company",
  auth(UserRole.EMPLOYEE),
  CompanyController.getMyCompany
);

router.get("/", CompanyController.getAllCompanies);

router.get(
  "/:companyId",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  CompanyController.getSingleCompany
);

router.patch(
  "/update",
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
  validateRequest(CompanyValidation.updateCompanySchema),
  CompanyController.updateCompany
);

export const CompanyRoutes = router;
