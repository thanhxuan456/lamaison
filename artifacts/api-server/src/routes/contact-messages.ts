import { Router } from "express";
import { db, contactMessagesTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const router = Router();

router.post("/contact-messages", async (req, res) => {
  try {
    const { name, email, phone, subject, message } = (req.body ?? {}) as Record<string, unknown>;
    const nameStr = typeof name === "string" ? name.trim() : "";
    const emailStr = typeof email === "string" ? email.trim() : "";
    const messageStr = typeof message === "string" ? message.trim() : "";
    if (!nameStr || nameStr.length < 2) return res.status(400).json({ error: "Tên không hợp lệ" });
    if (!emailStr || !/^\S+@\S+\.\S+$/.test(emailStr)) return res.status(400).json({ error: "Email không hợp lệ" });
    if (!messageStr || messageStr.length < 5) return res.status(400).json({ error: "Nội dung quá ngắn" });
    if (messageStr.length > 5000) return res.status(400).json({ error: "Nội dung quá dài" });

    const [row] = await db
      .insert(contactMessagesTable)
      .values({
        name: nameStr.slice(0, 200),
        email: emailStr.slice(0, 200),
        phone: typeof phone === "string" ? phone.trim().slice(0, 50) : null,
        subject: typeof subject === "string" ? subject.trim().slice(0, 300) : null,
        message: messageStr,
      })
      .returning();
    res.status(201).json({ id: row.id, ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to save contact message");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/contact-messages", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(contactMessagesTable)
      .orderBy(desc(contactMessagesTable.createdAt))
      .limit(500);
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/contact-messages/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    const read = (req.body as any)?.read;
    if (typeof read !== "boolean") return res.status(400).json({ error: "read must be boolean" });
    const [row] = await db
      .update(contactMessagesTable)
      .set({ read })
      .where(eq(contactMessagesTable.id, id))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/contact-messages/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    await db.delete(contactMessagesTable).where(eq(contactMessagesTable.id, id));
    res.status(204).end();
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
