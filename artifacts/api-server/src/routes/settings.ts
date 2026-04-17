import { Router } from "express";
import { db } from "@workspace/db";
import { appSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const THEME_KEY = "theme";

const DEFAULT_THEME = {
  preset: "royal-gold",
  primaryHsl: "46 65% 52%",
  secondaryHsl: "222 25% 14%",
  accentHsl: "46 65% 52%",
  primaryDarkHsl: "46 65% 52%",
  fontFamily: "'Playfair Display', serif",
  layout: "centered",
  radius: "0rem",
  showBackToTop: true,
  showLiveChat: true,
  footerNewsletter: true,
  navTransparent: true,
};

router.get("/settings/theme", async (_req, res) => {
  try {
    const [row] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, THEME_KEY));
    res.json({ ...DEFAULT_THEME, ...((row?.value as object | null) ?? {}) });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/settings/theme", async (req, res) => {
  try {
    const value = { ...DEFAULT_THEME, ...(req.body ?? {}) };
    await db
      .insert(appSettingsTable)
      .values({ key: THEME_KEY, value })
      .onConflictDoUpdate({
        target: appSettingsTable.key,
        set: { value, updatedAt: new Date() },
      });
    res.json(value);
  } catch (err) {
    req.log.error({ err }, "Failed to save theme");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
