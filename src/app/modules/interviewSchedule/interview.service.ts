import prisma from "../../utils/prisma";
import { InterviewScheduler } from "@prisma/client";
import QueryBuilder from "../../builder/QueryBuilder";

const getMyInterviewSchedules = async (userId: string) => {
  const interviews = await prisma.interviewScheduler.findMany({
    where: {
      jobApplication: {
        jobSeekerId: userId,
      },
    },
    select: {
      interviewDate: true,
      interviewLink: true,
      jobApplication: {
        select: {
          job: {
            select: {
              id: true,
              jobId: true,
              title: true,
              company: {
                select: {
                  companyName: true,
                },
              },
              user: {
                select: {
                  id: true,
                  fullName: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      interviewDate: "asc",
    },
  });

  const result = interviews.map((item) => {
    const interviewer = item.jobApplication.job.user;

    return {
      companyName: item.jobApplication.job.company?.companyName || "",
      interviewerName: interviewer?.fullName || "",
      position: item.jobApplication.job.title,
      jobOwnerId: interviewer?.id || "",
      jobId: item.jobApplication.job.id,
      jobPublicId: item.jobApplication.job.jobId,
      interviewDate: item.interviewDate,
      interviewLink: item.interviewLink || "",
    };
  });

  return result;
};

const createInterviewScheduleIntoDB = async (payload: InterviewScheduler) => {
  const result = await prisma.$transaction(async (tx) => {
    const interview = await tx.interviewScheduler.create({
      data: {
        jobApplicationId: payload.jobApplicationId,
        interviewTitle: payload.interviewTitle,
        interviewDate: payload.interviewDate,
        interviewTime: payload.interviewTime,
        interviewLink: payload.interviewLink,
        interviewPlatform: payload.interviewPlatform || "GOOGLE_MEET",
      },
      include: {
        jobApplication: {
          include: {
            job: {
              select: {
                id: true,
                title: true,
                company: {
                  select: {
                    id: true,
                    companyName: true,
                  },
                },
              },
            },
            jobSeeker: {
              select: {
                id: true,
                email: true,
                phone: true,
                fullName: true,
                profilePic: true,
              },
            },
          },
        },
      },
    });

    // Update job application status to SELECTED
    await tx.jobApplication.update({
      where: {
        id: payload.jobApplicationId,
      },
      data: {
        status: "SELECTED",
      },
    });

    return interview;
  });

  return result;
};

// Get all interviews with filtering options
const getAllInterviewsFromDB = async (query: Record<string, unknown>) => {
  const { jobApplicationId, startDate, endDate } = query;

  // Build custom filters for date range and jobApplicationId
  const customFilters: any = {};

  if (jobApplicationId) {
    customFilters.jobApplicationId = jobApplicationId;
  }

  if (startDate || endDate) {
    customFilters.interviewDate = {};
    if (startDate) {
      customFilters.interviewDate.gte = new Date(startDate as string);
    }
    if (endDate) {
      customFilters.interviewDate.lte = new Date(endDate as string);
    }
  }

  const queryBuilder = new QueryBuilder(prisma.interviewScheduler, query)
    .rawFilter(customFilters)
    .include({
      jobApplication: {
        include: {
          job: {
            select: {
              id: true,
              title: true,
              company: {
                select: {
                  id: true,
                  companyName: true,
                },
              },
            },
          },
          jobSeeker: {
            select: {
              id: true,
              email: true,
              phone: true,
              fullName: true,
              profilePic: true,
            },
          },
        },
      },
    })
    .sort()
    .paginate();

  const [interviews, meta] = await Promise.all([
    queryBuilder.execute(),
    queryBuilder.countTotal(),
  ]);

  return {
    data: interviews,
    meta,
  };
};

// Get interview by ID
const getInterviewByIdFromDB = async (id: string) => {
  const interview = await prisma.interviewScheduler.findUnique({
    where: { id },
    include: {
      jobApplication: {
        include: {
          job: {
            select: {
              title: true,
              company: {
                select: {
                  companyName: true,
                },
              },
            },
          },
          jobSeeker: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!interview) {
    throw new Error("Interview not found");
  }

  return interview;
};

// Update interview schedule
// const updateInterviewScheduleInDB = async (
//   id: string,
//   payload: Partial<InterviewScheduler>
// ) => {
//   const existingInterview = await prisma.interviewScheduler.findUnique({
//     where: { id },
//   });

//   if (!existingInterview) {
//     throw new Error("Interview not found!");
//   }

//   let updateData: any = { ...payload };

//   // If date or time is being updated, regenerate Google Meet link
//   if (
//     payload.interviewDate ||
//     payload.interviewTime ||
//     payload.interviewTitle
//   ) {
//     const interviewDate = payload.interviewDate
//       ? new Date(payload.interviewDate)
//       : existingInterview.interviewDate;

//     const interviewTime =
//       payload.interviewTime || existingInterview.interviewTime;
//     const interviewTitle =
//       payload.interviewTitle || existingInterview.interviewTitle;

//     // Test service account configuration
//     const isConfigValid = testServiceAccountConfig();
//     if (isConfigValid) {
//       try {
//         const meetLink = await generateGoogleMeetLink(
//           interviewTitle,
//           interviewDate,
//           interviewTime
//         );
//         updateData.interviewLink = meetLink;
//       } catch (error) {
//         console.error("Failed to generate new Meet link:", error);
//         // Continue without updating the link if generation fails
//       }
//     }
//   }

//   const result = await prisma.interviewScheduler.update({
//     where: { id },
//     data: updateData,
//     include: {
//       jobApplication: {
//         include: {
//           job: {
//             select: {
//               title: true,
//               company: {
//                 select: {
//                   companyName: true,
//                 },
//               },
//             },
//           },
//           jobSeeker: {
//             select: {
//               fullName: true,
//               email: true,
//             },
//           },
//         },
//       },
//     },
//   });

//   return result;
// };

// Delete interview schedule
const deleteInterviewScheduleFromDB = async (id: string) => {
  const existingInterview = await prisma.interviewScheduler.findUnique({
    where: { id },
  });

  if (!existingInterview) {
    throw new Error("Interview not found");
  }

  await prisma.interviewScheduler.delete({
    where: { id },
  });

  return { message: "Interview deleted successfully" };
};

// Get upcoming interviews for a user (based on job applications)
const getUpcomingInterviewsForUser = async (userId: string) => {
  const currentDate = new Date();

  const interviews = await prisma.interviewScheduler.findMany({
    where: {
      jobApplication: {
        jobSeekerId: userId,
      },
      interviewDate: {
        gte: currentDate,
      },
    },
    include: {
      jobApplication: {
        include: {
          job: {
            select: {
              title: true,
              company: {
                select: {
                  companyName: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      interviewDate: "asc",
    },
  });

  return interviews;
};

// Get all interview schedules for a company owner
const getCompanyInterviewSchedules = async (userId: string) => {
  // Find the user and validate they are a company employee
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
      role: "EMPLOYEE",
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
      "User not found or not authorized to view company interviews."
    );
  }

  if (!user.Company) {
    throw new Error("User is not associated with any company.");
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

  // Get all interview schedules for the company's job posts
  const interviews = await prisma.interviewScheduler.findMany({
    where: {
      jobApplication: {
        jobId: {
          in: companyJobPosts.map((job) => job.id),
        },
      },
    },
    include: {
      jobApplication: {
        include: {
          job: {
            select: {
              id: true,
              title: true,
              company: {
                select: {
                  id: true,
                  companyName: true,
                },
              },
            },
          },
          jobSeeker: {
            select: {
              id: true,
              email: true,
              phone: true,
              fullName: true,
              profilePic: true,
            },
          },
        },
      },
    },
    orderBy: {
      interviewDate: "asc",
    },
  });

  return interviews;
};

export const interviewService = {
  createInterviewScheduleIntoDB,
  getAllInterviewsFromDB,
  getInterviewByIdFromDB,
  deleteInterviewScheduleFromDB,
  getUpcomingInterviewsForUser,
  getCompanyInterviewSchedules,
  getMyInterviewSchedules,
};
