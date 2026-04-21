import { PageLayout } from "@/components/layout/PageLayout";
import { useBranchPage, mergeContent } from "@/lib/use-branch-page";
import { DEFAULT_SPA_CONTENT, getSpaTemplate, type SpaContent } from "@/lib/page-templates";

export default function SpaPage() {
  // Lay override per-branch (neu user dang nhap qua chi nhanh nao do).
  // Khi chua co data, hien default content + template classic — KHONG block UI.
  const { data: branchPage } = useBranchPage("spa");

  const content: SpaContent = mergeContent(DEFAULT_SPA_CONTENT, branchPage?.content);
  const tpl = getSpaTemplate(branchPage?.layoutTemplate);
  const Template = tpl.component;
  const branchName = branchPage?.hotel?.name;
  const branchCity = branchPage?.hotel?.city;

  return (
    <PageLayout>
      <Template content={content} branchName={branchName} branchCity={branchCity} />
    </PageLayout>
  );
}
