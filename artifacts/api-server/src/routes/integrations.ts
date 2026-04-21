import { requireAdmin } from "../middlewares/requireAdmin";
import { Router } from "express";
import { db } from "@workspace/db";
import { appSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const EINVOICE_KEY = "einvoice-config";

const DEFAULT_EINVOICE_CONFIG = {
  enabled: false,
  provider: "viettel" as const,
  apiEndpoint: "",
  username: "",
  password: "",
  businessCode: "",
  templateCode: "",
  series: "",
  autoIssue: false,
};

type EInvoiceProvider = "viettel" | "misa" | "vnpt" | "fast";

interface EInvoiceConfig {
  enabled: boolean;
  provider: EInvoiceProvider;
  apiEndpoint: string;
  username: string;
  password: string;
  businessCode: string;
  templateCode: string;
  series: string;
  autoIssue: boolean;
}

async function readEInvoiceConfig(): Promise<EInvoiceConfig> {
  const [row] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, EINVOICE_KEY));
  return { ...DEFAULT_EINVOICE_CONFIG, ...((row?.value as object) ?? {}) } as EInvoiceConfig;
}

async function writeEInvoiceConfig(config: EInvoiceConfig) {
  await db
    .insert(appSettingsTable)
    .values({ key: EINVOICE_KEY, value: config as any })
    .onConflictDoUpdate({
      target: appSettingsTable.key,
      set: { value: config as any, updatedAt: new Date() },
    });
  return config;
}

function maskPassword(config: EInvoiceConfig) {
  return {
    ...config,
    password: config.password ? "••••••••" : "",
  };
}

// GET /api/integrations/einvoice — trả config (mask password)
router.get("/integrations/einvoice", requireAdmin(), async (req, res) => {
  try {
    const config = await readEInvoiceConfig();
    res.json(maskPassword(config));
  } catch (err) {
    req.log.error({ err }, "Failed to read einvoice config");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/integrations/einvoice — lưu config vào DB
router.put("/integrations/einvoice", requireAdmin(), async (req, res) => {
  try {
    const existing = await readEInvoiceConfig();
    const body = req.body as Partial<EInvoiceConfig>;

    const updated: EInvoiceConfig = {
      ...existing,
      ...body,
      // Nếu password là mask (ẩn •••), giữ nguyên password cũ; ngược lại dùng password mới (kể cả "")
      password: body.password === "••••••••" ? existing.password : (body.password ?? existing.password),
    };

    await writeEInvoiceConfig(updated);
    res.json(maskPassword(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to save einvoice config");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/integrations/einvoice/test — test kết nối thật đến nhà cung cấp
router.post("/integrations/einvoice/test", requireAdmin(), async (req, res) => {
  try {
    const config = await readEInvoiceConfig();

    if (!config.enabled) {
      res.json({ success: false, message: "Tích hợp hóa đơn điện tử chưa được bật." });
      return;
    }
    if (!config.apiEndpoint) {
      res.json({ success: false, message: "Chưa cấu hình API endpoint." });
      return;
    }
    if (!config.username || !config.password) {
      res.json({ success: false, message: "Chưa nhập username hoặc mật khẩu." });
      return;
    }

    const result = await testProviderConnection(config);
    res.json(result);
  } catch (err: any) {
    req.log.error({ err }, "Test einvoice connection failed");
    res.status(500).json({ success: false, message: `Lỗi server: ${err.message}` });
  }
});

async function testProviderConnection(config: EInvoiceConfig): Promise<{ success: boolean; message: string; detail?: string }> {
  const timeout = 10000;

  try {
    switch (config.provider) {
      case "viettel":
        return await testViettel(config, timeout);
      case "misa":
        return await testMisa(config, timeout);
      case "vnpt":
        return await testVnpt(config, timeout);
      case "fast":
        return await testFast(config, timeout);
      default:
        return { success: false, message: "Nhà cung cấp không được hỗ trợ." };
    }
  } catch (err: any) {
    if (err.name === "AbortError") {
      return { success: false, message: "Timeout: Không kết nối được trong 10 giây.", detail: config.apiEndpoint };
    }
    return { success: false, message: `Lỗi kết nối: ${err.message}`, detail: config.apiEndpoint };
  }
}

async function testViettel(config: EInvoiceConfig, timeout: number) {
  // Viettel sinvoice.viettel.vn API: POST /InvoiceAPI/InvoiceWS/login
  const endpoint = config.apiEndpoint.replace(/\/$/, "");
  const loginUrl = `${endpoint}/InvoiceAPI/InvoiceWS/login`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const resp = await fetch(loginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: config.username, password: config.password }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const text = await resp.text().catch(() => "");

    if (resp.status === 200) {
      try {
        const json = JSON.parse(text);
        if (json.token || json.access_token || json.errorCode === "0") {
          return { success: true, message: "Kết nối thành công. Xác thực hợp lệ với Viettel sinvoice." };
        }
        if (json.errorCode && json.errorCode !== "0") {
          return { success: false, message: `Viettel từ chối: ${json.errorMessage || json.errorCode}`, detail: text.slice(0, 200) };
        }
      } catch {
        // not JSON
      }
      return { success: true, message: "Kết nối tới Viettel thành công (HTTP 200).", detail: text.slice(0, 100) };
    }
    if (resp.status === 401 || resp.status === 403) {
      return { success: false, message: "Sai username hoặc mật khẩu Viettel.", detail: `HTTP ${resp.status}` };
    }
    return { success: false, message: `Viettel trả về HTTP ${resp.status}.`, detail: text.slice(0, 200) };
  } finally {
    clearTimeout(timer);
  }
}

async function testMisa(config: EInvoiceConfig, timeout: number) {
  // MISA meInvoice: POST /api/auth/login or similar
  const endpoint = config.apiEndpoint.replace(/\/$/, "");
  const loginUrl = `${endpoint}/api/auth/login`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const resp = await fetch(loginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        CompanyCode: config.businessCode,
        UserName: config.username,
        Password: config.password,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const text = await resp.text().catch(() => "");

    if (resp.status === 200) {
      try {
        const json = JSON.parse(text);
        if (json.token || json.Token || json.access_token) {
          return { success: true, message: "Kết nối MISA meInvoice thành công. Token nhận được." };
        }
        if (json.success === false || json.errorCode) {
          return { success: false, message: `MISA từ chối: ${json.message || json.errorCode}`, detail: text.slice(0, 200) };
        }
      } catch { /* not JSON */ }
      return { success: true, message: "Kết nối tới MISA thành công (HTTP 200)." };
    }
    if (resp.status === 401 || resp.status === 403) {
      return { success: false, message: "Sai thông tin đăng nhập MISA.", detail: `HTTP ${resp.status}` };
    }
    return { success: false, message: `MISA trả về HTTP ${resp.status}.`, detail: text.slice(0, 200) };
  } finally {
    clearTimeout(timer);
  }
}

async function testVnpt(config: EInvoiceConfig, timeout: number) {
  // VNPT e-invoice: thường dùng SOAP hoặc REST tùy phiên bản
  const endpoint = config.apiEndpoint.replace(/\/$/, "");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    // Thử ping endpoint để xem có phản hồi không
    const resp = await fetch(endpoint, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (resp.status < 500) {
      // VNPT dùng SOAP nên không có REST login đơn giản — xác nhận endpoint sống
      return {
        success: true,
        message: `VNPT endpoint phản hồi (HTTP ${resp.status}). Để xác thực đầy đủ, vui lòng dùng WSDL client được cung cấp bởi VNPT.`,
      };
    }
    return { success: false, message: `VNPT endpoint lỗi HTTP ${resp.status}.` };
  } finally {
    clearTimeout(timer);
  }
}

async function testFast(config: EInvoiceConfig, timeout: number) {
  // FAST Invoice: REST API
  const endpoint = config.apiEndpoint.replace(/\/$/, "");
  const loginUrl = `${endpoint}/api/login`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const resp = await fetch(loginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: config.username, password: config.password }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const text = await resp.text().catch(() => "");

    if (resp.status === 200) {
      try {
        const json = JSON.parse(text);
        if (json.token || json.access_token) {
          return { success: true, message: "Kết nối FAST Invoice thành công." };
        }
        if (json.error || json.success === false) {
          return { success: false, message: `FAST từ chối: ${json.error || json.message}`, detail: text.slice(0, 200) };
        }
      } catch { /* not JSON */ }
      return { success: true, message: "Kết nối FAST Invoice thành công (HTTP 200)." };
    }
    if (resp.status === 401 || resp.status === 403) {
      return { success: false, message: "Sai thông tin đăng nhập FAST.", detail: `HTTP ${resp.status}` };
    }
    return { success: false, message: `FAST trả về HTTP ${resp.status}.`, detail: text.slice(0, 200) };
  } finally {
    clearTimeout(timer);
  }
}

export default router;
