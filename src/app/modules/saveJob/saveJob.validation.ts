import { z } from "zod";

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, { message: "Invalid ObjectId format" });

const saveJobValidationSchema = z.object({
  body: z.object({
    jobId: objectId,
  }),
});

export const SaveJobValidation = {
  saveJobValidationSchema,
};
