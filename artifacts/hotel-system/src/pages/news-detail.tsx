import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { PageLayout } from "@/components/layout/PageLayout";
import { ArrowLeft, Calendar, Eye, Tag, User, Crown, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API = import.meta.env.VITE_API_URL ?? "";

interface Post {
  id: number; slug: string; title: string; excerpt: string; content: string;
  coverImage: string; category: string; author: string; tags: string;
  views: number; publishedAt: string | null; createdAt: string;
}

export default function NewsDetail() {
  const [, params] = useRoute("/news/:slug");
  const slug = params?.slug;
  const { toast } = useToast();
  const [post, setPost] = useState<Post | null>(null);
  const [related, setRelated] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true); setNotFound(false);
    fetch(`${API}/api/blog-posts/${slug}`)
      .then(async r => { if (r.status === 404) { setNotFound(true); return null; } return r.json(); })
      .then(d => { if (d) setPost(d); })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!post) return;
    fetch(`${API}/api/blog-posts?published=true&category=${post.category}&limit=4`)
      .then(r => r.json())
      .then(d => Array.isArray(d) ? setRelated(d.filter((p: Post) => p.id !== post.id).slice(0, 3)) : setRelated([]));
  }, [post]);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: post?.title, url }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(url); toast({ title: "Đã sao chép liên kết" }); } catch {}
  };

  if (loading) {
    return <PageLayout><div className="py-32 text-center text-muted-foreground">Đang tải bài viết…</div></PageLayout>;
  }
  if (notFound || !post) {
    return (
      <PageLayout>
        <div className="py-32 text-center">
          <h1 className="font-serif text-3xl text-white mb-4">Không tìm thấy bài viết</h1>
          <Link href="/news" className="text-primary hover:underline text-sm tracking-[0.2em] uppercase">← Quay lại Tin tức</Link>
        </div>
      </PageLayout>
    );
  }

  const date = post.publishedAt ?? post.createdAt;
  const tags = post.tags ? post.tags.split(",").map(t => t.trim()).filter(Boolean) : [];

  return (
    <PageLayout>
      {/* Cover */}
      <section className="relative h-[60vh] min-h-[400px] bg-secondary overflow-hidden">
        {post.coverImage ? (
          <>
            <img src={post.coverImage} alt={post.title} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-primary/20"><Crown size={120} /></div>
        )}
        <div className="absolute inset-0 flex items-end pb-12">
          <div className="container mx-auto px-4 md:px-8 max-w-4xl">
            <Link href="/news" className="inline-flex items-center gap-2 text-primary text-[10px] tracking-[0.3em] uppercase mb-6 hover:underline">
              <ArrowLeft size={12} /> Tin tức
            </Link>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] uppercase tracking-[0.3em] text-primary/80 mb-4">
              <span className="inline-flex items-center gap-1.5"><Tag size={11} /> {post.category}</span>
              <span className="inline-flex items-center gap-1.5"><Calendar size={11} /> {new Date(date).toLocaleDateString("vi-VN")}</span>
              <span className="inline-flex items-center gap-1.5"><User size={11} /> {post.author}</span>
              <span className="inline-flex items-center gap-1.5"><Eye size={11} /> {post.views} lượt xem</span>
            </div>
            <h1 className="font-serif text-3xl md:text-5xl text-white max-w-3xl leading-tight">{post.title}</h1>
          </div>
        </div>
      </section>

      {/* Content */}
      <article className="py-16 bg-background">
        <div className="container mx-auto px-4 md:px-8 max-w-3xl">
          {post.excerpt && (
            <p className="text-lg text-muted-foreground italic border-l-2 border-primary pl-6 mb-10 font-serif">{post.excerpt}</p>
          )}

          {/* Render content: support raw HTML if it looks like HTML, otherwise treat as markdown-lite */}
          <div className="prose prose-invert max-w-none text-foreground leading-relaxed
                          prose-headings:font-serif prose-headings:text-white
                          prose-p:text-muted-foreground prose-strong:text-white
                          prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
            {/^\s*<[a-z!]/i.test(post.content)
              ? <div dangerouslySetInnerHTML={{ __html: post.content }} />
              : <RenderPlain text={post.content} />}
          </div>

          {/* Tags + Share */}
          <div className="mt-12 pt-8 border-t border-primary/15 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {tags.map(t => (
                <span key={t} className="px-3 py-1 border border-primary/30 text-primary text-[10px] uppercase tracking-widest">#{t}</span>
              ))}
            </div>
            <button onClick={share} className="inline-flex items-center gap-2 px-5 h-10 border border-primary text-primary hover:bg-primary hover:text-primary-foreground text-[10px] uppercase tracking-[0.25em] transition-colors">
              <Share2 size={12} /> Chia sẻ
            </button>
          </div>
        </div>
      </article>

      {/* Related */}
      {related.length > 0 && (
        <section className="bg-secondary py-16">
          <div className="container mx-auto px-4 md:px-8 max-w-6xl">
            <div className="text-center mb-10">
              <span className="text-primary text-[10px] tracking-[0.4em] uppercase">Bài viết liên quan</span>
              <h2 className="font-serif text-3xl text-white mt-3">Khám phá thêm</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map(p => (
                <Link key={p.id} href={`/news/${p.slug}`} className="group block border border-primary/20 bg-card hover:border-primary transition-colors overflow-hidden">
                    <div className="aspect-[16/10] bg-background overflow-hidden relative">
                      {p.coverImage
                        ? <img src={p.coverImage} alt={p.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        : <div className="absolute inset-0 flex items-center justify-center text-primary/20"><Crown size={32} /></div>}
                    </div>
                    <div className="p-5">
                      <div className="text-[10px] uppercase tracking-[0.3em] text-primary/70 mb-2">{new Date(p.publishedAt ?? p.createdAt).toLocaleDateString("vi-VN")}</div>
                      <h3 className="font-serif text-base text-white line-clamp-2 group-hover:text-primary transition-colors">{p.title}</h3>
                    </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </PageLayout>
  );
}

/** Renders plain text with blank-line paragraphs and `# `, `## ` headings. */
function RenderPlain({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).filter(b => b.trim());
  return (
    <>
      {blocks.map((b, i) => {
        if (/^###\s+/.test(b)) return <h3 key={i}>{b.replace(/^###\s+/, "")}</h3>;
        if (/^##\s+/.test(b))  return <h2 key={i}>{b.replace(/^##\s+/, "")}</h2>;
        if (/^#\s+/.test(b))   return <h1 key={i}>{b.replace(/^#\s+/, "")}</h1>;
        return <p key={i} style={{ whiteSpace: "pre-wrap" }}>{b}</p>;
      })}
    </>
  );
}
