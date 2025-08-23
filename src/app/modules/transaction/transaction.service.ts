import prisma from "../../utils/prisma";
import { IMeta } from "../../utils/sendResponse";
import QueryBuilder from "../../builder/QueryBuilder";
import { ITransactionHistory } from "./transaction.interface";

const getTransactionHistory = async (
  query: Record<string, unknown>
): Promise<{
  data: ITransactionHistory[];
  meta: IMeta;
}> => {
  // Create QueryBuilder instance
  const subscriptionQuery = new QueryBuilder(prisma.subscription, query)
    .include({
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          planExpiration: true,
          totalPayPerJobCount: true,
        },
      },
      plan: {
        select: {
          planName: true,
          description: true,
          planType: true,
          amount: true,
          currency: true,
          interval: true,
          intervalCount: true,
          productId: true,
          priceId: true,
          active: true,
        },
      },
    })
    .sort()
    .paginate();

  // Execute query and get meta data
  const [subscriptions, meta] = await Promise.all([
    subscriptionQuery.execute(),
    subscriptionQuery.countTotal(),
  ]);

  // Transform data and calculate billing status
  const transformedData: ITransactionHistory[] = subscriptions.map(
    (subscription: any) => {
      const currentDate = new Date();
      let billingStatusValue: "Active" | "Inactive" = "Inactive";

      if (subscription.user && subscription.plan) {
        // Check billing status based on plan type
        if (subscription.plan.planType === "subscription") {
          // For subscription plans, check planExpiration
          if (
            subscription.user.planExpiration &&
            subscription.user.planExpiration > currentDate
          ) {
            billingStatusValue = "Active";
          }
        } else if (subscription.plan.planType === "payPerJob") {
          // For pay-per-job plans, check totalPayPerJobCount
          if (subscription.user.totalPayPerJobCount > 0) {
            billingStatusValue = "Active";
          }
        }
      }

      return {
        id: subscription.id,
        paymentDate: subscription.createdAt,
        planName: subscription.plan?.planName || "Unknown Plan",
        planType: subscription.plan?.description || "No description available",
        userName: subscription.user
          ? `${subscription.user.firstName} ${subscription.user.lastName}`
          : "Unknown User",
        email: subscription.user?.email || "Unknown Email",
        phone: subscription.user?.phone || "Unknown Phone",
        amount: subscription.plan?.amount || 0,
        payType: "Stripe",
        billingStatus: billingStatusValue,
      };
    }
  );

  return {
    data: transformedData,
    meta,
  };
};

const getUserTransactionHistory = async (
  userId: string,
  query: Record<string, unknown>
): Promise<{
  data: ITransactionHistory[];
  meta: IMeta;
}> => {
  return getTransactionHistory({ ...query, userId });
};

export const TransactionService = {
  getTransactionHistory,
  getUserTransactionHistory,
};
