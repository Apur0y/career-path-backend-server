import prisma from "../../utils/prisma";
import { Company, UserRole } from "@prisma/client";
import ApiError from "../../errors/ApiError";
import QueryBuilder from "../../builder/QueryBuilder";

const createCompanyIntoDB = async (userId: string, payload: Company) => {
  const existingCompany = await prisma.company.findUnique({
    where: { userId },
  });

  if (existingCompany) {
    throw new ApiError(
      400,
      "User already has a company associated with their account!"
    );
  }

  // Check user subscription status
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      isSubscribed: true,
      planExpiration: true,
      totalPayPerJobCount: true,
      subscriptionType: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Check if user has active subscription
  if (user.isSubscribed) {
    if (!user.planExpiration || new Date(user.planExpiration) < new Date()) {
      throw new ApiError(
        402,
        "Subscription has expired! Please renew your subscription."
      );
    }
  }
  // Check pay-per-job count if not subscribed
  else if (user.subscriptionType === "payPerJob") {
    if (user.totalPayPerJobCount <= 0) {
      throw new ApiError(
        402,
        "No pay-per-job credits available! Please add credits to your account."
      );
    }
  }
  // No subscription and not pay-per-job
  else {
    throw new ApiError(402, "Subscription or pay-per-job credits required");
  }

  // Create the company
  const company = await prisma.company.create({
    data: {
      ...payload,
      userId,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      companyName: payload.companyName,
    },
  });

  return company;
};

const getAllCompaniesFromDB = async (query: Record<string, unknown>) => {
  const companyQuery = new QueryBuilder(prisma.company, query)
    .search(["companyName", "industryType"])
    .paginate();

  const [result, meta] = await Promise.all([
    companyQuery.execute(),
    companyQuery.countTotal(),
  ]);

  if (!result.length) {
    throw new ApiError(404, "No companies found!");
  }

  const data = result.map((company: Company) => {
    return company;
  });

  return {
    meta,
    data,
  };
};

const getSingleCompanyByIdFromDB = async (companyId: string) => {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          fullName: true,
          profilePic: true,
          role: true,
          planId: true,
        },
      },
      JobPost: {
        select: {
          id: true,
          title: true,
          experience: true,
          deadline: true,
          status: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      },
    },
  });

  if (!company) {
    throw new ApiError(404, "Company not found!");
  }

  return company;
};

const getMyCompanyFromDB = async (userId: string) => {
  const company = await prisma.company.findUnique({
    where: {
      userId,
      user: {
        role: UserRole.EMPLOYEE,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          fullName: true,
          profilePic: true,
          role: true,
        },
      },
      JobPost: {
        select: {
          id: true,
          title: true,
          experience: true,
          deadline: true,
          status: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      },
    },
  });

  if (!company) {
    throw new ApiError(
      404,
      "No company found or you don't have employee privileges"
    );
  }

  return company;
};

const updateCompanyInToDB = async (
  userId: string,
  payload: Partial<Company>
) => {
  // First check if the user has a company
  const existingCompany = await prisma.company.findUnique({
    where: { userId },
  });

  if (!existingCompany) {
    throw new ApiError(404, "No company found for this user");
  }

  // Prevent changing the userId or email if provided in payload
  if (payload.userId) {
    throw new ApiError(400, "Cannot change company ownership");
  }

  if (payload.email) {
    // Check if the new email is already taken by another company
    const companyWithSameEmail = await prisma.company.findFirst({
      where: {
        email: payload.email,
        id: { not: existingCompany.id },
      },
    });

    if (companyWithSameEmail) {
      throw new ApiError(400, "Email is already in use by another company");
    }
  }

  if (existingCompany.logo && !payload.logo) {
    payload.logo = existingCompany.logo;
  }

  // Update the company
  const updatedCompany = await prisma.company.update({
    where: { userId },
    data: payload,
  });

  if (payload.companyName) {
    await prisma.user.update({
      where: { id: userId },
      data: { companyName: payload.companyName },
    });
  }

  return updatedCompany;
};

const getAllCompaniesNameFromDB = async () => {
  // Get all companies and count job posts for each
  const companies = await prisma.company.findMany({
    select: {
      id: true,
      companyName: true,
      JobPost: { select: { id: true } },
    },
    orderBy: {
      companyName: "asc",
    },
  });

  if (!companies.length) {
    throw new ApiError(404, "No companies found!");
  }

  // Map to include job post count
  return companies.map((company) => ({
    // id: company.id,
    companyName: company.companyName,
    length: company.JobPost.length,
  }));
};

export const CompanyService = {
  getMyCompanyFromDB,
  createCompanyIntoDB,
  updateCompanyInToDB,
  getAllCompaniesFromDB,
  getSingleCompanyByIdFromDB,
  getAllCompaniesNameFromDB,
};
