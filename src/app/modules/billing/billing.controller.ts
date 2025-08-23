import status from "http-status";
import catchAsync from "../../utils/catchAsync";
import { BillingService } from "./billing.service";
import sendResponse from "../../utils/sendResponse";

const createBillingInfo = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const result = await BillingService.createBillingInfoIntoDB(userId, req.body);

  sendResponse(res, {
    statusCode: result.isUpdate ? status.OK : status.CREATED,
    message: result.isUpdate
      ? "Billing information updated successfully!"
      : "Billing information created successfully!",
    data: result.data,
  });
});

const getMyBillingInfo = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const result = await BillingService.getMyBillingInfoFromDB(userId);

  sendResponse(res, {
    statusCode: status.OK,
    message: result
      ? "Billing information retrieved successfully!"
      : "No billing information found",
    data: result,
  });
});

export const BillingController = {
  createBillingInfo,
  getMyBillingInfo,
};
