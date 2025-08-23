import { Router } from "express";
import { JobRoutes } from "../modules/job/job.route";
import { PlanRoutes } from "../modules/plan/plan.route";
import { AuthRoutes } from "../modules/auth/auth.route";
import { UserRoutes } from "../modules/user/user.routes";
import { CompanyRoutes } from "../modules/company/company.route";
import { ProfileRoutes } from "../modules/profile/profile.route";
import { RevenueRoutes } from "../modules/revenue/revenue.router";
import { StatisticsRoutes } from "../modules/statistics/statistics.route";
import { SubscriptionRoutes } from "../modules/subscription/subscription.route";
import { TransactionRoutes } from "../modules/transaction/transaction.route";
import { JobApplyRoutes } from "../modules/jobApply/jobApply.route";
import { SaveJobRoutes } from "../modules/saveJob/saveJob.route";
import { ChatRoutes } from "../modules/chat/chat.route";
import { ChatRoomRoutes } from "../modules/chatRoom/chatRoom.route";
import { CourseRoutes } from "../modules/course/course.route";
import { InterviewRoutes } from "../modules/interviewSchedule/interview.route";
import { NewsletterRoutes } from "../modules/newsletter/newsletter.route";
import { BillingRoutes } from "../modules/billing/billing.route";

const router = Router();

const moduleRoutes = [
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/users",
    route: UserRoutes,
  },
  {
    path: "/plans",
    route: PlanRoutes,
  },
  {
    path: "/subscriptions",
    route: SubscriptionRoutes,
  },
  {
    path: "/companies",
    route: CompanyRoutes,
  },
  {
    path: "/jobs",
    route: JobRoutes,
  },
  {
    path: "/profiles",
    route: ProfileRoutes,
  },
  {
    path: "/revenue",
    route: RevenueRoutes,
  },
  {
    path: "/statistics",
    route: StatisticsRoutes,
  },
  {
    path: "/transactions",
    route: TransactionRoutes,
  },
  {
    path: "/apply",
    route: JobApplyRoutes,
  },
  {
    path: "/save-jobs",
    route: SaveJobRoutes,
  },
  {
    path: "/chats",
    route: ChatRoutes,
  },
  {
    path: "/chat-rooms",
    route: ChatRoomRoutes,
  },
  {
    path: "/courses",
    route: CourseRoutes,
  },
  {
    path: "/interviews",
    route: InterviewRoutes,
  },
  {
    path: "/newsletters",
    route: NewsletterRoutes,
  },
  {
    path: "/billing",
    route: BillingRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
