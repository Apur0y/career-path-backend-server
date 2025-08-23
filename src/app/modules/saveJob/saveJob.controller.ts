import status from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { SaveJobServices } from "./saveJob.service";

// Save Job functionality
const saveJob = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { jobId } = req.body;

  const result = await SaveJobServices.saveJobIntoDB(userId, jobId);

  sendResponse(res, {
    statusCode: status.CREATED,
    message: "Job saved successfully!",
    data: result,
  });
});

// Get saved jobs
const getSavedJobs = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const result = await SaveJobServices.getSavedJobsFromDB(userId);

  sendResponse(res, {
    statusCode: status.OK,
    message: "Saved jobs retrieved successfully!",
    data: result,
  });
});

// Remove saved job
const removeSavedJob = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { jobId } = req.params;

  const result = await SaveJobServices.removeSavedJobFromDB(userId, jobId);

  sendResponse(res, {
    statusCode: status.OK,
    message: result.message,
  });
});

export const SaveJobController = {
  saveJob,
  getSavedJobs,
  removeSavedJob,
};
