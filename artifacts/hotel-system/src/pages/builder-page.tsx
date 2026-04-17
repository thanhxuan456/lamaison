import { useSitePages } from "@/lib/page-blocks";
import { PageLayout } from "@/components/layout/PageLayout";
import { BlockRenderer } from "@/pages/home";
import NotFound from "@/pages/not-found";

interface BuilderPageProps {
  slug: string;
}

export function BuilderPage({ slug }: BuilderPageProps) {
  const { getPageBySlug } = useSitePages();
  const page = getPageBySlug(slug);

  if (!page) return <NotFound />;

  return (
    <PageLayout>
      {page.blocks.length === 0 ? (
        <section className="py-24 text-center">
          <div className="container mx-auto px-4 max-w-2xl">
            <h1 className="text-4xl font-serif text-foreground mb-4">{page.title}</h1>
            <div className="w-16 h-[2px] bg-primary mx-auto mb-6" />
            <p className="text-muted-foreground">Trang đang được cập nhật. Vui lòng quay lại sau.</p>
          </div>
        </section>
      ) : (
        page.blocks.map((block) => <BlockRenderer key={block.id} block={block} />)
      )}
    </PageLayout>
  );
}

export const FaqPage = () => <BuilderPage slug="/faq" />;
export const CancellationPage = () => <BuilderPage slug="/cancellation-policy" />;
export const MembershipBuilderPage = () => <BuilderPage slug="/membership" />;
export const PrivacyBuilderPage = () => <BuilderPage slug="/privacy" />;
export const TermsBuilderPage = () => <BuilderPage slug="/terms" />;
