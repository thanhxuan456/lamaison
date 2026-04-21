import { useUser, useClerk, Show } from "@clerk/react";
import { useLocation } from "wouter";
import { PageLayout } from "@/components/layout/PageLayout";
import { useT } from "@/lib/i18n";
import { useListBookings } from "@workspace/api-client-react";
import { useMe } from "@/lib/use-me";
import { Link } from "wouter";
import {
  LogOut, User, Mail, Calendar, Star, Crown, ShieldCheck,
  Camera, Pencil, Lock, CheckCircle2, XCircle, KeyRound,
  Eye, EyeOff, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useRef } from "react";

const ADMIN_EMAIL = "tthanhxuan456@gmail.com";

type Tab = "overview" | "edit" | "security";

/* ─── Ornament corners shared util ─── */
function Corners() {
  return (
    <>
      <span className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-primary" />
      <span className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-primary" />
      <span className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-primary" />
      <span className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-primary" />
    </>
  );
}

/* ─── Avatar Upload Section ─── */
function AvatarUpload({ user, name, initials, isAdmin }: { user: any; name: string; initials: string; isAdmin: boolean }) {
  const { t } = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError(t("profile.avatarTooLarge")); return; }
    setError("");
    setUploading(true);
    try {
      await user.setProfileImage({ file });
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? t("profile.avatarError"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative group cursor-pointer mb-1" onClick={() => fileInputRef.current?.click()}>
        {user?.imageUrl ? (
          <img src={user.imageUrl} alt={name} className="w-24 h-24 rounded-full border-2 border-primary object-cover transition-opacity group-hover:opacity-70" />
        ) : (
          <div className="w-24 h-24 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center transition-opacity group-hover:opacity-70">
            <span className="font-serif text-2xl text-primary font-semibold">{initials}</span>
          </div>
        )}
        <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
          {uploading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Camera size={20} className="text-white" />
          )}
        </div>
        {isAdmin && (
          <div className="absolute -bottom-2 -right-2 bg-primary rounded-full p-1.5">
            <ShieldCheck size={14} className="text-primary-foreground" />
          </div>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="text-[10px] tracking-widest uppercase text-primary/70 hover:text-primary transition-colors mt-2"
        disabled={uploading}
      >
        {uploading ? t("profile.uploading") : t("profile.changeAvatar")}
      </button>
      {error && <p className="text-xs text-red-500 mt-1 text-center">{error}</p>}
    </div>
  );
}

/* ─── Edit Profile Tab ─── */
function EditProfileTab({ user }: { user: any }) {
  const { t } = useT();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!firstName.trim()) { setError(t("profile.firstNameRequired")); return; }
    setSaving(true); setSuccess(false); setError("");
    try {
      await user.update({ firstName: firstName.trim(), lastName: lastName.trim() });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? t("profile.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[11px] tracking-widest uppercase text-muted-foreground">{t("profile.firstName")}</Label>
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="rounded-none border-primary/30 focus:border-primary bg-background text-sm h-10"
            placeholder={t("profile.firstNamePlaceholder")}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] tracking-widest uppercase text-muted-foreground">{t("profile.lastName")}</Label>
          <Input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="rounded-none border-primary/30 focus:border-primary bg-background text-sm h-10"
            placeholder={t("profile.lastNamePlaceholder")}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] tracking-widest uppercase text-muted-foreground">{t("profile.email")}</Label>
        <Input
          value={user?.primaryEmailAddress?.emailAddress ?? ""}
          disabled
          className="rounded-none border-primary/20 bg-muted text-sm h-10 text-muted-foreground cursor-not-allowed"
        />
        <p className="text-[11px] text-muted-foreground">{t("profile.emailNote")}</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 border border-red-200 px-4 py-2">
          <XCircle size={14} /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 px-4 py-2">
          <CheckCircle2 size={14} /> {t("profile.saveSuccess")}
        </div>
      )}

      <Button
        onClick={handleSave}
        disabled={saving}
        className="bg-primary text-primary-foreground rounded-none uppercase tracking-widest text-xs px-8 py-4 hover:bg-primary/90"
      >
        {saving ? (
          <span className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {t("profile.saving")}
          </span>
        ) : (
          <span className="flex items-center gap-2"><Pencil size={13} /> {t("profile.saveChanges")}</span>
        )}
      </Button>
    </div>
  );
}

/* ─── Security Tab ─── */
function SecurityTab({ user }: { user: any }) {
  const { t } = useT();

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [pwdError, setPwdError] = useState("");

  const [verifying, setVerifying] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyCodeSent, setVerifyCodeSent] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  const emailAddress = user?.primaryEmailAddress;
  const isVerified = emailAddress?.verification?.status === "verified";

  const handleChangePassword = async () => {
    if (!newPwd) { setPwdError(t("profile.newPwdRequired")); return; }
    if (newPwd !== confirmPwd) { setPwdError(t("profile.pwdMismatch")); return; }
    if (newPwd.length < 8) { setPwdError(t("profile.pwdTooShort")); return; }
    setPwdError(""); setPwdSaving(true); setPwdSuccess(false);
    try {
      await user.updatePassword({ newPassword: newPwd, currentPassword: currentPwd || undefined });
      setPwdSuccess(true);
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      setTimeout(() => setPwdSuccess(false), 4000);
    } catch (err: any) {
      setPwdError(err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? t("profile.pwdError"));
    } finally {
      setPwdSaving(false);
    }
  };

  const handleSendVerification = async () => {
    setVerifyError(""); setVerifying(true);
    try {
      await emailAddress?.prepareVerification({ strategy: "email_code" });
      setVerifyCodeSent(true);
    } catch (err: any) {
      setVerifyError(err?.errors?.[0]?.message ?? t("profile.verifyError"));
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verifyCode.trim()) return;
    setVerifyError(""); setVerifying(true);
    try {
      await emailAddress?.attemptVerification({ code: verifyCode.trim() });
      setVerifySuccess(true);
      setVerifyCodeSent(false);
      setVerifyCode("");
    } catch (err: any) {
      setVerifyError(err?.errors?.[0]?.message ?? t("profile.verifyCodeError"));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Email Verification */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Mail size={14} className="text-primary" />
          <h4 className="text-sm font-medium tracking-wide uppercase text-foreground/80">{t("profile.emailSecurity")}</h4>
        </div>
        <div className="w-full h-px bg-primary/10" />

        <div className="flex items-center justify-between bg-muted/40 border border-primary/15 px-4 py-3">
          <div>
            <p className="text-sm text-foreground">{emailAddress?.emailAddress}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t("profile.primaryEmail")}</p>
          </div>
          {isVerified ? (
            <span className="flex items-center gap-1.5 text-[11px] tracking-widest uppercase text-green-600 bg-green-50 border border-green-200 px-3 py-1">
              <CheckCircle2 size={11} /> {t("profile.verified")}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[11px] tracking-widest uppercase text-yellow-600 bg-yellow-50 border border-yellow-200 px-3 py-1">
              <XCircle size={11} /> {t("profile.notVerified")}
            </span>
          )}
        </div>

        {!isVerified && !verifySuccess && (
          <div className="space-y-3">
            {!verifyCodeSent ? (
              <Button
                onClick={handleSendVerification}
                disabled={verifying}
                variant="outline"
                className="border-primary/40 text-primary rounded-none uppercase tracking-widest text-xs py-4 flex items-center gap-2 hover:bg-primary/5"
              >
                {verifying ? (
                  <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send size={13} />
                )}
                {t("profile.sendVerifyEmail")}
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-[12px] text-muted-foreground">{t("profile.verifyCodeSent")}</p>
                <div className="flex gap-2">
                  <Input
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    placeholder={t("profile.enterCode")}
                    className="rounded-none border-primary/30 focus:border-primary bg-background text-sm h-10 flex-1"
                    maxLength={6}
                  />
                  <Button
                    onClick={handleVerifyCode}
                    disabled={verifying || !verifyCode.trim()}
                    className="bg-primary text-primary-foreground rounded-none uppercase tracking-widest text-xs px-4 h-10 hover:bg-primary/90"
                  >
                    {verifying ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : t("profile.verify")}
                  </Button>
                </div>
                <button onClick={handleSendVerification} className="text-[11px] text-primary/60 hover:text-primary underline underline-offset-2">
                  {t("profile.resendCode")}
                </button>
              </div>
            )}
          </div>
        )}

        {verifySuccess && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 px-4 py-2">
            <CheckCircle2 size={14} /> {t("profile.verifySuccess")}
          </div>
        )}
        {verifyError && (
          <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 border border-red-200 px-4 py-2">
            <XCircle size={14} /> {verifyError}
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound size={14} className="text-primary" />
          <h4 className="text-sm font-medium tracking-wide uppercase text-foreground/80">{t("profile.changePassword")}</h4>
        </div>
        <div className="w-full h-px bg-primary/10" />

        <div className="space-y-3">
          {/* Current Password */}
          <div className="space-y-1.5">
            <Label className="text-[11px] tracking-widest uppercase text-muted-foreground">{t("profile.currentPassword")}</Label>
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                placeholder="••••••••"
                className="rounded-none border-primary/30 focus:border-primary bg-background text-sm h-10 pr-10"
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <Label className="text-[11px] tracking-widest uppercase text-muted-foreground">{t("profile.newPassword")}</Label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="••••••••"
                className="rounded-none border-primary/30 focus:border-primary bg-background text-sm h-10 pr-10"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label className="text-[11px] tracking-widest uppercase text-muted-foreground">{t("profile.confirmNewPassword")}</Label>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="••••••••"
                className="rounded-none border-primary/30 focus:border-primary bg-background text-sm h-10 pr-10"
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        </div>

        {pwdError && (
          <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 border border-red-200 px-4 py-2">
            <XCircle size={14} /> {pwdError}
          </div>
        )}
        {pwdSuccess && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 px-4 py-2">
            <CheckCircle2 size={14} /> {t("profile.pwdSuccess")}
          </div>
        )}

        <Button
          onClick={handleChangePassword}
          disabled={pwdSaving}
          className="bg-primary text-primary-foreground rounded-none uppercase tracking-widest text-xs px-8 py-4 hover:bg-primary/90"
        >
          {pwdSaving ? (
            <span className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {t("profile.saving")}
            </span>
          ) : (
            <span className="flex items-center gap-2"><Lock size={13} /> {t("profile.updatePassword")}</span>
          )}
        </Button>
      </div>
    </div>
  );
}

/* ─── Overview Tab ─── */
function OverviewTab({ user, bookings }: { user: any; bookings: any[] }) {
  const { t } = useT();
  const totalBookings = bookings?.length ?? 0;

  const stats = [
    { label: t("profile.bookings"), value: totalBookings, icon: Calendar },
    { label: t("profile.points"), value: (totalBookings * 500).toLocaleString(), icon: Star },
    { label: t("profile.tier"), value: totalBookings >= 5 ? "Gold" : "Silver", icon: Crown },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="relative bg-card border border-primary/20 p-5 text-center shadow-sm hover:border-primary/50 transition-colors">
            <Icon size={20} className="text-primary mx-auto mb-2" />
            <div className="font-serif text-2xl text-foreground font-semibold">{value}</div>
            <div className="text-[11px] text-muted-foreground tracking-widest uppercase mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="relative bg-card border border-primary/20 p-6 shadow-sm">
        <h3 className="font-serif text-lg text-foreground mb-4 flex items-center gap-2">
          <Calendar size={16} className="text-primary" />
          {t("profile.recentBookings")}
        </h3>
        {bookings && bookings.length > 0 ? (
          <div className="space-y-3">
            {bookings.slice(0, 5).map((b: any) => (
              <div key={b.id} className="flex items-center justify-between border-b border-primary/10 pb-3 last:border-b-0 last:pb-0">
                <div>
                  <div className="text-sm font-medium text-foreground">{t("profile.booking")} #{b.id}</div>
                  <div className="text-xs text-muted-foreground">{b.checkIn} → {b.checkOut}</div>
                </div>
                <span className={`text-[10px] tracking-widest uppercase px-2 py-1 border ${
                  b.status === "confirmed" ? "border-green-400/40 text-green-600 bg-green-50" :
                  b.status === "pending" ? "border-yellow-400/40 text-yellow-600 bg-yellow-50" :
                  "border-red-400/40 text-red-500 bg-red-50"
                }`}>{b.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <Calendar size={40} className="text-primary/30 mx-auto mb-3" />
            <p className="text-sm">{t("profile.noBookings")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main profile content ─── */
function ProfileContent() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { t } = useT();
  const [, setLocation] = useLocation();
  const { data: bookings } = useListBookings();
  const { data: me } = useMe();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const isAdmin = email === ADMIN_EMAIL;
  const name = user?.fullName ?? user?.firstName ?? "Guest";
  const joined = user?.createdAt ? new Date(user.createdAt).toLocaleDateString("vi-VN") : "";
  const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    setLocation("/");
  };

  const tabs: { id: Tab; label: string; icon: typeof User }[] = [
    { id: "overview", label: t("profile.tabOverview"), icon: User },
    { id: "edit", label: t("profile.tabEdit"), icon: Pencil },
    { id: "security", label: t("profile.tabSecurity"), icon: Lock },
  ];

  return (
    <section className="pt-32 pb-20 bg-background min-h-screen">
      <div className="container mx-auto px-4 md:px-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-10">
          <div className="flex-1 h-px bg-primary/20" />
          <div className="text-[10px] tracking-[0.4em] uppercase text-primary font-serif">{t("profile.title")}</div>
          <div className="flex-1 h-px bg-primary/20" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left sidebar */}
          <div className="relative bg-card border border-primary/30 p-8 flex flex-col items-center text-center shadow-lg h-fit">
            <Corners />

            <AvatarUpload user={user} name={name} initials={initials} isAdmin={isAdmin} />

            <h2 className="font-serif text-xl text-foreground mt-4 mb-1">{name}</h2>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 text-[10px] tracking-widest uppercase bg-primary/15 text-primary border border-primary/40 px-3 py-0.5 mb-2">
                <ShieldCheck size={10} /> Administrator
              </span>
            )}
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5 justify-center">
              <Mail size={12} className="text-primary" /> {email}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 justify-center">
              <Calendar size={11} className="text-primary" /> {t("profile.joined")}: {joined}
            </p>

            <div className="w-full h-px bg-primary/15 my-6" />

            <div className="w-full space-y-2">
              {isAdmin && (
                <Button
                  onClick={() => setLocation("/admin")}
                  className="w-full bg-primary text-primary-foreground rounded-none uppercase tracking-widest text-xs py-5 flex items-center gap-2"
                >
                  <ShieldCheck size={14} /> {t("profile.adminPanel")}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setLocation("/bookings")}
                className="w-full border-primary/40 text-foreground rounded-none uppercase tracking-widest text-xs py-5 flex items-center gap-2 hover:bg-primary/10"
              >
                <Calendar size={14} /> {t("nav.bookings")}
              </Button>
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="w-full border-red-400/40 text-red-500 rounded-none uppercase tracking-widest text-xs py-5 flex items-center gap-2 hover:bg-red-50"
              >
                <LogOut size={14} /> {t("profile.signOut")}
              </Button>
            </div>
          </div>

          {/* Right panel */}
          <div className="lg:col-span-2 space-y-0">
            {/* Tabs */}
            <div className="flex border-b border-primary/20 mb-6">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-5 py-3 text-xs tracking-widest uppercase transition-all border-b-2 -mb-px ${
                    activeTab === id
                      ? "border-primary text-primary font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-primary/30"
                  }`}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>

            {/* Branch info card — chi nhanh user dang dang nhap */}
            {me?.lastLoginHotel || me?.signupHotel ? (
              <div className="relative bg-card border border-primary/30 p-5 mb-6 shadow-sm">
                <span className="pointer-events-none absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2 border-primary" />
                <span className="pointer-events-none absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-primary" />
                <span className="pointer-events-none absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2 border-primary" />
                <span className="pointer-events-none absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2 border-primary" />
                <div className="text-[10px] tracking-[0.3em] uppercase text-primary mb-3 font-serif">Chi nhánh của tôi</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {me.lastLoginHotel && (
                    <Link href={`/hotels/${me.lastLoginHotel.slug}`} className="block group">
                      <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-1">Đăng nhập gần nhất</div>
                      <div className="font-serif text-base text-foreground group-hover:text-primary transition-colors">{me.lastLoginHotel.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{me.lastLoginHotel.city} · {me.lastLoginHotel.location}</div>
                      {me.user?.lastLoginAt && (
                        <div className="text-[10px] text-muted-foreground/70 mt-1">
                          Lần cuối: {new Date(me.user.lastLoginAt).toLocaleString("vi-VN")}
                        </div>
                      )}
                    </Link>
                  )}
                  {me.signupHotel && (
                    <Link href={`/hotels/${me.signupHotel.slug}`} className="block group">
                      <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-1">Đăng ký lần đầu</div>
                      <div className="font-serif text-base text-foreground group-hover:text-primary transition-colors">{me.signupHotel.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{me.signupHotel.city} · {me.signupHotel.location}</div>
                    </Link>
                  )}
                </div>
              </div>
            ) : null}

            {/* Tab content */}
            {activeTab === "overview" && (
              <OverviewTab user={user} bookings={bookings ?? []} />
            )}
            {activeTab === "edit" && (
              <div className="relative bg-card border border-primary/20 p-6 shadow-sm">
                <Corners />
                <h3 className="font-serif text-lg text-foreground mb-5 flex items-center gap-2">
                  <Pencil size={15} className="text-primary" />
                  {t("profile.editProfile")}
                </h3>
                <EditProfileTab user={user} />
              </div>
            )}
            {activeTab === "security" && (
              <div className="relative bg-card border border-primary/20 p-6 shadow-sm">
                <Corners />
                <h3 className="font-serif text-lg text-foreground mb-5 flex items-center gap-2">
                  <ShieldCheck size={15} className="text-primary" />
                  {t("profile.securityTitle")}
                </h3>
                <SecurityTab user={user} />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Profile() {
  return (
    <PageLayout>
      <Show when="signed-in">
        <ProfileContent />
      </Show>
      <Show when="signed-out">
        <section className="pt-32 pb-20 min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <User size={48} className="text-primary/40 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Vui lòng đăng nhập để xem hồ sơ của bạn.</p>
            <Button asChild className="bg-primary text-primary-foreground rounded-none uppercase tracking-widest text-xs px-8 py-5">
              <a href="/sign-in">Đăng nhập</a>
            </Button>
          </div>
        </section>
      </Show>
    </PageLayout>
  );
}
