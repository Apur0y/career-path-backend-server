import catchAsync from "../../utils/catchAsync";
import { RevenueService } from "./revenue.service";
import sendResponse from "../../utils/sendResponse";

const getRevenue = catchAsync(async (req, res) => {
  const result = await RevenueService.calculateRevenue();

  sendResponse(res, {
    statusCode: 200,
    message: "Revenue data retrieved successfully",
    data: result,
  });
});

export const RevenueController = {
  getRevenue,
};
