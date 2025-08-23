import status from "http-status";
import config from "../../config";
import { UserService } from "./user.service";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";

const createUser = catchAsync(async (req, res) => {
  const result = await UserService.createUserIntoDB(req.body);

  sendResponse(res, {
    statusCode: status.CREATED,
    message: result.message,
  });
});

const getAllUser = catchAsync(async (req, res) => {
  const result = await UserService.getAllUserFromDB(req.query);

  sendResponse(res, {
    statusCode: status.OK,
    message: "Users are retrieved successfully!",
    meta: result.meta,
    data: result.data,
  });
});

const updateUser = catchAsync(async (req, res) => {
  const userId = req.user.id;

  if (req.file) {
    req.body.profilePic = `${config.url.image}/uploads/${req.file.filename}`;
  }

  const result = await UserService.updateUserIntoDB(userId, req.body);

  sendResponse(res, {
    statusCode: status.OK,
    message: "User updated successfully!",
    data: result,
  });
});

const updateUserByAdmin = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const adminId = req.user.id;

  if (req.file) {
    req.body.profilePic = `${config.url.image}/uploads/${req.file.filename}`;
  }

  const result = await UserService.updateUserByAdminIntoDB(
    userId,
    adminId,
    req.body
  );

  sendResponse(res, {
    statusCode: status.OK,
    message: "User updated successfully by admin!",
    data: result,
  });
});

const getSingleUserById = catchAsync(async (req, res) => {
  const { userId } = req.params;

  const result = await UserService.getSingleUserByIdFromDB(userId);

  sendResponse(res, {
    statusCode: status.OK,
    message: "User retrieved successfully!",
    data: result,
  });
});

const deleteUser = catchAsync(async (req, res) => {
  const { userId } = req.params;

  await UserService.deleteUserFromDB(userId);

  sendResponse(res, {
    statusCode: status.OK,
    message: "User deleted successfully!",
  });
});

const makeAdmin = catchAsync(async (req, res) => {
  const { email } = req.params;

  const result = await UserService.makeAdminIntoDB(email);

  sendResponse(res, {
    statusCode: status.OK,
    message: "User role updated to ADMIN successfully!",
    data: result,
  });
});

const updateContactInfo = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;

  const result = await UserService.updateContactInfoIntoDB(
    userId,
    userRole,
    req.body
  );

  sendResponse(res, {
    statusCode: status.OK,
    message: "Contact information updated successfully!",
    data: result,
  });
});

const suspendUserStatus = catchAsync(async (req, res) => {
  const { userId } = req.params;

  await UserService.suspendUserStatusFromDB(userId);

  sendResponse(res, {
    statusCode: status.OK,
    message: "User suspended successfully!",
  });
});

const deleteUserStatus = catchAsync(async (req, res) => {
  const userId = req.params.userId;

  await UserService.deleteUserStatusFromDB(userId);

  sendResponse(res, {
    statusCode: status.OK,
    message: "User deleted successfully!",
  });
});

const removeUser = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const adminId = req.user.id;

  const result = await UserService.removeUserFromDB(userId, adminId);

  sendResponse(res, {
    statusCode: status.OK,
    message: "User permanently removed from database!",
    data: result,
  });
});

export const UserController = {
  makeAdmin,
  createUser,
  getAllUser,
  updateUser,
  updateUserByAdmin,
  deleteUser,
  getSingleUserById,
  updateContactInfo,
  suspendUserStatus,
  deleteUserStatus,
  removeUser,
};
