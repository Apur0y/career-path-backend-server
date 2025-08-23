import { UserRole } from "@prisma/client";

export const ROLE = {
  SUPER_ADMIN: UserRole.SUPER_ADMIN,
  ADMIN: UserRole.ADMIN,
  EMPLOYEE: UserRole.EMPLOYEE,
  JOB_SEEKER: UserRole.JOB_SEEKER,
} as const;

export type RoleType = UserRole;
