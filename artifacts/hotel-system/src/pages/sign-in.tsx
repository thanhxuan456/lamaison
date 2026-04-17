import { useState, FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useT } from "@/lib/i18n";

export default function SignIn() {
  const { t } = useT();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", remember: false });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast({ title: t("toast.success"), description: t("auth.signin.success") });
      setLocation("/");
    }, 900);
  };

  return (
    <PageLayout>
      <section className="relative min-h-[100vh] pt-32 pb-20 flex items-center bg-background overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20 dark:opacity-15">
          <img src="/images/hero.png" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-background/70"></div>
        </div>

        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-primary font-serif tracking-[0.3em] text-xs uppercase mb-3">
                {t("auth.welcome")}
              </h2>
              <h1 className="text-4xl md:text-5xl font-serif text-foreground mb-4">
                {t("auth.signin.title")}
              </h1>
              <div className="w-16 h-[2px] bg-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground font-light">{t("auth.signin.subtitle")}</p>
            </div>

            <div className="relative bg-card text-card-foreground border border-primary/30 p-8 md:p-10 shadow-2xl">
              <span className="pointer-events-none absolute -top-2 -left-2 w-5 h-5 border-t-2 border-l-2 border-primary"></span>
              <span className="pointer-events-none absolute -top-2 -right-2 w-5 h-5 border-t-2 border-r-2 border-primary"></span>
              <span className="pointer-events-none absolute -bottom-2 -left-2 w-5 h-5 border-b-2 border-l-2 border-primary"></span>
              <span className="pointer-events-none absolute -bottom-2 -right-2 w-5 h-5 border-b-2 border-r-2 border-primary"></span>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="uppercase tracking-widest text-xs text-foreground">
                    {t("auth.email")}
                  </Label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/70" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      placeholder="email@example.com"
                      className="bg-transparent border-primary/30 text-foreground focus-visible:ring-primary rounded-none h-12 pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="uppercase tracking-widest text-xs text-foreground">
                    {t("auth.password")}
                  </Label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/70" />
                    <Input
                      id="password"
                      name="password"
                      type={showPwd ? "text" : "password"}
                      required
                      minLength={6}
                      value={form.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="bg-transparent border-primary/30 text-foreground focus-visible:ring-primary rounded-none h-12 px-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/70 hover:text-primary"
                      aria-label={showPwd ? t("auth.hidePwd") : t("auth.showPwd")}
                    >
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer text-foreground/80">
                    <Checkbox
                      checked={form.remember}
                      onCheckedChange={(c) => setForm((p) => ({ ...p, remember: !!c }))}
                      className="rounded-none border-primary/40 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                    />
                    <span>{t("auth.remember")}</span>
                  </label>
                  <a href="#" className="text-primary hover:underline underline-offset-4">
                    {t("auth.forgot")}
                  </a>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-none py-6 uppercase tracking-widest text-sm"
                >
                  {submitting ? t("auth.signing") : t("auth.signin.submit")}
                </Button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full h-px bg-primary/20"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-card px-4 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                      {t("auth.or")}
                    </span>
                  </div>
                </div>

                <p className="text-center text-sm text-foreground/80">
                  {t("auth.noAccount")}{" "}
                  <Link href="/register" className="text-primary font-medium hover:underline underline-offset-4">
                    {t("auth.register.cta")}
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
