import { z } from "zod";

const createChatValidation = z.object({
  body: z.object({
    receiverId: z.string({
      required_error: "Receiver ID is required",
    }),
    message: z.string({
      required_error: "Message is required",
    }),
    jobPostId: z.string({
      required_error: "Job Post ID is required",
    }),
  }),
});

export const ChatValidation = {
  createChatValidation,
};
