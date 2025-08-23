import { z } from "zod";

const getTransactionHistoryValidation = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10)),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    userId: z.string().optional(),
    planType: z.enum(["subscription", "payPerJob"]).optional(),
    billingStatus: z.enum(["active", "inactive"]).optional(),
  }),
});

export const TransactionValidation = {
  getTransactionHistoryValidation,
};
