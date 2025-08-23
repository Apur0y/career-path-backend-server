import { Router } from "express";
import validateRequest from "../../middlewares/validateRequest";
import { NewsletterController } from "./newsletter.controller";
import { NewsletterValidation } from "./newsletter.validation";

const router = Router();

router.post(
  "/subscribe",
  validateRequest(NewsletterValidation.subscribeZodSchema),
  NewsletterController.subscribe
);

export const NewsletterRoutes = router;
