import { ApplicationStatus } from "@prisma/client";
import { z } from "zod";

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, { message: "Invalid ObjectId format" });

const jobApplyValidationSchema = z.object({
  body: z.object({
    jobId: objectId,
  }),
});

const updateStatusZodSchema = z.object({
  body: z.object({
    status: z.nativeEnum(ApplicationStatus, {
      required_error: "Status is required",
    }),
  }),
});

export const JobApplyValidation = {
  jobApplyValidationSchema,
  updateStatusZodSchema,
};
