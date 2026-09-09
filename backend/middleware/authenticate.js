import { verifyAccessToken } from "../services/tokenService.js";
import { findUserById } from "../models/user.js";

export function authenticate(req, res, next) {
  const header = req.get("authorization") || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "missing_bearer_token" });
  }

  try {
    const payload = verifyAccessToken(token);
    if (payload.type !== "access") throw new Error("wrong_token_type");

    const user = findUserById(payload.sub);
    if (!user) return res.status(401).json({ error: "user_not_found" });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "invalid_or_expired_access_token" });
  }
}
