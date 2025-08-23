import { Router } from "express";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import validateRequest from "../../middlewares/validateRequest";
import { TransactionController } from "./transaction.controller";
import { TransactionValidation } from "./transaction.validation";

const router = Router();

router.get(
  "/",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  TransactionController.getTransactionHistory
);

// Get current user's transaction history
router.get(
  "/my-transactions",
  auth(),
  validateRequest(TransactionValidation.getTransactionHistoryValidation),
  TransactionController.getMyTransactionHistory
);

// Get user transaction history by userId (Admin only)
router.get(
  "/:userId",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  TransactionController.getUserTransactionHistory
);

export const TransactionRoutes = router;
