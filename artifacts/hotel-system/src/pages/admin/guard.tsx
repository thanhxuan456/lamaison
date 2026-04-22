import { useUser } from "@clerk/react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMyRole, isAdminRole } from "@/lib/use-my-role";

export const ADMIN_EMAIL = "tthanhxuan456@gmail.com";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const [, setLocation] = useLocation();
  const { data: me, isLoading: roleLoading, isError: roleError } = useMyRole();

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  // Bootstrap: email super admin luon vuot qua kiem tra du API role chua tra ve.
  const isBootstrapSuper = email === ADMIN_EMAIL;
  const allowed = isBootstrapSuper || isAdminRole(me?.role);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) { setLocation("/sign-in"); return; }
    // Cho API role hoac bootstrap, sau do moi quyet dinh tu choi.
    if (!isBootstrapSuper && !roleLoading && !roleError && me && !isAdminRole(me.role)) {
      setLocation("/profile");
    }
  }, [isLoaded, user, isBootstrapSuper, roleLoading, roleError, me, setLocation]);

  if (!isLoaded || (user && roleLoading && !isBootstrapSuper)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  if (!user || !allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <ShieldCheck size={48} className="text-primary/40 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Bạn không có quyền truy cập trang này.</p>
          <Button asChild className="rounded-none bg-primary text-primary-foreground uppercase tracking-widest text-xs px-8 py-5">
            <a href="/sign-in">Đăng nhập</a>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
