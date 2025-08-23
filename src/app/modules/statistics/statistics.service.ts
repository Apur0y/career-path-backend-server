// services/statistics.service.ts
import prisma from "../../utils/prisma";
import { UserRole } from "@prisma/client";

const getDashboardStatistics = async () => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // First get total user count
  const totalUsers = await prisma.user.count();

  // For MongoDB, we need to get profile and company IDs first
  const profiles = await prisma.profile.findMany({
    select: { userId: true },
  });
  const companies = await prisma.company.findMany({
    select: { userId: true },
  });

  const profileUserIds = profiles.map((p) => p.userId);
  const companyUserIds = companies.map((c) => c.userId);

  // Execute all other queries in parallel
  const [
    totalVerifiedUsers,
    jobSeekers,
    employers,
    totalEmployers,
    todaysJobs,
    totalJobs,
    totalCompanies,
    totalSubscriptions,
    activeSubscriptions,
  ] = await Promise.all([
    // Total verified users
    prisma.user.count({
      where: { isVerified: true },
    }),

    // All job seekers
    prisma.user.findMany({
      where: { role: UserRole.JOB_SEEKER },
      select: { id: true },
    }),

    // All employers
    prisma.user.findMany({
      where: { role: UserRole.EMPLOYEE },
      select: { id: true },
    }),

    // Total employers count
    prisma.user.count({
      where: { role: UserRole.EMPLOYEE },
    }),

    // Jobs posted today
    prisma.jobPost.count({
      where: {
        createdAt: { gte: todayStart },
      },
    }),

    // Total jobs posted
    prisma.jobPost.count(),

    // Total companies registered
    prisma.company.count(),

    // Total subscriptions
    prisma.subscription.count(),

    // Active subscriptions
    prisma.subscription.count({
      where: {
        OR: [{ endDate: { gte: new Date() } }, { endDate: null }],
        paymentStatus: "COMPLETED",
      },
    }),
  ]);

  // Calculate active users by checking intersections
  const activeJobSeekers = jobSeekers.filter((user) =>
    profileUserIds.includes(user.id)
  ).length;

  const activeEmployers = employers.filter((user) =>
    companyUserIds.includes(user.id)
  ).length;

  return {
    totalVerifiedUsers,
    activeJobSeekers,
    activeEmployers,
    todaysJobs,
    totalJobs,
    totalCompanies,
    totalSubscriptions,
    activeSubscriptions,
  };
};

const getLoginStatistics = async () => {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // Get all users with their roles
  const users = await prisma.user.findMany({
    select: { id: true, role: true },
  });

  // Get all login records for active users calculation
  const recentLogins = await prisma.loginRecord.findMany({
    where: {
      loginTime: { gte: currentMonthStart },
    },
    select: {
      userId: true,
      loginTime: true,
      user: {
        select: {
          role: true,
        },
      },
    },
    orderBy: {
      loginTime: "desc",
    },
  });

  // Get unique active users (most recent login per user)
  const activeUsers = recentLogins.reduce((acc, login) => {
    if (!acc.some((user) => user.userId === login.userId)) {
      acc.push({
        userId: login.userId,
        role: login.user.role,
      });
    }
    return acc;
  }, [] as { userId: string; role: UserRole }[]);

  // Get login counts by period
  // const [thisMonthLogins, lastMonthLogins] = await Promise.all([
  //   prisma.loginRecord.count({
  //     where: {
  //       loginTime: { gte: currentMonthStart },
  //     },
  //   }),
  //   prisma.loginRecord.count({
  //     where: {
  //       loginTime: { gte: lastMonthStart, lte: lastMonthEnd },
  //     },
  //   }),
  // ]);

  // Count logins by role for this month
  const thisMonthLoginsByRole = await Promise.all(
    Object.values(UserRole).map(async (role) => {
      return {
        role,
        count: await prisma.loginRecord.count({
          where: {
            loginTime: { gte: currentMonthStart },
            user: { role },
          },
        }),
      };
    })
  );

  // Count logins by role for last month
  const lastMonthLoginsByRole = await Promise.all(
    Object.values(UserRole).map(async (role) => {
      return {
        role,
        count: await prisma.loginRecord.count({
          where: {
            loginTime: { gte: lastMonthStart, lte: lastMonthEnd },
            user: { role },
          },
        }),
      };
    })
  );

  // Initialize statistics
  const stats = {
    jobSeekers: {
      activeThisMonth: activeUsers.filter((u) => u.role === UserRole.JOB_SEEKER)
        .length,
      loginsThisMonth:
        thisMonthLoginsByRole.find((r) => r.role === UserRole.JOB_SEEKER)
          ?.count || 0,
      loginsLastMonth:
        lastMonthLoginsByRole.find((r) => r.role === UserRole.JOB_SEEKER)
          ?.count || 0,
    },
    employers: {
      activeThisMonth: activeUsers.filter((u) => u.role === UserRole.EMPLOYEE)
        .length,
      loginsThisMonth:
        thisMonthLoginsByRole.find((r) => r.role === UserRole.EMPLOYEE)
          ?.count || 0,
      loginsLastMonth:
        lastMonthLoginsByRole.find((r) => r.role === UserRole.EMPLOYEE)
          ?.count || 0,
    },
    superAdmins: {
      total: users.filter((u) => u.role === UserRole.SUPER_ADMIN).length,
      activeThisMonth: activeUsers.filter(
        (u) => u.role === UserRole.SUPER_ADMIN
      ).length,
      loginsThisMonth:
        thisMonthLoginsByRole.find((r) => r.role === UserRole.SUPER_ADMIN)
          ?.count || 0,
      loginsLastMonth:
        lastMonthLoginsByRole.find((r) => r.role === UserRole.SUPER_ADMIN)
          ?.count || 0,
    },
  };

  return stats;
};

const getEmployeeDashboardStatistics = async (userId: string) => {
  // Find the user and validate they are a company employee
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
      role: UserRole.EMPLOYEE,
    },
    include: {
      Company: {
        select: {
          id: true,
          companyName: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error(
      "User not found or not authorized to view dashboard statistics."
    );
  }

  if (!user.Company) {
    throw new Error("User is not associated with any company.");
  }

  const companyId = user.Company.id;
  const currentDate = new Date();

  // Get all job posts from the user's company
  const [totalJobPosts, liveJobs, companyJobApplications, activeInterviews] =
    await Promise.all([
      // Total job posts by the company
      prisma.jobPost.count({
        where: {
          companyId: companyId,
        },
      }),

      // Live jobs (not expired and active)
      prisma.jobPost.count({
        where: {
          companyId: companyId,
          deadline: {
            gte: currentDate,
          },
          status: "ACTIVE",
        },
      }),

      // Total applications received for all company jobs
      prisma.jobApplication.count({
        where: {
          job: {
            companyId: companyId,
          },
        },
      }),

      // Active interviews (scheduled interviews)
      prisma.interviewScheduler.count({
        where: {
          jobApplication: {
            job: {
              companyId: companyId,
            },
          },
        },
      }),
    ]);

  return {
    totalLiveJobs: liveJobs,
    totalApplicationReceived: companyJobApplications,
    totalJobPosts: totalJobPosts,
    activeInterview: activeInterviews,
    companyInfo: {
      id: user.Company.id,
      name: user.Company.companyName,
    },
  };
};

const getLiveJobsStatistics = async (userId: string) => {
  // Find the user and validate they are a company employee
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
      role: UserRole.EMPLOYEE,
    },
    include: {
      Company: {
        select: {
          id: true,
          companyName: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error(
      "User not found or not authorized to view live jobs statistics."
    );
  }

  if (!user.Company) {
    throw new Error("User is not associated with any company.");
  }

  const companyId = user.Company.id;
  const currentDate = new Date();

  // Calculate month boundaries
  const thisMonthStart = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );
  const lastMonthStart = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() - 1,
    1
  );
  const lastMonthEnd = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    0
  );

  const [
    totalLiveJobs,
    liveJobsByDesignation,
    thisMonthLiveJobs,
    lastMonthLiveJobs,
  ] = await Promise.all([
    // Total live jobs count
    prisma.jobPost.count({
      where: {
        companyId: companyId,
        deadline: {
          gte: currentDate,
        },
        status: "ACTIVE",
      },
    }),

    // Live jobs grouped by designation/title
    prisma.jobPost.groupBy({
      by: ["title"],
      where: {
        companyId: companyId,
        deadline: {
          gte: currentDate,
        },
        status: "ACTIVE",
      },
      _count: {
        title: true,
      },
      orderBy: {
        _count: {
          title: "desc",
        },
      },
    }),

    // Live jobs posted this month
    prisma.jobPost.count({
      where: {
        companyId: companyId,
        deadline: {
          gte: currentDate,
        },
        status: "ACTIVE",
        createdAt: {
          gte: thisMonthStart,
        },
      },
    }),

    // Live jobs posted last month
    prisma.jobPost.count({
      where: {
        companyId: companyId,
        deadline: {
          gte: currentDate,
        },
        status: "ACTIVE",
        createdAt: {
          gte: lastMonthStart,
          lte: lastMonthEnd,
        },
      },
    }),
  ]);

  // Format designation-wise data
  const designationWiseJobs = liveJobsByDesignation.map((job) => ({
    designation: job.title,
    count: job._count.title,
  }));

  return {
    totalLiveJobs,
    designationWiseJobs,
    monthlyBreakdown: {
      thisMonth: thisMonthLiveJobs,
      lastMonth: lastMonthLiveJobs,
    },
    companyInfo: {
      id: user.Company.id,
      name: user.Company.companyName,
    },
  };
};

export const StatisticsService = {
  getDashboardStatistics,
  getLoginStatistics,
  getEmployeeDashboardStatistics,
  getLiveJobsStatistics,
};
