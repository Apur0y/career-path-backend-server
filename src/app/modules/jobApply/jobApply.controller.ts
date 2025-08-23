import status from "http-status";
import { UserRole } from "@prisma/client";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { JobApplyServices } from "./jobApply.service";

// Create apply job function
const applyJob = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;

  if (userRole !== UserRole.JOB_SEEKER) {
    sendResponse(res, {
      statusCode: status.FORBIDDEN,
      message: "Only job seekers can apply for jobs.",
    });
  }
  const result = await JobApplyServices.JobApply(userId, req.body);
  sendResponse(res, {
    statusCode: status.CREATED,
    message: "Job apply successfully!",
    data: result,
  });
});
const getJobApply = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const result = await JobApplyServices.getMyJobApply(userId);
  sendResponse(res, {
    statusCode: status.OK,
    message: "Job applications retrieved successfully!",
    data: result,
  });
});
const getJobApplyById = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const applyId = req.params.id;
  const result = await JobApplyServices.getJobApplyById(userId, applyId);
  sendResponse(res, {
    statusCode: status.OK,
    message: "Job application retrieved successfully!",
    data: result,
  });
});

// get candidate
const getAllCandidate = catchAsync(async (req, res) => {
  const jobId = req.params.id;
  const result = await JobApplyServices.getAllCandidate(jobId);
  sendResponse(res, {
    statusCode: status.OK,
    message: "Candidates retrieved successfully!",
    data: result,
  });
});

const getMyCandidatesList = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const result = await JobApplyServices.getMyCandidatesListFromDB(userId);

  sendResponse(res, {
    statusCode: status.OK,
    message: "My candidates retrieved successfully!",
    data: result,
  });
});

// get single candidate
const getCandidateById = catchAsync(async (req, res) => {
  const applyId = req.params.applyId;

  const result = await JobApplyServices.getCandidateById(applyId);
  sendResponse(res, {
    statusCode: status.OK,
    message: "Candidate retrieved successfully!",
    data: result,
  });
});

const getRecentAppliedCandidates = catchAsync(async (req, res) => {
  const userId = req.user.id; // Extracted from token by auth middleware

  const result = await JobApplyServices.recentAppliedCandidatesFromDB(userId);

  sendResponse(res, {
    statusCode: 200,
    message: "Recent applied candidates retrieved successfully!",
    data: result,
  });
});

const changeApplicationStatus = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { applicationId } = req.params;

  const result = await JobApplyServices.changeApplicationStatus(
    applicationId,
    req.body,
    userId
  );

  sendResponse(res, {
    statusCode: status.OK,
    message: result.message,
  });
});

const getMyAppliedJobList = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const result = await JobApplyServices.getMyAppliedJobList(userId);

  sendResponse(res, {
    statusCode: status.OK,
    message: "Applied job list retrieved successfully!",
    data: result,
  });
});

const deleteJobApplicant = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { applicationId } = req.params;

  const result = await JobApplyServices.deleteJobApplicantFromDB(
    applicationId,
    userId
  );

  sendResponse(res, {
    statusCode: status.OK,
    message: result.message,
  });
});

export const JobApplyController = {
  applyJob,
  getJobApply,
  getJobApplyById,
  getAllCandidate,
  getCandidateById,
  deleteJobApplicant,
  getMyCandidatesList,
  getMyAppliedJobList,
  changeApplicationStatus,
  getRecentAppliedCandidates,
};
