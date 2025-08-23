import prisma from "../utils/prisma";
import ApiError from "../errors/ApiError";

export const generateJobId = async (): Promise<string> => {
  let jobId: string;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 5;

  while (!isUnique && attempts < maxAttempts) {
    // Generate random 5-digit number (10000-99999)
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    jobId = `SJ${randomNum}`;

    // Check if this jobId already exists
    const existingJob = await prisma.jobPost.findUnique({
      where: { jobId },
    });

    if (!existingJob) {
      isUnique = true;
    }

    attempts++;
  }

  if (!isUnique) {
    throw new ApiError(
      404,
      "Failed to generate unique job ID after multiple attempts"
    );
  }

  return jobId!;
};
