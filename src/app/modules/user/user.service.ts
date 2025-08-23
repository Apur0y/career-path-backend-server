import status from "http-status";
import config from "../../config";
import prisma from "../../utils/prisma";
import { hashPassword } from "./user.utils";
import ApiError from "../../errors/ApiError";
import { createToken } from "../auth/auth.utils";
import { sendEmail } from "../../utils/sendEmail";
import QueryBuilder from "../../builder/QueryBuilder";
import {
  User,
  UserRole,
  UserStatus,
  SubscriptionType,
  PaymentStatus,
} from "@prisma/client";

const createUserIntoDB = async (payload: User) => {
  // Check if user exists by email
  const isUserExistByEmail = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (isUserExistByEmail) {
    throw new ApiError(
      status.BAD_REQUEST,
      `User with this email: ${payload.email} already exists!`
    );
  }

  const hashedPassword = await hashPassword(payload.password);

  const userData = {
    ...payload,
    fullName: `${payload.firstName} ${payload.lastName}`,
    password: hashedPassword,
    role: UserRole.JOB_SEEKER,
    isVerified: false,
    isSubscribed: true,
    subscriptionType: SubscriptionType.monthly,
    planId: "6887696a4d0192c4db3d1f0a",
  };

  const jwtPayload = {
    firstName: payload.firstName,
    lastName: payload.lastName,
    fullName: `${payload.firstName} ${payload.lastName}`,
    email: payload.email,
    role: UserRole.JOB_SEEKER,
    profilePic: payload?.profilePic || "",
    isVerified: false,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt.access.secret as string,
    config.jwt.resetPassword.expiresIn as string
  );

  const confirmedLink = `${config.verify.email}?token=${accessToken}`;

  // Use transaction to ensure both user and subscription are created together
  await prisma.$transaction(async (tx) => {
    try {
      // Create the user
      const user = await tx.user.create({ data: userData });

      // Create the subscription for the free plan
      await tx.subscription.create({
        data: {
          userId: user.id,
          planId: "6887696a4d0192c4db3d1f0a",
          stripePaymentId: `free-plan-${Date.now()}`,
          startDate: new Date(),
          amount: 0,
          paymentStatus: PaymentStatus.COMPLETED,
          endDate: null,
        },
      });

      return user;
    } catch (error) {
      throw new ApiError(
        status.INTERNAL_SERVER_ERROR,
        `Failed to create user and subscription: ${error}`
      );
    }
  });

  await sendEmail(payload.email, undefined, confirmedLink);

  return {
    message:
      "We have sent a confirmation email to your email address. Please check your inbox.",
  };
};

const getAllUserFromDB = async (query: Record<string, unknown>) => {
  const userQuery = new QueryBuilder(prisma.user, query)
    .search(["fullName", "email"])
    .filter()
    .select([
      "id",
      "email",
      "fullName",
      "profilePic",
      "role",
      "isSubscribed",
      "companyName",
      "joiningDate",
      "planExpiration",
      "subscriptionType",
      "planId",
      "totalPayPerJobCount",
      "isVerified",
      "createdAt",
      "updatedAt",
    ])
    .paginate();

  const [result, meta] = await Promise.all([
    userQuery.execute(),
    userQuery.countTotal(),
  ]);

  if (!result.length) {
    throw new ApiError(status.NOT_FOUND, "No users found!");
  }

  // Remove password from each user
  const data = result.map((user: User) => {
    const { password, ...rest } = user;
    return rest;
  });

  return {
    meta,
    data,
  };
};

const updateUserIntoDB = async (userId: string, payload: Partial<User>) => {
  const isUserExist = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!isUserExist) {
    throw new ApiError(status.NOT_FOUND, "User not found!");
  }

  if (!payload.profilePic && isUserExist.profilePic) {
    payload.profilePic = isUserExist.profilePic;
  }

  if (payload.firstName && !payload.lastName) {
    payload.fullName = `${payload.firstName} ${isUserExist.lastName}`;
  }

  if (payload.lastName && !payload.firstName) {
    payload.fullName = `${isUserExist.firstName} ${payload.lastName}`;
  }

  if (payload.firstName && payload.lastName) {
    payload.fullName = `${payload.firstName} ${payload.lastName}`;
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      firstName: payload.firstName,
      lastName: payload.lastName,
      fullName: payload.fullName,
      profilePic: payload.profilePic || "",
      phone: payload.phone,
    },
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
      planId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

const getSingleUserByIdFromDB = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(status.NOT_FOUND, "User not found!");
  }

  const { password, ...rest } = user;

  return rest;
};

const deleteUserFromDB = async (userId: string) => {
  const isUserExist = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!isUserExist) {
    throw new ApiError(status.NOT_FOUND, "User not found!");
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  return null;
};

const makeAdminIntoDB = async (email: string) => {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      isVerified: true,
      planId: true,
    },
  });

  if (!user) {
    throw new ApiError(status.NOT_FOUND, "User not found!");
  }

  // Check if user is already an admin
  if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
    throw new ApiError(status.BAD_REQUEST, `User is already an ${user.role}!`);
  }

  // Update user role to ADMIN
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      role: UserRole.ADMIN,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      fullName: true,
      email: true,
      profilePic: true,
      role: true,
      isVerified: true,
      planId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

const updateContactInfoIntoDB = async (
  userId: string,
  userRole: UserRole,
  payload: {
    address?: string;
    city?: string;
    zipCode?: string;
    preferredContactMethod?: string;
    email?: string;
    phone?: string;
  }
) => {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      email: true,
    },
  });

  if (!user) {
    throw new ApiError(status.NOT_FOUND, "User not found!");
  }

  // Only ADMIN and SUPER_ADMIN can update contact info
  if (userRole !== UserRole.ADMIN && userRole !== UserRole.SUPER_ADMIN) {
    throw new ApiError(
      status.FORBIDDEN,
      "Only admin and super admin can update contact information"
    );
  }

  // Check if email is being updated and if it's already taken by another user
  if (payload.email && payload.email !== user.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (existingUser) {
      throw new ApiError(
        status.BAD_REQUEST,
        "Email is already taken by another user"
      );
    }
  }

  // Update contact information
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      address: payload.address,
      city: payload.city,
      zipCode: payload.zipCode,
      preferredContactMethod: payload.preferredContactMethod as any,
      email: payload.email,
      phone: payload.phone,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      fullName: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      zipCode: true,
      preferredContactMethod: true,
      profilePic: true,
      role: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

const suspendUserStatusFromDB = async (userId: string) => {
  // Find the user in the database by their ID
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.status === UserStatus.DELETED) {
    throw new ApiError(400, "User status is already 'DELETED', cannot suspend");
  }

  // Update user status to suspended
  return await prisma.user.update({
    where: { id: userId },
    data: {
      status: "SUSPENDED",
    },
  });
};

// Delete a user: This action will permanently delete the user
const deleteUserStatusFromDB = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Update user status to DELETED instead of deleting
  return await prisma.user.update({
    where: { id: userId },
    data: {
      status: UserStatus.DELETED,
    },
  });
};

const updateUserByAdminIntoDB = async (
  userId: string,
  adminId: string,
  payload: Partial<User>
) => {
  // Check if the user to be updated exists
  const isUserExist = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!isUserExist) {
    throw new ApiError(status.NOT_FOUND, "User not found!");
  }

  // Check if the admin exists and has proper role
  const admin = await prisma.user.findUnique({
    where: { id: adminId },
  });

  if (!admin) {
    throw new ApiError(status.NOT_FOUND, "Admin not found!");
  }

  // Handle profile picture
  if (!payload.profilePic && isUserExist.profilePic) {
    payload.profilePic = isUserExist.profilePic;
  }

  // Handle full name construction
  if (payload.firstName && !payload.lastName) {
    payload.fullName = `${payload.firstName} ${isUserExist.lastName}`;
  }

  if (payload.lastName && !payload.firstName) {
    payload.fullName = `${isUserExist.firstName} ${payload.lastName}`;
  }

  if (payload.firstName && payload.lastName) {
    payload.fullName = `${payload.firstName} ${payload.lastName}`;
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      firstName: payload.firstName,
      lastName: payload.lastName,
      fullName: payload.fullName,
      profilePic: payload.profilePic || "",
      phone: payload.phone,
    },
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
      planId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

const removeUserFromDB = async (userId: string, adminId: string) => {
  // Check if the user to be removed exists
  const userToRemove = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!userToRemove) {
    throw new ApiError(status.NOT_FOUND, "User not found!");
  }

  // Check if the admin exists and has proper role
  const admin = await prisma.user.findUnique({
    where: { id: adminId },
  });

  if (!admin) {
    throw new ApiError(status.NOT_FOUND, "Admin not found!");
  }

  if (admin.role !== UserRole.ADMIN && admin.role !== UserRole.SUPER_ADMIN) {
    throw new ApiError(
      status.FORBIDDEN,
      "You don't have permission to remove users!"
    );
  }

  // Prevent admin from removing themselves
  if (userId === adminId) {
    throw new ApiError(status.BAD_REQUEST, "You cannot remove yourself!");
  }

  // Prevent removing super admin (only super admin can remove super admin)
  if (
    userToRemove.role === UserRole.SUPER_ADMIN &&
    admin.role !== UserRole.SUPER_ADMIN
  ) {
    throw new ApiError(
      status.FORBIDDEN,
      "Only super admin can remove super admin users!"
    );
  }

  // Use transaction to ensure data consistency
  return await prisma.$transaction(async (tx) => {
    // Delete related records first (if any)
    // Note: You may need to add more related deletions based on your schema

    // Delete user's subscriptions
    await tx.subscription.deleteMany({
      where: { userId: userId },
    });

    // Delete user's job applications
    await tx.jobApplication.deleteMany({
      where: { jobSeekerId: userId },
    });

    // Delete user's saved jobs
    await tx.savedJob.deleteMany({
      where: { userId: userId },
    });

    // Delete user's chat rooms (where they are the creator)
    await tx.chatRoom.deleteMany({
      where: { createdBy: userId },
    });

    // Delete user's chats (messages sent by them)
    await tx.chat.deleteMany({
      where: { senderId: userId },
    });

    // Delete user's billing info
    await tx.billingInfo.deleteMany({
      where: { userId: userId },
    });

    // Delete user's company (if they have one)
    await tx.company.deleteMany({
      where: { userId: userId },
    });

    // Delete user's job posts
    await tx.jobPost.deleteMany({
      where: { userId: userId },
    });

    // Finally, delete the user
    await tx.user.delete({
      where: { id: userId },
    });

    return {
      message: `User ${userToRemove.email} has been permanently removed from the database.`,
      removedUser: {
        id: userToRemove.id,
        email: userToRemove.email,
        fullName: userToRemove.fullName,
        role: userToRemove.role,
      },
    };
  });
};

export const UserService = {
  makeAdminIntoDB,
  createUserIntoDB,
  getAllUserFromDB,
  updateUserIntoDB,
  updateUserByAdminIntoDB,
  deleteUserFromDB,
  removeUserFromDB,
  getSingleUserByIdFromDB,
  updateContactInfoIntoDB,
  suspendUserStatusFromDB,
  deleteUserStatusFromDB,
};
