import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { hotelsTable, roomsTable } from "@workspace/db/schema";

const { Pool } = pg;

const connectionString = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
});
const db = drizzle(pool);

const hotels = [
  {
    name: "MAISON DELUXE Hà Nội",
    location: "Hà Nội",
    city: "Hà Nội",
    address: "18 Lý Thường Kiệt, Hoàn Kiếm, Hà Nội",
    description: "Tọa lạc tại trung tâm lịch sử Hà Nội, MAISON DELUXE Hà Nội mang đến trải nghiệm nghỉ dưỡng sang trọng đẳng cấp với view hồ Hoàn Kiếm huyền thoại. Kiến trúc Pháp cổ điển kết hợp cùng nội thất hiện đại tạo nên không gian vừa tinh tế vừa ấm cúng.",
    rating: "4.9",
    imageUrl: "/images/hotel-hanoi.png",
    amenities: ["Hồ bơi vô cực", "Spa & Wellness", "Nhà hàng 5 sao", "Phòng gym", "Dịch vụ đưa đón sân bay", "Concierge 24/7", "WiFi tốc độ cao", "Trung tâm hội nghị"],
    priceFrom: "2500000",
    totalRooms: 120,
    phone: "+84 24 3824 1000",
    email: "hanoi@maisondeluxe.vn",
  },
  {
    name: "MAISON DELUXE Đà Nẵng",
    location: "Đà Nẵng",
    city: "Đà Nẵng",
    address: "120 Võ Nguyên Giáp, Mỹ An, Ngũ Hành Sơn, Đà Nẵng",
    description: "Nằm ngay trên bãi biển Mỹ Khê thơ mộng, MAISON DELUXE Đà Nẵng là thiên đường nghỉ dưỡng biển với tầm nhìn panorama ra biển Đông. Mỗi căn phòng đều được thiết kế để tối ưu hóa ánh sáng tự nhiên và gió biển trong lành.",
    rating: "4.8",
    imageUrl: "/images/hotel-danang.png",
    amenities: ["Bãi biển riêng", "Hồ bơi ngoài trời", "Spa thư giãn", "Nhà hàng hải sản", "Bar rooftop", "Dịch vụ lặn biển", "WiFi tốc độ cao", "Sân tennis"],
    priceFrom: "2200000",
    totalRooms: 95,
    phone: "+84 236 3959 555",
    email: "danang@maisondeluxe.vn",
  },
  {
    name: "MAISON DELUXE Hồ Chí Minh",
    location: "Hồ Chí Minh",
    city: "Hồ Chí Minh",
    address: "8 Công Trường Lam Sơn, Bến Nghé, Quận 1, TP.HCM",
    description: "Biểu tượng của sự xa hoa giữa lòng thành phố năng động nhất Việt Nam, MAISON DELUXE Hồ Chí Minh là điểm đến của giới thượng lưu. Tòa tháp 45 tầng với thiết kế đương đại mang đến tầm nhìn toàn cảnh thành phố choáng ngợp.",
    rating: "4.9",
    imageUrl: "/images/hotel-hcm.png",
    amenities: ["Hồ bơi Sky", "Spa cao cấp", "Nhà hàng fine dining", "Executive lounge", "Phòng họp sang trọng", "Dịch vụ butler", "WiFi tốc độ cao", "Valet parking"],
    priceFrom: "3000000",
    totalRooms: 180,
    phone: "+84 28 3824 2000",
    email: "hcm@maisondeluxe.vn",
  },
];

const roomTemplates = [
  {
    type: "Deluxe",
    description: "Phòng Deluxe sang trọng với nội thất cao cấp, giường King size êm ái và tiện nghi hiện đại. Không gian phòng thoáng đãng, trang trí tinh tế theo phong cách cổ điển Đông Dương.",
    pricePerNight: "2500000",
    capacity: 2,
    floor: 5,
    view: "Thành phố",
    amenities: ["Giường King", "Bồn tắm", "Minibar", "TV 55 inch", "Wifi", "Két sắt", "Máy pha cà phê"],
  },
  {
    type: "Deluxe",
    description: "Phòng Deluxe hướng vườn yên tĩnh, lý tưởng cho những vị khách muốn tìm kiếm sự thư thái giữa lòng thành phố. Thiết kế hài hòa giữa thiên nhiên và không gian sống.",
    pricePerNight: "2300000",
    capacity: 2,
    floor: 3,
    view: "Vườn",
    amenities: ["Giường Queen", "Vòi sen mưa", "Minibar", "TV 49 inch", "Wifi", "Két sắt"],
  },
  {
    type: "Superior",
    description: "Phòng Superior rộng rãi với phong cách trang trí sang trọng, cửa sổ lớn đón ánh sáng tự nhiên. Không gian làm việc tiện nghi dành cho khách công tác.",
    pricePerNight: "3200000",
    capacity: 2,
    floor: 8,
    view: "Thành phố",
    amenities: ["Giường King", "Bồn tắm riêng", "Khu vực làm việc", "TV 65 inch", "Wifi cao tốc", "Két sắt", "Máy pha cà phê Nespresso"],
  },
  {
    type: "Superior",
    description: "Phòng Superior với view biển/sông tuyệt đẹp. Thiết kế hiện đại, nội thất tối giản nhưng đẳng cấp. Cửa sổ từ sàn đến trần giúp tối ưu tầm nhìn panorama.",
    pricePerNight: "3500000",
    capacity: 2,
    floor: 10,
    view: "Biển / Sông",
    amenities: ["Giường King", "Bồn ngâm", "Ban công riêng", "TV 65 inch", "Wifi cao tốc", "Két sắt", "Minibar"],
  },
  {
    type: "Junior Suite",
    description: "Junior Suite với không gian phòng khách riêng biệt, phòng ngủ sang trọng và phòng tắm đôi. Lý tưởng cho các cặp đôi tổ chức kỷ niệm hoặc tuần trăng mật.",
    pricePerNight: "5500000",
    capacity: 2,
    floor: 15,
    view: "Thành phố / Biển",
    amenities: ["Giường King", "Phòng khách riêng", "Bồn ngâm", "Bàn trang điểm", "TV 75 inch", "Hệ thống âm thanh", "Wifi cao tốc", "Minibar cao cấp"],
  },
  {
    type: "Suite",
    description: "Suite hoàng gia với không gian sống đẳng cấp, phòng ăn riêng và khu vực tiếp khách rộng rãi. Được trang bị mọi tiện nghi cao cấp nhất cho một kỳ nghỉ hoàn hảo.",
    pricePerNight: "8500000",
    capacity: 4,
    floor: 20,
    view: "Panorama",
    amenities: ["Phòng ăn riêng", "Bếp nhỏ", "Bồn spa", "Phòng tắm đôi", "TV 85 inch", "Hệ thống smarthome", "Butler riêng", "Wifi cao tốc", "Minibar đầy đủ"],
  },
  {
    type: "Suite",
    description: "Grand Suite với tầm nhìn 270 độ, phòng khách sang trọng và phòng ngủ chính cùng phòng ngủ phụ. Không gian lý tưởng cho gia đình hoặc nhóm khách VIP.",
    pricePerNight: "12000000",
    capacity: 4,
    floor: 25,
    view: "Panorama toàn cảnh",
    amenities: ["2 phòng ngủ", "Phòng khách lớn", "Phòng ăn riêng", "2 phòng tắm", "Bồn spa", "TV 85 inch đa phòng", "Hệ thống smarthome", "Butler riêng", "Minibar premium"],
  },
  {
    type: "Presidential Suite",
    description: "Presidential Suite — đỉnh cao của sự xa hoa. Toàn bộ tầng riêng biệt với thiết kế độc đáo, bể bơi riêng và đội ngũ phục vụ chuyên biệt. Dành cho những khách hàng xứng đáng với trải nghiệm không gì sánh được.",
    pricePerNight: "25000000",
    capacity: 6,
    floor: 30,
    view: "Toàn cảnh 360°",
    amenities: ["Toàn tầng riêng", "Bể bơi riêng", "3 phòng ngủ", "Phòng khách lớn", "Phòng ăn chính thức", "Nhà bếp đầy đủ", "3 phòng tắm", "Bồn spa", "Phòng xông hơi", "TV đa phòng", "Butler riêng 24/7", "Xe đưa đón riêng"],
  },
];

async function seed() {
  console.log("🌱 Seeding database...");

  // Skip if already seeded
  const existing = await db.select().from(hotelsTable).limit(1);
  if (existing.length > 0) {
    console.log("⏭️  Database already seeded, skipping.");
    await pool.end();
    return;
  }

  // Insert hotels
  const insertedHotels = await db.insert(hotelsTable).values(hotels).returning();
  console.log(`✅ Inserted ${insertedHotels.length} hotels`);

  // Insert rooms for each hotel
  for (const hotel of insertedHotels) {
    const rooms = roomTemplates.map((template, index) => ({
      hotelId: hotel.id,
      roomNumber: `${(index + 1) * 100 + Math.floor(Math.random() * 50 + 1)}`,
      type: template.type,
      description: template.description,
      pricePerNight: template.pricePerNight,
      capacity: template.capacity,
      imageUrl: `/images/room-${template.type.toLowerCase().replace(/\s+/g, "-")}.png`,
      amenities: template.amenities,
      isAvailable: true,
      status: "available" as const,
      floor: template.floor,
      view: template.view,
    }));

    await db.insert(roomsTable).values(rooms);
    console.log(`✅ Inserted ${rooms.length} rooms for ${hotel.name}`);
  }

  console.log("🎉 Seeding complete!");
  await pool.end();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
