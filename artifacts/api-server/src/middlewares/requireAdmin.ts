import type { RequestHandler, Request } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { db, userRolesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// Roles considered "staff" with backend admin access. Adjust here if you ever
// want to give a new role permission to manage chat / users / settings.
export const ADMIN_ROLES = new Set(["superadmin", "admin", "manager", "staff"]);
// Cap quyen toan he thong (xem moi chi nhanh, doi vai tro nguoi khac).
export const SUPER_ROLES = new Set(["superadmin", "admin"]);
// Email bootstrap luon duoc nang super admin du DB chua co row — tranh tu khoa minh ra ngoai.
export const BOOTSTRAP_SUPER_EMAIL = "tthanhxuan456@gmail.com";

// Short-lived in-memory cache: luu CA role + branchId de tranh mat context khi cache hit.
type RoleCacheEntry = { role: string; branchId: number | null; until: number };
const roleCache = new Map<string, RoleCacheEntry>();
const CACHE_MS = 30_000;

export function getCachedRoleEntry(clerkUserId: string): RoleCacheEntry | undefined {
  const c = roleCache.get(clerkUserId);
  return c && c.until > Date.now() ? c : undefined;
}

export function clearRoleCache(clerkUserId?: string) {
  if (clerkUserId) roleCache.delete(clerkUserId);
  else roleCache.clear();
}

// Resolve role + branchId cho user dang dang nhap. Thu cache truoc, sau do DB,
// cuoi cung — neu khong co row va clerk email == bootstrap thi nang superadmin.
export async function resolveUserRole(clerkUserId: string): Promise<{ role: string; branchId: number | null }> {
  const cached = getCachedRoleEntry(clerkUserId);
  if (cached) return { role: cached.role, branchId: cached.branchId };

  const [row] = await db
    .select({ role: userRolesTable.role, branchId: userRolesTable.branchId, email: userRolesTable.email })
    .from(userRolesTable)
    .where(eq(userRolesTable.clerkUserId, clerkUserId));

  let role = row?.role ?? "guest";
  let branchId = row?.branchId ?? null;

  // Bootstrap path: kiem tra email tu DB row truoc; neu khong co row, hoi Clerk.
  let email = row?.email ?? null;
  if (!email) {
    try {
      const u = await clerkClient.users.getUser(clerkUserId);
      email = u?.emailAddresses?.find((e: any) => e.id === u.primaryEmailAddressId)?.emailAddress
        ?? u?.emailAddresses?.[0]?.emailAddress
        ?? null;
    } catch { /* fallthrough — bootstrap chi la safety net, khong fail request */ }
  }
  if (email === BOOTSTRAP_SUPER_EMAIL) role = "superadmin";

  const entry: RoleCacheEntry = { role, branchId, until: Date.now() + CACHE_MS };
  roleCache.set(clerkUserId, entry);
  return { role, branchId };
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

      const { role, branchId } = await resolveUserRole(userId);
      if (!ADMIN_ROLES.has(role)) {
        res.status(403).json({ error: "Forbidden — admin access required" });
        return;
      }
      const r = req as unknown as { adminUserId: string; adminRole: string; adminBranchId: number | null };
      r.adminUserId = userId;
      r.adminRole = role;
      r.adminBranchId = SUPER_ROLES.has(role) ? null : branchId;
      next();
    } catch (err) {
      req.log?.error({ err }, "requireAdmin failed");
      res.status(500).json({ error: "Auth check failed" });
    }
  };
}

/**
 * Chi cho phep super admin (superadmin/admin). Dung cho cac thao tac nhay cam:
 * doi vai tro nguoi khac, doi branch assignment, xoa user...
 */
export function requireSuperAdmin(): RequestHandler {
  return async (req, res, next) => {
    try {
      if (process.env.NODE_ENV !== "production" || !process.env.CLERK_SECRET_KEY) {
        return next();
      }
      const auth = getAuth(req);
      const userId = auth?.userId;
      if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
      const { role } = await resolveUserRole(userId);
      if (!SUPER_ROLES.has(role)) {
        res.status(403).json({ error: "Forbidden — super admin required" });
        return;
      }
      const r = req as unknown as { adminUserId: string; adminRole: string; adminBranchId: number | null };
      r.adminUserId = userId;
      r.adminRole = role;
      r.adminBranchId = null;
      next();
    } catch (err) {
      req.log?.error({ err }, "requireSuperAdmin failed");
      res.status(500).json({ error: "Auth check failed" });
    }
  };
}
