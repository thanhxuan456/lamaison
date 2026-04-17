import { useState, FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, Mail, Lock, User, Phone } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useT } from "@/lib/i18n";

export default function Register() {
  const { t } = useT();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    agree: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast({ title: t("toast.error"), description: t("auth.pwdMismatch"), variant: "destructive" });
      return;
    }
    if (!form.agree) {
      toast({ title: t("toast.error"), description: t("auth.mustAgree"), variant: "destructive" });
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast({ title: t("toast.success"), description: t("auth.register.success") });
      setLocation("/sign-in");
    }, 900);
  };

  return (
    <PageLayout>
      <section className="relative min-h-[100vh] pt-32 pb-20 flex items-center bg-background overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20 dark:opacity-15">
          <img src="/images/hotel-danang.png" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-background/70"></div>
        </div>

        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-primary font-serif tracking-[0.3em] text-xs uppercase mb-3">
                {t("auth.welcome")}
              </h2>
              <h1 className="text-4xl md:text-5xl font-serif text-foreground mb-4">
                {t("auth.register.title")}
              </h1>
              <div className="w-16 h-[2px] bg-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground font-light">{t("auth.register.subtitle")}</p>
            </div>

            <div className="relative bg-card text-card-foreground border border-primary/30 p-8 md:p-10 shadow-2xl">
              <span className="pointer-events-none absolute -top-2 -left-2 w-5 h-5 border-t-2 border-l-2 border-primary"></span>
              <span className="pointer-events-none absolute -top-2 -right-2 w-5 h-5 border-t-2 border-r-2 border-primary"></span>
              <span className="pointer-events-none absolute -bottom-2 -left-2 w-5 h-5 border-b-2 border-l-2 border-primary"></span>
              <span className="pointer-events-none absolute -bottom-2 -right-2 w-5 h-5 border-b-2 border-r-2 border-primary"></span>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="uppercase tracking-widest text-xs text-foreground">{t("auth.fullName")}</Label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/70" />
                    <Input id="fullName" name="fullName" required value={form.fullName} onChange={handleChange}
                      className="bg-transparent border-primary/30 focus-visible:ring-primary rounded-none h-12 pl-10" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="uppercase tracking-widest text-xs text-foreground">{t("auth.email")}</Label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/70" />
                      <Input id="email" name="email" type="email" required value={form.email} onChange={handleChange}
                        className="bg-transparent border-primary/30 focus-visible:ring-primary rounded-none h-12 pl-10" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="uppercase tracking-widest text-xs text-foreground">{t("auth.phone")}</Label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/70" />
                      <Input id="phone" name="phone" required value={form.phone} onChange={handleChange}
                        className="bg-transparent border-primary/30 focus-visible:ring-primary rounded-none h-12 pl-10" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="uppercase tracking-widest text-xs text-foreground">{t("auth.password")}</Label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/70" />
                    <Input id="password" name="password" type={showPwd ? "text" : "password"} required minLength={6}
                      value={form.password} onChange={handleChange} placeholder="••••••••"
                      className="bg-transparent border-primary/30 focus-visible:ring-primary rounded-none h-12 px-10" />
                    <button type="button" onClick={() => setShowPwd(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/70 hover:text-primary"
                      aria-label={showPwd ? t("auth.hidePwd") : t("auth.showPwd")}>
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="uppercase tracking-widest text-xs text-foreground">{t("auth.confirmPwd")}</Label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/70" />
                    <Input id="confirmPassword" name="confirmPassword" type={showPwd ? "text" : "password"} required minLength={6}
                      value={form.confirmPassword} onChange={handleChange} placeholder="••••••••"
                      className="bg-transparent border-primary/30 focus-visible:ring-primary rounded-none h-12 pl-10" />
                  </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer text-sm text-foreground/80 pt-1">
                  <Checkbox
                    checked={form.agree}
                    onCheckedChange={(c) => setForm((p) => ({ ...p, agree: !!c }))}
                    className="rounded-none border-primary/40 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground mt-0.5"
                  />
                  <span>
                    {t("auth.agreePrefix")}{" "}
                    <a href="#" className="text-primary hover:underline underline-offset-4">{t("footer.terms")}</a>
                    {" "}&amp;{" "}
                    <a href="#" className="text-primary hover:underline underline-offset-4">{t("footer.privacy")}</a>
                  </span>
                </label>

                <Button type="submit" disabled={submitting}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-none py-6 uppercase tracking-widest text-sm">
                  {submitting ? t("auth.creating") : t("auth.register.submit")}
                </Button>

                <p className="text-center text-sm text-foreground/80">
                  {t("auth.haveAccount")}{" "}
                  <Link href="/sign-in" className="text-primary font-medium hover:underline underline-offset-4">
                    {t("auth.signin.cta")}
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
