import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminGuard } from "./guard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Loader2, BookOpen, DollarSign, Shield, Star, Edit,
  Trash2, X, Save, Link2, Copy, Check, UserPlus, TrendingUp,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? "";

type UserRole = "superadmin" | "admin" | "manager" | "staff" | "affiliate" | "vip" | "guest";

interface UserRoleRow {
  id: number;
  clerkUserId: string;
  email: string;
  name?: string;
  role: UserRole;
  affiliateCode?: string;
  commissionRate?: number;
  notes?: string;
  createdAt: string;
}

interface BookingGuest {
  name: string;
  email: string;
  bookings: number;
  spent: number;
  lastBooking: string;
}

const ROLE_META: Record<UserRole, { label: string; color: string; bg: string }> = {
  superadmin: { label: "Super Admin", color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-950/40 border-yellow-300/50" },
  admin:      { label: "Admin",       color: "text-red-600 dark:text-red-400",    bg: "bg-red-50 dark:bg-red-950/40 border-red-300/50" },
  manager:    { label: "Manager",     color: "text-blue-600 dark:text-blue-400",  bg: "bg-blue-50 dark:bg-blue-950/40 border-blue-300/50" },
  staff:      { label: "Staff",       color: "text-green-600 dark:text-green-400",bg: "bg-green-50 dark:bg-green-950/40 border-green-300/50" },
  affiliate:  { label: "Affiliate",   color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/40 border-purple-300/50" },
  vip:        { label: "VIP",         color: "text-primary",                      bg: "bg-primary/10 border-primary/30" },
  guest:      { label: "Guest",       color: "text-muted-foreground",             bg: "bg-muted border-muted-foreground/20" },
};

/* ─── Edit Modal ─── */
function EditModal({ user, onClose, onSaved }: { user: UserRoleRow; onClose: () => void; onSaved: (u: UserRoleRow) => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ role: user.role, commissionRate: user.commissionRate ?? 5, notes: user.notes ?? "" });
  const [saving, setSaving] = useState(false);
  const [genning, setGenning] = useState(false);
  const [copied, setCopied] = useState(false);

  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    const r = await fetch(`${API}/api/users/${user.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (r.ok) { onSaved(await r.json()); toast({ title: "Đã cập nhật người dùng" }); }
    else toast({ title: "Lỗi khi cập nhật", variant: "destructive" });
  };

  const genAffiliate = async () => {
    setGenning(true);
    const r = await fetch(`${API}/api/users/${user.id}/affiliate`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commissionRate: form.commissionRate }),
    });
    setGenning(false);
    if (r.ok) { const updated = await r.json(); onSaved(updated); toast({ title: "Mã affiliate đã tạo", description: updated.affiliateCode }); }
    else toast({ title: "Lỗi tạo mã", variant: "destructive" });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(user.affiliateCode ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-card border border-primary/40 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary/20 bg-primary/5">
          <h2 className="font-serif text-lg text-foreground">Chỉnh sửa người dùng</h2>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* User info */}
          <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/15">
            <div className="w-10 h-10 bg-primary/20 border border-primary flex items-center justify-center text-sm font-serif text-primary">
              {(user.name ?? user.email).charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-medium text-foreground">{user.name ?? "—"}</div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-2">Vai trò / Quyền hạn</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(ROLE_META) as UserRole[]).map((r) => (
                <button key={r} onClick={() => set("role", r)}
                  className={`px-3 py-2 border text-xs font-medium transition-all ${form.role === r ? "border-primary bg-primary/15 text-primary" : "border-primary/20 text-muted-foreground hover:border-primary/40"}`}>
                  {ROLE_META[r].label}
                </button>
              ))}
            </div>
          </div>

          {/* Affiliate section */}
          <div className="border border-primary/20 bg-purple-50/30 dark:bg-purple-950/20 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Link2 size={13} className="text-purple-500" />
              <span className="text-[11px] tracking-[0.2em] uppercase text-purple-600 dark:text-purple-400 font-medium">Affiliate</span>
            </div>

            {user.affiliateCode ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 font-mono text-sm bg-background border border-primary/20 px-3 py-2 text-foreground">
                  {user.affiliateCode}
                </div>
                <button onClick={copyCode} className="p-2 border border-primary/30 text-primary hover:bg-primary/10 transition-colors">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Chưa có mã affiliate</p>
            )}

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-[10px] text-muted-foreground mb-1">Hoa hồng (%)</label>
                <input type="number" min={0} max={100}
                  className="w-full border border-primary/20 bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
                  value={form.commissionRate} onChange={(e) => set("commissionRate", parseInt(e.target.value) || 0)} />
              </div>
              <button onClick={genAffiliate} disabled={genning}
                className="mt-5 flex items-center gap-1.5 px-3 py-1.5 border border-purple-400/50 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-xs transition-colors disabled:opacity-50">
                {genning ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
                {user.affiliateCode ? "Tạo lại" : "Tạo mã"}
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Ghi chú nội bộ</label>
            <textarea className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none resize-none h-20"
              value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Ghi chú về người dùng..." />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-primary/15 bg-primary/5">
          <Button variant="outline" onClick={onClose} className="rounded-none border-primary/40">Hủy</Button>
          <Button onClick={save} disabled={saving} className="rounded-none bg-primary text-primary-foreground uppercase tracking-widest text-xs px-6 gap-1.5">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Lưu thay đổi
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Add User Modal ─── */
function AddModal({ onClose, onAdded }: { onClose: () => void; onAdded: (u: UserRoleRow) => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ clerkUserId: "", email: "", name: "", role: "guest" as UserRole, notes: "" });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.clerkUserId || !form.email) return;
    setSaving(true);
    const r = await fetch(`${API}/api/users`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (r.ok) { onAdded(await r.json()); toast({ title: "Đã thêm người dùng" }); }
    else toast({ title: "Lỗi khi thêm", variant: "destructive" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-primary/40 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary/20 bg-primary/5">
          <h2 className="font-serif text-lg text-foreground">Thêm người dùng</h2>
          <button onClick={onClose}><X size={16} className="text-muted-foreground" /></button>
        </div>
        <div className="p-6 space-y-4">
          {[
            { label: "Clerk User ID *", key: "clerkUserId", placeholder: "user_xxx..." },
            { label: "Email *", key: "email", placeholder: "email@example.com" },
            { label: "Tên hiển thị", key: "name", placeholder: "Nguyễn Văn A" },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">{label}</label>
              <input className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none"
                placeholder={placeholder}
                value={(form as any)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}
          <div>
            <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Vai trò</label>
            <select className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none"
              value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}>
              {(Object.keys(ROLE_META) as UserRole[]).map((r) => (
                <option key={r} value={r}>{ROLE_META[r].label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-primary/15 bg-primary/5">
          <Button variant="outline" onClick={onClose} className="rounded-none border-primary/40">Hủy</Button>
          <Button onClick={save} disabled={saving || !form.clerkUserId || !form.email}
            className="rounded-none bg-primary text-primary-foreground uppercase tracking-widest text-xs px-6 gap-1.5">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />} Thêm
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const { toast } = useToast();
  const [roleUsers, setRoleUsers] = useState<UserRoleRow[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<UserRoleRow | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [tab, setTab] = useState<"roles" | "guests">("roles");
  const [search, setSearch] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ru, bk] = await Promise.all([
        fetch(`${API}/api/users`).then((r) => r.json()).catch(() => []),
        fetch(`${API}/api/bookings`).then((r) => r.json()).catch(() => []),
      ]);
      setRoleUsers(Array.isArray(ru) ? ru : []);
      setBookings(Array.isArray(bk) ? bk : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const deleteUser = async (id: number) => {
    if (!confirm("Xóa phân quyền người dùng này?")) return;
    await fetch(`${API}/api/users/${id}`, { method: "DELETE" });
    setRoleUsers((r) => r.filter((u) => u.id !== id));
    toast({ title: "Đã xóa phân quyền" });
  };

  // Aggregate guests from bookings
  const guestMap = new Map<string, BookingGuest>();
  bookings.forEach((b) => {
    if (!b.guestName) return;
    const key = b.guestEmail || b.guestName;
    const ex = guestMap.get(key);
    if (ex) {
      ex.bookings++;
      ex.spent += parseFloat(b.totalPrice ?? 0);
      if (b.createdAt > ex.lastBooking) ex.lastBooking = b.createdAt;
    } else {
      guestMap.set(key, { name: b.guestName, email: b.guestEmail || "—", bookings: 1, spent: parseFloat(b.totalPrice ?? 0), lastBooking: b.createdAt });
    }
  });
  const guests = Array.from(guestMap.values()).sort((a, b) => b.spent - a.spent);

  const filteredRoles = roleUsers.filter((u) =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );
  const filteredGuests = guests.filter((g) =>
    !search || g.name.toLowerCase().includes(search.toLowerCase()) || g.email.toLowerCase().includes(search.toLowerCase())
  );

  const affiliates = roleUsers.filter((u) => u.role === "affiliate" || u.affiliateCode);

  return (
    <AdminGuard>
      <AdminLayout title="Quản lý Người dùng" subtitle="Phân quyền, affiliate và lịch sử đặt phòng">
        {editUser && <EditModal user={editUser} onClose={() => setEditUser(null)}
          onSaved={(u) => { setRoleUsers((r) => r.map((x) => x.id === u.id ? u : x)); setEditUser(null); }} />}
        {addOpen && <AddModal onClose={() => setAddOpen(false)}
          onAdded={(u) => { setRoleUsers((r) => [...r, u]); setAddOpen(false); }} />}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { icon: Users, label: "Phân quyền", value: roleUsers.length, color: "text-primary" },
            { icon: Star, label: "VIP", value: roleUsers.filter((u) => u.role === "vip").length, color: "text-yellow-500" },
            { icon: Link2, label: "Affiliate", value: affiliates.length, color: "text-purple-500" },
            { icon: BookOpen, label: "Lượt đặt phòng", value: bookings.length, color: "text-blue-500" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-card border border-primary/20 px-4 py-3 flex items-center gap-3">
              <Icon size={16} className={color} />
              <div>
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="font-serif text-2xl text-foreground">{value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs + search + add */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex border-b border-primary/20 -mb-px">
            {([["roles", "Phân quyền"], ["guests", "Khách đặt phòng"]] as const).map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`px-5 py-3 text-sm border-b-2 -mb-px transition-all ${tab === k ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input placeholder="Tìm kiếm..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="border border-primary/20 bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary w-48" />
            {tab === "roles" && (
              <Button onClick={() => setAddOpen(true)} className="rounded-none bg-primary text-primary-foreground text-xs uppercase tracking-widest h-9 px-4 gap-1.5">
                <UserPlus size={13} /> Thêm
              </Button>
            )}
          </div>
        </div>

        {/* Roles tab */}
        {tab === "roles" && (
          <div className="bg-card border border-primary/20 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary/15 bg-primary/5">
                  {["Người dùng", "Email", "Vai trò", "Affiliate", "Hoa hồng", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-normal whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {loading ? (
                  <tr><td colSpan={6} className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-primary" size={20} /></td></tr>
                ) : filteredRoles.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                    Chưa có phân quyền nào. Thêm người dùng để phân quyền.
                  </td></tr>
                ) : filteredRoles.map((u) => {
                  const meta = ROLE_META[u.role as UserRole] ?? ROLE_META.guest;
                  return (
                    <tr key={u.id} className="hover:bg-primary/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary/15 border border-primary/30 flex items-center justify-center text-[11px] font-serif text-primary shrink-0">
                            {(u.name ?? u.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{u.name ?? "—"}</div>
                            {u.notes && <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">{u.notes}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 border uppercase tracking-widest font-medium ${meta.bg} ${meta.color}`}>
                          <Shield size={9} /> {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.affiliateCode
                          ? <span className="font-mono text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 border border-purple-300/40">{u.affiliateCode}</span>
                          : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-sm">
                        {u.affiliateCode ? `${u.commissionRate ?? 5}%` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setEditUser(u)} className="p-1.5 border border-primary/20 text-primary hover:bg-primary/10 transition-colors"><Edit size={12} /></button>
                          <button onClick={() => deleteUser(u.id)} className="p-1.5 border border-red-300/40 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Guests tab */}
        {tab === "guests" && (
          <div className="bg-card border border-primary/20 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary/15 bg-primary/5">
                  {["Khách hàng", "Email", "Đặt phòng", "Tổng chi", "Lần cuối"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-normal whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {loading ? (
                  <tr><td colSpan={5} className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-primary" size={20} /></td></tr>
                ) : filteredGuests.length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center text-muted-foreground text-sm">Chưa có khách đặt phòng.</td></tr>
                ) : filteredGuests.map((g, i) => (
                  <tr key={i} className="hover:bg-primary/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/15 border border-primary/30 flex items-center justify-center text-[11px] font-serif text-primary">
                          {g.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground">{g.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{g.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{g.bookings}</td>
                    <td className="px-4 py-3 text-primary font-medium">${g.spent.toFixed(0)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{g.lastBooking ? new Date(g.lastBooking).toLocaleDateString("vi-VN") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminLayout>
    </AdminGuard>
  );
}
