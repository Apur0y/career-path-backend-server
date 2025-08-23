import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { TransactionService } from "./transaction.service";

const getTransactionHistory = catchAsync(
  async (req: Request, res: Response) => {
    const result = await TransactionService.getTransactionHistory(req.query);

    sendResponse(res, {
      statusCode: status.OK,
      message: "Transaction history retrieved successfully",
      meta: result.meta,
      data: result.data,
    });
  }
);

const getUserTransactionHistory = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const result = await TransactionService.getUserTransactionHistory(
      userId,
      req.query
    );

    sendResponse(res, {
      statusCode: status.OK,
      message: "User transaction history retrieved successfully",
      meta: result.meta,
      data: result.data,
    });
  }
);

const getMyTransactionHistory = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const result = await TransactionService.getUserTransactionHistory(
      userId,
      req.query
    );

    sendResponse(res, {
      statusCode: status.OK,
      message: "My transaction history retrieved successfully",
      meta: result.meta,
      data: result.data,
    });
  }
);

export const TransactionController = {
  getTransactionHistory,
  getUserTransactionHistory,
  getMyTransactionHistory,
};
