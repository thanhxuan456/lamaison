import { requireAdmin } from "../middlewares/requireAdmin";
import { Router } from "express";
import { db, contactMessagesTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { encryptString, decryptString } from "../lib/crypto";

const router = Router();

router.post("/contact-messages", async (req, res) => {
  try {
    const { name, email, phone, subject, message } = (req.body ?? {}) as Record<string, unknown>;
    const nameStr = typeof name === "string" ? name.trim() : "";
    const emailStr = typeof email === "string" ? email.trim() : "";
    const messageStr = typeof message === "string" ? message.trim() : "";
    if (!nameStr || nameStr.length < 2) { res.status(400).json({ error: "Tên không hợp lệ" }); return; }
    if (!emailStr || !/^\S+@\S+\.\S+$/.test(emailStr)) { res.status(400).json({ error: "Email không hợp lệ" }); return; }
    if (!messageStr || messageStr.length < 5) { res.status(400).json({ error: "Nội dung quá ngắn" }); return; }
    if (messageStr.length > 5000) { res.status(400).json({ error: "Nội dung quá dài" }); return; }

    const phoneStr = typeof phone === "string" ? phone.trim().slice(0, 50) : "";
    const subjectStr = typeof subject === "string" ? subject.trim().slice(0, 300) : "";

    const [row] = await db
      .insert(contactMessagesTable)
      .values({
        name: encryptString(nameStr.slice(0, 200)),
        email: encryptString(emailStr.slice(0, 200)),
        phone: phoneStr ? encryptString(phoneStr) : null,
        subject: subjectStr ? encryptString(subjectStr) : null,
        message: encryptString(messageStr),
      })
      .returning();
    res.status(201).json({ id: row.id, ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to save contact message");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/contact-messages", requireAdmin(), async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(contactMessagesTable)
      .orderBy(desc(contactMessagesTable.createdAt))
      .limit(500);
    // Decrypt for admin viewing. Plaintext never leaves the server in the DB.
    const decoded = rows.map((r) => ({
      ...r,
      name: decryptString(r.name),
      email: decryptString(r.email),
      phone: r.phone ? decryptString(r.phone) : null,
      subject: r.subject ? decryptString(r.subject) : null,
      message: decryptString(r.message),
    }));
    res.json(decoded);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/contact-messages/:id", requireAdmin(), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const read = (req.body as any)?.read;
    if (typeof read !== "boolean") { res.status(400).json({ error: "read must be boolean" }); return; }
    const [row] = await db
      .update(contactMessagesTable)
      .set({ read })
      .where(eq(contactMessagesTable.id, id))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/contact-messages/:id", requireAdmin(), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    await db.delete(contactMessagesTable).where(eq(contactMessagesTable.id, id));
    res.status(204).end();
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
