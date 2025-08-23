import { z } from "zod";

const createCompanySchema = z.object({
  body: z.object({
    companyName: z.string({
      required_error: "Company name is required",
      invalid_type_error: "Company name must be a string",
    }),

    industryType: z.string({
      required_error: "Industry type is required",
      invalid_type_error: "Industry type must be a string",
    }),

    roleInCompany: z.string({
      required_error: "Role in company is required",
      invalid_type_error: "Role in company must be a string",
    }),

    description: z.string({
      required_error: "Description is required",
      invalid_type_error: "Description must be a string",
    }),

    logo: z.string({ invalid_type_error: "Logo must be a string" }).optional(),

    country: z.string({
      required_error: "Country is required",
      invalid_type_error: "Country must be a string",
    }),

    email: z
      .string({
        required_error: "Email is required",
        invalid_type_error: "Email must be a string",
      })
      .email("Invalid email format"),

    phoneNumber: z
      .string({
        required_error: "Phone number is required",
        invalid_type_error: "Phone number must be a string",
      })
      .min(7, "Phone number too short"),

    address: z.string({
      required_error: "Address is required",
      invalid_type_error: "Address must be a string",
    }),

    city: z.string({
      required_error: "City is required",
      invalid_type_error: "City must be a string",
    }),

    state: z.string({
      required_error: "State is required",
      invalid_type_error: "State must be a string",
    }),

    zipCode: z.string({
      required_error: "Zip code is required",
      invalid_type_error: "Zip code must be a string",
    }),

    website: z
      .string({
        required_error: "Website is required",
        invalid_type_error: "Website must be a string",
      })
      .url("Invalid website URL"),
  }),
});

const updateCompanySchema = z.object({
  body: z
    .object({
      companyName: z
        .string({
          invalid_type_error: "Company name must be a string",
        })
        .optional(),

      industryType: z
        .string({
          invalid_type_error: "Industry type must be a string",
        })
        .optional(),

      roleInCompany: z
        .string({
          invalid_type_error: "Role in company must be a string",
        })
        .optional(),

      description: z
        .string({ invalid_type_error: "Description must be a string" })
        .optional(),

      logo: z
        .string({ invalid_type_error: "Logo must be a string" })
        .optional(),

      country: z
        .string({
          invalid_type_error: "Country must be a string",
        })
        .optional(),

      email: z
        .string({
          invalid_type_error: "Email must be a string",
        })
        .email("Invalid email format")
        .optional(),

      phoneNumber: z
        .string({
          invalid_type_error: "Phone number must be a string",
        })
        .optional(),

      address: z
        .string({
          invalid_type_error: "Address must be a string",
        })
        .optional(),

      city: z
        .string({
          invalid_type_error: "City must be a string",
        })
        .optional(),

      state: z
        .string({
          invalid_type_error: "State must be a string",
        })
        .optional(),

      zipCode: z
        .string({
          invalid_type_error: "Zip code must be a string",
        })
        .optional(),

      website: z
        .string({
          invalid_type_error: "Website must be a string",
        })
        .url("Invalid website URL")
        .optional(),
    })
    .optional(),
});

export const CompanyValidation = {
  createCompanySchema,
  updateCompanySchema,
};
