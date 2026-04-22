import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Render } from "@measured/puck";
import "@measured/puck/puck.css";
import { PageLayout } from "@/components/layout/PageLayout";
import NotFound from "@/pages/not-found";
import { puckConfig } from "@/lib/puck-config";

const API = import.meta.env.VITE_API_URL ?? "";

interface CmsPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  status: string;
  puckData: any | null;
  metaTitle?: string;
  metaDesc?: string;
}

const EMPTY_PUCK = { content: [], root: { props: {} } };

export default function CmsPagePublic() {
  const [, params] = useRoute("/p/:key");
  const key = params?.key ?? "";
  const [page, setPage] = useState<CmsPage | null | undefined>(undefined); // undefined = loading

  useEffect(() => {
    let cancelled = false;
    if (!key) { setPage(null); return; }
    (async () => {
      try {
        const r = await fetch(`${API}/api/pages/${encodeURIComponent(key)}`);
        if (cancelled) return;
        if (!r.ok) { setPage(null); return; }
        const data = await r.json();
        setPage(data);
      } catch {
        if (!cancelled) setPage(null);
      }
    })();
    return () => { cancelled = true; };
  }, [key]);

  // Cap nhat title/meta khi co data.
  useEffect(() => {
    if (!page) return;
    document.title = page.metaTitle || page.title || "MAISON DELUXE";
    if (page.metaDesc) {
      let m = document.querySelector('meta[name="description"]');
      if (!m) {
        m = document.createElement("meta");
        m.setAttribute("name", "description");
        document.head.appendChild(m);
      }
      m.setAttribute("content", page.metaDesc);
    }
  }, [page]);

  if (page === undefined) {
    return (
      <PageLayout>
        <div className="py-24 text-center text-muted-foreground">Đang tải...</div>
      </PageLayout>
    );
  }
  if (page === null) return <NotFound />;

  // Uu tien puckData; fallback HTML cu (content) neu chua dung trinh keo-tha.
  const hasPuck = page.puckData && Array.isArray(page.puckData.content) && page.puckData.content.length > 0;

  return (
    <PageLayout>
      {hasPuck ? (
        <Render config={puckConfig as any} data={(page.puckData ?? EMPTY_PUCK) as any} />
      ) : page.content ? (
        <article className="container mx-auto px-4 py-12 max-w-4xl prose prose-invert">
          <h1 className="font-serif text-4xl text-foreground mb-6">{page.title}</h1>
          <div dangerouslySetInnerHTML={{ __html: page.content }} />
        </article>
      ) : (
        <section className="py-24 text-center">
          <div className="container mx-auto px-4 max-w-2xl">
            <h1 className="text-4xl font-serif text-foreground mb-4">{page.title}</h1>
            <div className="w-16 h-[2px] bg-primary mx-auto mb-6" />
            <p className="text-muted-foreground">Trang đang được cập nhật. Vui lòng quay lại sau.</p>
          </div>
        </section>
      )}
    </PageLayout>
  );
}
