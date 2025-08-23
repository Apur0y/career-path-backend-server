import {
  UserRole,
  JobPostStatus,
  JobApplication,
  ApplicationStatus,
} from "@prisma/client";
import prisma from "../../utils/prisma";
import ApiError from "../../errors/ApiError";

const JobApply = async (userId: string, payload: JobApplication) => {
  const jobId = payload.jobId;

  const userExists = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, Profile: { select: { id: true } } },
  });
  if (!userExists) {
    throw new ApiError(404, "User not found.");
  }
  const existingJob = await prisma.jobPost.findUnique({
    where: { id: jobId },
  });

  if (existingJob?.status !== JobPostStatus.ACTIVE) {
    throw new ApiError(400, "This job is not active or does not exist.");
  }

  if (existingJob?.deadline && existingJob.deadline < new Date()) {
    throw new ApiError(400, "This job application deadline has passed.");
  }

  return await prisma.$transaction(async (tx) => {
    // Check if the user has already applied for this job
    const existingApplication = await tx.jobApplication.findFirst({
      where: {
        jobId: jobId,
        jobSeekerId: userId,
      },
    });

    if (existingApplication) {
      throw new ApiError(400, "You have already applied for this job.");
    }

    // Create the job application
    const application = await tx.jobApplication.create({
      data: {
        jobId,
        jobSeekerId: userId,
        profileId: userExists.Profile[0].id,
        status: ApplicationStatus.PENDING,
        appliedAt: new Date(),
      },
    });

    // Increment the number of applicants for the job post
    await tx.jobPost.update({
      where: { id: jobId },
      data: {
        noOfApplicants: {
          increment: 1,
        },
      },
    });

    return application;
  });
};

// Get All Job Apply
const getMyJobApply = async (userId: string) => {
  const userExists = await prisma.user.findUnique({
    where: {
      id: userId,
      role: UserRole.JOB_SEEKER,
    },
    select: { id: true, role: true },
  });
  if (!userExists) {
    throw new ApiError(404, "User not found.");
  }

  const result = await prisma.jobApplication.findMany({
    where: {
      jobSeekerId: userId,
    },
    select: {
      id: true,
      jobId: true,
      job: {
        select: {
          id: true,
          title: true,
          company: true,
          salaryRange: true,
        },
      },
      profileId: true,
      status: true,
      jobSeekerId: true,
      appliedAt: true,
      profile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      jobSeeker: {
        select: {
          id: true,
          email: true,
        },
      },
    },
    orderBy: {
      appliedAt: "desc",
    },
  });
  return result;
};

// Get a Single job application by ID
const getJobApplyById = async (userId: string, applyId: string) => {
  const jobExist = await prisma.jobApplication.findUnique({
    where: { id: applyId, jobSeekerId: userId },
    select: {
      id: true,
      jobId: true,
      job: {
        select: {
          id: true,
          title: true,
          company: true,
          status: true,
        },
      },
      profileId: true,
      status: true,
      jobSeekerId: true,
      appliedAt: true,
      profile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      jobSeeker: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });
  if (!jobExist) {
    throw new ApiError(404, "Job application not found.");
  }

  return jobExist;
};
// get candidate

// Get All Job Apply
const getAllCandidate = async (jobId: string) => {
  const result = await prisma.jobApplication.findMany({
    where: {
      jobId: jobId,
    },
    select: {
      id: true,
      jobId: true,
      job: {
        select: {
          id: true,
          title: true,
          company: true,
        },
      },
      profileId: true,
      status: true,
      jobSeekerId: true,
      appliedAt: true,
      profile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      jobSeeker: {
        select: {
          id: true,
          email: true,
          fullName: true,
          profilePic: true,
          phone: true,
          preferredContactMethod: true,
        },
      },
    },
    orderBy: {
      appliedAt: "desc",
    },
  });
  return result;
};

const getMyCandidatesListFromDB = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
      role: UserRole.EMPLOYEE,
    },
    include: {
      Company: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  if (!user.Company) {
    throw new ApiError(404, "User is not associated with any company.");
  }

  // Get all job posts from the user's company
  const companyJobPosts = await prisma.jobPost.findMany({
    where: {
      companyId: user.Company.id,
    },
    select: {
      id: true,
    },
  });

  if (companyJobPosts.length === 0) {
    return [];
  }

  // Get all applications for these job posts
  const result = await prisma.jobApplication.findMany({
    where: {
      jobId: {
        in: companyJobPosts.map((job) => job.id),
      },
    },
    select: {
      id: true,
      jobId: true,
      job: {
        select: {
          id: true,
          title: true,
          company: true,
        },
      },
      profileId: true,
      status: true,
      jobSeekerId: true,
      appliedAt: true,
      profile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      jobSeeker: {
        select: {
          id: true,
          email: true,
          fullName: true,
          profilePic: true,
          phone: true,
          preferredContactMethod: true,
        },
      },
      InterviewScheduler: {
        select: {
          id: true,
          interviewTitle: true,
          interviewDate: true,
          interviewTime: true,
          interviewPlatform: true,
          interviewLink: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
    orderBy: {
      appliedAt: "desc",
    },
  });

  // Transform the result to return interview as single object for each candidate
  const transformedResult = result.map((candidate) => ({
    ...candidate,
    interviewScheduler: candidate.InterviewScheduler[0] || null,
    InterviewScheduler: undefined,
  }));

  return transformedResult;
};

// Get a Single job candidate by ID
const getCandidateById = async (applyId: string) => {
  const jobExist = await prisma.jobApplication.findUnique({
    where: { id: applyId },
    include: {
      jobSeeker: true,
      job: true,
      profile: true,
      InterviewScheduler: {
        select: {
          id: true,
          interviewTitle: true,
          interviewDate: true,
          interviewTime: true,
          interviewPlatform: true,
          interviewLink: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });
  if (!jobExist) {
    throw new ApiError(404, "Job application not found.");
  }

  // Transform the result to return interview as single object
  const result = {
    ...jobExist,
    interviewScheduler: jobExist.InterviewScheduler[0] || null,
  };

  // Remove the original InterviewScheduler array
  delete (result as any).InterviewScheduler;

  return result;
};

const recentAppliedCandidatesFromDB = async (userId: string) => {
  // Find the company for this user
  const company = await prisma.company.findFirst({
    where: { userId },
    select: { id: true },
  });

  if (!company) {
    throw new ApiError(404, "Company not found for this user!");
  }

  // Find the last 6 job applications for jobs in this company
  const applications = await prisma.jobApplication.findMany({
    where: {
      job: {
        companyId: company.id,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 6,
    include: {
      jobSeeker: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          fullName: true,
          email: true,
          profilePic: true,
        },
      },
      job: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  if (!applications.length) {
    throw new ApiError(404, "No recent candidates found!");
  }

  return applications;
};

const changeApplicationStatus = async (
  applicationId: string,
  payload: { status: ApplicationStatus },
  userId: string
) => {
  // Verify the job exists and user is the owner
  const jobApplication = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    include: {
      job: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!jobApplication) {
    throw new ApiError(404, "Job application not found");
  }

  if (!jobApplication.job.user || jobApplication.job.user.id !== userId) {
    throw new ApiError(
      403,
      "Only the company owner can change application status"
    );
  }

  await prisma.jobApplication.update({
    where: { id: applicationId },
    data: { status: payload.status },
    include: {
      jobSeeker: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return {
    message: `Application status updated to: ${payload.status} successfully.`,
  };
};

// Get My Applied Job List with specific fields
const getMyAppliedJobList = async (userId: string) => {
  const userExists = await prisma.user.findUnique({
    where: {
      id: userId,
      role: UserRole.JOB_SEEKER,
    },
    select: { id: true, role: true, email: true },
  });

  if (!userExists) {
    throw new ApiError(404, "User not found.");
  }

  const result = await prisma.jobApplication.findMany({
    where: {
      jobSeekerId: userId,
    },
    select: {
      id: true,
      appliedAt: true,
      status: true,
      job: {
        select: {
          title: true,
          salaryRange: true,
          company: {
            select: {
              companyName: true,
              phoneNumber: true,
            },
          },
        },
      },
    },
    orderBy: {
      appliedAt: "desc",
    },
  });

  // Transform the data to match the required field names
  const transformedResult = result.map((application) => ({
    id: application.id,
    candidateId: userId,
    candidateEmail: userExists.email,
    appliedDate: application.appliedAt,
    companyName: application.job.company?.companyName || "",
    companyContact: application.job.company?.phoneNumber || "",
    salaryRange: application.job.salaryRange || "",
    position: application.job.title,
    status: application.status,
  }));

  return transformedResult;
};

const deleteJobApplicantFromDB = async (
  applicationId: string,
  userId: string
) => {
  try {
    console.log("Starting deleteJobApplicantFromDB with:", {
      applicationId,
      userId,
    });

    // Verify the job application exists and user is the company owner
    const jobApplication = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        job: {
          include: {
            user: true,
          },
        },
      },
    });

    console.log("Found jobApplication:", jobApplication);

    if (!jobApplication) {
      throw new ApiError(404, "Job application not found");
    }

    console.log("Job application found, checking ownership...");
    console.log("Job user ID:", jobApplication.job.user?.id);
    console.log("Request user ID:", userId);

    // Check if the user is the owner of the job post
    if (!jobApplication.job.user || jobApplication.job.user.id !== userId) {
      throw new ApiError(
        403,
        "Only the company owner can delete job applicants"
      );
    }

    console.log("Ownership verified, starting transaction...");

    return await prisma.$transaction(async (tx) => {
      console.log("Inside transaction, deleting job application...");

      // Delete the job application
      await tx.jobApplication.delete({
        where: { id: applicationId },
      });

      console.log("Job application deleted, updating job post...");

      // Decrement the number of applicants for the job post
      await tx.jobPost.update({
        where: { id: jobApplication.jobId },
        data: {
          noOfApplicants: {
            decrement: 1,
          },
        },
      });

      console.log("Job post updated, transaction completed successfully");

      return {
        message: "Job applicant deleted successfully",
      };
    });
  } catch (error) {
    console.error("Error in deleteJobApplicantFromDB:", error);
    console.error("Error details:", {
      name: (error as any).name,
      message: (error as any).message,
      stack: (error as any).stack,
    });
    throw error;
  }
};

export const JobApplyServices = {
  JobApply,
  getMyJobApply,
  getJobApplyById,
  getAllCandidate,
  getCandidateById,
  getMyAppliedJobList,
  changeApplicationStatus,
  deleteJobApplicantFromDB,
  getMyCandidatesListFromDB,
  recentAppliedCandidatesFromDB,
};
