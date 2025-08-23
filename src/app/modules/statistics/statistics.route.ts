import { Router } from "express";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { StatisticsController } from "./statistics.controller";

const router = Router();

router.get(
  "/",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  StatisticsController.getStatistics
);

router.get(
  "/login-stats",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  StatisticsController.getLoginStats
);

router.get(
  "/employee-dashboard",
  auth(UserRole.EMPLOYEE),
  StatisticsController.getEmployeeDashboard
);

router.get(
  "/live-jobs",
  auth(UserRole.EMPLOYEE),
  StatisticsController.getLiveJobsStats
);

export const StatisticsRoutes = router;
