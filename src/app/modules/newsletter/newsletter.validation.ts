import { z } from "zod";

const subscribeZodSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
  }),
});

export const NewsletterValidation = {
  subscribeZodSchema,
};
