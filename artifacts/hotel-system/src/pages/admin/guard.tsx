import { useUser } from "@clerk/react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ADMIN_EMAIL = "tthanhxuan456@gmail.com";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const [, setLocation] = useLocation();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  useEffect(() => {
    if (isLoaded && user && email !== ADMIN_EMAIL) setLocation("/profile");
    else if (isLoaded && !user) setLocation("/sign-in");
  }, [isLoaded, email, user, setLocation]);

  if (!isLoaded) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="animate-spin text-primary" size={28} />
    </div>
  );

  if (!user || email !== ADMIN_EMAIL) return (
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

  return <>{children}</>;
}
