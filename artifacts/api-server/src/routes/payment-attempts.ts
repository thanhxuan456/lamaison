import { Router } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import { paymentAttemptsTable, appSettingsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

// GET /api/admin/payment-attempts — list (newest first), default 100
router.get("/admin/payment-attempts", requireAdmin(), async (req, res) => {
  try {
    const limit = Math.min(500, Math.max(1, Number(req.query.limit ?? 100)));
    const rows = await db.select().from(paymentAttemptsTable)
      .orderBy(desc(paymentAttemptsTable.createdAt))
      .limit(limit);
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "Failed" });
  }
});

// POST /api/admin/payment-confirm/regenerate — sinh secret moi cho 1 channel (sms/casso/email)
router.post("/admin/payment-confirm/regenerate", requireAdmin(), async (req, res) => {
  try {
    const channel = String(req.body?.channel ?? "");
    if (!["sms", "casso", "email"].includes(channel)) {
      res.status(400).json({ error: "channel must be sms | casso | email" });
      return;
    }
    const newSecret = crypto.randomBytes(24).toString("hex");

    const [row] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, "payment-settings"));
    const current = (row?.value as any) ?? {};
    const updated = {
      ...current,
      autoConfirm: {
        ...(current.autoConfirm ?? {}),
        [channel]: { ...(current.autoConfirm?.[channel] ?? {}), secret: newSecret },
      },
    };
    await db.insert(appSettingsTable).values({ key: "payment-settings", value: updated as any })
      .onConflictDoUpdate({ target: appSettingsTable.key, set: { value: updated as any, updatedAt: new Date() } });

    res.json({ channel, secret: newSecret });
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "Failed" });
  }
});

// GET /api/admin/payment-confirm/secrets — admin xem cac secret hien tai (de copy)
router.get("/admin/payment-confirm/secrets", requireAdmin(), async (_req, res) => {
  try {
    const [row] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, "payment-settings"));
    const ac = ((row?.value as any)?.autoConfirm ?? {}) as Record<string, { enabled?: boolean; secret?: string }>;
    res.json({
      sms:   { enabled: !!ac.sms?.enabled,   secret: ac.sms?.secret   ?? "" },
      casso: { enabled: !!ac.casso?.enabled, secret: ac.casso?.secret ?? "" },
      email: { enabled: !!ac.email?.enabled, secret: ac.email?.secret ?? "" },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "Failed" });
  }
});

// PUT /api/admin/payment-confirm/toggle — bat/tat 1 channel hoac payAtHotel
router.put("/admin/payment-confirm/toggle", requireAdmin(), async (req, res) => {
  try {
    const { channel, enabled } = req.body as { channel?: string; enabled?: boolean };
    if (!["sms", "casso", "email", "payAtHotel"].includes(String(channel))) {
      res.status(400).json({ error: "Invalid channel" });
      return;
    }
    const [row] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, "payment-settings"));
    const current = (row?.value as any) ?? {};
    let updated = current;
    if (channel === "payAtHotel") {
      updated = { ...current, payAtHotel: { ...(current.payAtHotel ?? {}), enabled: !!enabled } };
    } else {
      updated = {
        ...current,
        autoConfirm: {
          ...(current.autoConfirm ?? {}),
          [channel as string]: { ...(current.autoConfirm?.[channel as string] ?? {}), enabled: !!enabled },
        },
      };
    }
    await db.insert(appSettingsTable).values({ key: "payment-settings", value: updated as any })
      .onConflictDoUpdate({ target: appSettingsTable.key, set: { value: updated as any, updatedAt: new Date() } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "Failed" });
  }
});

export default router;
