import { z } from "zod";

const createBillingInfoValidationSchema = z.object({
  body: z.object({
    firstName: z.string({
      required_error: "First name is required.",
      invalid_type_error: "First name must be a string.",
    }),
    lastName: z.string({
      required_error: "Last name is required.",
      invalid_type_error: "Last name must be a string.",
    }),
    phone: z.string({
      required_error: "Phone number is required.",
      invalid_type_error: "Phone number must be a string.",
    }),
    email: z
      .string({ required_error: "Email is required." })
      .email("Invalid email address"),
    country: z.string({
      required_error: "Country is required.",
      invalid_type_error: "Country must be a string.",
    }),
    address: z.string({
      required_error: "Address is required.",
      invalid_type_error: "Address must be a string.",
    }),
    city: z.string({
      required_error: "City is required.",
      invalid_type_error: "City must be a string.",
    }),
    state: z.string({
      required_error: "State is required.",
      invalid_type_error: "State must be a string.",
    }),
    zipCode: z.string({
      required_error: "Zip code is required.",
      invalid_type_error: "Zip code must be a string.",
    }),
    additionalInfo: z
      .string({
        invalid_type_error: "Additional info must be a string.",
      })
      .optional(),
  }),
});

const updateBillingInfoValidationSchema = z.object({
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
        invalid_type_error: "Phone number must be a string.",
      })
      .optional(),
    email: z.string().email("Invalid email address").optional(),
    country: z
      .string({
        invalid_type_error: "Country must be a string.",
      })
      .optional(),
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
    state: z
      .string({
        invalid_type_error: "State must be a string.",
      })
      .optional(),
    zipCode: z
      .string({
        invalid_type_error: "Zip code must be a string.",
      })
      .optional(),
    additionalInfo: z
      .string({
        invalid_type_error: "Additional info must be a string.",
      })
      .optional(),
  }),
});

export const BillingValidation = {
  createBillingInfoValidationSchema,
  updateBillingInfoValidationSchema,
};
