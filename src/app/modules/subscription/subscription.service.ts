import {
  handlePaymentIntentFailed,
  handlePaymentIntentSucceeded,
} from "../../utils/webhook";
import Stripe from "stripe";
import status from "http-status";
import prisma from "../../utils/prisma";
import { stripe } from "../../utils/stripe";
import ApiError from "../../errors/ApiError";
import { SubscriptionType } from "@prisma/client";
import QueryBuilder from "../../builder/QueryBuilder";

const createSubscription = async (userId: string, planId: string) => {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Verify user exists
      const user = await tx.user.findUnique({ where: { id: userId } });

      if (!user) {
        throw new ApiError(status.NOT_FOUND, "User not found");
      }

      // 2. Verify plan exists
      const plan = await tx.plan.findUnique({ where: { id: planId } });
      if (!plan) {
        throw new ApiError(status.NOT_FOUND, "Plan not found");
      }

      // === New check: Prevent EMPLOYEE from buying payPerJob if active subscription exists ===
      if (user.role === "EMPLOYEE" && plan.planType === "payPerJob") {
        const now = new Date();

        const hasActiveSubscriptionPlan =
          user.subscriptionType === "monthly" &&
          user.planExpiration &&
          user.planExpiration > now;

        if (hasActiveSubscriptionPlan) {
          throw new ApiError(
            status.BAD_REQUEST,
            `You already have an active "Subscription" plan and cannot purchase a Pay-per-Job plan.`
          );
        }
      }

      // 3. Calculate end date (for subscription plans)
      const startDate = new Date();
      let endDate: Date | null = null;
      if (plan.interval === "month") {
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + (plan.intervalCount || 1));
        if (endDate.getDate() !== startDate.getDate()) {
          endDate.setDate(0);
        }
      }

      // 4. Check for existing subscription
      const existingSubscription = await tx.subscription.findFirst({
        where: { userId: user.id },
      });

      // 5.5 Prevent duplicate active subscription purchase
      if (
        plan.planType === "subscription" &&
        user.subscriptionType === "monthly" &&
        user.planExpiration &&
        user.planExpiration > new Date() &&
        existingSubscription?.planId === plan.id
      ) {
        throw new ApiError(
          status.BAD_REQUEST,
          "You already have an active subscription. Please wait until your current subscription expires."
        );
      }

      // ✅ FREE PLAN: Skip Stripe, directly create or update subscription and update user
      if (plan.amount === 0) {
        const dummyStripeId = `free-plan-${Date.now()}`;
        let subscription;

        if (existingSubscription) {
          subscription = await tx.subscription.update({
            where: { id: existingSubscription.id },
            data: {
              planId,
              stripePaymentId: dummyStripeId,
              amount: 0,
              paymentStatus: "COMPLETED",
              endDate,
            },
          });
        } else {
          subscription = await tx.subscription.create({
            data: {
              userId: user.id,
              planId,
              stripePaymentId: dummyStripeId,
              startDate,
              amount: 0,
              paymentStatus: "COMPLETED",
              endDate,
            },
          });
        }

        await tx.user.update({
          where: { id: user.id },
          data: {
            isSubscribed: true,
            role: "JOB_SEEKER",
            subscriptionType:
              plan.planType === "subscription"
                ? SubscriptionType.monthly
                : SubscriptionType.payPerJob,
            ...(plan.planType === "subscription" && plan.amount > 0
              ? { planExpiration: endDate }
              : {}),
          },
        });

        return {
          subscription,
          clientSecret: null,
          paymentIntentId: null,
        };
      }

      // Validate minimum amount for Stripe (recurring plans must be >= €0.50)
      if (plan.planType === "subscription" && plan.amount < 0.5) {
        throw new ApiError(
          status.BAD_REQUEST,
          "Recurring plans must be at least €0.50 due to Stripe restrictions."
        );
      }

      const stripeCustomer = await stripe.customers.create({
        name: user.fullName || `${user.firstName} ${user.lastName}`,
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });

      // 5. PAID PLAN: Create Stripe PaymentIntent
      let paymentIntent;
      try {
        paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(plan.amount * 100), // in cents
          currency: plan.currency || "eur",
          customer: stripeCustomer.id,
          metadata: {
            userId: user.id,
            planId,
          },
          automatic_payment_methods: {
            enabled: true,
          },
        });
      } catch (stripeError: any) {
        console.error("Stripe payment intent creation error:", stripeError);
        throw new ApiError(
          status.BAD_REQUEST,
          stripeError.message || "Failed to create payment intent"
        );
      }

      // 6. Update existing subscription if any, else create new
      let subscription;
      if (existingSubscription) {
        subscription = await tx.subscription.update({
          where: { id: existingSubscription.id },
          data: {
            planId,
            stripePaymentId: paymentIntent.id,
            startDate,
            amount: plan.amount,
            endDate: existingSubscription.endDate || endDate,
            paymentStatus: "PENDING",
          },
        });
      } else {
        subscription = await tx.subscription.create({
          data: {
            userId: user.id,
            planId,
            stripePaymentId: paymentIntent.id,
            startDate,
            amount: plan.amount,
            paymentStatus: "PENDING",
            endDate,
          },
        });
      }

      return {
        subscription,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
      };
    });
  } catch (error: any) {
    throw new ApiError(
      error.statusCode || status.BAD_REQUEST,
      error.message || "Subscription creation failed"
    );
  }
};

const getAllSubscription = async (query: Record<string, any>) => {
  const queryBuilder = new QueryBuilder(prisma.subscription, query);
  const subscription = await queryBuilder
    .search([""])
    .paginate()
    .fields()
    .include({
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profilePic: true,
          role: true,
          isSubscribed: true,
          planExpiration: true,
          totalPayPerJobCount: true,
        },
      },
      plan: true,
    })
    .execute();

  const meta = await queryBuilder.countTotal();
  return { meta, data: subscription };
};

const getSingleSubscription = async (subscriptionId: string) => {
  const result = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          profilePic: true,
          email: true,
          role: true,
          isSubscribed: true,
          planExpiration: true,
          planId: true,
        },
      },
      plan: true,
    },
  });

  if (!result) {
    throw new ApiError(status.NOT_FOUND, "Subscription not found!");
  }

  return result;
};

const getMySubscription = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(status.NOT_FOUND, "User not found");
  }

  const result = await prisma.subscription.findFirst({
    where: { user: { id: userId } },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          profilePic: true,
          email: true,
          role: true,
          isSubscribed: true,
          planExpiration: true,
          subscriptionType: true,
          planId: true,
          totalPayPerJobCount: true,
        },
      },
      plan: true,
    },
  });

  if (!result) {
    throw new ApiError(status.NOT_FOUND, "Subscription not found!");
  }

  return result;
};

const HandleStripeWebhook = async (event: Stripe.Event) => {
  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return { received: true };
  } catch (error) {
    console.error("Error handling Stripe webhook:", error);
    throw new ApiError(status.INTERNAL_SERVER_ERROR, "Webhook handling failed");
  }
};

export const SubscriptionServices = {
  getMySubscription,
  createSubscription,
  getAllSubscription,
  HandleStripeWebhook,
  getSingleSubscription,
};
