import { z } from "zod";

const createChatRoomValidation = z.object({
  body: z.object({
    participantId: z.string({
      required_error: "Participant ID is required",
    }),
    jobPostId: z.string({
      required_error: "Job Post ID is required",
    }),
    roomType: z
      .enum(["JOB_APPLICATION", "INTERVIEW_CHAT", "FOLLOW_UP"])
      .optional(),
    name: z.string().optional(),
    description: z.string().optional(),
  }),
});

const createChatMessageValidation = z.object({
  body: z.object({
    message: z
      .string({
        required_error: "Message is required",
      })
      .min(1, "Message cannot be empty"),
    messageType: z
      .enum(["TEXT", "IMAGE", "FILE", "SYSTEM", "NOTIFICATION"])
      .optional(),
    replyToId: z.string().optional(),
  }),
});

const getChatRoomMessagesValidation = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val) : 50)),
  }),
});

export const ChatRoomValidation = {
  createChatRoomValidation,
  createChatMessageValidation,
  getChatRoomMessagesValidation,
};
