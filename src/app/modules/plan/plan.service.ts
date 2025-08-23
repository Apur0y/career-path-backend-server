import { Plan } from "@prisma/client";
import prisma from "../../utils/prisma";
import { stripe } from "../../utils/stripe";
import ApiError from "../../errors/ApiError";

const createPlan = async (payload: Plan) => {
  const result = await prisma.$transaction(async (tx) => {
    // Step 1: Create Product in Stripe
    const product = await stripe.products.create({
      name: payload.planName,
      description: payload.description!,
      active: true,
    });

    if (payload.interval && !payload.intervalCount) {
      throw new ApiError(
        404,
        "Interval count is required when interval is specified"
      );
    }

    if (payload.intervalCount && !payload.interval) {
      throw new ApiError(
        404,
        "Interval is required when interval count is specified"
      );
    }

    // Step 2: Create Price in Stripe
    let price: any = {};
    if (payload.interval && payload.intervalCount) {
      const recurringData: any = {
        interval: payload.interval,
        interval_count: payload.intervalCount,
      };

      price = await stripe.prices.create({
        currency: "eur",
        unit_amount: Math.round(payload.amount * 100),
        active: true,
        recurring: recurringData,
        product: product.id,
      });
    } else {
      price = await stripe.prices.create({
        currency: "eur",
        unit_amount: Math.round(payload.amount * 100),
        active: true,
        product: product.id,
      });
    }

    // Step 3: Create Plan Record in Database
    const dbPlan = await tx.plan.create({
      data: {
        amount: payload.amount || 0,
        planName: payload.planName,
        interval: payload?.interval,
        intervalCount: payload?.intervalCount,
        productId: product.id,
        priceId: price.id,
        active: true,
        description: payload.description,
        features: payload.features,
        planType: payload.planType || "subscription",
      },
    });

    return dbPlan;
  });
  return result;
};

// Get All Plans
const getAllPlans = async () => {
  const plans = await prisma.plan.findMany();
  return plans;
};

// Get a Single Plan by ID
const getPlanById = async (planId: string) => {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
  });

  return plan;
};

// // Delete Plan
const deletePlan = async (planId: string) => {
  return await prisma.$transaction(async (tx) => {
    // Step 1: Find the plan record in the database
    const plan = await tx.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new Error(`Plan with ID ${planId} not found`);
    }

    // Step 2: Deactivate the price in Stripe
    await stripe.prices.update(plan.priceId, {
      active: false,
    });

    // Step 3: Deactivate the product in Stripe
    await stripe.products.update(plan.productId, {
      active: false,
    });

    // Step 4: Delete the plan record in the database
    await tx.plan.delete({
      where: { id: planId },
    });

    return {
      message: `Plan with ID ${planId} archived and deleted successfully`,
    };
  });
};

// Update Plan
const updatePlan = async (planId: string, payload: Partial<Plan>) => {
  return await prisma.$transaction(async (tx) => {
    // Step 1: Find the existing plan
    const existingPlan = await tx.plan.findUnique({
      where: { id: planId },
    });

    if (!existingPlan) {
      throw new ApiError(404, "Plan not found");
    }

    // Step 2: Update Product in Stripe if planName or description changed
    if (payload.planName || payload.description) {
      await stripe.products.update(existingPlan.productId, {
        name: payload.planName || existingPlan.planName,
        description: payload.description || existingPlan.description || "",
      });
    }

    // Step 3: Handle price updates if amount, interval, or intervalCount changed
    if (payload.amount || payload.interval || payload.intervalCount) {
      // Deactivate the old price
      await stripe.prices.update(existingPlan.priceId, {
        active: false,
      });

      // Create new price with updated values
      const newAmount =
        payload.amount !== undefined ? payload.amount : existingPlan.amount;
      const newInterval =
        payload.interval !== undefined
          ? payload.interval
          : existingPlan.interval;
      const newIntervalCount =
        payload.intervalCount !== undefined
          ? payload.intervalCount
          : existingPlan.intervalCount;

      if (newInterval && !newIntervalCount) {
        throw new ApiError(
          400,
          "Interval count is required when interval is specified"
        );
      }

      if (newIntervalCount && !newInterval) {
        throw new ApiError(
          400,
          "Interval is required when interval count is specified"
        );
      }

      let newPrice: any = {};
      if (newInterval && newIntervalCount) {
        const recurringData: any = {
          interval: newInterval,
          interval_count: newIntervalCount,
        };

        newPrice = await stripe.prices.create({
          currency: "eur",
          unit_amount: Math.round(newAmount * 100),
          active: true,
          recurring: recurringData,
          product: existingPlan.productId,
        });
      } else {
        newPrice = await stripe.prices.create({
          currency: "eur",
          unit_amount: Math.round(newAmount * 100),
          active: true,
          product: existingPlan.productId,
        });
      }

      // Update the plan with new price ID
      payload.priceId = newPrice.id;
    }

    // Step 4: Update Plan Record in Database
    const updatedPlan = await tx.plan.update({
      where: { id: planId },
      data: {
        planName: payload.planName,
        amount: payload.amount,
        interval: payload.interval,
        intervalCount: payload.intervalCount,
        priceId: payload.priceId,
        active: payload.active,
        description: payload.description,
        features: payload.features,
        planType: payload.planType,
      },
    });

    return updatedPlan;
  });
};

export const PlanServices = {
  createPlan,
  getAllPlans,
  getPlanById,
  deletePlan,
  updatePlan,
};
