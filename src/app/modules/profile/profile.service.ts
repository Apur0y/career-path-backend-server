import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import prisma from "../../utils/prisma";
import ApiError from "../../errors/ApiError";
import { Profile } from "@prisma/client";
const createProfileInToDB = async (
  userId: string,
  payload: any,
  files?: {
    achievementFiles?: Express.Multer.File[];
    graduationCertificateFiles?: Express.Multer.File[];
  }
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  if (!user) throw new ApiError(404, 'User not found!');

  // Step 1: Check if profile exists (skip API call if already created)
  const existingProfile = await prisma.profile.findFirst({
    where: { userId: user.id },
    select: {
      id: true,
      profileId: true,
      userId: true,
      firstName: true,
      email: true,
    },
  });

  // Step 2: If profile exists, return the full profile with user info
  if (existingProfile) {
    const profile = await prisma.profile.findUnique({
      where: { id: existingProfile.id },
      include: {
        User: { select: { profilePic: true } },
      },
    });

    return {
      success: true,
      profile,
      message: 'Profile already exists',
    };
  }

  // Step 3: Create FormData for API call
  const formData = new FormData();

  const fieldMapping: { [key: string]: string } = {
    firstName: 'first_name',
    lastName: 'last_name',
    email: 'email_address',
    phoneNumber: 'phone_number',
    countryRegion: 'country_region',
    address: 'address',
    city: 'city',
    state: 'state',
    zipCode: 'zip_code',
    recentJobTitle: 'recent_job_title',
    jobTitle: 'job_title',
    companyName: 'company_name',
    startDate: 'start_date',
    endDate: 'end_date',
    jobDescription: 'job_description',
    education: 'education',
    jobExperience: 'job_experience',
    certifications: 'certifications',
    linkedinProfileUrl: 'linkedin_profile_url',
    personalWebsiteUrl: 'personal_website_url',
    otherSocialMedia: 'other_social_media',
    otherSocialMediaUrl: 'other_social_media_url',
    githubUrl: 'github_url',
    twitterUrl: 'twitter_url',
    portfolioUrl: 'portfolio_url',
    skills: 'skills',
    languages: 'languages',
  };

  for (const [key, value] of Object.entries(payload)) {
    const apiFieldName = fieldMapping[key] || key;

    if (Array.isArray(value)) {
      value.forEach((item, index) =>
        formData.append(`${apiFieldName}[${index}]`, String(item))
      );
    } else if (value instanceof Date) {
      formData.append(apiFieldName, value.toISOString());
    } else {
      formData.append(apiFieldName, String(value));
    }
  }

  formData.append('user_id', `user_${userId}`);

  // Step 4: Append uploaded files to FormData
  if (files) {
    if (files.achievementFiles?.length) {
      for (const file of files.achievementFiles) {
        formData.append('achievement_files', fs.createReadStream(file.path), {
          filename: file.originalname,
          contentType: file.mimetype,
        });
      }
    }

    if (files.graduationCertificateFiles?.length) {
      for (const file of files.graduationCertificateFiles) {
        formData.append(
          'graduation_certificate_files',
          fs.createReadStream(file.path),
          {
            filename: file.originalname,
            contentType: file.mimetype,
          }
        );
      }
    }
  }

  // Step 5: Make external API call
  const response = await axios.post(
    'http://31.97.216.98:8000/api/v1/user-profiles',
    formData,
    {
      headers: formData.getHeaders(),
    }
  );

  if (!response || !response.data?.profile_data) {
    throw new ApiError(500, 'Profile not created or response malformed');
  }

  const apiData = response.data.profile_data;

  // Step 6: Use Prisma transaction to safely write profile to DB
  const result = await prisma.$transaction(async (tx) => {
    const profileData = {
      firstName: apiData.first_name,
      lastName: apiData.last_name,
      profileId: apiData.user_id,
      phoneNumber: apiData.phone_number,
      email: apiData.email_address || '',
      countryRegion: apiData.country_region || '',
      address: apiData.address,
      city: apiData.city,
      state: apiData.state,
      zipCode: apiData.zip_code,
      skills: payload.skills || [],
      languages: payload.languages || [],
      JobTitle: apiData.recent_job_title,
      jobDescription: apiData.job_explanation,
      jobExperience: Array.isArray(payload.experiences)
        ? payload.experiences.map((exp: any) => ({
            job_title: exp.job_title,
            company_name: exp.company_name || '',
            start_date: new Date(exp.start_date),
            end_date: exp.end_date ? new Date(exp.end_date) : null,
            job_description: exp.job_description || null,
            skills: exp.skills || [],
            achievements: Array.isArray(exp.achievements)
              ? exp.achievements.map((file: any) => ({
                  filename: file.filename,
                  file_path: file.file_path,
                  file_size: file.file_size,
                  upload_timestamp: new Date(file.upload_timestamp),
                  content_type: file.content_type,
                  description: null,
                }))
              : [],
          }))
        : [],
      education: Array.isArray(payload.education)
        ? payload.education.map((edu: any) => ({
            degree: edu.degree,
            institution_name: edu.institution_name || '',
            major: edu.major,
          }))
        : [],
      certifications: Array.isArray(payload.certifications)
        ? payload.certifications.map((cert: any) => ({
            certification_name: cert.certification_title,
            issuing_organization: cert.issuing_organization,
            issue_date: cert.certification_issue_date
              ? new Date(cert.certification_issue_date)
              : null,
            expiry_date: cert.certification_expiry_date
              ? new Date(cert.certification_expiry_date)
              : null,
          }))
        : [],
      socialMedia: apiData.social_media
        ? {
            linkedin_profile_url:
              apiData.social_media.linkedin_profile_url || null,
            personal_website_url:
              apiData.social_media.personal_website_url || null,
            other_social_media: apiData.social_media.other_social_media || null,
            other_social_media_url:
              apiData.social_media.other_social_media_url || null,
          }
        : null,
      userId: userId,
    };

    return await tx.profile.create({
      data: profileData,
    });
  });

  return {
    success: true,
    profile: result,
    message: 'Profile created successfully',
  };
};
const UpdateMyResume = async (userId: string, payload: Profile) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  if (!user) throw new ApiError(404, "User not found!");
  // Check if profile exists
  const profileExist = await prisma.profile.findUnique({
    where: { userId },
    select: {
      profileId: true,
      firstName: true,
      lastName: true,
      id: true,
    },
  });

  if (!profileExist) {
    throw new ApiError(404, "Profile not found");
  }
  // Create profile in database using Prisma
  const result = await prisma.profile.update({
    where: { userId },
    data: payload,
  });

  return {
    success: true,
    profile: result,
    message: "Profile updated successfully",
  };
};

/// get profile by job seeker id, admin and super admin
const getProfileById = async (userId: string) => {
  const user = await prisma.profile.findUnique({
    where: { userId },
    include: { User: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};
/// get profile by job seeker id, admin and super admin
const getMyProfileById = async (userId: string) => {
  const profileExist = await prisma.profile.findUnique({
    where: { userId },
    include: {
      User: true,
    },
  });

  if (!profileExist) {
    throw new Error("Profile not found");
  }

  return profileExist;
};

// resume generation after profile creation, by user_id/profileId
const resumeGenerate = async (profileId: string) => {
  if (!profileId) throw new ApiError(400, "Profile ID is required");

  const userProfile = await prisma.profile.findUnique({
    where: { profileId },
    include: { User: true },
  });
  if (!userProfile) throw new ApiError(404, "Profile not found");

  const id = userProfile?.userId;
  if (!id) {
    throw new ApiError(404, "User ID not found in profile");
  }
  const userExists = await prisma.user.findUnique({
    where: { id },
    include: { plan: true },
  });
  if (!userExists) throw new ApiError(404, "User not found");

  const jobLimit =
    userExists.plan?.planName === "Premium Plan"
      ? 25
      : userExists.plan?.planName === "Pro Plan"
        ? 50
        : 5;

  const resume = await axios.post(
    `http://31.97.216.98:8000/api/v1/resume/${profileId}/generate-resume`
  );
  if (!resume || !resume.data.data) {
    throw new ApiError(500, "Failed to generate resume");
  }

  await prisma.profile.update({
    where: { profileId },
    data: {
      aboutMe: resume.data?.data?.sections[1]?.content[0] || null,
    },
  });

  // Call recommendation in background
  axios
    .post(
      `http://31.97.216.98:8000/api/v1/recommendations/user/${profileId}/generate?limit=${jobLimit}&include_reasoning=true`
    )
    .catch((err) => {
      console.error("Recommendation API error:", err.message);
    });

  return { resume: resume.data, profile: userProfile };
};

export const ProfileService = {
  createProfileInToDB,
  getProfileById,
  resumeGenerate,
  getMyProfileById,
  UpdateMyResume,
};
