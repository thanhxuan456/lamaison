import type { RequestHandler } from "express";
import { getAuth } from "@clerk/express";
import { db, userRolesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// Roles considered "staff" with backend admin access. Adjust here if you ever
// want to give a new role permission to manage chat / users / settings.
export const ADMIN_ROLES = new Set(["superadmin", "admin", "manager", "staff"]);

// Short-lived in-memory role cache so we don't hit the DB on every request.
const roleCache = new Map<string, { role: string; until: number }>();
const CACHE_MS = 30_000;

export function getCachedRole(clerkUserId: string): string | undefined {
  const c = roleCache.get(clerkUserId);
  return c && c.until > Date.now() ? c.role : undefined;
}

export function clearRoleCache(clerkUserId?: string) {
  if (clerkUserId) roleCache.delete(clerkUserId);
  else roleCache.clear();
}

/**
 * Express middleware that allows the request through ONLY if the caller is
 * authenticated with Clerk AND has an admin-level role in `user_roles`.
 *
 * In development (when CLERK_SECRET_KEY is not set), the guard is bypassed so
 * local workflows keep working. In production this is always enforced.
 */
export function requireAdmin(): RequestHandler {
  return async (req, res, next) => {
    try {
      // Dev-mode bypass: only enforce admin auth in production. Local dev (and
      // workspaces without Clerk Secret) keep working without sending tokens.
      if (process.env.NODE_ENV !== "production" || !process.env.CLERK_SECRET_KEY) {
        return next();
      }
      const auth = getAuth(req);
      const userId = auth?.userId;
      if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

      let role = getCachedRole(userId);
      if (!role) {
        const [row] = await db
          .select({ role: userRolesTable.role })
          .from(userRolesTable)
          .where(eq(userRolesTable.clerkUserId, userId));
        role = row?.role;
        if (role) roleCache.set(userId, { role, until: Date.now() + CACHE_MS });
      }
      if (!role || !ADMIN_ROLES.has(role)) {
        res.status(403).json({ error: "Forbidden — admin access required" });
        return;
      }
      (req as unknown as { adminUserId: string; adminRole: string }).adminUserId = userId;
      (req as unknown as { adminUserId: string; adminRole: string }).adminRole = role;
      next();
    } catch (err) {
      req.log?.error({ err }, "requireAdmin failed");
      res.status(500).json({ error: "Auth check failed" });
    }
  };
}
