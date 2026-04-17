import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminGuard } from "./guard";
import { useListHotels } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BedDouble, Plus, Edit, Trash2, X, Loader2, ChevronDown } from "lucide-react";
import { useBranding, useFormatPrice } from "@/lib/branding";

const ROOM_STATUSES = ["available", "reserved", "occupied", "cleaning", "maintenance"] as const;
type RoomStatus = (typeof ROOM_STATUSES)[number];

const STATUS_META: Record<RoomStatus, { label: string; cls: string }> = {
  available:   { label: "Trống",       cls: "border-green-400/40 text-green-600 dark:text-green-400 bg-green-500/5" },
  reserved:    { label: "Đã đặt",      cls: "border-amber-400/40 text-amber-700 dark:text-amber-400 bg-amber-500/5" },
  occupied:    { label: "Đang ở",      cls: "border-rose-400/40  text-rose-600  dark:text-rose-400  bg-rose-500/5"  },
  cleaning:    { label: "Đang dọn",    cls: "border-sky-400/40   text-sky-600   dark:text-sky-400   bg-sky-500/5"   },
  maintenance: { label: "Bảo trì",     cls: "border-zinc-400/40  text-zinc-600  dark:text-zinc-400  bg-zinc-500/10" },
};

function deriveStatus(r: any): RoomStatus {
  const s = (r?.status ?? "") as RoomStatus;
  if (ROOM_STATUSES.includes(s)) return s;
  return r?.isAvailable ? "available" : "occupied";
}

const API = import.meta.env.VITE_API_URL ?? "";

const ROOM_TYPES = ["Standard", "Deluxe", "Superior", "Suite", "Junior Suite", "Presidential Suite", "Villa"];
const VIEWS = ["City View", "Pool View", "Garden View", "Ocean View", "Mountain View", "Courtyard View"];

const EMPTY_ROOM = {
  hotelId: 0, roomNumber: "", type: "Deluxe", description: "",
  pricePerNight: "200", capacity: 2, imageUrl: "/images/room-suite.png",
  amenities: [] as string[], isAvailable: true, floor: 1, view: "City View",
};

type RoomForm = typeof EMPTY_ROOM;

function Field({ label, value, onChange, type = "text", placeholder }: any) {
  return (
    <div>
      <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">{label}</label>
      <input type={type} className="w-full border border-primary/25 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors"
        value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function Select({ label, value, onChange, options }: any) {
  return (
    <div>
      <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">{label}</label>
      <select className="w-full border border-primary/25 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none"
        value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function RoomModal({ room, hotels, onClose, onSaved }: { room?: any; hotels: any[]; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState<RoomForm>(room ? {
    hotelId: room.hotelId, roomNumber: room.roomNumber, type: room.type,
    description: room.description, pricePerNight: String(room.pricePerNight),
    capacity: room.capacity, imageUrl: room.imageUrl, amenities: room.amenities ?? [],
    isAvailable: room.isAvailable, floor: room.floor, view: room.view,
  } : { ...EMPTY_ROOM, hotelId: hotels[0]?.id ?? 0 });
  const [saving, setSaving] = useState(false);
  const [amenityInput, setAmenityInput] = useState("");

  const set = (k: keyof RoomForm, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const addAmenity = () => {
    const a = amenityInput.trim();
    if (a && !form.amenities.includes(a)) { set("amenities", [...form.amenities, a]); setAmenityInput(""); }
  };

  const save = async () => {
    if (!form.hotelId || !form.roomNumber) {
      toast({ title: "Missing fields", description: "Hotel and room number are required", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const url = room ? `${API}/api/rooms/${room.id}` : `${API}/api/rooms`;
      const res = await fetch(url, {
        method: room ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, hotelId: Number(form.hotelId), floor: Number(form.floor), capacity: Number(form.capacity) }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      toast({ title: room ? "Room updated" : "Room created", description: `Room ${form.roomNumber}` });
      onSaved();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-card border border-primary/40 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary/20 bg-primary/5 sticky top-0">
          <h2 className="font-serif text-xl text-foreground">{room ? "Edit Room" : "Add New Room"}</h2>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Hotel *</label>
            <select className="w-full border border-primary/25 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none"
              value={form.hotelId} onChange={(e) => set("hotelId", Number(e.target.value))}>
              {hotels.map((h) => <option key={h.id} value={h.id}>{h.name} — {h.city}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Room Number *" value={form.roomNumber} onChange={(v: string) => set("roomNumber", v)} placeholder="e.g. 101" />
            <Select label="Room Type" value={form.type} onChange={(v: string) => set("type", v)} options={ROOM_TYPES} />
            <Field label={`Giá / Đêm (${branding.currency})`} value={form.pricePerNight} onChange={(v: string) => set("pricePerNight", v)} type="number" />
            <Field label="Capacity (guests)" value={String(form.capacity)} onChange={(v: string) => set("capacity", Number(v))} type="number" />
            <Field label="Floor" value={String(form.floor)} onChange={(v: string) => set("floor", Number(v))} type="number" />
            <Select label="View" value={form.view} onChange={(v: string) => set("view", v)} options={VIEWS} />
            <Field label="Image URL" value={form.imageUrl} onChange={(v: string) => set("imageUrl", v)} />
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="accent-primary w-4 h-4" checked={form.isAvailable}
                  onChange={(e) => set("isAvailable", e.target.checked)} />
                <span className="text-sm text-foreground">Available for booking</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Description</label>
            <textarea className="w-full border border-primary/25 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none resize-none h-20"
              value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>

          <div>
            <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Amenities</label>
            <div className="flex gap-2 mb-2">
              <input className="flex-1 border border-primary/25 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none"
                value={amenityInput} onChange={(e) => setAmenityInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAmenity())} placeholder="e.g. Mini Bar, Bathtub" />
              <Button onClick={addAmenity} size="sm" variant="outline" className="rounded-none border-primary/40 text-primary">Add</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {form.amenities.map((a) => (
                <span key={a} className="flex items-center gap-1 text-xs border border-primary/30 text-primary px-2 py-0.5 bg-primary/5">
                  {a} <button onClick={() => set("amenities", form.amenities.filter((x) => x !== a))} className="text-primary/60 hover:text-red-500"><X size={10} /></button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-primary/15 bg-primary/5">
          <Button variant="outline" onClick={onClose} className="rounded-none border-primary/40">Cancel</Button>
          <Button onClick={save} disabled={saving} className="rounded-none bg-primary text-primary-foreground uppercase tracking-widest text-xs px-6">
            {saving ? <Loader2 size={14} className="animate-spin" /> : (room ? "Save Changes" : "Create Room")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RoomsContent() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: hotels } = useListHotels();
  const { branding } = useBranding();
  const fmtPrice = useFormatPrice();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterHotel, setFilterHotel] = useState<number | "all">("all");
  const [filterStatus, setFilterStatus] = useState<RoomStatus | "all">("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editRoom, setEditRoom] = useState<any>(null);

  const loadRooms = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/rooms`);
      const data = await res.json();
      setRooms(data);
    } catch { toast({ title: "Error loading rooms", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadRooms(); }, []);

  const deleteRoom = async (id: number) => {
    if (!confirm("Delete this room?")) return;
    try {
      await fetch(`${API}/api/rooms/${id}`, { method: "DELETE" });
      toast({ title: "Room deleted" });
      loadRooms();
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const filtered = rooms
    .filter((r) => filterHotel === "all" || r.hotelId === filterHotel)
    .filter((r) => filterStatus === "all" || deriveStatus(r) === filterStatus);

  const setStatus = async (room: any, status: RoomStatus) => {
    try {
      const res = await fetch(`${API}/api/rooms/${room.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: `Phòng ${room.roomNumber} → ${STATUS_META[status].label}` });
      loadRooms();
    } catch { toast({ title: "Không thể cập nhật trạng thái", variant: "destructive" }); }
  };
  const hotelName = (id: number) => hotels?.find((h: any) => h.id === id)?.name ?? `Hotel #${id}`;

  return (
    <>
      {addOpen && hotels && <RoomModal hotels={hotels as any[]} onClose={() => setAddOpen(false)} onSaved={() => { setAddOpen(false); loadRooms(); }} />}
      {editRoom && hotels && <RoomModal room={editRoom} hotels={hotels as any[]} onClose={() => setEditRoom(null)} onSaved={() => { setEditRoom(null); loadRooms(); }} />}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <select className="border border-primary/25 bg-background text-sm text-foreground px-3 py-2 outline-none"
            value={filterHotel} onChange={(e) => setFilterHotel(e.target.value === "all" ? "all" : Number(e.target.value))}>
            <option value="all">All Hotels</option>
            {hotels?.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <select className="border border-primary/25 bg-background text-sm text-foreground px-3 py-2 outline-none"
            value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
            <option value="all">Tất cả trạng thái</option>
            {ROOM_STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
          <span className="text-sm text-muted-foreground">{filtered.length} phòng</span>
        </div>
        <Button onClick={() => setAddOpen(true)} className="rounded-none bg-primary text-primary-foreground uppercase tracking-widest text-xs px-5 h-9 gap-1.5">
          <Plus size={13} /> Add Room
        </Button>
      </div>

      <div className="bg-card border border-primary/20">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-primary/15 bg-primary/5">
                {["Room No.", "Hotel", "Type", "Floor", "View", "Capacity", "Price/Night", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-normal whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {loading ? (
                <tr><td colSpan={9} className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-primary" size={20} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="py-12 text-center text-muted-foreground">No rooms found. Add one above.</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="hover:bg-primary/5 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{r.roomNumber}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{hotelName(r.hotelId)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.type}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.floor}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{r.view}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.capacity}</td>
                  <td className="px-4 py-3 text-foreground">{fmtPrice(r.pricePerNight)}</td>
                  <td className="px-4 py-3">
                    {(() => {
                      const st = deriveStatus(r);
                      return (
                        <select
                          value={st}
                          onChange={(e) => setStatus(r, e.target.value as RoomStatus)}
                          className={`text-[10px] tracking-widest uppercase px-2 py-1 border outline-none cursor-pointer ${STATUS_META[st].cls}`}
                          title="Đổi trạng thái phòng"
                        >
                          {ROOM_STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                        </select>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setEditRoom(r)} className="p-1.5 border border-primary/20 text-primary hover:bg-primary/10 transition-colors"><Edit size={12} /></button>
                      <button onClick={() => deleteRoom(r.id)} className="p-1.5 border border-red-300/40 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default function AdminRooms() {
  return (
    <AdminGuard>
      <AdminLayout title="Room Management" subtitle="Manage rooms across all hotel branches">
        <RoomsContent />
      </AdminLayout>
    </AdminGuard>
  );
}
