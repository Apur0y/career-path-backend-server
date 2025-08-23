import { z } from "zod";

// Define InterviewPlatform enum for validation
const InterviewPlatformEnum = z.enum([
  "GOOGLE_MEET",
  "ZOOM",
  "TEAMS",
  "SKYPE",
  "OTHER",
]);

// Zod schemas
const createInterviewZodSchema = z.object({
  body: z.object({
    jobApplicationId: z
      .string()
      .length(
        24,
        "JobApplication ID must be a valid 24-character MongoDB ObjectID"
      ),
    interviewTitle: z.string().min(1, "Interview title is required"),
    interviewDate: z.string().datetime("Invalid datetime format"),
    interviewTime: z.string().min(1, "Interview time is required"),
    interviewPlatform: InterviewPlatformEnum.optional().default("GOOGLE_MEET"),
    interviewLink: z
      .string()
      .url("Invalid URL format")
      .optional()
      .or(z.literal("")),
  }),
});

const updateInterviewZodSchema = z.object({
  body: z.object({
    interviewTitle: z.string().optional(),
    interviewDate: z.string().datetime().optional(),
    interviewTime: z.string().optional(),
    interviewPlatform: InterviewPlatformEnum.optional(),
    interviewLink: z
      .string()
      .url("Invalid URL format")
      .optional()
      .or(z.literal("")),
  }),
  params: z.object({
    id: z.string(),
  }),
});

const getInterviewByIdZodSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

const deleteInterviewZodSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

const getAllInterviewsZodSchema = z.object({
  query: z.object({
    jobApplicationId: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    interviewPlatform: InterviewPlatformEnum.optional(),
    limit: z.string().optional(),
    page: z.string().optional(),
  }),
});

export const InterviewValidation = {
  createInterviewZodSchema,
  updateInterviewZodSchema,
  getInterviewByIdZodSchema,
  deleteInterviewZodSchema,
  getAllInterviewsZodSchema,
  InterviewPlatformEnum,
};
