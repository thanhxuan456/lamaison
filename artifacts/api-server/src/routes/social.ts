import { Router } from "express";
import { db, appSettingsTable, socialPublishLogTable, blogPostsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  publishToFacebook, publishToInstagram, publishToThreads,
  publishToGoogle, publishToZalo,
  type FacebookConfig, type InstagramConfig, type ThreadsConfig,
  type GoogleConfig, type ZaloConfig, type PostPayload, type PublishResult,
} from "../lib/social-publishers";

const router = Router();
const KEY = "social-config";

export interface SocialConfig {
  autoPublish: boolean;
  publicBaseUrl: string;
  facebook: FacebookConfig;
  instagram: InstagramConfig;
  threads: ThreadsConfig;
  google: GoogleConfig;
  zalo: ZaloConfig;
}

const DEFAULT_CONFIG: SocialConfig = {
  autoPublish: false,
  publicBaseUrl: "",
  facebook: { enabled: false, accessToken: "", pageId: "", groupId: "" },
  instagram: { enabled: false, accessToken: "", igUserId: "" },
  threads: { enabled: false, accessToken: "", threadsUserId: "" },
  google: { enabled: false, accessToken: "", accountId: "", locationId: "" },
  zalo: { enabled: false, accessToken: "", oaId: "" },
};

const MASK = "••••••••";
function maskTokens(c: SocialConfig): SocialConfig {
  return {
    ...c,
    facebook: { ...c.facebook, accessToken: c.facebook.accessToken ? MASK : "" },
    instagram: { ...c.instagram, accessToken: c.instagram.accessToken ? MASK : "" },
    threads: { ...c.threads, accessToken: c.threads.accessToken ? MASK : "" },
    google: { ...c.google, accessToken: c.google.accessToken ? MASK : "" },
    zalo: { ...c.zalo, accessToken: c.zalo.accessToken ? MASK : "" },
  };
}

export async function readSocialConfig(): Promise<SocialConfig> {
  const [row] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, KEY));
  const stored = (row?.value ?? {}) as Partial<SocialConfig>;
  return {
    ...DEFAULT_CONFIG,
    ...stored,
    facebook: { ...DEFAULT_CONFIG.facebook, ...(stored.facebook ?? {}) },
    instagram: { ...DEFAULT_CONFIG.instagram, ...(stored.instagram ?? {}) },
    threads: { ...DEFAULT_CONFIG.threads, ...(stored.threads ?? {}) },
    google: { ...DEFAULT_CONFIG.google, ...(stored.google ?? {}) },
    zalo: { ...DEFAULT_CONFIG.zalo, ...(stored.zalo ?? {}) },
  };
}

async function writeSocialConfig(c: SocialConfig) {
  await db
    .insert(appSettingsTable)
    .values({ key: KEY, value: c as any })
    .onConflictDoUpdate({ target: appSettingsTable.key, set: { value: c as any, updatedAt: new Date() } });
}

router.get("/integrations/social", async (_req, res) => {
  res.json(maskTokens(await readSocialConfig()));
});

router.put("/integrations/social", async (req, res) => {
  try {
    const existing = await readSocialConfig();
    const body = (req.body ?? {}) as Partial<SocialConfig>;
    // Preserve existing tokens when client sends back the mask
    const mergeToken = (incoming: string | undefined, current: string) =>
      incoming === MASK || incoming === undefined ? current : incoming;

    const next: SocialConfig = {
      autoPublish: body.autoPublish ?? existing.autoPublish,
      publicBaseUrl: body.publicBaseUrl ?? existing.publicBaseUrl,
      facebook: {
        ...existing.facebook,
        ...(body.facebook ?? {}),
        accessToken: mergeToken(body.facebook?.accessToken, existing.facebook.accessToken),
      },
      instagram: {
        ...existing.instagram,
        ...(body.instagram ?? {}),
        accessToken: mergeToken(body.instagram?.accessToken, existing.instagram.accessToken),
      },
      threads: {
        ...existing.threads,
        ...(body.threads ?? {}),
        accessToken: mergeToken(body.threads?.accessToken, existing.threads.accessToken),
      },
      google: {
        ...existing.google,
        ...(body.google ?? {}),
        accessToken: mergeToken(body.google?.accessToken, existing.google.accessToken),
      },
      zalo: {
        ...existing.zalo,
        ...(body.zalo ?? {}),
        accessToken: mergeToken(body.zalo?.accessToken, existing.zalo.accessToken),
      },
    };
    await writeSocialConfig(next);
    res.json(maskTokens(next));
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "internal" });
  }
});

/** Publish a single blog post to all enabled platforms. */
export async function publishPostToSocial(postId: number, hostHint?: string) {
  const [post] = await db.select().from(blogPostsTable).where(eq(blogPostsTable.id, postId)).limit(1);
  if (!post) return { ok: false, message: "Post not found" } as const;
  const cfg = await readSocialConfig();

  const base = (cfg.publicBaseUrl || hostHint || "").replace(/\/$/, "");
  const url = base ? `${base}/blog/${post.slug}` : `/blog/${post.slug}`;
  const payload: PostPayload = {
    id: post.id,
    title: post.title,
    excerpt: post.excerpt || post.title,
    url,
    coverImage: post.coverImage || undefined,
    tags: post.tags || undefined,
  };

  const tasks: Array<{ platform: string; run: () => Promise<PublishResult> }> = [];
  if (cfg.facebook.enabled)  tasks.push({ platform: "facebook",  run: () => publishToFacebook(payload, cfg.facebook) });
  if (cfg.instagram.enabled) tasks.push({ platform: "instagram", run: () => publishToInstagram(payload, cfg.instagram) });
  if (cfg.threads.enabled)   tasks.push({ platform: "threads",   run: () => publishToThreads(payload, cfg.threads) });
  if (cfg.google.enabled)    tasks.push({ platform: "google",    run: () => publishToGoogle(payload, cfg.google) });
  if (cfg.zalo.enabled)      tasks.push({ platform: "zalo",      run: () => publishToZalo(payload, cfg.zalo) });

  const results: Array<{ platform: string; result: PublishResult }> = [];
  for (const t of tasks) {
    let result: PublishResult;
    try { result = await t.run(); }
    catch (err: any) { result = { ok: false, message: err?.message ?? String(err) }; }
    results.push({ platform: t.platform, result });
    await db.insert(socialPublishLogTable).values({
      postId,
      platform: t.platform,
      status: result.ok ? "success" : "failed",
      externalId: result.externalId ?? null,
      externalUrl: result.externalUrl ?? null,
      message: result.message,
    });
  }
  return { ok: true, results } as const;
}

router.post("/blog-posts/:id/publish-social", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "invalid id" }); return; }
    // Prefer canonical publicBaseUrl from saved config; only fall back to
    // request host if explicitly empty (publishPostToSocial handles the merge).
    const out = await publishPostToSocial(id);
    res.json(out);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "internal" });
  }
});

router.get("/blog-posts/:id/social-log", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await db.select().from(socialPublishLogTable)
      .where(eq(socialPublishLogTable.postId, id))
      .orderBy(desc(socialPublishLogTable.createdAt))
      .limit(50);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "internal" });
  }
});

export default router;
