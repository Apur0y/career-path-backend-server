import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import config from "../config";

const verifyToken = (token: string) => {
  return jwt.verify(token, config.jwt.access.secret!) as JwtPayload;
};

export const jwtHelpers = {
  verifyToken,
};
