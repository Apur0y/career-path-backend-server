import catchAsync from "../../utils/catchAsync";
import { ProfileService } from "./profile.service";
import sendResponse from "../../utils/sendResponse";
import { Request, Response } from "express";


const createProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;

  const files = {
    achievementFiles: Array.isArray(req.files)
      ? undefined
      : req.files?.achievementFiles,
    graduationCertificateFiles: Array.isArray(req.files)
      ? undefined
      : req.files?.graduationCertificateFiles,
  };

  const result = await ProfileService.createProfileInToDB(
    userId,
    req.body,
    files
  );

  sendResponse(res, {
    statusCode: 201,
    message: "Profile created successfully!",
    data: result,
  });
});
const updatedProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;

  const result = await ProfileService.UpdateMyResume(
    userId,
    req.body
  );

  sendResponse(res, {
    statusCode: 201,
    message: "Profile updated successfully!",
    data: result,
  });
});

const getProfileById = catchAsync(async (req, res) => {
  const result = await ProfileService.getProfileById(req.params.userId);

  sendResponse(res, {
    statusCode: 200,
    message: "Profile retrieved successfully",
    data: result,
  });
});
const getMyProfileById = catchAsync(async (req, res) => {

  const userId = req.user.id;
  if (!userId) {
    return sendResponse(res, {
      statusCode: 400,
      message: "First need to login",
    });
  }
  const result = await ProfileService.getMyProfileById(userId);

  sendResponse(res, {
    statusCode: 200,
    message: "Profile retrieved successfully",
    data: result,
  });
});

const resumeGenerate = catchAsync(async (req, res) => {
  const result = await ProfileService.resumeGenerate(req.params.userId);

  sendResponse(res, {
    statusCode: 200,
    message: "Resume generated successfully",
    data: result,
  });
});

export const ProfileController = {
  createProfile,
  getProfileById,
  resumeGenerate, getMyProfileById, updatedProfile
};
