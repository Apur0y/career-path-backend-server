import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { interviewService } from "./interview.service";

const getMyInterviewSchedules = catchAsync(async (req, res) => {
  const userId = req.user?.id;

  const result = await interviewService.getMyInterviewSchedules(userId!);

  sendResponse(res, {
    statusCode: 200,
    message: "My interview schedules retrieved successfully",
    data: result,
  });
});

const createInterviewSchedule = catchAsync(async (req, res) => {
  console.log(
    "🎯 Controller: Creating interview schedule with body:",
    req.body
  );

  try {
    const result = await interviewService.createInterviewScheduleIntoDB(
      req.body
    );

    console.log(
      "🎉 Controller: Interview created successfully, sending response"
    );
    sendResponse(res, {
      statusCode: 201,
      message: "Interview schedule created successfully",
      data: result,
    });
  } catch (error) {
    console.error("❌ Controller: Error in createInterviewSchedule:", error);
    throw error; // Re-throw to let global error handler manage it
  }
});

const getAllInterviews = catchAsync(async (req, res) => {
  const result = await interviewService.getAllInterviewsFromDB(req.query);

  sendResponse(res, {
    statusCode: 200,
    message: "Interviews retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getInterviewById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await interviewService.getInterviewByIdFromDB(id);

  sendResponse(res, {
    statusCode: 200,
    message: "Interview retrieved successfully",
    data: result,
  });
});

// const updateInterviewSchedule = catchAsync(async (req, res) => {
//   const { id } = req.params;
//   const result = await interviewService.updateInterviewScheduleInDB(
//     id,
//     req.body
//   );

//   sendResponse(res, {
//     statusCode: 200,
//     message: "Interview schedule updated successfully",
//     data: result,
//   });
// });

const deleteInterviewSchedule = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await interviewService.deleteInterviewScheduleFromDB(id);

  sendResponse(res, {
    statusCode: 200,
    message: "Interview schedule deleted successfully",
    data: result,
  });
});

const getUpcomingInterviews = catchAsync(async (req, res) => {
  const userId = req.user?.userId; // Assuming user info is attached to req by auth middleware

  if (!userId) {
    return sendResponse(res, {
      statusCode: 401,
      message: "User not authenticated",
      data: null,
    });
  }

  const result = await interviewService.getUpcomingInterviewsForUser(userId);

  sendResponse(res, {
    statusCode: 200,
    message: "Upcoming interviews retrieved successfully",
    data: result,
  });
});

const getCompanyInterviews = catchAsync(async (req, res) => {
  const userId = req.user?.id;

  const result = await interviewService.getCompanyInterviewSchedules(userId);

  sendResponse(res, {
    statusCode: 200,
    message: "Company interview schedules retrieved successfully",
    data: result,
  });
});

export const interviewController = {
  createInterviewSchedule,
  getAllInterviews,
  getInterviewById,
  // updateInterviewSchedule,
  deleteInterviewSchedule,
  getUpcomingInterviews,
  getCompanyInterviews,
  getMyInterviewSchedules,
};
