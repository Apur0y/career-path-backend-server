import { UserRole, JobPostStatus } from "@prisma/client";
import prisma from "../../utils/prisma";
import ApiError from "../../errors/ApiError";

// Save Job functionality
const saveJobIntoDB = async (userId: string, jobId: string) => {
  // Check if user exists and is a job seeker
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.role !== UserRole.JOB_SEEKER) {
    throw new ApiError(403, "Only job seekers can save jobs");
  }

  // Check if job exists and is active
  const job = await prisma.jobPost.findUnique({
    where: { id: jobId },
    select: { id: true, status: true },
  });

  if (!job) {
    throw new ApiError(404, "Job not found");
  }

  if (job.status !== JobPostStatus.ACTIVE) {
    throw new ApiError(400, "Cannot save inactive job");
  }

  // Check if job is already saved by this user
  const existingSavedJob = await prisma.savedJob.findUnique({
    where: {
      jobId_userId: {
        jobId,
        userId,
      },
    },
  });

  if (existingSavedJob) {
    throw new ApiError(400, "Job is already saved");
  }

  // Save the job
  const savedJob = await prisma.savedJob.create({
    data: {
      jobId,
      userId,
    },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          company: {
            select: {
              companyName: true,
            },
          },
          salaryRange: true,
          location: true,
        },
      },
    },
  });

  return savedJob;
};

// Get saved jobs for a user
const getSavedJobsFromDB = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.role !== UserRole.JOB_SEEKER) {
    throw new ApiError(403, "Only job seekers can view saved jobs");
  }

  const savedJobs = await prisma.savedJob.findMany({
    where: { userId },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          experience: true,
          location: true,
          salaryRange: true,
          jobType: true,
          status: true,
          company: {
            select: {
              companyName: true,
              logo: true,
            },
          },
        },
      },
    },
    orderBy: {
      savedAt: "desc",
    },
  });

  return savedJobs;
};

// Remove saved job
const removeSavedJobFromDB = async (userId: string, jobId: string) => {
  // Check if user exists and is a job seeker
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.role !== UserRole.JOB_SEEKER) {
    throw new ApiError(403, "Only job seekers can remove saved jobs");
  }

  // Check if saved job exists
  const savedJob = await prisma.savedJob.findUnique({
    where: {
      jobId_userId: {
        jobId,
        userId,
      },
    },
  });

  if (!savedJob) {
    throw new ApiError(404, "Saved job not found");
  }

  // Remove the saved job
  await prisma.savedJob.delete({
    where: {
      jobId_userId: {
        jobId,
        userId,
      },
    },
  });

  return {
    message: "Job removed from saved jobs successfully",
  };
};

export const SaveJobServices = {
  saveJobIntoDB,
  getSavedJobsFromDB,
  removeSavedJobFromDB,
};
