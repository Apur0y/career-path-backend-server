import status from "http-status";
import config from "../../config";
import { AuthService } from "./auth.service";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import ApiError from "../../errors/ApiError";
import { verifyToken } from "../../utils/verifyToken";

const verifyEmail = catchAsync(async (req, res) => {
  const { token } = req.query;

  await AuthService.verifyEmail(token as string);

  res.redirect(`${config.url.frontend}/signIn`);

  sendResponse(res, {
    statusCode: status.OK,
    message: "Your Account verified successfully!",
  });
});

const verifyResetPassLink = catchAsync(async (req, res) => {
  const { token } = req.query;

  await AuthService.verifyResetPassLink(token as string);

  res.redirect(`${config.url.frontend}/reset-password`);

  sendResponse(res, {
    statusCode: status.OK,
    message:
      "Your Reset Password link verified successfully! Please reset your password.",
  });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const result = await AuthService.loginUser(email, password, req);

  const { accessToken, refreshToken } = result;

  // ✅ SET BOTH TOKENS as HTTP-only cookies
  res.cookie("accessToken", accessToken, {
    httpOnly: false,
    secure: false,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: false,
    secure: false,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });

  console.log("🍪 Both access and refresh tokens set as HTTP-only cookies");

  sendResponse(res, {
    statusCode: status.OK,
    message: "User logged in successfully!",
    data: {
      accessToken,
    },
  });
});

const changePassword = catchAsync(async (req, res) => {
  const email = req.user?.email as string;

  const { currentPassword, newPassword, confirmPassword } = req.body;

  await AuthService.changePassword(
    email,
    currentPassword,
    newPassword,
    confirmPassword
  );

  sendResponse(res, {
    statusCode: status.OK,
    message: "User password changed successfully!",
  });
});

const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;
  const result = await AuthService.forgotPassword(email);

  sendResponse(res, {
    statusCode: status.OK,
    message: result.message,
  });
});

const resetPassword = catchAsync(async (req, res) => {
  const { email, newPassword, confirmPassword } = req.body;

  const result = await AuthService.resetPassword(
    email,
    newPassword,
    confirmPassword
  );

  sendResponse(res, {
    statusCode: status.OK,
    message: result.message,
  });
});

const resendVerificationLink = catchAsync(async (req, res) => {
  const { email } = req.body;

  const result = await AuthService.resendVerificationLink(email);

  sendResponse(res, {
    statusCode: status.OK,
    message: result.message,
  });
});

const resendResetPassLink = catchAsync(async (req, res) => {
  const { email } = req.body;

  const result = await AuthService.resendResetPassLink(email);

  sendResponse(res, {
    statusCode: status.OK,
    message: result.message,
  });
});

const getMe = catchAsync(async (req, res) => {
  const email = req.user?.email as string;

  const result = await AuthService.getMe(email);

  sendResponse(res, {
    statusCode: status.OK,
    message: "User fetched successfully!",
    data: result,
  });
});

const validateSession = catchAsync(async (req, res) => {
  const { accessToken } = req.cookies;

  if (!accessToken) {
    throw new ApiError(status.UNAUTHORIZED, "No active session found");
  }

  // Verify the access token from HTTP-only cookie
  try {
    const decoded = verifyToken(
      accessToken,
      config.jwt.access.secret as string
    );
    const user = await AuthService.getMe(decoded.email);

    sendResponse(res, {
      statusCode: status.OK,
      message: "Session validated successfully!",
      data: {
        user,
        accessToken,
      },
    });
  } catch (error) {
    throw new ApiError(status.UNAUTHORIZED, "Invalid session");
  }
});

const refreshToken = catchAsync(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    throw new ApiError(
      status.UNAUTHORIZED,
      "Refresh token not found in cookies"
    );
  }

  const result = await AuthService.refreshToken(refreshToken);
  const { accessToken, refreshToken: newRefreshToken } = result;

  // ✅ SET BOTH NEW TOKENS as HTTP-only cookies
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/", // Ensure cookie is available across the domain
    // ✅ Removed domain restriction for VPS deployment
  });

  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none", // Required for cross-origin requests (VPS deployment)
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days (matches JWT refresh token expiry)
    path: "/", // Ensure cookie is available across the domain
    // ✅ Removed domain restriction for VPS deployment
  });

  console.log("🍪 Both new access and refresh tokens set in HTTP-only cookies");

  sendResponse(res, {
    statusCode: status.OK,
    message: "Access token is retrieved successfully!",
    data: { accessToken },
  });
});

const googleLogin = catchAsync(async (req, res) => {
  const { googleToken } = req.body;

  const result = await AuthService.googleLogin(googleToken, req);

  const { accessToken, refreshToken } = result;

  // ✅ SET BOTH TOKENS as HTTP-only cookies for Google login
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });

  console.log(
    "🍪 Both access and refresh tokens set as HTTP-only cookies (Google login)"
  );

  sendResponse(res, {
    statusCode: status.OK,
    message: "User logged in with Google successfully!",
    data: {
      accessToken,
      refreshToken,
    },
  });
});

export const AuthController = {
  login,
  getMe,
  verifyEmail,
  googleLogin,
  refreshToken,
  resetPassword,
  forgotPassword,
  changePassword,
  verifyResetPassLink,
  resendResetPassLink,
  resendVerificationLink,
  validateSession,
};
