import catchAsync from "../../utils/catchAsync";
import { JobService } from "./job.service";
import sendResponse from "../../utils/sendResponse";
import config from "../../config";

const createJobPost = catchAsync(async (req, res) => {
  const userId = req.user.id;

  if (req.file) {
    req.body.thumbnail = `${config.imageUrl}/uploads/${req.file.filename}`;
  }

  const result = await JobService.createJobPostIntoDB(userId, req.body);

  sendResponse(res, {
    statusCode: 201,
    message: "Successfully posted job.",
    data: result,
  });
});

const getMyJobPosts = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const result = await JobService.getMyJobPostsFromDB(userId, req.query);

  sendResponse(res, {
    statusCode: 200,
    message: "Successfully retrieved job posts.",
    data: result,
  });
});

const getAllJobPosts = catchAsync(async (req, res) => {
  const result = await JobService.getAllJobPostsFromDB(req.query);

  sendResponse(res, {
    statusCode: 200,
    message: "Successfully retrieved all job posts.",
    data: result,
  });
});

const getActiveJobPosts = catchAsync(async (req, res) => {
  const result = await JobService.getActiveJobPostsFromDB(req.query);

  sendResponse(res, {
    statusCode: 200,
    message: "Successfully retrieved active job posts.",
    data: result,
  });
});

const deleteJobPost = catchAsync(async (req, res) => {
  const { jobPostId } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  const result = await JobService.deleteJobPostFromDB(
    jobPostId,
    userId,
    userRole
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Job post deleted successfully",
  });
});

const suspendJobPost = catchAsync(async (req, res) => {
  const { jobPostId } = req.params;
  const userRole = req.user.role;

  await JobService.suspendJobPostFromDB(jobPostId, userRole);

  sendResponse(res, {
    statusCode: 200,
    message: "Job post suspended successfully",
  });
});

const updateJobPostIntoDB = catchAsync(async (req, res) => {
  const { jobPostId } = req.params;
  const userId = req.user.id;

  if (req.file) {
    req.body.thumbnail = `${config.imageUrl}/uploads/${req.file.filename}`;
  }

  const result = await JobService.updateJobPostIntoDB(
    jobPostId,
    userId,
    req.body
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Job post updated successfully",
    data: result,
  });
});

const getAllDepartments = catchAsync(async (req, res) => {
  const result = await JobService.getAllDepartmentsFromDB();
  sendResponse(res, {
    statusCode: 200,
    message: "Successfully retrieved all departments.",
    data: result,
  });
});

const getWorkMode = catchAsync(async (req, res) => {
  const result = await JobService.getWorkModeFromDB();
  sendResponse(res, {
    statusCode: 200,
    message: "Successfully retrieved all work modes.",
    data: result,
  });
});

const getAllJobLocations = catchAsync(async (req, res) => {
  const result = await JobService.getAllJobLocationFromDB();
  sendResponse(res, {
    statusCode: 200,
    message: "Successfully retrieved all job locations.",
    data: result,
  });
});

const getMyJobList = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const result = await JobService.getMyJobListFromDB(userId, req.query);

  sendResponse(res, {
    statusCode: 200,
    message: "Successfully retrieved job list.",
    data: result,
  });
});

const getRecommendedJobs = catchAsync(async (req, res) => {
  const userId = req.params.userId;
  const id = req.user.id;

  const result = await JobService.getRecommendedJobsFromDB(id, userId);

  sendResponse(res, {
    statusCode: 200,
    message: "Successfully retrieved recommendations job.",
    data: result,
  });
});

export const JobController = {
  createJobPost,
  getMyJobPosts,
  getMyJobList,
  getAllJobPosts,
  getActiveJobPosts,
  getWorkMode,
  getAllDepartments,
  getAllJobLocations,
  getRecommendedJobs,
  deleteJobPost,
  suspendJobPost,
  updateJobPostIntoDB,
};
