import Stripe from "stripe";
import prisma from "./prisma";
import status from "http-status";
import ApiError from "../errors/ApiError";
import { PaymentStatus, Interval, SubscriptionType } from "@prisma/client";

// Helper function to calculate end date based on plan interval
const calculateEndDate = (
  startDate: Date,
  interval: Interval,
  intervalCount: number
): Date => {
  if (interval !== "month") {
    throw new ApiError(status.BAD_REQUEST, `Unsupported interval: ${interval}`);
  }

  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + intervalCount);

  if (endDate.getDate() !== startDate.getDate()) {
    endDate.setDate(0); // Last day of previous month
  }

  return endDate;
};

const handlePaymentIntentSucceeded = async (
  paymentIntent: Stripe.PaymentIntent
) => {
  const payment = await prisma.subscription.findFirst({
    where: { stripePaymentId: paymentIntent.id },
    include: {
      plan: true,
    },
  });

  if (!payment) {
    throw new ApiError(
      status.NOT_FOUND,
      `Payment not found for ID: ${paymentIntent.id}`
    );
  }

  if (!payment.plan) {
    throw new ApiError(
      status.NOT_FOUND,
      "Plan not found for this subscription"
    );
  }

  if (paymentIntent.status !== "succeeded") {
    throw new ApiError(
      status.BAD_REQUEST,
      "Payment intent is not in succeeded state"
    );
  }

  const startDate = new Date();
  const updates: any[] = [];

  const isFreePlan = payment.plan.amount === 0;
  const isPayPerJob = payment.plan.planType === "payPerJob";
  const shouldSetDates = !isFreePlan && !isPayPerJob;

  updates.push(
    prisma.subscription.update({
      where: { id: payment.id },
      data: {
        paymentStatus: PaymentStatus.COMPLETED,
        ...(shouldSetDates ? { startDate } : {}),
      },
    })
  );

  // === Step 3: User update logic ===
  if (isPayPerJob) {
    const userUpdate: any = {
      totalPayPerJobCount: {
        increment: 1,
      },
      subscriptionType: SubscriptionType.payPerJob,
      planId: payment.planId,
    };

    // Optional: Assign role based on plan description
    if (payment.plan.description === "Employer_Plan") {
      userUpdate.role = "EMPLOYEE";
      userUpdate.roleChangedAt = new Date();
    } else if (payment.plan.description === "Job_Seeker_Plan") {
      userUpdate.role = "JOB_SEEKER";
      userUpdate.roleChangedAt = new Date();
    }

    updates.push(
      prisma.user.update({
        where: { id: payment.userId },
        data: userUpdate,
      })
    );
  } else if (payment.plan.planType === "subscription") {
    const userUpdateData: any = {
      isSubscribed: true,
      subscriptionType: SubscriptionType.monthly,
      planId: payment.planId,
    };

    if (payment.plan.description === "Employer_Plan") {
      userUpdateData.role = "EMPLOYEE";
      userUpdateData.roleChangedAt = new Date();
    } else if (payment.plan.description === "Job_Seeker_Plan" || isFreePlan) {
      userUpdateData.role = "JOB_SEEKER";
      userUpdateData.roleChangedAt = new Date();
    }

    if (shouldSetDates) {
      const endDate = calculateEndDate(
        startDate,
        payment.plan.interval || Interval.month,
        payment.plan.intervalCount || 1
      );

      userUpdateData.planExpiration = endDate;

      updates.push(
        prisma.subscription.update({
          where: { id: payment.id },
          data: { endDate },
        })
      );
    }

    updates.push(
      prisma.user.update({
        where: { id: payment.userId },
        data: userUpdateData,
      })
    );
  }

  updates.push(
    prisma.plan.update({
      where: { id: payment.planId },
      data: {
        totalSubscribers: {
          increment: 1,
        },
      },
    })
  );

  // === Step 4: Apply all DB changes ===
  await prisma.$transaction(updates);
};

const handlePaymentIntentFailed = async (
  paymentIntent: Stripe.PaymentIntent
) => {
  const payment = await prisma.subscription.findFirst({
    where: { stripePaymentId: paymentIntent.id },
  });

  if (!payment) {
    throw new ApiError(
      status.NOT_FOUND,
      `Payment not found for ID: ${paymentIntent.id}`
    );
  }

  const updates: any[] = [];

  updates.push(
    prisma.subscription.update({
      where: { id: payment.id },
      data: {
        paymentStatus: PaymentStatus.CANCELED,
        endDate: payment.endDate ?? new Date(),
      },
    })
  );

  await prisma.$transaction(updates);
};

export { handlePaymentIntentSucceeded, handlePaymentIntentFailed };
