// import prisma from "../../utils/prisma";
// import { PaymentStatus } from "@prisma/client";

// const calculateRevenue = async () => {
//   // Get all completed payments
//   const completedPayments = await prisma.subscription.findMany({
//     where: {
//       paymentStatus: PaymentStatus.COMPLETED,
//     },
//     select: {
//       amount: true,
//       createdAt: true,
//       plan: {
//         select: {
//           planType: true,
//         },
//       },
//     },
//   });

//   // Calculate totals
//   const totalRevenue = completedPayments.reduce(
//     (sum, payment) => sum + payment.amount,
//     0
//   );

//   // Calculate by plan type
//   const revenueByPlanType = completedPayments.reduce((acc, payment) => {
//     const planType = payment.plan?.planType || "unknown";
//     acc[planType] = (acc[planType] || 0) + payment.amount;
//     return acc;
//   }, {} as Record<string, number>);

//   // Calculate by time period
//   const now = new Date();
//   const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
//   const currentMonth = now.getMonth();
//   const currentYear = now.getFullYear();

//   const last30DaysRevenue = completedPayments
//     .filter((payment) => payment.createdAt >= thirtyDaysAgo)
//     .reduce((sum, payment) => sum + payment.amount, 0);

//   const currentMonthRevenue = completedPayments
//     .filter(
//       (payment) =>
//         payment.createdAt.getMonth() === currentMonth &&
//         payment.createdAt.getFullYear() === currentYear
//     )
//     .reduce((sum, payment) => sum + payment.amount, 0);

//   const currentYearRevenue = completedPayments
//     .filter((payment) => payment.createdAt.getFullYear() === currentYear)
//     .reduce((sum, payment) => sum + payment.amount, 0);

//   return {
//     totalRevenue,
//     revenueByPlanType,
//     timePeriods: {
//       last30Days: last30DaysRevenue,
//       currentMonth: currentMonthRevenue,
//       currentYear: currentYearRevenue,
//     },
//     paymentCount: completedPayments.length,
//   };
// };

// export const RevenueService = {
//   calculateRevenue,
// };

import prisma from "../../utils/prisma";
import { PaymentStatus } from "@prisma/client";

const calculateRevenue = async () => {
  // Get all completed payments
  const completedPayments = await prisma.subscription.findMany({
    where: {
      paymentStatus: PaymentStatus.COMPLETED,
    },
    select: {
      amount: true,
      createdAt: true,
      plan: {
        select: {
          planType: true,
        },
      },
    },
  });

  // Create fresh date objects for each calculation
  const currentDate = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(currentDate.getDate() - 30);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Calculate totals
  const totalRevenue = completedPayments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );

  // Calculate by plan type
  const revenueByPlanType = completedPayments.reduce((acc, payment) => {
    const planType = payment.plan?.planType || "unknown";
    acc[planType] = (acc[planType] || 0) + payment.amount;
    return acc;
  }, {} as Record<string, number>);

  // Calculate by time period
  const last30DaysRevenue = completedPayments
    .filter((payment) => payment.createdAt >= thirtyDaysAgo)
    .reduce((sum, payment) => sum + payment.amount, 0);

  const currentMonthRevenue = completedPayments
    .filter(
      (payment) =>
        payment.createdAt.getMonth() === currentMonth &&
        payment.createdAt.getFullYear() === currentYear
    )
    .reduce((sum, payment) => sum + payment.amount, 0);

  const currentYearRevenue = completedPayments
    .filter((payment) => payment.createdAt.getFullYear() === currentYear)
    .reduce((sum, payment) => sum + payment.amount, 0);

  return {
    totalRevenue,
    revenueByPlanType,
    timePeriods: {
      last30Days: last30DaysRevenue,
      currentMonth: currentMonthRevenue,
      currentYear: currentYearRevenue,
    },
    paymentCount: completedPayments.length,
  };
};

export const RevenueService = {
  calculateRevenue,
};
