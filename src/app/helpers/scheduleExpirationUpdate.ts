import prisma from "../utils/prisma";
import { scheduleJob } from "node-schedule";

const scheduleExpirationUpdate = (jobId: string, expirationDate: Date) => {
  // Schedule a one-time job for the expiration date
  scheduleJob(expirationDate, async () => {
    try {
      await prisma.jobPost.update({
        where: { id: jobId },
        data: { status: "EXPIRED" },
      });
      console.log(`Job ${jobId} status updated to Expired.`);
    } catch (err) {
      console.error(`Failed to update job ${jobId} status:`, err);
    }
  });
};

export default scheduleExpirationUpdate;
