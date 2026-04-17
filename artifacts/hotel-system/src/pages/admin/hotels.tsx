import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminGuard } from "./guard";
import { useListHotels } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Hotel, Plus, Edit, Trash2, Eye, Star, X, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n";
import { Link } from "wouter";

const API = import.meta.env.VITE_API_URL ?? "";

const EMPTY_HOTEL = {
  name: "", location: "", city: "", address: "", description: "",
  rating: "5.0", imageUrl: "/images/hero.png", amenities: [] as string[],
  priceFrom: "500", totalRooms: 50, phone: "", email: "",
};

type HotelForm = typeof EMPTY_HOTEL;

function HotelModal({ hotel, onClose, onSaved }: {
  hotel?: any; onClose: () => void; onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<HotelForm>(hotel ? {
    name: hotel.name, location: hotel.location, city: hotel.city,
    address: hotel.address, description: hotel.description,
    rating: String(hotel.rating), imageUrl: hotel.imageUrl,
    amenities: hotel.amenities ?? [], priceFrom: String(hotel.priceFrom),
    totalRooms: hotel.totalRooms, phone: hotel.phone, email: hotel.email,
  } : EMPTY_HOTEL);
  const [saving, setSaving] = useState(false);
  const [amenityInput, setAmenityInput] = useState("");

  const set = (k: keyof HotelForm, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const addAmenity = () => {
    const a = amenityInput.trim();
    if (a && !form.amenities.includes(a)) {
      set("amenities", [...form.amenities, a]);
      setAmenityInput("");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const url = hotel ? `${API}/api/hotels/${hotel.id}` : `${API}/api/hotels`;
      const method = hotel ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, rating: form.rating, priceFrom: form.priceFrom, totalRooms: Number(form.totalRooms) }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save hotel");
      }
      toast({ title: hotel ? "Hotel updated" : "Hotel created", description: form.name });
      onSaved();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-card border border-primary/40 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary/20 bg-primary/5 sticky top-0">
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-primary font-serif mb-0.5">Grand Palace Admin</div>
            <h2 className="font-serif text-xl text-foreground">{hotel ? "Edit Hotel" : "Add New Hotel"}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Hotel Name *" value={form.name} onChange={(v) => set("name", v)} />
            <Field label="City *" value={form.city} onChange={(v) => set("city", v)} placeholder="e.g. Hà Nội" />
            <Field label="Location / District" value={form.location} onChange={(v) => set("location", v)} />
            <Field label="Address *" value={form.address} onChange={(v) => set("address", v)} />
            <Field label="Phone" value={form.phone} onChange={(v) => set("phone", v)} />
            <Field label="Email" value={form.email} onChange={(v) => set("email", v)} type="email" />
            <Field label="Rating (0–5)" value={form.rating} onChange={(v) => set("rating", v)} type="number" />
            <Field label="Price From (USD)" value={String(form.priceFrom)} onChange={(v) => set("priceFrom", v)} type="number" />
            <Field label="Total Rooms" value={String(form.totalRooms)} onChange={(v) => set("totalRooms", Number(v))} type="number" />
            <Field label="Image URL" value={form.imageUrl} onChange={(v) => set("imageUrl", v)} />
          </div>

          <div>
            <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Description *</label>
            <textarea
              className="w-full border border-primary/25 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none resize-none h-24 transition-colors"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Amenities</label>
            <div className="flex gap-2 mb-2">
              <input
                className="flex-1 border border-primary/25 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none"
                value={amenityInput}
                onChange={(e) => setAmenityInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAmenity())}
                placeholder="e.g. Pool, Spa, Gym"
              />
              <Button onClick={addAmenity} size="sm" variant="outline" className="rounded-none border-primary/40 text-primary">Add</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {form.amenities.map((a) => (
                <span key={a} className="flex items-center gap-1 text-xs border border-primary/30 text-primary px-2 py-0.5 bg-primary/5">
                  {a}
                  <button onClick={() => set("amenities", form.amenities.filter((x) => x !== a))} className="text-primary/60 hover:text-red-500">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-primary/15 bg-primary/5">
          <Button variant="outline" onClick={onClose} className="rounded-none border-primary/40">Cancel</Button>
          <Button onClick={save} disabled={saving} className="rounded-none bg-primary text-primary-foreground uppercase tracking-widest text-xs px-6">
            {saving ? <Loader2 size={14} className="animate-spin" /> : (hotel ? "Save Changes" : "Create Hotel")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">{label}</label>
      <input
        type={type}
        className="w-full border border-primary/25 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function DeleteConfirm({ hotel, onClose, onDeleted }: { hotel: any; onClose: () => void; onDeleted: () => void }) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const confirm = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`${API}/api/hotels/${hotel.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast({ title: "Hotel deleted", description: hotel.name });
      onDeleted();
    } catch {
      toast({ title: "Error", description: "Could not delete hotel", variant: "destructive" });
    } finally { setDeleting(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-sm bg-card border border-red-400/40 shadow-2xl p-6">
        <h3 className="font-serif text-lg text-foreground mb-2">Delete Hotel?</h3>
        <p className="text-sm text-muted-foreground mb-6">This will permanently delete <strong>{hotel.name}</strong> and all its rooms.</p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} className="rounded-none">Cancel</Button>
          <Button onClick={confirm} disabled={deleting} className="rounded-none bg-red-500 text-white hover:bg-red-600">
            {deleting ? <Loader2 size={14} className="animate-spin" /> : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function HotelsContent() {
  const { t } = useT();
  const qc = useQueryClient();
  const { data: hotels, isLoading } = useListHotels();
  const [addOpen, setAddOpen] = useState(false);
  const [editHotel, setEditHotel] = useState<any>(null);
  const [deleteHotel, setDeleteHotel] = useState<any>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["listHotels"] });

  return (
    <>
      {addOpen && <HotelModal onClose={() => setAddOpen(false)} onSaved={() => { setAddOpen(false); refresh(); }} />}
      {editHotel && <HotelModal hotel={editHotel} onClose={() => setEditHotel(null)} onSaved={() => { setEditHotel(null); refresh(); }} />}
      {deleteHotel && <DeleteConfirm hotel={deleteHotel} onClose={() => setDeleteHotel(null)} onDeleted={() => { setDeleteHotel(null); refresh(); }} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-muted-foreground">{hotels?.length ?? 0} hotels in system</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="rounded-none bg-primary text-primary-foreground uppercase tracking-widest text-xs px-5 h-9 gap-1.5">
          <Plus size={13} /> Add Hotel
        </Button>
      </div>

      <div className="bg-card border border-primary/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-primary/15 bg-primary/5">
                {["ID", "Name", "City", "Rooms", "Rating", "Price From", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-normal whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {isLoading ? (
                <tr><td colSpan={7} className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-primary" size={20} /></td></tr>
              ) : hotels?.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-muted-foreground text-sm">No hotels yet. Click "Add Hotel" to create one.</td></tr>
              ) : hotels?.map((h: any) => (
                <tr key={h.id} className="hover:bg-primary/5 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground text-xs">#{h.id}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{h.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{h.city}</td>
                  <td className="px-4 py-3 text-muted-foreground">{h.totalRooms} <span className="text-xs text-green-600 dark:text-green-400">({h.availableRooms} free)</span></td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-primary text-xs">
                      <Star size={11} fill="currentColor" /> {h.rating}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground">${parseFloat(h.priceFrom).toFixed(0)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/hotels/${h.id}`}>
                        <button className="p-1.5 border border-primary/20 text-primary hover:bg-primary/10 transition-colors"><Eye size={12} /></button>
                      </Link>
                      <button onClick={() => setEditHotel(h)} className="p-1.5 border border-primary/20 text-primary hover:bg-primary/10 transition-colors"><Edit size={12} /></button>
                      <button onClick={() => setDeleteHotel(h)} className="p-1.5 border border-red-300/40 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"><Trash2 size={12} /></button>
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

export default function AdminHotels() {
  return (
    <AdminGuard>
      <AdminLayout title="Hotel Management" subtitle="Add, edit and manage hotel properties">
        <HotelsContent />
      </AdminLayout>
    </AdminGuard>
  );
}
