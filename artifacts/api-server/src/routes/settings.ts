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

const DEFAULT_MAIN_MENU = {
  items: [
    { id: "home", label: "Trang chủ", href: "/", enabled: true, target: "_self" },
    { id: "rooms", label: "Phòng & Suite", href: "/hotels/1/rooms", enabled: true, target: "_self" },
    { id: "contact", label: "Liên hệ", href: "/contact", enabled: true, target: "_self" },
    { id: "bookings", label: "Đặt phòng của tôi", href: "/bookings", enabled: true, target: "_self" },
  ],
  ctaLabel: "Đặt phòng ngay",
  ctaHref: "/hotels/1/rooms",
  ctaEnabled: false,
};

const DEFAULT_FOOTER = {
  brand: {
    about:
      "Trải nghiệm sự xa hoa bậc nhất tại Việt Nam. Nơi mỗi chi tiết đều được chăm chút tỉ mỉ, mang đến cho bạn cảm giác trân quý như hoàng gia.",
  },
  newsletter: {
    enabled: true,
    title: "Bản tin đặc quyền",
    body: "Đăng ký để nhận ưu đãi riêng tư và những trải nghiệm thượng lưu mới nhất từ Grand Palace.",
    placeholder: "Email của bạn",
    submitText: "Đăng ký",
  },
  contact: {
    enabled: true,
    title: "Liên hệ",
    email: "contact@grandpalace.vn",
    phone: "+84 1800 9999",
    address: "Hà Nội · Đà Nẵng · TP.HCM",
  },
  columns: [
    {
      id: "explore",
      title: "Khám phá",
      enabled: true,
      links: [
        { id: "about", label: "Về chúng tôi", href: "/contact" },
        { id: "rooms", label: "Phòng & Suite", href: "/hotels/1/rooms" },
        { id: "dining", label: "Ẩm thực", href: "/" },
        { id: "spa", label: "Spa & Thư giãn", href: "/" },
        { id: "offers", label: "Ưu đãi đặc quyền", href: "/" },
      ],
    },
    {
      id: "support",
      title: "Hỗ trợ",
      enabled: true,
      links: [
        { id: "contact", label: "Liên hệ", href: "/contact" },
        { id: "faq", label: "Câu hỏi thường gặp", href: "/contact" },
        { id: "cancel", label: "Chính sách hủy", href: "/" },
        { id: "loyalty", label: "Chương trình thành viên", href: "/" },
      ],
    },
  ],
  socials: [
    { platform: "facebook", url: "https://facebook.com/grandpalace", enabled: true },
    { platform: "instagram", url: "https://instagram.com/grandpalace", enabled: true },
    { platform: "twitter", url: "https://twitter.com/grandpalace", enabled: true },
    { platform: "youtube", url: "https://youtube.com/grandpalace", enabled: true },
  ],
  bottom: {
    showCopyright: true,
    termsLabel: "Điều khoản sử dụng",
    termsHref: "/",
    privacyLabel: "Chính sách bảo mật",
    privacyHref: "/",
  },
};

const DEFAULT_CONTACT_MAP = {
  enabled: true,
  provider: "openstreetmap" as "openstreetmap" | "google" | "custom",
  title: "Tìm chúng tôi",
  address: "Hà Nội · Đà Nẵng · TP.HCM",
  // OpenStreetMap defaults: Hà Nội Old Quarter
  lat: 21.0285,
  lng: 105.8542,
  zoom: 14,
  // Optional custom embed (Google Maps "Embed a map" iframe URL, or any iframe src)
  embedUrl: "",
  height: 420,
};

const DEFAULT_PAYMENT_SETTINGS = {
  momo: { enabled: false, partnerCode: "", accessKey: "", secretKey: "", testMode: true },
  bank: { enabled: true, bankCode: "VCB", accountNumber: "", accountName: "GRAND PALACE HOTELS", defaultDescription: "Dat phong Grand Palace" },
};

// Safelist of keys that may be read/written via the generic endpoint and their defaults.
const KEY_DEFAULTS: Record<string, unknown> = {
  theme: DEFAULT_THEME,
  mainMenu: DEFAULT_MAIN_MENU,
  footer: DEFAULT_FOOTER,
  contactMap: DEFAULT_CONTACT_MAP,
  "payment-settings": DEFAULT_PAYMENT_SETTINGS,
};

function defaultFor(key: string): any {
  return KEY_DEFAULTS[key] ?? null;
}

async function readKey(key: string) {
  const [row] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, key));
  const def = defaultFor(key);
  if (def && typeof def === "object") {
    return { ...(def as object), ...((row?.value as object | null) ?? {}) };
  }
  return row?.value ?? def;
}

async function writeKey(key: string, body: unknown) {
  const def = defaultFor(key);
  const value = def && typeof def === "object" ? { ...(def as object), ...((body as object) ?? {}) } : body;
  await db
    .insert(appSettingsTable)
    .values({ key, value: value as any })
    .onConflictDoUpdate({
      target: appSettingsTable.key,
      set: { value: value as any, updatedAt: new Date() },
    });
  return value;
}

// Theme — keep dedicated routes for backward compat
router.get("/settings/theme", async (_req, res) => {
  try { res.json(await readKey(THEME_KEY)); }
  catch { res.status(500).json({ error: "Internal server error" }); }
});

router.put("/settings/theme", async (req, res) => {
  try { res.json(await writeKey(THEME_KEY, req.body)); }
  catch (err) { req.log.error({ err }, "Failed to save theme"); res.status(500).json({ error: "Internal server error" }); }
});

// Generic key endpoints (safelisted)
router.get("/settings/:key", async (req, res) => {
  const key = req.params.key;
  if (!(key in KEY_DEFAULTS)) return res.status(404).json({ error: "Unknown setting key" });
  try { res.json(await readKey(key)); }
  catch { res.status(500).json({ error: "Internal server error" }); }
});

router.put("/settings/:key", async (req, res) => {
  const key = req.params.key;
  if (!(key in KEY_DEFAULTS)) return res.status(404).json({ error: "Unknown setting key" });
  try { res.json(await writeKey(key, req.body)); }
  catch (err) { req.log.error({ err, key }, "Failed to save setting"); res.status(500).json({ error: "Internal server error" }); }
});

export default router;
