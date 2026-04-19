import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  useMainMenu, useFooterConfig, useContactMap, buildMapEmbedUrl,
  type MainMenu, type MenuItem,
  type FooterConfig, type FooterColumn, type FooterLink, type FooterSocial,
  type ContactMap,
} from "@/lib/site-config";
import { ArrowUp, ArrowDown, Trash2, Plus, Save, ListTree, PanelBottom, MapPin } from "lucide-react";

const genId = () => Math.random().toString(36).slice(2, 10);

export default function AdminMenusPage() {
  const { menu, save: saveMenu } = useMainMenu();
  const { footer, save: saveFooter } = useFooterConfig();
  const { map, save: saveMap } = useContactMap();
  const { toast } = useToast();

  const [m, setM] = useState<MainMenu>(menu);
  const [f, setF] = useState<FooterConfig>(footer);
  const [mp, setMp] = useState<ContactMap>(map);
  const [savingM, setSavingM] = useState(false);
  const [savingF, setSavingF] = useState(false);
  const [savingMp, setSavingMp] = useState(false);

  useEffect(() => setM(menu), [menu]);
  useEffect(() => setF(footer), [footer]);
  useEffect(() => setMp(map), [map]);

  const onSaveMap = async () => {
    setSavingMp(true);
    try {
      await saveMap(mp);
      toast({ title: "Đã lưu", description: "Cấu hình bản đồ đã được cập nhật." });
    } catch (e: any) {
      toast({ title: "Lỗi", description: e.message ?? "Không lưu được", variant: "destructive" });
    } finally { setSavingMp(false); }
  };

  const onSaveMenu = async () => {
    setSavingM(true);
    try {
      await saveMenu(m);
      toast({ title: "Đã lưu", description: "Menu chính đã được cập nhật." });
    } catch (e: any) {
      toast({ title: "Lỗi", description: e.message ?? "Không lưu được", variant: "destructive" });
    } finally { setSavingM(false); }
  };
  const onSaveFooter = async () => {
    setSavingF(true);
    try {
      await saveFooter(f);
      toast({ title: "Đã lưu", description: "Footer đã được cập nhật." });
    } catch (e: any) {
      toast({ title: "Lỗi", description: e.message ?? "Không lưu được", variant: "destructive" });
    } finally { setSavingF(false); }
  };

  // ---- Menu helpers ----
  const updateItem = (id: string, patch: Partial<MenuItem>) =>
    setM({ ...m, items: m.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) });
  const moveItem = (id: string, dir: -1 | 1) => {
    const idx = m.items.findIndex((i) => i.id === id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= m.items.length) return;
    const next = [...m.items];
    [next[idx], next[j]] = [next[j], next[idx]];
    setM({ ...m, items: next });
  };
  const removeItem = (id: string) => setM({ ...m, items: m.items.filter((i) => i.id !== id) });
  const addItem = () => setM({
    ...m,
    items: [...m.items, { id: genId(), label: "Mục mới", href: "/", enabled: true, target: "_self" }],
  });

  // ---- Footer column helpers ----
  const updateCol = (id: string, patch: Partial<FooterColumn>) =>
    setF({ ...f, columns: f.columns.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const addCol = () =>
    setF({ ...f, columns: [...f.columns, { id: genId(), title: "Cột mới", enabled: true, links: [] }] });
  const removeCol = (id: string) => setF({ ...f, columns: f.columns.filter((c) => c.id !== id) });
  const updateLink = (colId: string, linkId: string, patch: Partial<FooterLink>) =>
    setF({
      ...f,
      columns: f.columns.map((c) =>
        c.id === colId ? { ...c, links: c.links.map((l) => (l.id === linkId ? { ...l, ...patch } : l)) } : c
      ),
    });
  const addLink = (colId: string) =>
    setF({
      ...f,
      columns: f.columns.map((c) =>
        c.id === colId ? { ...c, links: [...c.links, { id: genId(), label: "Liên kết", href: "/" }] } : c
      ),
    });
  const removeLink = (colId: string, linkId: string) =>
    setF({
      ...f,
      columns: f.columns.map((c) =>
        c.id === colId ? { ...c, links: c.links.filter((l) => l.id !== linkId) } : c
      ),
    });
  const updateSocial = (i: number, patch: Partial<FooterSocial>) => {
    const next = [...f.socials]; next[i] = { ...next[i], ...patch }; setF({ ...f, socials: next });
  };

  return (
    <AdminLayout title="Menu chính & Footer" subtitle="Tùy chỉnh các liên kết menu trên cùng và các widget chân trang.">
      <Tabs defaultValue="menu">
        <TabsList>
          <TabsTrigger value="menu"><ListTree size={14} className="mr-2" /> Menu chính</TabsTrigger>
          <TabsTrigger value="footer"><PanelBottom size={14} className="mr-2" /> Footer Widgets</TabsTrigger>
          <TabsTrigger value="map"><MapPin size={14} className="mr-2" /> Bản đồ liên hệ</TabsTrigger>
        </TabsList>

        {/* ============ MAIN MENU ============ */}
        <TabsContent value="menu" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Các mục menu</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={addItem}><Plus size={14} className="mr-1" /> Thêm mục</Button>
                <Button size="sm" onClick={onSaveMenu} disabled={savingM}><Save size={14} className="mr-1" /> {savingM ? "Đang lưu…" : "Lưu menu"}</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {m.items.map((it, idx) => (
                <div key={it.id} className="grid grid-cols-12 gap-2 items-center border border-border rounded p-3 bg-card">
                  <div className="col-span-1 flex flex-col gap-1">
                    <Button size="icon" variant="ghost" onClick={() => moveItem(it.id, -1)} disabled={idx === 0}><ArrowUp size={14} /></Button>
                    <Button size="icon" variant="ghost" onClick={() => moveItem(it.id, 1)} disabled={idx === m.items.length - 1}><ArrowDown size={14} /></Button>
                  </div>
                  <div className="col-span-3"><Input value={it.label} placeholder="Nhãn" onChange={(e) => updateItem(it.id, { label: e.target.value })} /></div>
                  <div className="col-span-4"><Input value={it.href} placeholder="/đường-dẫn" onChange={(e) => updateItem(it.id, { href: e.target.value })} /></div>
                  <div className="col-span-2 flex items-center gap-2">
                    <Switch checked={it.target === "_blank"} onCheckedChange={(c) => updateItem(it.id, { target: c ? "_blank" : "_self" })} />
                    <span className="text-xs text-muted-foreground">Mở tab mới</span>
                  </div>
                  <div className="col-span-1 flex items-center justify-center">
                    <Switch checked={it.enabled} onCheckedChange={(c) => updateItem(it.id, { enabled: c })} />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button size="icon" variant="ghost" onClick={() => removeItem(it.id)}><Trash2 size={14} className="text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Nút CTA (tuỳ chọn)</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Nhãn</Label>
                <Input value={m.ctaLabel} onChange={(e) => setM({ ...m, ctaLabel: e.target.value })} />
              </div>
              <div>
                <Label>Liên kết</Label>
                <Input value={m.ctaHref} onChange={(e) => setM({ ...m, ctaHref: e.target.value })} />
              </div>
              <div className="flex items-end gap-3">
                <Switch checked={m.ctaEnabled} onCheckedChange={(c) => setM({ ...m, ctaEnabled: c })} />
                <span className="text-sm text-muted-foreground pb-2">Hiển thị nút</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Tùy chỉnh hiển thị Menu</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Màu chữ menu</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={m.textColor || "#c9a84c"}
                    onChange={(e) => setM({ ...m, textColor: e.target.value })}
                    className="w-10 h-10 rounded border border-input cursor-pointer p-0.5 bg-background"
                  />
                  <Input
                    value={m.textColor || ""}
                    placeholder="Mặc định (theo theme)"
                    onChange={(e) => setM({ ...m, textColor: e.target.value })}
                    className="flex-1 font-mono text-sm"
                  />
                  {m.textColor && (
                    <Button variant="ghost" size="sm" onClick={() => setM({ ...m, textColor: "" })}
                      className="text-xs text-muted-foreground hover:text-foreground px-2">
                      Đặt lại
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Để trống để dùng màu mặc định của theme.</p>
              </div>
              <div className="space-y-2">
                <Label>Cỡ chữ menu (px)</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={10}
                    max={20}
                    step={1}
                    value={m.fontSize ?? 12}
                    onChange={(e) => setM({ ...m, fontSize: Number(e.target.value) })}
                    className="flex-1 accent-primary"
                  />
                  <Input
                    type="number"
                    min={10}
                    max={20}
                    value={m.fontSize ?? 12}
                    onChange={(e) => setM({ ...m, fontSize: Number(e.target.value) })}
                    className="w-20 text-center"
                  />
                  <span className="text-sm text-muted-foreground">px</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cỡ chữ nhỏ hơn giúp các mục menu hiển thị inline trên cùng một hàng.
                </p>
                <div className="mt-2 p-3 border border-dashed border-primary/30 bg-muted/30 rounded">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Xem trước</p>
                  <div className="flex flex-wrap gap-4">
                    {m.items.filter(i => i.enabled).map(i => (
                      <span
                        key={i.id}
                        className="font-medium tracking-wider uppercase whitespace-nowrap"
                        style={{
                          fontSize: `${m.fontSize ?? 12}px`,
                          color: m.textColor || "hsl(var(--primary))",
                        }}
                      >
                        {i.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ FOOTER ============ */}
        <TabsContent value="footer" className="space-y-6 mt-6">
          <div className="flex justify-end">
            <Button onClick={onSaveFooter} disabled={savingF}><Save size={14} className="mr-1" /> {savingF ? "Đang lưu…" : "Lưu footer"}</Button>
          </div>

          <Card>
            <CardHeader><CardTitle>Widget thương hiệu</CardTitle></CardHeader>
            <CardContent>
              <Label>Giới thiệu ngắn</Label>
              <Textarea rows={3} value={f.brand.about} onChange={(e) => setF({ ...f, brand: { about: e.target.value } })} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Bản tin (Newsletter)</CardTitle>
              <div className="flex items-center gap-2">
                <Switch checked={f.newsletter.enabled} onCheckedChange={(c) => setF({ ...f, newsletter: { ...f.newsletter, enabled: c } })} />
                <span className="text-xs text-muted-foreground">Bật widget</span>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Tiêu đề</Label><Input value={f.newsletter.title} onChange={(e) => setF({ ...f, newsletter: { ...f.newsletter, title: e.target.value } })} /></div>
              <div><Label>Nút</Label><Input value={f.newsletter.submitText} onChange={(e) => setF({ ...f, newsletter: { ...f.newsletter, submitText: e.target.value } })} /></div>
              <div className="md:col-span-2"><Label>Mô tả</Label><Textarea rows={2} value={f.newsletter.body} onChange={(e) => setF({ ...f, newsletter: { ...f.newsletter, body: e.target.value } })} /></div>
              <div className="md:col-span-2"><Label>Placeholder</Label><Input value={f.newsletter.placeholder} onChange={(e) => setF({ ...f, newsletter: { ...f.newsletter, placeholder: e.target.value } })} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Cột liên kết</CardTitle>
              <Button variant="outline" size="sm" onClick={addCol}><Plus size={14} className="mr-1" /> Thêm cột</Button>
            </CardHeader>
            <CardContent className="space-y-5">
              {f.columns.map((col) => (
                <div key={col.id} className="border border-border rounded p-4 bg-card space-y-3">
                  <div className="flex items-center gap-3">
                    <Input className="flex-1" value={col.title} onChange={(e) => updateCol(col.id, { title: e.target.value })} placeholder="Tiêu đề cột" />
                    <Switch checked={col.enabled} onCheckedChange={(c) => updateCol(col.id, { enabled: c })} />
                    <Button size="icon" variant="ghost" onClick={() => removeCol(col.id)}><Trash2 size={14} className="text-destructive" /></Button>
                  </div>
                  <div className="space-y-2 pl-3 border-l-2 border-primary/20">
                    {col.links.map((l) => (
                      <div key={l.id} className="grid grid-cols-12 gap-2">
                        <Input className="col-span-5" value={l.label} placeholder="Nhãn" onChange={(e) => updateLink(col.id, l.id, { label: e.target.value })} />
                        <Input className="col-span-6" value={l.href} placeholder="/đường-dẫn" onChange={(e) => updateLink(col.id, l.id, { href: e.target.value })} />
                        <Button size="icon" variant="ghost" className="col-span-1" onClick={() => removeLink(col.id, l.id)}><Trash2 size={14} className="text-destructive" /></Button>
                      </div>
                    ))}
                    <Button size="sm" variant="outline" onClick={() => addLink(col.id)}><Plus size={14} className="mr-1" /> Thêm liên kết</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Mạng xã hội</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {f.socials.map((s, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-2 capitalize text-sm">{s.platform}</div>
                  <Input className="col-span-9" value={s.url} placeholder="https://…" onChange={(e) => updateSocial(i, { url: e.target.value })} />
                  <div className="col-span-1 flex justify-center"><Switch checked={s.enabled} onCheckedChange={(c) => updateSocial(i, { enabled: c })} /></div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Liên hệ</CardTitle>
              <div className="flex items-center gap-2">
                <Switch checked={f.contact.enabled} onCheckedChange={(c) => setF({ ...f, contact: { ...f.contact, enabled: c } })} />
                <span className="text-xs text-muted-foreground">Bật widget</span>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Tiêu đề</Label><Input value={f.contact.title} onChange={(e) => setF({ ...f, contact: { ...f.contact, title: e.target.value } })} /></div>
              <div><Label>Email</Label><Input value={f.contact.email} onChange={(e) => setF({ ...f, contact: { ...f.contact, email: e.target.value } })} /></div>
              <div><Label>Điện thoại</Label><Input value={f.contact.phone} onChange={(e) => setF({ ...f, contact: { ...f.contact, phone: e.target.value } })} /></div>
              <div><Label>Địa chỉ</Label><Input value={f.contact.address} onChange={(e) => setF({ ...f, contact: { ...f.contact, address: e.target.value } })} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Thanh dưới cùng</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch checked={f.bottom.showCopyright} onCheckedChange={(c) => setF({ ...f, bottom: { ...f.bottom, showCopyright: c } })} />
                <span className="text-sm">Hiển thị copyright</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><Label>Nhãn "Điều khoản"</Label><Input value={f.bottom.termsLabel} onChange={(e) => setF({ ...f, bottom: { ...f.bottom, termsLabel: e.target.value } })} /></div>
                <div><Label>Liên kết</Label><Input value={f.bottom.termsHref} onChange={(e) => setF({ ...f, bottom: { ...f.bottom, termsHref: e.target.value } })} /></div>
                <div><Label>Nhãn "Bảo mật"</Label><Input value={f.bottom.privacyLabel} onChange={(e) => setF({ ...f, bottom: { ...f.bottom, privacyLabel: e.target.value } })} /></div>
                <div><Label>Liên kết</Label><Input value={f.bottom.privacyHref} onChange={(e) => setF({ ...f, bottom: { ...f.bottom, privacyHref: e.target.value } })} /></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {/* ============ MAP ============ */}
        <TabsContent value="map" className="space-y-6 mt-6">
          <div className="flex justify-end">
            <Button onClick={onSaveMap} disabled={savingMp}><Save size={14} className="mr-1" /> {savingMp ? "Đang lưu…" : "Lưu bản đồ"}</Button>
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Hiển thị bản đồ trên trang Liên hệ</CardTitle>
              <Switch checked={mp.enabled} onCheckedChange={(c) => setMp({ ...mp, enabled: c })} />
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Tiêu đề</Label><Input value={mp.title} onChange={(e) => setMp({ ...mp, title: e.target.value })} /></div>
              <div><Label>Địa chỉ hiển thị</Label><Input value={mp.address} onChange={(e) => setMp({ ...mp, address: e.target.value })} /></div>
              <div>
                <Label>Nhà cung cấp bản đồ</Label>
                <select className="w-full h-10 px-3 border border-input rounded bg-background text-sm"
                  value={mp.provider}
                  onChange={(e) => setMp({ ...mp, provider: e.target.value as ContactMap["provider"] })}>
                  <option value="openstreetmap">OpenStreetMap (miễn phí, không cần key)</option>
                  <option value="google">Google Maps Embed (dán URL iframe)</option>
                  <option value="custom">Tùy chỉnh (URL iframe bất kỳ)</option>
                </select>
              </div>
              <div>
                <Label>Chiều cao (px)</Label>
                <Input type="number" min={200} max={1000} value={mp.height}
                  onChange={(e) => setMp({ ...mp, height: Number(e.target.value) || 420 })} />
              </div>

              {mp.provider === "openstreetmap" ? (
                <>
                  <div><Label>Vĩ độ (Latitude)</Label><Input type="number" step="0.0001" value={mp.lat}
                    onChange={(e) => setMp({ ...mp, lat: Number(e.target.value) || 0 })} /></div>
                  <div><Label>Kinh độ (Longitude)</Label><Input type="number" step="0.0001" value={mp.lng}
                    onChange={(e) => setMp({ ...mp, lng: Number(e.target.value) || 0 })} /></div>
                  <div><Label>Mức zoom (1-20)</Label><Input type="number" min={1} max={20} value={mp.zoom}
                    onChange={(e) => setMp({ ...mp, zoom: Number(e.target.value) || 14 })} /></div>
                  <div className="flex items-end">
                    <p className="text-xs text-muted-foreground">
                      Mẹo: mở openstreetmap.org, click chuột phải vào vị trí → "Hiển thị địa chỉ" để lấy lat/lng.
                    </p>
                  </div>
                </>
              ) : (
                <div className="md:col-span-2">
                  <Label>URL iframe nhúng</Label>
                  <Textarea rows={3} value={mp.embedUrl}
                    placeholder='Ví dụ: https://www.google.com/maps/embed?pb=...'
                    onChange={(e) => setMp({ ...mp, embedUrl: e.target.value })} />
                  <p className="text-xs text-muted-foreground mt-2">
                    Trên Google Maps: Chia sẻ → Nhúng bản đồ → sao chép phần <code>src="..."</code> trong thẻ iframe.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {mp.enabled && (
            <Card>
              <CardHeader><CardTitle>Xem trước</CardTitle></CardHeader>
              <CardContent>
                {buildMapEmbedUrl(mp) ? (
                  <iframe
                    title="Xem trước bản đồ"
                    src={buildMapEmbedUrl(mp)}
                    style={{ height: Math.min(mp.height, 360), border: 0 }}
                    className="w-full block border border-border rounded"
                    loading="lazy"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground p-6 text-center">Vui lòng nhập URL iframe để xem trước.</p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
