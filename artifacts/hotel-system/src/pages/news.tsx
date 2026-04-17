import { useEffect, useState } from "react";
import { Link } from "wouter";
import { PageLayout } from "@/components/layout/PageLayout";
import { Crown, Calendar, Eye, ArrowRight, Newspaper, Tag } from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? "";

interface Post {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  category: string;
  author: string;
  views: number;
  publishedAt: string | null;
  createdAt: string;
}

const CATEGORIES: { id: string; label: string }[] = [
  { id: "all",       label: "Tất cả" },
  { id: "news",      label: "Tin tức" },
  { id: "promotion", label: "Khuyến mãi" },
  { id: "experience",label: "Trải nghiệm" },
  { id: "culinary",  label: "Ẩm thực" },
  { id: "travel",    label: "Du lịch" },
];

export default function NewsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [cat, setCat] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams({ published: "true" });
    if (cat !== "all") q.set("category", cat);
    fetch(`${API}/api/blog-posts?${q}`)
      .then(r => r.json())
      .then(d => Array.isArray(d) ? setPosts(d) : setPosts([]))
      .finally(() => setLoading(false));
  }, [cat]);

  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <PageLayout>
      {/* Hero */}
      <section className="bg-gradient-to-b from-secondary to-background pt-24 pb-16 border-b border-primary/10">
        <div className="container mx-auto px-4 md:px-8 text-center">
          <div className="inline-flex items-center gap-3 mb-6">
            <span className="w-12 h-px bg-primary" />
            <Crown size={14} className="text-primary" />
            <span className="text-primary text-[10px] tracking-[0.4em] uppercase">Tin tức & Trải nghiệm</span>
            <Crown size={14} className="text-primary" />
            <span className="w-12 h-px bg-primary" />
          </div>
          <h1 className="font-serif text-4xl md:text-6xl text-white mb-4">Câu chuyện Grand Palace</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Khám phá những bài viết mới nhất về khuyến mãi, ẩm thực, văn hoá Việt và những trải nghiệm đẳng cấp tại các khu nghỉ dưỡng của chúng tôi.
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-background border-b border-primary/10 sticky top-0 z-20 backdrop-blur">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex gap-2 overflow-x-auto py-4 no-scrollbar">
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setCat(c.id)}
                className={`px-5 h-10 text-[11px] uppercase tracking-[0.25em] whitespace-nowrap border transition-colors ${
                  cat === c.id ? "bg-primary text-primary-foreground border-primary" : "border-primary/30 text-muted-foreground hover:text-primary hover:border-primary"
                }`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Posts */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          {loading ? (
            <div className="text-center py-20 text-muted-foreground text-sm">Đang tải bài viết…</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20">
              <Newspaper size={32} className="mx-auto text-primary/40 mb-4" />
              <p className="text-muted-foreground">Chưa có bài viết trong chuyên mục này.</p>
            </div>
          ) : (
            <>
              {/* Featured */}
              {featured && (
                <Link href={`/news/${featured.slug}`} className="group block mb-12 border border-primary/20 bg-card hover:border-primary transition-colors overflow-hidden">
                    <div className="grid md:grid-cols-2 gap-0">
                      <div className="aspect-[4/3] md:aspect-auto bg-secondary overflow-hidden relative">
                        {featured.coverImage ? (
                          <img src={featured.coverImage} alt={featured.title}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-primary/30"><Crown size={48} /></div>
                        )}
                        <div className="absolute top-4 left-4 px-3 py-1 bg-primary text-primary-foreground text-[10px] uppercase tracking-widest">Nổi bật</div>
                      </div>
                      <div className="p-8 md:p-12 flex flex-col justify-center">
                        <PostMeta post={featured} />
                        <h2 className="font-serif text-2xl md:text-3xl text-white mt-4 mb-4 group-hover:text-primary transition-colors">{featured.title}</h2>
                        <p className="text-muted-foreground mb-6 line-clamp-3">{featured.excerpt}</p>
                        <span className="inline-flex items-center gap-2 text-primary text-[11px] tracking-[0.3em] uppercase">
                          Đọc bài viết <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </span>
                      </div>
                    </div>
                </Link>
              )}

              {/* Rest grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {rest.map(p => <PostCard key={p.id} post={p} />)}
              </div>
            </>
          )}
        </div>
      </section>
    </PageLayout>
  );
}

function PostCard({ post }: { post: Post }) {
  return (
    <Link href={`/news/${post.slug}`} className="group block border border-primary/15 bg-card hover:border-primary transition-colors overflow-hidden">
        <div className="aspect-[16/10] bg-secondary overflow-hidden relative">
          {post.coverImage ? (
            <img src={post.coverImage} alt={post.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-primary/30"><Crown size={36} /></div>
          )}
        </div>
        <div className="p-6">
          <PostMeta post={post} />
          <h3 className="font-serif text-lg text-white mt-3 mb-2 line-clamp-2 group-hover:text-primary transition-colors">{post.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
        </div>
    </Link>
  );
}

function PostMeta({ post }: { post: Post }) {
  const date = post.publishedAt ?? post.createdAt;
  const cat = CATEGORIES.find(c => c.id === post.category)?.label ?? post.category;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] uppercase tracking-[0.3em] text-primary/70">
      <span className="inline-flex items-center gap-1.5"><Tag size={11} /> {cat}</span>
      <span className="inline-flex items-center gap-1.5"><Calendar size={11} /> {new Date(date).toLocaleDateString("vi-VN")}</span>
      <span className="inline-flex items-center gap-1.5"><Eye size={11} /> {post.views ?? 0}</span>
    </div>
  );
}
