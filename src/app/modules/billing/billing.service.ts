import status from "http-status";
import prisma from "../../utils/prisma";
import ApiError from "../../errors/ApiError";
import { IBillingInfo, IBillingInfoResponse } from "./billing.interface";

const createBillingInfoIntoDB = async (
  userId: string,
  payload: IBillingInfo
): Promise<{ data: IBillingInfoResponse; isUpdate: boolean }> => {
  // Verify that the user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(status.NOT_FOUND, "User not found!");
  }

  // Check if billing info already exists for this user
  const existingBillingInfo = await prisma.billingInfo.findFirst({
    where: { userId: userId },
  });

  if (existingBillingInfo) {
    // Update existing billing info
    const result = await prisma.billingInfo.update({
      where: { id: existingBillingInfo.id },
      data: {
        ...payload,
        userId: userId, // Ensure userId is set correctly
      },
    });

    return { data: result, isUpdate: true };
  }

  // Create new billing info
  const result = await prisma.billingInfo.create({
    data: {
      ...payload,
      userId: userId, // Ensure userId is set correctly
    },
  });

  return { data: result, isUpdate: false };
};

const getMyBillingInfoFromDB = async (
  userId: string
): Promise<IBillingInfoResponse | null> => {
  const result = await prisma.billingInfo.findFirst({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return result;
};

export const BillingService = {
  createBillingInfoIntoDB,
  getMyBillingInfoFromDB,
};
