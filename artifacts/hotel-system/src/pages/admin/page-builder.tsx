import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Puck, type Data } from "@measured/puck";
import "@measured/puck/puck.css";
import { puckConfig, EMPTY_PUCK_DATA } from "@/lib/puck-config";
import { useToast } from "@/hooks/use-toast";
import { AdminGuard } from "./guard";
import { Loader2, ArrowLeft } from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? "";

interface Page {
  id: string;
  title: string;
  slug: string;
  status: "published" | "draft";
  puckData?: Data | null;
}

function PageBuilderInner() {
  const [, params] = useRoute("/admin/pages/:id/builder");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const id = params?.id ?? "";

  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API}/api/pages/admin/${encodeURIComponent(id)}`, { credentials: "include" });
        if (cancelled) return;
        if (r.ok) {
          setPage(await r.json());
        } else {
          toast({ title: "Không tải được trang", variant: "destructive" });
        }
      } catch {
        if (!cancelled) toast({ title: "Lỗi kết nối", variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, toast]);

  const initialData = useMemo<Data>(() => {
    if (page?.puckData && typeof page.puckData === "object") return page.puckData;
    return EMPTY_PUCK_DATA;
  }, [page]);

  const save = async (data: Data) => {
    if (!id) return;
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/pages/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ puckData: data }),
      });
      if (r.ok) {
        toast({ title: "Đã lưu bố cục", description: "Trình tạo trang đã được cập nhật." });
      } else {
        const t = await r.text();
        toast({ title: "Lưu thất bại", description: t.slice(0, 200), variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Lỗi kết nối", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center gap-4 bg-background">
        <p className="text-muted-foreground">Không tìm thấy trang.</p>
        <button onClick={() => navigate("/admin/pages")} className="text-primary underline text-sm">
          ← Về danh sách trang
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-2 border-b border-primary/20 bg-card shrink-0 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/admin/content/pages/${encodeURIComponent(id)}`)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            title="Quay lại trình soạn nội dung"
          >
            <ArrowLeft size={14} /> Trở về
          </button>
          <div className="h-4 w-px bg-border" />
          <div>
            <div className="text-sm font-serif text-foreground">{page.title}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Trình tạo trang trực quan · {page.slug}
            </div>
          </div>
        </div>
        {saving && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 size={12} className="animate-spin" /> Đang lưu...
          </div>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <Puck
          config={puckConfig}
          data={initialData}
          onPublish={save}
        />
      </div>
    </div>
  );
}

export default function PageBuilder() {
  return (
    <AdminGuard>
      <PageBuilderInner />
    </AdminGuard>
  );
}
