import { z } from "zod";

const createUserValidationSchema = z.object({
  body: z.object({
    firstName: z.string({
      required_error: "First name is required.",
      invalid_type_error: "First name must be a string.",
    }),
    lastName: z.string({
      required_error: "Last name is required.",
      invalid_type_error: "Last name must be a string.",
    }),
    email: z
      .string({ required_error: "Email is required." })
      .email("Invalid email address"),
    password: z
      .string({
        required_error: "Password is required.",
        invalid_type_error: "Password must be a string.",
      })
      .min(6, "Password must be at least 6 characters long."),
  }),
});

const updateUserValidationSchema = z.object({
  body: z.object({
    firstName: z
      .string({
        invalid_type_error: "First name must be a string.",
      })
      .optional(),
    lastName: z
      .string({
        invalid_type_error: "Last name must be a string.",
      })
      .optional(),
    phone: z
      .string({
        invalid_type_error: "Phone must be a string.",
      })
      .optional(),
  }),
});

const updateContactInfoValidationSchema = z.object({
  body: z.object({
    address: z
      .string({
        invalid_type_error: "Address must be a string.",
      })
      .optional(),
    city: z
      .string({
        invalid_type_error: "City must be a string.",
      })
      .optional(),
    zipCode: z
      .string({
        invalid_type_error: "Zip code must be a string.",
      })
      .optional(),
    preferredContactMethod: z
      .enum(["email", "phone"], {
        invalid_type_error:
          "Preferred contact method must be 'email' or 'phone'.",
      })
      .optional(),
    email: z.string().email("Invalid email address").optional(),
    phone: z
      .string({
        invalid_type_error: "Phone must be a string.",
      })
      .optional(),
  }),
});

export const UserValidation = {
  createUserValidationSchema,
  updateUserValidationSchema,
  updateContactInfoValidationSchema,
};
