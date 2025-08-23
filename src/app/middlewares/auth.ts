import config from "../config";
import status from "http-status";
import prisma from "../utils/prisma";
import ApiError from "../errors/ApiError";
import catchAsync from "../utils/catchAsync";
import jwt, { JwtPayload } from "jsonwebtoken";
import { RoleType } from "../../constants/role";

const auth = (...requiredRoles: RoleType[]) => {
  return catchAsync(async (req, _res, next) => {
    // 1. Get token from header
    let token = req.headers.authorization;

    // 2. Check if token exists
    if (!token) {
      throw new ApiError(status.UNAUTHORIZED, "Authorization token is missing");
    }

    // 3. Extract token if Bearer format
    if (token.startsWith("Bearer ")) {
      token = token.split(" ")[1].trim();
    }

    try {
      // 4. Verify token
      const decoded = jwt.verify(
        token,
        config.jwt.access.secret as string
      ) as JwtPayload;

      // 5. Find user in database
      const user = await prisma.user.findUnique({
        where: { email: decoded.email },
        select: {
          id: true,
          role: true,
          isVerified: true,
          roleChangedAt: true,
        },
      });

      if (!user) {
        throw new ApiError(
          status.NOT_FOUND,
          "User not found or unauthorized access"
        );
      }

      // 6. Verify token role matches database role
      if (decoded.role !== user.role) {
        throw new ApiError(status.FORBIDDEN, "Access denied: role mismatch");
      }

      // 6.5. Check if role was changed after token was issued
      if (
        user.roleChangedAt &&
        /* convert both to seconds since epoch */
        Math.floor(user.roleChangedAt.getTime() / 1000) > decoded.iat!
      ) {
        throw new ApiError(
          status.UNAUTHORIZED,
          "Token expired: role was changed after this token was issued"
        );
      }

      // 7. Check if user has required roles
      if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
        throw new ApiError(
          status.FORBIDDEN,
          `Access denied: allowed roles [${requiredRoles.join(
            ", "
          )}], but your role is ${user.role}`
        );
      }

      // 8. Attach user to request
      req.user = {
        id: user.id,
        role: user.role,
        email: decoded.email,
        isVerified: user.isVerified,
      };

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new ApiError(status.UNAUTHORIZED, "Token has expired");
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new ApiError(status.UNAUTHORIZED, "Invalid or malformed token");
      }
      throw error;
    }
  });
};

export default auth;
