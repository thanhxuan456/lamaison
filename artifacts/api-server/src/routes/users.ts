import { requireAdmin, requireSuperAdmin, SUPER_ROLES, BOOTSTRAP_SUPER_EMAIL, clearRoleCache, resolveUserRole } from "../middlewares/requireAdmin";
import { requireAuth } from "../middlewares/requireAuth";
import { Router } from "express";
import { db } from "@workspace/db";
import { userRolesTable, hotelsTable } from "@workspace/db";
import { eq, inArray, sql } from "drizzle-orm";

const router = Router();

// ===== /api/me — endpoints cua chinh user dang dang nhap (KHONG can admin) =====

// GET /api/me — tra ve user_roles row + thong tin chi nhanh user dang dang nhap
router.get("/me", requireAuth(), async (req, res) => {
  try {
    const userId = (req as any).authUserId as string;
    const [row] = await db.select().from(userRolesTable).where(eq(userRolesTable.clerkUserId, userId));
    if (!row) { res.json({ user: null, signupHotel: null, lastLoginHotel: null }); return; }

    const hotelIds = Array.from(new Set([row.signupHotelId, row.lastLoginHotelId].filter((id): id is number => typeof id === "number")));
    const hotels = hotelIds.length
      ? await db.select().from(hotelsTable).where(inArray(hotelsTable.id, hotelIds))
      : [];
    const byId = new Map(hotels.map(h => [h.id, h]));

    res.json({
      user: row,
      signupHotel: row.signupHotelId ? byId.get(row.signupHotelId) ?? null : null,
      lastLoginHotel: row.lastLoginHotelId ? byId.get(row.lastLoginHotelId) ?? null : null,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "Failed to fetch profile" });
  }
});

// GET /api/me/role — tra ve { role, branchId, isSuper } cho frontend AdminGuard.
// Bootstrap email luon duoc nang superadmin du DB chua co row (resolve qua Clerk).
router.get("/me/role", requireAuth(), async (req, res) => {
  try {
    const userId = (req as any).authUserId as string;
    const { role, branchId } = await resolveUserRole(userId);
    const isSuper = SUPER_ROLES.has(role);
    res.json({
      role,
      branchId: isSuper ? null : branchId,
      isSuper,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "Failed to fetch role" });
  }
});

// POST /api/me/branch — sync chi nhanh user vua dang nhap qua URL chi nhanh
// Body: { slug, email?, name? }  (email/name lay tu Clerk user phia FE de upsert lan dau)
// Atomic upsert dung ON CONFLICT, tranh race khi user mo nhieu tab cung dang nhap.
router.post("/me/branch", requireAuth(), async (req, res) => {
  try {
    const userId = (req as any).authUserId as string;
    const { slug, email, name } = req.body ?? {};
    if (!slug || typeof slug !== "string") { res.status(400).json({ error: "slug is required" }); return; }
    if (!email) { res.status(400).json({ error: "email is required" }); return; }

    const [hotel] = await db.select().from(hotelsTable).where(eq(hotelsTable.slug, slug));
    if (!hotel) { res.status(404).json({ error: "Hotel not found" }); return; }

    const now = new Date();
    // Atomic upsert. Khi insert va co conflict tren clerk_user_id thi update.
    // signupHotel* dung COALESCE de KHONG ghi de neu da co (chi set lan dau).
    // lastLoginHotel*/lastLoginAt LUON ghi de.
    const [row] = await db
      .insert(userRolesTable)
      .values({
        clerkUserId: userId,
        email,
        name: name ?? null,
        role: "guest",
        signupHotelId: hotel.id,
        signupHotelSlug: hotel.slug,
        lastLoginHotelId: hotel.id,
        lastLoginHotelSlug: hotel.slug,
        lastLoginAt: now,
      })
      .onConflictDoUpdate({
        target: userRolesTable.clerkUserId,
        set: {
          email,
          ...(name ? { name } : {}),
          signupHotelId: sql`coalesce(${userRolesTable.signupHotelId}, ${hotel.id})`,
          signupHotelSlug: sql`coalesce(${userRolesTable.signupHotelSlug}, ${hotel.slug})`,
          lastLoginHotelId: hotel.id,
          lastLoginHotelSlug: hotel.slug,
          lastLoginAt: now,
          updatedAt: now,
        },
      })
      .returning();

    res.json({ user: row, hotel });
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "Failed to sync branch" });
  }
});

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function genCode(prefix = "GP") {
  let code = prefix;
  for (let i = 0; i < 6; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code;
}

// GET /api/users — list all users with roles
router.get("/users", requireAdmin(), async (_req, res) => {
  try {
    const rows = await db.select().from(userRolesTable).orderBy(userRolesTable.createdAt);
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// POST /api/users — upsert (create or update) a user role entry
// Chi super admin moi duoc set role/branch khi tao moi.
router.post("/users", requireSuperAdmin(), async (req, res) => {
  try {
    const { clerkUserId, email, name, role, notes } = req.body ?? {};
    if (!clerkUserId || !email) { res.status(400).json({ error: "clerkUserId and email are required" }); return; }

    const existing = await db.select().from(userRolesTable).where(eq(userRolesTable.clerkUserId, clerkUserId));
    if (existing.length > 0) {
      const [updated] = await db.update(userRolesTable)
        .set({ email, name, role, notes, updatedAt: new Date() })
        .where(eq(userRolesTable.clerkUserId, clerkUserId))
        .returning();
      res.json(updated); return;
    }

    const [created] = await db.insert(userRolesTable).values({
      clerkUserId,
      email,
      name,
      role: role ?? "guest",
      notes,
    }).returning();
    res.status(201).json(created);
  } catch (e: any) {
    res.status(400).json({ error: e.message ?? "Invalid data" });
  }
});

// PUT /api/users/:id — update role / commission / notes / branch
// Manager/staff (admin-level nhung khong phai super) chi sua duoc commissionRate/notes/name.
// Chi super admin moi duoc doi role va branchId — chong privilege escalation.
router.put("/users/:id", requireAdmin(), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const callerRole = (req as any).adminRole as string;
    const isSuperCaller = SUPER_ROLES.has(callerRole);
    const { role, commissionRate, notes, name, branchId } = req.body ?? {};

    // Chan privilege escalation: non-super gui role/branchId -> 403.
    if (!isSuperCaller && (role !== undefined || branchId !== undefined)) {
      res.status(403).json({ error: "Forbidden — only super admin can change role or branch assignment" });
      return;
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (commissionRate !== undefined) patch.commissionRate = Number(commissionRate);
    if (notes !== undefined) patch.notes = notes;
    if (name !== undefined) patch.name = name;
    if (isSuperCaller) {
      if (role !== undefined) patch.role = role;
      if (branchId !== undefined) patch.branchId = branchId === null || branchId === "" ? null : Number(branchId);
    }

    const [updated] = await db.update(userRolesTable)
      .set(patch)
      .where(eq(userRolesTable.id, id))
      .returning();

    if (!updated) { res.status(404).json({ error: "User not found" }); return; }
    clearRoleCache(updated.clerkUserId);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message ?? "Invalid data" });
  }
});

// DELETE /api/users/:id — remove role entry (chi super admin)
router.delete("/users/:id", requireSuperAdmin(), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    await db.delete(userRolesTable).where(eq(userRolesTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// POST /api/users/:id/affiliate — generate affiliate code
router.post("/users/:id/affiliate", requireAdmin(), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const code = genCode();
    const rate = Number(req.body?.commissionRate ?? 5);

    const [updated] = await db.update(userRolesTable)
      .set({ affiliateCode: code, commissionRate: rate, updatedAt: new Date() })
      .where(eq(userRolesTable.id, id))
      .returning();

    if (!updated) { res.status(404).json({ error: "User not found" }); return; }
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message ?? "Failed to generate code" });
  }
});

export default router;
