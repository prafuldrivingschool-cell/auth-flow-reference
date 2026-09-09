import { Router } from "express";
import { findUserByEmail, publicUser } from "../models/user.js";
import { authenticate } from "../middleware/authenticate.js";
import {
  issueAccessToken,
  issueRefreshToken,
  verifyRefreshToken
} from "../services/tokenService.js";

const router = Router();

router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email_and_password_required" });

  const user = findUserByEmail(email);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  return res.json({
    user: publicUser(user),
    accessToken: issueAccessToken(user),
    refreshToken: issueRefreshToken(user)
  });
});

router.post("/refresh", (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ error: "refresh_token_required" });

  try {
    const payload = verifyRefreshToken(refreshToken);
    if (payload.type !== "refresh") throw new Error("wrong_token_type");
    const user = findUserByEmail("demo@example.com");
    if (!user || user.id !== payload.sub) return res.status(401).json({ error: "user_not_found" });

    return res.json({
      accessToken: issueAccessToken(user),
      refreshToken: issueRefreshToken(user)
    });
  } catch {
    return res.status(401).json({ error: "invalid_or_expired_refresh_token" });
  }
});

router.get("/me", authenticate, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export default router;
