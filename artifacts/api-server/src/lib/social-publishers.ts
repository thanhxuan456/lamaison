/**
 * Social media publishers — real Graph / API calls per platform.
 *
 * Every publisher returns { ok, externalId?, externalUrl?, message }.
 * If the platform is misconfigured we return ok:false with a human message
 * (Vietnamese) instead of throwing — the caller logs every attempt.
 */

export interface PostPayload {
  id: number;
  title: string;
  excerpt: string;
  /** Public URL on the hotel website */
  url: string;
  /** Absolute https URL of cover image, may be empty */
  coverImage?: string;
  tags?: string;
}

export interface PublishResult {
  ok: boolean;
  externalId?: string;
  externalUrl?: string;
  message: string;
}

/* ---------- Facebook (Page feed + optional Group post) -------------------- */

export interface FacebookConfig {
  enabled: boolean;
  accessToken: string;   // long-lived Page Access Token (pages_manage_posts)
  pageId: string;
  groupId?: string;
}

export async function publishToFacebook(p: PostPayload, c: FacebookConfig): Promise<PublishResult> {
  if (!c.enabled) return { ok: false, message: "Facebook chưa được bật" };
  if (!c.accessToken || !c.pageId) return { ok: false, message: "Thiếu Page Access Token hoặc Page ID" };

  const message = `${p.title}\n\n${p.excerpt}\n\nĐọc đầy đủ: ${p.url}`;
  const body = new URLSearchParams({
    message,
    link: p.url,
    access_token: c.accessToken,
  });

  try {
    const r = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(c.pageId)}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data: any = await r.json().catch(() => ({}));
    if (!r.ok || data?.error) {
      return { ok: false, message: `Facebook từ chối: ${data?.error?.message ?? `HTTP ${r.status}`}` };
    }
    const id: string = data.id ?? "";
    const externalUrl = id ? `https://www.facebook.com/${id}` : undefined;
    return { ok: true, externalId: id, externalUrl, message: "Đã đăng lên Facebook Page" };
  } catch (err: any) {
    return { ok: false, message: `Lỗi mạng: ${err?.message ?? err}` };
  }
}

/* ---------- Instagram (Business account, 2-step container + publish) ------ */

export interface InstagramConfig {
  enabled: boolean;
  accessToken: string;   // same FB user token with instagram_content_publish
  igUserId: string;      // IG Business Account ID
}

export async function publishToInstagram(p: PostPayload, c: InstagramConfig): Promise<PublishResult> {
  if (!c.enabled) return { ok: false, message: "Instagram chưa được bật" };
  if (!c.accessToken || !c.igUserId) return { ok: false, message: "Thiếu Access Token hoặc IG User ID" };
  if (!p.coverImage) return { ok: false, message: "Instagram cần ảnh cover https công khai" };

  const caption = `${p.title}\n\n${p.excerpt}\n\n${p.tags ?? ""}\n${p.url}`.slice(0, 2200);

  try {
    // Step 1: create media container
    const createBody = new URLSearchParams({
      image_url: p.coverImage,
      caption,
      access_token: c.accessToken,
    });
    const create = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(c.igUserId)}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: createBody,
    });
    const created: any = await create.json().catch(() => ({}));
    if (!create.ok || !created?.id) {
      return { ok: false, message: `IG container lỗi: ${created?.error?.message ?? `HTTP ${create.status}`}` };
    }

    // Step 2: publish container
    const pubBody = new URLSearchParams({
      creation_id: created.id,
      access_token: c.accessToken,
    });
    const pub = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(c.igUserId)}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: pubBody,
    });
    const published: any = await pub.json().catch(() => ({}));
    if (!pub.ok || !published?.id) {
      return { ok: false, message: `IG publish lỗi: ${published?.error?.message ?? `HTTP ${pub.status}`}` };
    }
    return {
      ok: true,
      externalId: String(published.id),
      message: "Đã đăng lên Instagram",
    };
  } catch (err: any) {
    return { ok: false, message: `Lỗi mạng: ${err?.message ?? err}` };
  }
}

/* ---------- Threads (Meta Threads Graph API, 2-step) ---------------------- */

export interface ThreadsConfig {
  enabled: boolean;
  accessToken: string;
  threadsUserId: string;
}

export async function publishToThreads(p: PostPayload, c: ThreadsConfig): Promise<PublishResult> {
  if (!c.enabled) return { ok: false, message: "Threads chưa được bật" };
  if (!c.accessToken || !c.threadsUserId) return { ok: false, message: "Thiếu Access Token hoặc Threads User ID" };

  const text = `${p.title}\n\n${p.excerpt}\n\n${p.url}`.slice(0, 500);

  try {
    const params: Record<string, string> = {
      media_type: p.coverImage ? "IMAGE" : "TEXT",
      text,
      access_token: c.accessToken,
    };
    if (p.coverImage) params.image_url = p.coverImage;

    const create = await fetch(`https://graph.threads.net/v1.0/${encodeURIComponent(c.threadsUserId)}/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params),
    });
    const created: any = await create.json().catch(() => ({}));
    if (!create.ok || !created?.id) {
      return { ok: false, message: `Threads container lỗi: ${created?.error?.message ?? `HTTP ${create.status}`}` };
    }

    const pub = await fetch(`https://graph.threads.net/v1.0/${encodeURIComponent(c.threadsUserId)}/threads_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ creation_id: created.id, access_token: c.accessToken }),
    });
    const published: any = await pub.json().catch(() => ({}));
    if (!pub.ok || !published?.id) {
      return { ok: false, message: `Threads publish lỗi: ${published?.error?.message ?? `HTTP ${pub.status}`}` };
    }
    return { ok: true, externalId: String(published.id), message: "Đã đăng lên Threads" };
  } catch (err: any) {
    return { ok: false, message: `Lỗi mạng: ${err?.message ?? err}` };
  }
}

/* ---------- Google Business Profile (Maps post + photo) ------------------- */

export interface GoogleConfig {
  enabled: boolean;
  accessToken: string;   // OAuth access token with business.manage scope
  accountId: string;     // accounts/123
  locationId: string;    // locations/456
}

export async function publishToGoogle(p: PostPayload, c: GoogleConfig): Promise<PublishResult> {
  if (!c.enabled) return { ok: false, message: "Google Business Profile chưa được bật" };
  if (!c.accessToken || !c.accountId || !c.locationId) {
    return { ok: false, message: "Thiếu OAuth token, accountId hoặc locationId" };
  }

  const parent = `${c.accountId}/${c.locationId}`; // already like accounts/x/locations/y
  const summary = `${p.title} — ${p.excerpt}`.slice(0, 1500);
  const body: any = {
    languageCode: "vi",
    summary,
    callToAction: { actionType: "LEARN_MORE", url: p.url },
    topicType: "STANDARD",
  };
  if (p.coverImage) body.media = [{ mediaFormat: "PHOTO", sourceUrl: p.coverImage }];

  try {
    const r = await fetch(`https://mybusiness.googleapis.com/v4/${parent}/localPosts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data: any = await r.json().catch(() => ({}));
    if (!r.ok || data?.error) {
      return { ok: false, message: `Google từ chối: ${data?.error?.message ?? `HTTP ${r.status}`}` };
    }
    return {
      ok: true,
      externalId: data.name ?? "",
      externalUrl: data.searchUrl ?? undefined,
      message: "Đã đăng lên Google Business Profile (hiển thị trên Maps)",
    };
  } catch (err: any) {
    return { ok: false, message: `Lỗi mạng: ${err?.message ?? err}` };
  }
}

/* ---------- TikTok (Content Posting API — PHOTO_MODE direct post) -------- */

export interface TikTokConfig {
  enabled: boolean;
  /** OAuth user access token with scope: video.publish + video.upload */
  accessToken: string;
  /** Optional: TikTok Open ID for logging only */
  openId?: string;
  /** Privacy level: PUBLIC_TO_EVERYONE | MUTUAL_FOLLOW_FRIENDS | SELF_ONLY */
  privacyLevel?: string;
}

export async function publishToTikTok(p: PostPayload, c: TikTokConfig): Promise<PublishResult> {
  if (!c.enabled) return { ok: false, message: "TikTok chưa được bật" };
  if (!c.accessToken) return { ok: false, message: "Thiếu TikTok Access Token" };
  if (!p.coverImage) {
    return { ok: false, message: "TikTok cần ảnh bìa https công khai (PHOTO mode). Bài text-only không đăng được." };
  }

  const title = `${p.title}`.slice(0, 90);
  const description = `${p.excerpt}\n\n${p.url}\n${p.tags ?? ""}`.slice(0, 4000);
  const privacy = c.privacyLevel || "PUBLIC_TO_EVERYONE";

  const body = {
    post_info: {
      title,
      description,
      privacy_level: privacy,
      disable_comment: false,
      auto_add_music: true,
    },
    source_info: {
      source: "PULL_FROM_URL",
      photo_cover_index: 0,
      photo_images: [p.coverImage],
    },
    post_mode: "DIRECT_POST",
    media_type: "PHOTO",
  };

  try {
    const r = await fetch("https://open.tiktokapis.com/v2/post/publish/content/init/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify(body),
    });
    const data: any = await r.json().catch(() => ({}));
    const errCode = data?.error?.code;
    if (!r.ok || (errCode && errCode !== "ok")) {
      return { ok: false, message: `TikTok từ chối: ${data?.error?.message ?? `HTTP ${r.status}`}` };
    }
    const publishId = data?.data?.publish_id ?? "";
    return {
      ok: true,
      externalId: String(publishId),
      message: "Đã gửi bài lên TikTok (đang xử lý phía TikTok ~1-2 phút)",
    };
  } catch (err: any) {
    return { ok: false, message: `Lỗi mạng: ${err?.message ?? err}` };
  }
}

/* ---------- Zalo Official Account (broadcast text + link) ----------------- */

export interface ZaloConfig {
  enabled: boolean;
  accessToken: string;   // OA access token (refreshable)
  oaId?: string;
}

export async function publishToZalo(p: PostPayload, c: ZaloConfig): Promise<PublishResult> {
  if (!c.enabled) return { ok: false, message: "Zalo OA chưa được bật" };
  if (!c.accessToken) return { ok: false, message: "Thiếu Zalo OA Access Token" };

  // Broadcast a "list" template card with link to article
  const message = {
    attachment: {
      type: "template",
      payload: {
        template_type: "media",
        elements: [
          {
            media_type: "article",
            url: p.url,
            title: p.title,
            subtitle: p.excerpt,
            image_url: p.coverImage || undefined,
          },
        ],
      },
    },
  };

  try {
    const r = await fetch("https://openapi.zalo.me/v3.0/oa/message/promotion", {
      method: "POST",
      headers: {
        access_token: c.accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { target: { audience_id: "default" } },
        message,
      }),
    });
    const data: any = await r.json().catch(() => ({}));
    if (data?.error && data.error !== 0) {
      return { ok: false, message: `Zalo từ chối: ${data?.message ?? data.error}` };
    }
    return {
      ok: true,
      externalId: String(data?.data?.message_id ?? ""),
      message: "Đã gửi broadcast Zalo OA",
    };
  } catch (err: any) {
    return { ok: false, message: `Lỗi mạng: ${err?.message ?? err}` };
  }
}
