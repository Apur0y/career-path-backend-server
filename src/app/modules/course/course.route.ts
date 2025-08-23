import { Router } from "express";
import { CourseController } from "./course.controller";

const router = Router();

router.get("/recommendations/:userId", CourseController.getRecommendedCourses);

router.get("/recommendations", CourseController.getAllCourses);

export const CourseRoutes = router;
