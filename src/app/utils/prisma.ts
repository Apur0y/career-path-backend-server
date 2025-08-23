import { PrismaClient } from "@prisma/client";
// import { initiateSuperAdmin } from "../app/db/db";

const prisma = new PrismaClient();

// Handle connection issues
const connectPrisma = async () => {
  try {
    await prisma.$connect();

    // initiate super admin
    // initiateSuperAdmin();
  } catch (error) {
    console.error("Prisma connection failed:", error);
    process.exit(1); // Exit process with failure
  }

  // Graceful shutdown
  process.on("SIGINT", async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

connectPrisma();

export default prisma;
