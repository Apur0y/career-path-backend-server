import { UserRole } from "@prisma/client";
import catchAsync from "../../utils/catchAsync";
import prisma from "../../utils/prisma";
import sendResponse from "../../utils/sendResponse";
import { StatisticsService } from "./statistics.service";

const getStatistics = catchAsync(async (req, res) => {
  const stats = await StatisticsService.getDashboardStatistics();

  sendResponse(res, {
    statusCode: 200,
    message: "Dashboard statistics retrieved successfully",
    data: {
      users: {
        totalVerified: stats.totalVerifiedUsers,
        activeJobSeekers: stats.activeJobSeekers,
        activeEmployers: stats.activeEmployers,
      },
      jobs: {
        totalPostedToday: stats.todaysJobs,
        totalPosted: stats.totalJobs,
      },
      companies: {
        totalRegistered: stats.totalCompanies,
      },
      subscriptions: {
        total: stats.totalSubscriptions,
        active: stats.activeSubscriptions,
      },
    },
  });
});

const getLoginStats = catchAsync(async (req, res) => {
  const stats = await StatisticsService.getLoginStatistics();

  sendResponse(res, {
    statusCode: 200,
    message: "Login statistics retrieved successfully",
    data: {
      jobSeekers: {
        loginsThisMonth: stats.jobSeekers.loginsThisMonth,
        loginsLastMonth: stats.jobSeekers.loginsLastMonth,
        totalLogins:
          stats.jobSeekers.loginsThisMonth + stats.jobSeekers.loginsLastMonth,
      },
      employers: {
        loginsThisMonth: stats.employers.loginsThisMonth,
        loginsLastMonth: stats.employers.loginsLastMonth,
        totalLogins:
          stats.employers.loginsThisMonth + stats.employers.loginsLastMonth,
      },
    },
  });
});

const getEmployeeDashboard = catchAsync(async (req, res) => {
  const userId = req.user?.id;

  const stats = await StatisticsService.getEmployeeDashboardStatistics(userId);

  sendResponse(res, {
    statusCode: 200,
    message: "Employee dashboard statistics retrieved successfully",
    data: {
      totalLiveJobs: stats.totalLiveJobs,
      totalApplicationReceived: stats.totalApplicationReceived,
      totalJobPosts: stats.totalJobPosts,
      activeInterview: stats.activeInterview,
      companyInfo: stats.companyInfo,
    },
  });
});

const getLiveJobsStats = catchAsync(async (req, res) => {
  const userId = req.user?.id;

  const stats = await StatisticsService.getLiveJobsStatistics(userId);

  sendResponse(res, {
    statusCode: 200,
    message: "Live jobs statistics retrieved successfully",
    data: {
      totalLiveJobs: stats.totalLiveJobs,
      designationWiseJobs: stats.designationWiseJobs,
      monthlyBreakdown: stats.monthlyBreakdown,
      companyInfo: stats.companyInfo,
    },
  });
});

export const StatisticsController = {
  getStatistics,
  getLoginStats,
  getEmployeeDashboard,
  getLiveJobsStats,
};
