import jwt from "jsonwebtoken";

const accessSecret = process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me";
const refreshSecret = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me";
const accessTtl = process.env.ACCESS_TOKEN_TTL || "15m";
const refreshTtl = process.env.REFRESH_TOKEN_TTL || "7d";

export function issueAccessToken(user) {
  return jwt.sign({ sub: user.id, type: "access" }, accessSecret, { expiresIn: accessTtl });
}

export function issueRefreshToken(user) {
  return jwt.sign({ sub: user.id, type: "refresh" }, refreshSecret, { expiresIn: refreshTtl });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, accessSecret, { algorithms: ["HS256"] });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, refreshSecret, { algorithms: ["HS256"] });
}
