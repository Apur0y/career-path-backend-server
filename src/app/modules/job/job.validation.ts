import { z } from "zod";

// Define enums to match your Prisma schema
const SalaryType = z.enum(["monthly", "yearly", "hourly", "daily"]);
const Status = z.enum(["active", "expired"]);

// Schema for the features array items
const featureSchema = z
  .union([
    z.object({
      featureTitle: z.string().min(1, "Feature title is required"),
      paragraph: z.string().min(1, "Paragraph cannot be empty"),
    }),
    z.object({
      featureTitle: z.string().min(1, "Feature title is required"),
      point: z
        .array(z.string().min(1, "Point cannot be empty"))
        .min(1, "At least one point is required"),
    }),
  ])
  .refine(
    (data) => {
      // Ensure either point or paragraph is present but not both
      return (
        ("point" in data && !("paragraph" in data)) ||
        ("paragraph" in data && !("point" in data))
      );
    },
    {
      message:
        "Feature must have either 'point' array or 'paragraph' string, but not both",
    }
  );

// Main JobPost schema
export const createJobPostSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required").max(100, "Title too long"),
    thumbnail: z.string().optional(),
    experience: z.string().min(1, "Experience is required"),
    deadline: z
      .string()
      .datetime({ offset: true })
      .refine((val) => new Date(val) > new Date(), {
        message: "Deadline must be in the future",
      })
      .optional(),
    location: z.string().min(1, "Location is required"),
    salaryType: SalaryType.default("monthly"),
    salaryRange: z.string().optional(),
    skills: z
      .array(z.string().min(1, "Skill cannot be empty"))
      .min(1, "At least one skill is required"),
    features: z.array(featureSchema),
    companyId: z.string().min(1, "Company ID is required"),
    type: z.string().optional(),
    status: Status.default("active"),
  }),
});

export const updateJobPostSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    thumbnail: z.string().optional(),
    experience: z.string().optional(),
    deadline: z
      .string()
      .datetime({ offset: true })
      .refine((val) => new Date(val) > new Date(), {
        message: "Deadline must be in the future",
      })
      .optional(),
    location: z.string().optional(),
    salaryType: SalaryType.default("monthly").optional(),
    salaryRange: z.string().optional(),
    skills: z.array(z.string().min(1, "Skill cannot be empty")).optional(),
    features: z.array(featureSchema).optional(),
  }),
});

export const JobPostValidation = {
  createJobPostSchema,
  updateJobPostSchema,
};
