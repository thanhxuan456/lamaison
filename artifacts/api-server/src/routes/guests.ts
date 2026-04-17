import { Router } from "express";
import { db } from "@workspace/db";
import { guestsTable, bookingsTable, roomsTable, hotelsTable } from "@workspace/db";
import { and, eq, desc, sql, inArray } from "drizzle-orm";

const router = Router();

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

router.get("/guests", async (req, res) => {
  try {
    const rows = await db
      .select({
        guest: guestsTable,
        totalBookings: sql<number>`count(${bookingsTable.id})::int`,
        sources: sql<string[]>`coalesce(array_agg(distinct ${bookingsTable.source}) filter (where ${bookingsTable.source} is not null), '{}')`,
        lastStayAt: sql<string | null>`max(${bookingsTable.checkedInAt})`,
      })
      .from(guestsTable)
      .leftJoin(bookingsTable, eq(bookingsTable.guestId, guestsTable.id))
      .groupBy(guestsTable.id)
      .orderBy(desc(guestsTable.updatedAt));
    res.json(
      rows.map((r) => ({
        id: r.guest.id,
        fullName: r.guest.fullName,
        email: r.guest.email,
        phone: r.guest.phone,
        notes: r.guest.notes,
        totalBookings: Number(r.totalBookings ?? 0),
        sources: r.sources ?? [],
        lastStayAt: r.lastStayAt,
        createdAt: r.guest.createdAt,
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list guests");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** CSV export. Optional ?ids=1,2,3 filter; otherwise exports all. */
router.get("/guests/export.csv", async (req, res) => {
  try {
    const idsParam = String(req.query.ids ?? "").trim();
    const ids = idsParam
      ? idsParam.split(",").map((s) => parseInt(s, 10)).filter((n) => Number.isFinite(n))
      : [];

    const rows = await db
      .select({
        guest: guestsTable,
        totalBookings: sql<number>`count(${bookingsTable.id})::int`,
        sources: sql<string[]>`coalesce(array_agg(distinct ${bookingsTable.source}) filter (where ${bookingsTable.source} is not null), '{}')`,
        lastStayAt: sql<string | null>`max(${bookingsTable.checkedInAt})`,
        totalSpent: sql<string>`coalesce(sum(${bookingsTable.totalPrice}), 0)::text`,
      })
      .from(guestsTable)
      .leftJoin(bookingsTable, eq(bookingsTable.guestId, guestsTable.id))
      .where(ids.length ? inArray(guestsTable.id, ids) : sql`true`)
      .groupBy(guestsTable.id)
      .orderBy(desc(guestsTable.updatedAt));

    const header = ["ID", "Họ tên", "Email", "Số điện thoại", "Số lần đặt", "Tổng chi tiêu (VND)", "Nguồn", "Lần lưu trú gần nhất", "Tham gia", "Ghi chú"];
    const lines = [header.map(csvEscape).join(",")];
    for (const r of rows) {
      lines.push([
        r.guest.id,
        r.guest.fullName,
        r.guest.email,
        r.guest.phone,
        Number(r.totalBookings ?? 0),
        Math.round(Number(r.totalSpent ?? 0)),
        (r.sources ?? []).join("|"),
        r.lastStayAt ?? "",
        r.guest.createdAt instanceof Date ? r.guest.createdAt.toISOString() : r.guest.createdAt,
        r.guest.notes ?? "",
      ].map(csvEscape).join(","));
    }
    const csv = "\uFEFF" + lines.join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="guests-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (err) {
    req.log.error({ err }, "Failed to export guests");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** Bulk check-out: for each guest in `ids`, check out every booking currently in `checked_in`. */
router.post("/guests/bulk-checkout", async (req, res) => {
  try {
    const ids: number[] = Array.isArray(req.body?.ids)
      ? req.body.ids.map((x: unknown) => parseInt(String(x), 10)).filter((n: number) => Number.isFinite(n))
      : [];
    if (ids.length === 0) { res.status(400).json({ error: "ids required" }); return; }

    const active = await db
      .select()
      .from(bookingsTable)
      .where(and(inArray(bookingsTable.guestId, ids), eq(bookingsTable.status, "checked_in")));

    if (active.length === 0) {
      res.json({ checkedOut: 0, roomsCleaned: 0, message: "Không có khách nào đang lưu trú." });
      return;
    }

    const now = new Date();
    const bookingIds = active.map((b) => b.id);
    const roomIds = Array.from(new Set(active.map((b) => b.roomId)));

    await db
      .update(bookingsTable)
      .set({ status: "checked_out", checkedOutAt: now })
      .where(inArray(bookingsTable.id, bookingIds));

    await db
      .update(roomsTable)
      .set({ isAvailable: false, status: "cleaning" })
      .where(inArray(roomsTable.id, roomIds));

    res.json({ checkedOut: bookingIds.length, roomsCleaned: roomIds.length, bookingIds });
  } catch (err) {
    req.log.error({ err }, "Failed bulk checkout");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Bulk delete guests. Refuses any guest with active bookings (confirmed/checked_in).
 * Past bookings (cancelled/checked_out/no_show) have their `guestId` nulled so booking
 * records remain intact for accounting.
 */
router.delete("/guests", async (req, res) => {
  try {
    const ids: number[] = Array.isArray(req.body?.ids)
      ? req.body.ids.map((x: unknown) => parseInt(String(x), 10)).filter((n: number) => Number.isFinite(n))
      : [];
    if (ids.length === 0) { res.status(400).json({ error: "ids required" }); return; }

    const blockers = await db
      .select({ guestId: bookingsTable.guestId, status: bookingsTable.status })
      .from(bookingsTable)
      .where(and(inArray(bookingsTable.guestId, ids), inArray(bookingsTable.status, ["confirmed", "checked_in"])));
    if (blockers.length > 0) {
      const blocked = Array.from(new Set(blockers.map((b) => b.guestId)));
      res.status(409).json({
        error: "Một số khách còn đặt phòng đang hoạt động. Hãy hủy hoặc check-out trước.",
        blockedGuestIds: blocked,
      });
      return;
    }

    await db
      .update(bookingsTable)
      .set({ guestId: null })
      .where(inArray(bookingsTable.guestId, ids));

    const deleted = await db.delete(guestsTable).where(inArray(guestsTable.id, ids)).returning({ id: guestsTable.id });
    res.json({ deleted: deleted.length, ids: deleted.map((d) => d.id) });
  } catch (err) {
    req.log.error({ err }, "Failed bulk delete guests");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/guests/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid guest ID" }); return; }
    const [guest] = await db.select().from(guestsTable).where(eq(guestsTable.id, id));
    if (!guest) { res.status(404).json({ error: "Guest not found" }); return; }

    const bookings = await db
      .select()
      .from(bookingsTable)
      .where(eq(bookingsTable.guestId, id))
      .orderBy(desc(bookingsTable.createdAt));

    const enriched = await Promise.all(
      bookings.map(async (b) => {
        const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, b.roomId));
        const [hotel] = await db.select().from(hotelsTable).where(eq(hotelsTable.id, b.hotelId));
        return {
          ...b,
          totalPrice: parseFloat(b.totalPrice),
          room: room ? { ...room, pricePerNight: parseFloat(room.pricePerNight) } : null,
          hotel: hotel
            ? { ...hotel, rating: parseFloat(hotel.rating), priceFrom: parseFloat(hotel.priceFrom), totalRooms: 0, availableRooms: 0 }
            : null,
        };
      }),
    );

    const sources = Array.from(new Set(bookings.map((b) => b.source)));
    const lastStay = bookings.find((b) => b.checkedInAt)?.checkedInAt ?? null;

    res.json({
      id: guest.id,
      fullName: guest.fullName,
      email: guest.email,
      phone: guest.phone,
      notes: guest.notes,
      totalBookings: bookings.length,
      sources,
      lastStayAt: lastStay,
      createdAt: guest.createdAt,
      bookings: enriched,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get guest");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
