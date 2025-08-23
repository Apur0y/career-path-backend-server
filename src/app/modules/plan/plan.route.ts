import { Router } from "express";
import { PlanController } from "./plan.controller";
import { PlanValidation } from "./plan.validation";
import validateRequest from "../../middlewares/validateRequest";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = Router();

router.post(
  "/create-plan",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  validateRequest(PlanValidation.planValidationSchema),
  PlanController.createPlan
);

router.get("/", PlanController.getAllPlans);

router.get("/:planId", PlanController.getPlanById);

router.patch(
  "/:planId",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  validateRequest(PlanValidation.updatePlanValidationSchema),
  PlanController.updatePlan
);

router.delete(
  "/:planId",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  PlanController.deletePlan
);

export const PlanRoutes = router;
