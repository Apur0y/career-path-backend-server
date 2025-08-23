import status from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { NewsletterService } from "./newsletter.service";

const subscribe = catchAsync(async (req, res) => {
  const { email } = req.body;
  await NewsletterService.subscribe(email);

  sendResponse(res, {
    statusCode: status.OK,
    message: "Subscribed to newsletter successfully.",
  });
});

export const NewsletterController = {
  subscribe,
};
