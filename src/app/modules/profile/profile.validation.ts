import { z } from "zod";
// 🧠 Reusable validators
const nonEmptyString = z.string().trim().min(1);
const optionalString = z.string().trim().optional();
const dateString = z.coerce.date(); // accepts ISO strings or Date objects
const optionalDate = dateString.optional().nullable();

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");
const createProfile = z.object({
  body: z.object({
    first_name: nonEmptyString,
    last_name: nonEmptyString,
    phone_number: nonEmptyString,
    email_address: z.string().email(),
    country_region: nonEmptyString,
    address: nonEmptyString,
    city: nonEmptyString,
    state: nonEmptyString,
    zip_code: nonEmptyString,
    recent_job_title: nonEmptyString,
    job_explanation: nonEmptyString,

    // Education
    education: z.array(
      z.object({
        degree: nonEmptyString,
        institution_name: nonEmptyString,
        major: nonEmptyString,
        graduation_start_date: dateString,
        graduation_end_date: dateString,
        achievements: z.array(z.string().trim()).optional()
      })
    ),

    // Experiences
    experiences: z.array(
      z.object({
        job_title: nonEmptyString,
        company_name: nonEmptyString,
        start_date: dateString,
        end_date: dateString.nullable().optional(), // allow null for current jobs
        job_description: nonEmptyString,
        skills: z.array(z.string().trim()).optional(),
        achievements: z.array(z.string().trim()).optional()
      })
    ),

    // Skills & Languages
    skills: z.array(z.string().trim()).optional(),
    languages: z.array(z.string().trim()).optional(),

    // Certifications
    certifications: z.array(
      z.object({
        certification_title: nonEmptyString,
        issuing_organization: nonEmptyString,
        certification_issue_date: dateString,
        certification_expiry_date: dateString.nullable().optional()
      })
    ).optional(),

    // Social Links
    linkedin_profile_url: optionalString,
    personal_website_url: optionalString,
    other_social_media: optionalString,
    other_social_media_url: optionalString,
  }),
}); const updateProfile = z.object({
  body: z.object({
    first_name: optionalString,
    last_name: optionalString,
    phone_number: optionalString,
    email_address: z.string().email().optional(),

    country_region: optionalString,
    address: optionalString,
    city: optionalString,
    state: optionalString,
    zip_code: optionalString,
    recent_job_title: optionalString,
    job_explanation: optionalString,

    education: z.array(
      z.object({
        degree: nonEmptyString,
        institution_name: nonEmptyString,
        major: nonEmptyString,
        graduation_start_date: dateString,
        graduation_end_date: dateString,
        achievements: z.array(z.string().trim()).optional()
      })
    ).optional(),

    experiences: z.array(
      z.object({
        job_title: nonEmptyString,
        company_name: nonEmptyString,
        start_date: dateString,
        end_date: optionalDate,
        job_description: nonEmptyString,
        skills: z.array(z.string().trim()).optional(),
        achievements: z.array(z.string().trim()).optional()
      })
    ).optional(),

    skills: z.array(z.string().trim()).optional(),
    languages: z.array(z.string().trim()).optional(),

    certifications: z.array(
      z.object({
        certification_title: nonEmptyString,
        issuing_organization: nonEmptyString,
        certification_issue_date: dateString,
        certification_expiry_date: optionalDate
      })
    ).optional(),

    linkedin_profile_url: optionalString,
    personal_website_url: optionalString,
    other_social_media: optionalString,
    other_social_media_url: optionalString,
  })
});

export const profileValidation = {
  createProfile, updateProfile
};
