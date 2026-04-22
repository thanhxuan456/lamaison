export interface EditorBlock {
  id: string;
  label: string;
  group: "Bố cục" | "Nội dung" | "Truyền thông" | "Khác";
  html: string;
}

const IMG = (seed: string) =>
  `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=1200&q=70`;

export const EDITOR_BLOCKS: EditorBlock[] = [
  {
    id: "hero-band",
    label: "Hero — Tiêu đề lớn",
    group: "Bố cục",
    html: `
<div style="text-align:center;padding:48px 16px;border-top:1px solid #d4af37;border-bottom:1px solid #d4af37;margin:32px 0;">
  <div style="font-size:11px;letter-spacing:.4em;text-transform:uppercase;color:#b8941f;margin-bottom:16px;">Trải nghiệm độc bản</div>
  <h2 style="font-family:Georgia,serif;font-size:36px;line-height:1.2;margin:0 0 16px;">Khám phá nét quyến rũ riêng có</h2>
  <p style="font-size:16px;color:#6b6b6b;max-width:560px;margin:0 auto 24px;">Một câu mô tả ngắn gọn về điểm nổi bật của chi nhánh, viết bằng giọng văn riêng của bạn.</p>
  <a href="#booking" style="display:inline-block;padding:12px 28px;background:#1a1a1a;color:#fff;text-decoration:none;font-size:12px;letter-spacing:.3em;text-transform:uppercase;">Đặt phòng ngay</a>
</div>`.trim(),
  },
  {
    id: "two-col",
    label: "2 cột — Ảnh + chữ",
    group: "Bố cục",
    html: `
<div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:center;margin:32px 0;">
  <img src="${IMG("1564501049412-61c2a3083791")}" alt="Mô tả ảnh" style="width:100%;height:320px;object-fit:cover;border-radius:0;" />
  <div>
    <div style="font-size:11px;letter-spacing:.4em;text-transform:uppercase;color:#b8941f;margin-bottom:12px;">Tiện nghi đặc biệt</div>
    <h3 style="font-family:Georgia,serif;font-size:26px;margin:0 0 12px;">Tiêu đề khối nội dung</h3>
    <p style="color:#555;line-height:1.7;margin:0 0 12px;">Mô tả chi tiết về dịch vụ, không gian, hoặc trải nghiệm dành riêng cho chi nhánh này. Bạn có thể chỉnh sửa trực tiếp.</p>
    <p style="color:#555;line-height:1.7;margin:0;">Thêm dòng thứ hai nếu cần để cân đối với ảnh bên trái.</p>
  </div>
</div>`.trim(),
  },
  {
    id: "three-feature",
    label: "Lưới 3 tiện nghi",
    group: "Bố cục",
    html: `
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin:32px 0;text-align:center;">
  <div style="padding:24px;border:1px solid #e5d9b6;">
    <div style="font-size:32px;margin-bottom:12px;">◆</div>
    <h4 style="font-family:Georgia,serif;font-size:18px;margin:0 0 8px;">Spa & Wellness</h4>
    <p style="font-size:14px;color:#666;margin:0;">Mô tả ngắn dịch vụ.</p>
  </div>
  <div style="padding:24px;border:1px solid #e5d9b6;">
    <div style="font-size:32px;margin-bottom:12px;">◆</div>
    <h4 style="font-family:Georgia,serif;font-size:18px;margin:0 0 8px;">Hồ bơi vô cực</h4>
    <p style="font-size:14px;color:#666;margin:0;">Mô tả ngắn dịch vụ.</p>
  </div>
  <div style="padding:24px;border:1px solid #e5d9b6;">
    <div style="font-size:32px;margin-bottom:12px;">◆</div>
    <h4 style="font-family:Georgia,serif;font-size:18px;margin:0 0 8px;">Nhà hàng fine-dining</h4>
    <p style="font-size:14px;color:#666;margin:0;">Mô tả ngắn dịch vụ.</p>
  </div>
</div>`.trim(),
  },
  {
    id: "stats",
    label: "Dải số liệu",
    group: "Bố cục",
    html: `
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;padding:32px 16px;background:#1a1a1a;color:#fff;margin:32px 0;text-align:center;">
  <div><div style="font-family:Georgia,serif;font-size:32px;color:#d4af37;">120+</div><div style="font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:#aaa;margin-top:4px;">Phòng nghỉ</div></div>
  <div><div style="font-family:Georgia,serif;font-size:32px;color:#d4af37;">5★</div><div style="font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:#aaa;margin-top:4px;">Tiêu chuẩn</div></div>
  <div><div style="font-family:Georgia,serif;font-size:32px;color:#d4af37;">24/7</div><div style="font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:#aaa;margin-top:4px;">Lễ tân</div></div>
  <div><div style="font-family:Georgia,serif;font-size:32px;color:#d4af37;">98%</div><div style="font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:#aaa;margin-top:4px;">Hài lòng</div></div>
</div>`.trim(),
  },
  {
    id: "gallery-3",
    label: "Gallery 3 ảnh",
    group: "Truyền thông",
    html: `
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:32px 0;">
  <img src="${IMG("1551882547-ff40c63fe5fa")}" alt="Ảnh 1" style="width:100%;height:240px;object-fit:cover;" />
  <img src="${IMG("1566073771259-6a8506099945")}" alt="Ảnh 2" style="width:100%;height:240px;object-fit:cover;" />
  <img src="${IMG("1582719478250-c89cae4dc85b")}" alt="Ảnh 3" style="width:100%;height:240px;object-fit:cover;" />
</div>`.trim(),
  },
  {
    id: "image-full",
    label: "Ảnh full-width",
    group: "Truyền thông",
    html: `
<figure style="margin:32px 0;">
  <img src="${IMG("1564501049412-61c2a3083791")}" alt="Ảnh nổi bật" style="width:100%;height:auto;display:block;" />
  <figcaption style="text-align:center;font-size:12px;color:#888;margin-top:8px;font-style:italic;">Chú thích ảnh — chỉnh sửa nội dung này.</figcaption>
</figure>`.trim(),
  },
  {
    id: "quote",
    label: "Trích dẫn lớn",
    group: "Nội dung",
    html: `
<blockquote style="border-left:3px solid #d4af37;padding:24px 32px;margin:32px 0;background:#faf6ec;font-family:Georgia,serif;">
  <p style="font-size:22px;line-height:1.5;margin:0 0 12px;color:#2a2a2a;">"Một trải nghiệm vượt mong đợi, không gian sang trọng và dịch vụ chu đáo từng chi tiết."</p>
  <footer style="font-size:13px;color:#888;letter-spacing:.15em;text-transform:uppercase;">— Khách hàng</footer>
</blockquote>`.trim(),
  },
  {
    id: "cta",
    label: "CTA — Lời kêu gọi",
    group: "Nội dung",
    html: `
<div style="text-align:center;padding:40px 24px;background:#1a1a1a;color:#fff;margin:32px 0;">
  <h3 style="font-family:Georgia,serif;font-size:26px;margin:0 0 12px;">Sẵn sàng đặt phòng?</h3>
  <p style="color:#bbb;margin:0 0 20px;">Liên hệ chúng tôi để nhận ưu đãi đặc biệt cho kỳ nghỉ của bạn.</p>
  <a href="tel:+842839999999" style="display:inline-block;padding:12px 28px;background:#d4af37;color:#1a1a1a;text-decoration:none;font-size:12px;letter-spacing:.3em;text-transform:uppercase;font-weight:600;">Gọi ngay</a>
</div>`.trim(),
  },
  {
    id: "divider-title",
    label: "Phân cách có tiêu đề",
    group: "Khác",
    html: `
<div style="text-align:center;margin:40px 0;">
  <div style="display:inline-flex;align-items:center;gap:16px;">
    <span style="display:inline-block;width:48px;height:1px;background:#d4af37;"></span>
    <span style="font-size:11px;letter-spacing:.4em;text-transform:uppercase;color:#b8941f;font-family:Georgia,serif;">Phần mới</span>
    <span style="display:inline-block;width:48px;height:1px;background:#d4af37;"></span>
  </div>
</div>`.trim(),
  },
  {
    id: "spacer",
    label: "Khoảng trống",
    group: "Khác",
    html: `<div style="height:48px;"></div>`,
  },
];
