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
  },
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  if (!user) throw new ApiError(404, "User not found!");

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
  // if (existingProfile) {
  //   const profile = await prisma.profile.findUnique({
  //     where: { id: existingProfile.id },
  //     include: {
  //       User: { select: { profilePic: true } },
  //     },
  //   });

  //   return {
  //     success: true,
  //     profile,
  //     message: "Profile already exists",
  //   };
  // }

  // Step 6: Use Prisma transaction to safely write profile to DB
  const result = await prisma.$transaction(async (tx) => {
    const profileData = {
      firstName: payload.firstName || payload.first_name || "John",
      lastName: payload.lastName || payload.last_name || "Doe",
      profileId: `profile_${Date.now()}`,
      phoneNumber: payload.phoneNumber || payload.phone_number || "01700000000",
      email: payload.email || payload.email_address || "demo@example.com",
      countryRegion:
        payload.countryRegion || payload.country_region || "Bangladesh",
      address: payload.address || "Dhaka",
      city: payload.city || "Dhaka",
      state: payload.state || "Dhaka",
      zipCode: payload.zipCode || payload.zip_code || "1207",

      aboutMe: `Hi, I'm ${payload.firstName || payload.first_name || "John"} ${
        payload.lastName || payload.last_name || "Doe"
      }, currently working as ${
        payload.recentJobTitle || payload.recent_job_title || "a Professional"
      }. Based in ${
        payload.city || "my city"
      }, ${payload.countryRegion || payload.country_region || "my country"}, I enjoy applying my skills to solve real-world problems and continuously learning new technologies to grow professionally.`,

      skills: Array.isArray(payload.skills) ? payload.skills : [],
      languages: Array.isArray(payload.languages) ? payload.languages : [],

      JobTitle:
        payload.recentJobTitle ||
        payload.recent_job_title ||
        "Frontend Developer",

      jobDescription:
        payload.jobExplanation ||
        payload.job_explanation ||
        "Experienced software developer.",

      jobExperience: Array.isArray(payload.experiences)
        ? payload.experiences.map((exp: any) => ({
            job_title: exp.job_title || "Software Engineer",
            company_name: exp.company_name || "Demo Company",
            start_date: exp.start_date ? new Date(exp.start_date) : new Date(),
            end_date: exp.end_date ? new Date(exp.end_date) : null,
            job_description:
              exp.job_description || "Worked on multiple projects.",
            skills: Array.isArray(exp.skills) ? exp.skills : [],
            achievements: Array.isArray(exp.achievements)
              ? exp.achievements.map((file: any) => ({
                  filename: file.filename || "achievement.pdf",
                  file_path: file.file_path || "/uploads/achievement.pdf",
                  file_size: file.file_size || 1024,
                  upload_timestamp: file.upload_timestamp
                    ? new Date(file.upload_timestamp)
                    : new Date(),
                  content_type: file.content_type || "application/pdf",
                  description: file.description || null,
                }))
              : [],
          }))
        : [],

      education: Array.isArray(payload.education)
        ? payload.education.map((edu: any) => ({
            degree: edu.degree || "B.Sc",
            institution_name: edu.institution_name || "Demo University",
            major: edu.major || "Computer Science",
          }))
        : [],

      certifications: Array.isArray(payload.certifications)
        ? payload.certifications.map((cert: any) => ({
            certification_name: cert.certification_title || "Demo Certificate",
            issuing_organization:
              cert.issuing_organization || "Demo Organization",
            issue_date: cert.certification_issue_date
              ? new Date(cert.certification_issue_date)
              : new Date(),
            expiry_date: cert.certification_expiry_date
              ? new Date(cert.certification_expiry_date)
              : null,
          }))
        : [],

      socialMedia: {
        linkedin_profile_url:
          payload.linkedinProfileUrl ||
          payload.linkedin_profile_url ||
          "https://linkedin.com/in/demo",

        personal_website_url:
          payload.personalWebsiteUrl ||
          payload.personal_website_url ||
          "https://example.com",

        other_social_media:
          payload.otherSocialMedia || payload.other_social_media || "Facebook",

        other_social_media_url:
          payload.otherSocialMediaUrl ||
          payload.other_social_media_url ||
          "https://facebook.com/demo",
      },

      userId,
    };

    return await tx.profile.upsert({
      where: {
        userId: userId,
      },
      create: profileData,
      update: profileData,
    });
  });

  return {
    success: true,
    profile: result,
    message: "Profile created successfully",
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
    `http://31.97.216.98:8000/api/v1/resume/${profileId}/generate-resume`,
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
      `http://31.97.216.98:8000/api/v1/recommendations/user/${profileId}/generate?limit=${jobLimit}&include_reasoning=true`,
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
