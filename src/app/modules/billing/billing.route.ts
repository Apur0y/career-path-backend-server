import { Router } from "express";
import auth from "../../middlewares/auth";
import { BillingValidation } from "./billing.validation";
import { BillingController } from "./billing.controller";
import validateRequest from "../../middlewares/validateRequest";

const router = Router();

router.post(
  "/create-billing-info",
  auth(),
  validateRequest(BillingValidation.createBillingInfoValidationSchema),
  BillingController.createBillingInfo
);

// Get current user's billing information
router.get("/my-billing-info", auth(), BillingController.getMyBillingInfo);

export const BillingRoutes = router;
