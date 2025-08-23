import axios from "axios";
import prisma from "../../utils/prisma";
import ApiError from "../../errors/ApiError";
import QueryBuilder from "../../builder/QueryBuilder";
import { generateJobId } from "../../helpers/jobIdGenerator";
import { JobPost, Prisma, UserRole, JobType } from "@prisma/client";
import scheduleExpirationUpdate from "../../helpers/scheduleExpirationUpdate";

const createJobPostIntoDB = async (userId: string, payload: JobPost) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      isSubscribed: true,
      planExpiration: true,
      totalPayPerJobCount: true,
      role: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found!");
  }

  // Check if company exists and belongs to this user
  const company = await prisma.company.findUnique({
    where: { id: payload.companyId },
    select: {
      userId: true,
    },
  });

  if (!company) {
    throw new ApiError(404, "Company not found!");
  }

  if (company.userId !== userId) {
    throw new ApiError(
      403,
      "You don't have permission to post jobs for this company"
    );
  }

  // Check subscription
  let canPostJob =
    user.isSubscribed &&
    user.planExpiration &&
    user.planExpiration > new Date();

  if (!canPostJob) {
    if (user.totalPayPerJobCount > 0) {
      canPostJob = true;
    } else {
      throw new ApiError(
        402,
        "You need an active subscription or pay-per-job credits"
      );
    }
  }

  // Set default deadline to 1 year from now if not provided
  const deadlineDate = payload.deadline
    ? new Date(payload.deadline)
    : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
  const isExpired = deadlineDate < new Date();

  // Generate unique job ID
  const jobId = await generateJobId();

  const result = await prisma.jobPost.create({
    data: {
      ...payload,
      userId,
      jobId,
      deadline: deadlineDate,
      status: isExpired ? "EXPIRED" : "ACTIVE",
      features: payload.features as Prisma.InputJsonValue,
    },
  });

  if (!isExpired) {
    scheduleExpirationUpdate(result.id, deadlineDate);
  }

  if (!user.isSubscribed) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        totalPayPerJobCount: {
          decrement: 1,
        },
      },
    });
  }

  return result;
};

const getMyJobPostsFromDB = async (
  userId: string,
  query: Record<string, unknown>
) => {
  const jobPostQuery = new QueryBuilder(prisma.jobPost, query)
    .search([
      "title",
      "location",
      "company.companyName",
      "company.zipCode",
      "experience",
      "salaryRange",
      "jobType",
    ])
    .filter()
    .rawFilter({ userId })
    .paginate()
    .include({
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          fullName: true,
          email: true,
          profilePic: true,
          role: true,
        },
      },
      company: {
        select: {
          companyName: true,
          logo: true,
          industryType: true,
          email: true,
          phoneNumber: true,
        },
      },
    });

  const [result, meta] = await Promise.all([
    jobPostQuery.execute(),
    jobPostQuery.countTotal(),
  ]);

  if (!result.length) {
    throw new ApiError(404, "No job posts found for your account!");
  }

  return {
    meta,
    data: result,
  };
};

const getAllJobPostsFromDB = async (query: Record<string, unknown>) => {
  const jobPostQuery = new QueryBuilder(prisma.jobPost, query)
    .search(["location", "company.zipCode", "jobType"])
    .filter()
    .paginate()
    .include({
      company: {
        select: {
          companyName: true,
          industryType: true,
          logo: true,
          roleInCompany: true,
          description: true,
          email: true,
          phoneNumber: true,
          country: true,
          city: true,
          state: true,
          address: true,
          zipCode: true,
          website: true,
        },
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          fullName: true,
          email: true,
          profilePic: true,
          role: true,
          isSubscribed: true,
          planExpiration: true,
          subscriptionType: true,
          totalPayPerJobCount: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    });

  const [result, meta] = await Promise.all([
    jobPostQuery.execute(),
    jobPostQuery.countTotal(),
  ]);

  if (!result.length) {
    throw new ApiError(404, "No job posts found!");
  }

  return {
    meta,
    data: result,
  };
};

const getActiveJobPostsFromDB = async (query: Record<string, unknown>) => {
  // Special handling for salaryRange range semantics
  const q = { ...(query as Record<string, any>) };
  const salaryRangeQuery: string | undefined =
    typeof q.salaryRange === "string" ? (q.salaryRange as string) : undefined;

  // Enhanced search functionality
  const searchTerm = q.searchTerm as string;

  // Helpers to parse ranges like "$1,000 - $12,000" or "1200" into numeric min/max
  const parseSalaryRange = (
    input: string
  ): { min: number; max: number } | null => {
    if (!input) return null;
    const numbers = (input.match(/\d[\d,]*/g) || []).map((n) =>
      parseInt(n.replace(/,/g, ""), 10)
    );
    if (numbers.length === 0) return null;
    if (numbers.length === 1) return { min: numbers[0], max: numbers[0] };
    const min = Math.min(numbers[0], numbers[1]);
    const max = Math.max(numbers[0], numbers[1]);
    return { min, max };
  };

  const rangesOverlap = (
    a: { min: number; max: number } | null,
    b: { min: number; max: number } | null
  ) => {
    if (!a || !b) return false;
    if (
      Number.isNaN(a.min) ||
      Number.isNaN(a.max) ||
      Number.isNaN(b.min) ||
      Number.isNaN(b.max)
    )
      return false;
    return a.min <= b.max && a.max >= b.min;
  };

  // Enhanced search function that searches across multiple fields
  const enhancedSearch = (jobs: any[], searchTerm: string) => {
    if (!searchTerm) return jobs;

    const searchLower = searchTerm.toLowerCase();

    return jobs.filter((job) => {
      // Search in job title
      if (job.title?.toLowerCase().includes(searchLower)) return true;

      // Search in location
      if (job.location?.toLowerCase().includes(searchLower)) return true;

      // Search in experience
      if (job.experience?.toLowerCase().includes(searchLower)) return true;

      // Search in company name
      if (job.company?.companyName?.toLowerCase().includes(searchLower))
        return true;

      // Search in company industry
      if (job.company?.industryType?.toLowerCase().includes(searchLower))
        return true;

      // Search in company description
      if (job.company?.description?.toLowerCase().includes(searchLower))
        return true;

      // Search in job skills (if skills is an array)
      if (job.skills && Array.isArray(job.skills)) {
        if (
          job.skills.some((skill: string) =>
            skill.toLowerCase().includes(searchLower)
          )
        ) {
          return true;
        }
      }

      // Search in job features (if features is an object with text)
      if (job.features) {
        const featuresStr = JSON.stringify(job.features).toLowerCase();
        if (featuresStr.includes(searchLower)) return true;
      }

      // Search in salary range
      if (job.salaryRange?.toLowerCase().includes(searchLower)) return true;

      // Search in job type (case-insensitive exact match for enum values)
      if (job.jobType?.toLowerCase() === searchLower) return true;

      // Search in company city/state/country/zipCode
      if (job.company?.city?.toLowerCase().includes(searchLower)) return true;
      if (job.company?.state?.toLowerCase().includes(searchLower)) return true;
      if (job.company?.country?.toLowerCase().includes(searchLower))
        return true;
      if (job.company?.zipCode?.toLowerCase().includes(searchLower))
        return true;

      return false;
    });
  };

  if (salaryRangeQuery) {
    // Remove salaryRange from DB filter; we will filter in-memory by overlap
    delete q.salaryRange;

    const page = Number(q.page) || 1;
    const limit = Number(q.limit) || 10;

    const baseQuery = new QueryBuilder(prisma.jobPost, q)
      .search([
        "title",
        "location",
        "company.companyName",
        "company.zipCode",
        "experience",
        "skills",
        "salaryRange",
        "jobType",
      ])
      .filter()
      .rawFilter({ status: "ACTIVE" })
      .include({
        company: {
          select: {
            companyName: true,
            industryType: true,
            logo: true,
            roleInCompany: true,
            description: true,
            email: true,
            phoneNumber: true,
            country: true,
            city: true,
            state: true,
            address: true,
            zipCode: true,
            website: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            fullName: true,
            email: true,
            profilePic: true,
            role: true,
            isSubscribed: true,
            planExpiration: true,
            subscriptionType: true,
            totalPayPerJobCount: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      });

    const allActive = await baseQuery.execute();

    // Apply enhanced search if searchTerm is provided
    const searchFiltered = enhancedSearch(allActive, searchTerm);

    const wanted = parseSalaryRange(salaryRangeQuery);
    const filtered = searchFiltered.filter((job: any) =>
      rangesOverlap(parseSalaryRange(job.salaryRange || ""), wanted)
    );

    const total = filtered.length;
    const totalPage = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + limit;
    const sliced = filtered.slice(start, end);

    if (sliced.length === 0) {
      throw new ApiError(404, "No active job posts found!");
    }

    return {
      meta: { page, limit, total, totalPage },
      data: sliced,
    };
  }

  // Default path without salaryRange range logic
  const jobPostQuery = new QueryBuilder(prisma.jobPost, query)
    .search([
      "title",
      "location",
      "company.companyName",
      "company.zipCode",
      "experience",
      "skills",
      "salaryRange",
      "jobType",
    ])
    .filter()
    .rawFilter({ status: "ACTIVE" })
    .paginate()
    .include({
      company: {
        select: {
          companyName: true,
          industryType: true,
          logo: true,
          roleInCompany: true,
          description: true,
          email: true,
          phoneNumber: true,
          country: true,
          city: true,
          state: true,
          address: true,
          zipCode: true,
          website: true,
        },
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          fullName: true,
          email: true,
          profilePic: true,
          role: true,
          isSubscribed: true,
          planExpiration: true,
          subscriptionType: true,
          totalPayPerJobCount: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    });

  const [result, meta] = await Promise.all([
    jobPostQuery.execute(),
    jobPostQuery.countTotal(),
  ]);

  // Apply enhanced search if searchTerm is provided
  let finalResult = result;
  if (searchTerm) {
    finalResult = enhancedSearch(result, searchTerm);

    // Update meta information for search results
    if (meta) {
      meta.total = finalResult.length;
      meta.totalPage = Math.ceil(finalResult.length / (meta.limit || 10));
    }
  }

  if (finalResult.length === 0) {
    throw new ApiError(404, "No active job posts found!");
  }

  return {
    meta,
    data: finalResult,
  };
};

const getAllDepartmentsFromDB = async () => {
  // Group by title and count occurrences
  const titles = await prisma.jobPost.groupBy({
    by: ["title"],
    _count: { title: true },
    orderBy: { title: "asc" },
  });
  if (!titles.length) {
    throw new ApiError(404, "No job titles found!");
  }
  // Return array of { title, length }
  return titles.map((t) => ({ title: t.title, length: t._count.title }));
};

const getWorkModeFromDB = async () => {
  // Group by jobType and count occurrences
  const jobTypes = await prisma.jobPost.groupBy({
    by: ["jobType"],
    _count: { jobType: true },
  });
  // Ensure all JobType enum values are present
  const allTypes = Object.values(JobType);
  const typeMap = Object.fromEntries(
    jobTypes.map((j) => [j.jobType, j._count.jobType])
  );
  return allTypes.map((type) => ({
    jobType: type,
    length: typeMap[type] || 0,
  }));
};

const deleteJobPostFromDB = async (
  jobPostId: string,
  userId: string,
  userRole: UserRole
) => {
  const jobPost = await prisma.jobPost.findUnique({
    where: { id: jobPostId },
    select: {
      userId: true,
      status: true,
    },
  });

  if (!jobPost) {
    throw new ApiError(404, "Job post not found");
  }

  // Authorization logic
  const isAdmin =
    userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;
  const isOwner = jobPost.userId === userId;

  if (!isAdmin && !isOwner) {
    throw new ApiError(
      403,
      "You don't have permission to delete this job post"
    );
  }

  // Check if job post is already deleted
  if (jobPost.status === "DELETED") {
    throw new ApiError(400, "Job post is already deleted");
  }

  // Mark the job post as deleted instead of actually deleting it
  await prisma.jobPost.update({
    where: { id: jobPostId },
    data: {
      status: "DELETED",
    },
    include: {
      company: {
        select: {
          companyName: true,
          logo: true,
          industryType: true,
          email: true,
          phoneNumber: true,
        },
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          fullName: true,
          email: true,
          profilePic: true,
          role: true,
        },
      },
    },
  });

  return null;
};

const suspendJobPostFromDB = async (jobPostId: string, userRole: UserRole) => {
  const jobPost = await prisma.jobPost.findUnique({
    where: { id: jobPostId },
    select: {
      userId: true,
      status: true,
      title: true,
      company: {
        select: {
          companyName: true,
        },
      },
    },
  });

  if (!jobPost) {
    throw new ApiError(404, "Job post not found");
  }

  // If job post is deleted, throw error
  if (jobPost.status === "DELETED") {
    throw new ApiError(400, "Cannot suspend a deleted job post.");
  }

  // Only SUPER_ADMIN can suspend job posts
  if (userRole !== UserRole.SUPER_ADMIN) {
    throw new ApiError(403, "Only super admin can suspend job posts");
  }

  // Check if job post is already suspended
  if (jobPost.status === "SUSPENDED") {
    throw new ApiError(400, "Job post is already suspended");
  }

  // Suspend the job post
  await prisma.jobPost.update({
    where: { id: jobPostId },
    data: {
      status: "SUSPENDED",
    },
    include: {
      company: {
        select: {
          companyName: true,
          logo: true,
          industryType: true,
          email: true,
          phoneNumber: true,
        },
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          fullName: true,
          email: true,
          profilePic: true,
          role: true,
        },
      },
    },
  });

  return null;
};

const updateJobPostIntoDB = async (
  jobPostId: string,
  userId: string,
  payload: Partial<JobPost>
): Promise<JobPost> => {
  const existingJobPost = await prisma.jobPost.findUnique({
    where: { id: jobPostId },
    select: {
      userId: true,
      companyId: true,
      status: true,
      thumbnail: true,
    },
  });

  if (!existingJobPost) {
    throw new ApiError(404, "Job post not found");
  }

  // 2. Strict ownership verification
  if (existingJobPost.userId !== userId) {
    throw new ApiError(
      403,
      "You don't have permission to update this job post."
    );
  }

  // 3. Type-safe protected fields check
  const protectedFields: Array<keyof JobPost> = ["userId", "companyId"];

  protectedFields.forEach((field) => {
    if (field in payload && payload[field] !== undefined) {
      throw new ApiError(400, `Cannot change ${String(field)} field`);
    }
  });

  if (existingJobPost.thumbnail && payload.thumbnail) {
    payload.thumbnail = existingJobPost.thumbnail;
  }

  // 4. Prepare update data with proper typing
  const updateData: Prisma.JobPostUpdateInput = {
    ...payload,
    features: payload.features as Prisma.InputJsonValue | undefined,
  };

  // 5. Handle deadline updates
  if (payload.deadline) {
    const newDeadline = new Date(payload.deadline);
    updateData.deadline = newDeadline;
    updateData.status = newDeadline < new Date() ? "EXPIRED" : "ACTIVE";
  }

  // 6. Perform the update
  const updatedJobPost = await prisma.jobPost.update({
    where: { id: jobPostId },
    data: updateData,
    include: {
      company: {
        select: {
          companyName: true,
          logo: true,
          industryType: true,
          email: true,
          phoneNumber: true,
        },
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          fullName: true,
          email: true,
          profilePic: true,
          role: true,
          isVerified: true,
        },
      },
    },
  });

  // 7. Reschedule expiration check if needed
  if (payload.deadline && updatedJobPost.status === "ACTIVE") {
    scheduleExpirationUpdate(jobPostId, new Date(payload.deadline));
  }

  return updatedJobPost;
};

const getMyJobListFromDB = async (
  userId: string,
  query: Record<string, unknown>
) => {
  const jobPostQuery = new QueryBuilder(prisma.jobPost, query)
    .search(["thumbnail", "location", "company.zipCode", "jobType"])
    .filter()
    .rawFilter({ userId })
    .sort()
    .paginate()
    .include({
      company: {
        select: {
          companyName: true,
        },
      },
    });

  const [result, meta] = await Promise.all([
    jobPostQuery.execute(),
    jobPostQuery.countTotal(),
  ]);

  if (!result.length) {
    throw new ApiError(404, "No job posts found for your account!");
  }

  // Calculate remaining days for each job
  const jobList = result.map((job: JobPost) => {
    const currentDate = new Date();
    const deadlineDate = job.deadline ? new Date(job.deadline) : null;
    const timeDiff = deadlineDate
      ? deadlineDate.getTime() - currentDate.getTime()
      : 0;
    const remainingDays = deadlineDate
      ? Math.ceil(timeDiff / (1000 * 3600 * 24))
      : 0;

    return {
      jobId: job.jobId,
      postingDate: job.createdAt,
      salaryRange: job.salaryRange,
      position: job.title,
      thumbnail: job.thumbnail,
      status: job.status,
      noOfApplicants: job.noOfApplicants,
      deadline: job.deadline,
      time: remainingDays > 0 ? remainingDays : 0,
    };
  });

  return {
    meta,
    data: jobList,
  };
};

const getRecommendedJobsFromDB = async (id: string, userId: string) => {
  const userExists = await prisma.user.findUnique({
    where: { id },
    select: { id: true, plan: true },
  });
  if (!userExists) {
    throw new ApiError(404, "User not found");
  }

  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }

  const userProfile = await prisma.profile.findUnique({
    where: { profileId: userId },
  });

  console.log("userId", userId);

  if (!userProfile) {
    throw new ApiError(404, "Profile not found");
  }
  const jobLimit =
    userExists.plan?.planName === "Premium Plan"
      ? 25
      : userExists.plan?.planName === "Free Plan"
      ? 5
      : userExists.plan?.planName === "Pro Plan" && 50;

  const recommendations = await axios.get(
    `http://31.97.216.98:8000/api/v1/recommendations/user/${userId}/stored-data`
  );
  // {{base_url}}/api/v1/recommendations/user/user_73c6f6be886e/stored-data
  return recommendations.data;
};

const getAllJobLocationFromDB = async () => {
  // Group by location and count occurrences
  const locations = await prisma.jobPost.groupBy({
    by: ["location"],
    _count: { location: true },
    where: {
      status: "ACTIVE", // Only count active job posts
    },
    orderBy: { location: "asc" },
  });

  if (!locations.length) {
    throw new ApiError(404, "No job locations found!");
  }

  // Return array of { location, length }
  return locations.map((loc) => ({
    location: loc.location,
    length: loc._count.location,
  }));
};

export const JobService = {
  getWorkModeFromDB,
  getMyJobListFromDB,
  getMyJobPostsFromDB,
  deleteJobPostFromDB,
  suspendJobPostFromDB,
  createJobPostIntoDB,
  updateJobPostIntoDB,
  getAllJobPostsFromDB,
  getActiveJobPostsFromDB,
  getAllDepartmentsFromDB,
  getAllJobLocationFromDB,
  getRecommendedJobsFromDB,
};
