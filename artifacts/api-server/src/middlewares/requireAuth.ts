import type { RequestHandler } from "express";
import { getAuth } from "@clerk/express";

/**
 * Yeu cau user da dang nhap qua Clerk (KHONG can role admin).
 * Dung cho cac endpoint /api/me/* — moi user da signed-in deu duoc goi cho chinh minh.
 *
 * Trong dev (NODE_ENV != production hoac thieu CLERK_SECRET_KEY) van bypass de
 * dev local khong can token.
 */
// Dev bypass CHI duoc bat khi: NODE_ENV != production VA AUTH_DEV_BYPASS=true (explicit opt-in).
// Dieu nay tranh viec deploy len staging publicly accessible bi mao danh user qua header.
const DEV_BYPASS = process.env.NODE_ENV !== "production" && process.env.AUTH_DEV_BYPASS === "true";

export function requireAuth(): RequestHandler {
  return (req, res, next) => {
    try {
      if (DEV_BYPASS) {
        (req as unknown as { authUserId: string }).authUserId =
          (req.header("x-dev-clerk-user-id") || "dev-user").toString();
        return next();
      }
      const auth = getAuth(req);
      const userId = auth?.userId;
      if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
      (req as unknown as { authUserId: string }).authUserId = userId;
      next();
    } catch (err) {
      req.log?.error({ err }, "requireAuth failed");
      res.status(500).json({ error: "Auth check failed" });
    }
  };
}
