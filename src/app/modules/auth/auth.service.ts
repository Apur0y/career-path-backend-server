import crypto from "crypto";
import status from "http-status";
import config from "../../config";
import { Request } from "express";
import { User, UserRole } from "@prisma/client";
import prisma from "../../utils/prisma";
import { createToken } from "./auth.utils";
import ApiError from "../../errors/ApiError";
import { UserStatus } from "@prisma/client";
import { hashPassword } from "../user/user.utils";
import { RefreshPayload } from "./auth.interface";
import { sendEmail } from "../../utils/sendEmail";
import { OAuth2Client } from "google-auth-library";
import { verifyToken } from "../../utils/verifyToken";
import { passwordCompare } from "../../utils/comparePasswords";

const loginUser = async (email: string, password: string, req: Request) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ApiError(status.NOT_FOUND, "User not found!");
  }

  if (user.status === UserStatus.DELETED) {
    throw new ApiError(
      status.UNAUTHORIZED,
      "User cannot login! User is deleted!"
    );
  }

  if (user.status === UserStatus.SUSPENDED) {
    throw new ApiError(
      status.UNAUTHORIZED,
      "User cannot login! User is suspended!"
    );
  }

  const isPasswordMatched = await passwordCompare(password, user.password);

  if (!isPasswordMatched) {
    throw new ApiError(status.UNAUTHORIZED, "Password is incorrect!");
  }

  const jwtPayload = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName!,
    email: user.email,
    profilePic: user.profilePic,
    role: user.role,
    isVerified: user.isVerified,
  };

  // Check if user is not active
  if (!user.isVerified) {
    const accessToken = createToken(
      jwtPayload,
      config.jwt.access.secret as string,
      config.jwt.resetPassword.expiresIn as string
    );

    const confirmedLink = `${config.verify.email}?token=${accessToken}`;

    await sendEmail(user.email, undefined, confirmedLink);

    throw new ApiError(
      status.UNAUTHORIZED,
      "User is not verified! We have sent a confirmation email to your email address. Please check your inbox."
    );
  }

  const accessToken = createToken(
    jwtPayload,
    config.jwt.access.secret as string,
    config.jwt.access.expiresIn as string
  );

  const refreshToken = createToken(
    jwtPayload,
    config.jwt.refresh.secret as string,
    config.jwt.refresh.expiresIn as string
  );

  await recordLogin(user, req);

  return {
    accessToken,
    refreshToken,
  };
};

const recordLogin = async (user: User, req: Request) => {
  try {
    await prisma.loginRecord.create({
      data: {
        userId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"] || "",
      },
    });
  } catch (error) {
    console.error("Failed to record login:", error);
  }
};

const verifyEmail = async (token: string) => {
  const verifiedToken = verifyToken(token);

  const user = await prisma.user.findUnique({
    where: { email: verifiedToken.email },
  });

  if (!user) {
    throw new ApiError(status.NOT_FOUND, "User not found!");
  }

  if (user.isVerified) {
    throw new ApiError(status.BAD_REQUEST, "User already verified!");
  }

  await prisma.user.update({
    where: {
      email: verifiedToken.email,
    },
    data: {
      isVerified: true,
    },
  });

  return null;
};

const verifyResetPassLink = async (token: string) => {
  const verifiedToken = verifyToken(token);

  const user = await prisma.user.findUnique({
    where: { email: verifiedToken.email },
  });

  if (!user) {
    throw new ApiError(status.NOT_FOUND, "User not found!");
  }

  await prisma.user.update({
    where: { email: verifiedToken.email },
    data: {
      isResetPassword: false,
      canResetPassword: true,
    },
  });

  return null;
};

const changePassword = async (
  email: string,
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ApiError(status.NOT_FOUND, "User not found!");
  }

  if (!newPassword) {
    throw new ApiError(status.BAD_REQUEST, "New password is required!");
  }

  if (!confirmPassword) {
    throw new ApiError(status.BAD_REQUEST, "Confirm password is required!");
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(
      status.BAD_REQUEST,
      "New password and confirm password do not match!"
    );
  }

  const isPasswordMatch = await passwordCompare(currentPassword, user.password);

  if (!isPasswordMatch) {
    throw new ApiError(status.UNAUTHORIZED, "Current password is incorrect!");
  }

  const hashedNewPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { email },
    data: {
      password: hashedNewPassword,
      passwordChangedAt: new Date(),
    },
  });

  return null;
};

const forgotPassword = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new ApiError(status.NOT_FOUND, "User not found!");
  }

  if (!user.isVerified) {
    throw new ApiError(status.UNAUTHORIZED, "User account is not verified!");
  }

  if (user.status === UserStatus.DELETED) {
    throw new ApiError(
      status.UNAUTHORIZED,
      "User cannot reset password! User is deleted!"
    );
  }

  if (user.status === UserStatus.SUSPENDED) {
    throw new ApiError(
      status.UNAUTHORIZED,
      "User cannot reset password! User is suspended!"
    );
  }

  // Step 2: Save OTP in DB
  await prisma.user.update({
    where: { email },
    data: {
      isResetPassword: true,
      canResetPassword: false,
    },
  });

  const jwtPayload = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName!,
    email: user.email,
    profilePic: user.profilePic,
    role: user.role,
    isVerified: user.isVerified,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt.access.secret as string,
    config.jwt.access.expiresIn as string
  );

  const resetPassLink = `${config.verify.resetPassLink}?token=${accessToken}`;

  await sendEmail(user.email, resetPassLink);

  // Step 4: Return response
  return {
    message:
      "We have sent a Reset Password link to your email address. Please check your inbox.",
  };
};

const resetPassword = async (
  email: string,
  newPassword: string,
  confirmPassword: string
) => {
  if (newPassword !== confirmPassword) {
    throw new ApiError(status.BAD_REQUEST, "Passwords do not match!");
  }

  const user = await prisma.user.findUnique({
    where: { email: email },
  });

  if (!user) {
    throw new ApiError(status.NOT_FOUND, "User not found!");
  }

  if (!user.canResetPassword) {
    throw new ApiError(
      status.BAD_REQUEST,
      "User is not eligible for password reset!"
    );
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { email: email },
    data: {
      password: hashedPassword,
      isResetPassword: false,
      canResetPassword: false,
    },
  });

  return {
    message: "Password reset successfully!",
  };
};

const resendVerificationLink = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new ApiError(status.NOT_FOUND, "User not found!");
  }

  if (user.isVerified) {
    throw new ApiError(status.BAD_REQUEST, "User account already verified!");
  }

  const jwtPayload = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName!,
    email: user.email,
    profilePic: user.profilePic,
    role: user.role,
    isVerified: user.isVerified,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt.access.secret as string,
    config.jwt.access.expiresIn as string
  );

  const confirmedLink = `${config.verify.email}?token=${accessToken}`;

  await sendEmail(user.email, undefined, confirmedLink);

  return {
    message:
      "New verification link has been sent to your email. Please check your inbox.",
  };
};

const resendResetPassLink = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new ApiError(status.NOT_FOUND, "User not found!");
  }

  const jwtPayload = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName!,
    email: user.email,
    profilePic: user.profilePic,
    role: user.role,
    isVerified: user.isVerified,
  };

  await prisma.user.update({
    where: { email: user.email },
    data: {
      isResetPassword: true,
    },
  });

  const accessToken = createToken(
    jwtPayload,
    config.jwt.access.secret as string,
    config.jwt.access.expiresIn as string
  );

  const resetPassLink = `${config.verify.resetPassLink}?token=${accessToken}`;

  await sendEmail(user.email, resetPassLink);

  return {
    message:
      "New Reset Password link has been sent to your email. Please check your inbox.",
  };
};

const googleLogin = async (googleToken: string, req: Request) => {
  const client = new OAuth2Client();

  let ticket;

  try {
    ticket = await client.verifyIdToken({
      idToken: googleToken,
      audience: config.google.clientId,
    });
  } catch (err) {
    throw new ApiError(status.UNAUTHORIZED, "Invalid Google token");
  }

  const payload = ticket.getPayload();

  if (!payload || !payload.email) {
    throw new ApiError(status.UNAUTHORIZED, "Google account email not found");
  }

  let user = await prisma.user.findUnique({ where: { email: payload.email } });

  const createdPassword = crypto.randomBytes(6).toString("hex");

  const hashedNewPassword = await hashPassword(createdPassword);

  if (!user) {
    // Create user if not exists (customize fields as needed)
    user = await prisma.user.create({
      data: {
        email: payload.email,
        firstName: payload.given_name || "",
        lastName: payload.family_name || "",
        fullName: `${payload.given_name} ${payload.family_name}` || "",
        profilePic: payload.picture || "",
        isVerified: true,
        role: UserRole.JOB_SEEKER,
        password: hashedNewPassword,
      },
    });
  }

  const jwtPayload = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName!,
    email: user.email,
    profilePic: user.profilePic,
    role: user.role,
    isVerified: user.isVerified,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt.access.secret as string,
    config.jwt.access.expiresIn as string
  );

  const refreshToken = createToken(
    jwtPayload,
    config.jwt.refresh.secret as string,
    config.jwt.refresh.expiresIn as string
  );

  await recordLogin(user, req);

  return {
    accessToken,
    refreshToken,
  };
};

const getMe = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ApiError(status.NOT_FOUND, "User not found");
  }

  if (user.status === UserStatus.DELETED) {
    throw new ApiError(status.UNAUTHORIZED, "User is deleted");
  }

  if (user.status === UserStatus.SUSPENDED) {
    throw new ApiError(status.UNAUTHORIZED, "User is suspended!");
  }

  const result = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      fullName: true,
      email: true,
      phone: true,
      profilePic: true,
      role: true,
      isVerified: true,
      isSubscribed: true,
      companyName: true,
      joiningDate: true,
      status: true,
      planExpiration: true,
      subscriptionType: true,
      planId: true,
      totalPayPerJobCount: true,
      city: true,
      zipCode: true,
      address: true,
    },
  });

  return result;
};

export const refreshToken = async (token: string) => {
  const decoded = verifyToken(
    token,
    config.jwt.refresh.secret as string
  ) as RefreshPayload;

  const { email, iat } = decoded;

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      fullName: true,
      email: true,
      role: true,
      profilePic: true,
      isVerified: true,
      passwordChangedAt: true,
      roleChangedAt: true,
    },
  });

  if (!user) {
    throw new ApiError(status.NOT_FOUND, "User not found");
  }

  /* Reject if password changed after token was issued */
  if (
    user.passwordChangedAt &&
    /* convert both to seconds since epoch */
    Math.floor(user.passwordChangedAt.getTime() / 1000) > iat
  ) {
    throw new ApiError(
      status.UNAUTHORIZED,
      "Password was changed after this token was issued"
    );
  }

  /* Reject if role changed after token was issued */
  // if (
  //   user.roleChangedAt &&
  //   /* convert both to seconds since epoch */
  //   Math.floor(user.roleChangedAt.getTime() / 1000) > iat
  // ) {
  //   throw new ApiError(
  //     status.UNAUTHORIZED,
  //     "Role was changed after this token was issued"
  //   );
  // }

  const jwtPayload = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName!,
    email: user.email,
    role: user.role,
    profilePic: user?.profilePic,
    isVerified: user.isVerified,
  };

  // ✅ FIX: Use ACCESS token config, not REFRESH token config
  const accessToken = createToken(
    jwtPayload,
    config.jwt.access.secret as string,
    config.jwt.access.expiresIn as string
  );

  // ✅ GENERATE NEW REFRESH TOKEN to extend session
  const newRefreshToken = createToken(
    jwtPayload,
    config.jwt.refresh.secret as string,
    config.jwt.refresh.expiresIn as string
  );

  console.log("🔄 Generated new tokens during refresh");
  console.log("✅ New Access Token:", accessToken.substring(0, 50) + "...");
  console.log(
    "✅ New Refresh Token:",
    newRefreshToken.substring(0, 50) + "..."
  );

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
};

export const AuthService = {
  getMe,
  loginUser,
  verifyEmail,
  refreshToken,
  googleLogin,
  resetPassword,
  changePassword,
  forgotPassword,
  verifyResetPassLink,
  resendResetPassLink,
  resendVerificationLink,
};
