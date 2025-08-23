import ApiError from "../../errors/ApiError";
import prisma from "../../utils/prisma";

const subscribe = async (email: string) => {
  const existing = await prisma.newsletterSubscriber.findUnique({
    where: { email },
  });

  if (existing) {
    throw new ApiError(400, "Email already exists!");
  }

  const created = await prisma.newsletterSubscriber.create({
    data: { email },
  });

  return created;
};

export const NewsletterService = {
  subscribe,
};
