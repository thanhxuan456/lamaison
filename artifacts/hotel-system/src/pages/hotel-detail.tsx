import { useEffect } from "react";
import { useRoute } from "wouter";
import { useGetHotel, useGetHotelSummary, useListHotelRooms } from "@workspace/api-client-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useT } from "@/lib/i18n";
import { useFormatPrice } from "@/lib/branding";
import { getHotelTemplate } from "@/lib/hotel-templates";
import { setBranchContext } from "@/lib/branch-context";

export default function HotelDetail() {
  const [, params] = useRoute("/hotels/:slug");
  const slug = params?.slug ?? "";
  const { t } = useT();
  const fmtPrice = useFormatPrice();

  // Ghi nho chi nhanh user dang ghe tham — neu user bam Sign In tu navbar binh thuong,
  // hook auto-sync van biet duoc chi nhanh nay de luu vao DB.
  useEffect(() => { if (slug) setBranchContext(slug); }, [slug]);

  const { data: hotel, isLoading: loadingHotel } = useGetHotel(slug as any);
  const { data: summary, isLoading: loadingSummary } = useGetHotelSummary(slug as any);
  const { data: rooms, isLoading: loadingRooms } = useListHotelRooms(slug as any);

  if (loadingHotel) {
    return (
      <PageLayout>
        <div className="h-screen flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </PageLayout>
    );
  }

  if (!hotel) {
    return (
      <PageLayout>
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-4xl font-serif text-foreground mb-4">{t("hotel.notFound.title")}</h1>
          <p className="text-muted-foreground mb-8">{t("hotel.notFound.body")}</p>
          <Button asChild className="bg-primary text-primary-foreground rounded-none px-8 py-6 uppercase tracking-widest">
            <Link href="/">{t("common.backHome")}</Link>
          </Button>
        </div>
      </PageLayout>
    );
  }

  let heroImage = "/images/hero.png";
  if (hotel.city.includes("Hà Nội") || hotel.city.includes("Ha Noi")) heroImage = "/images/hotel-hanoi.png";
  if (hotel.city.includes("Đà Nẵng") || hotel.city.includes("Da Nang")) heroImage = "/images/hotel-danang.png";
  if (hotel.city.includes("Hồ Chí Minh") || hotel.city.includes("Ho Chi Minh")) heroImage = "/images/hotel-hcmc.png";

  const tpl = getHotelTemplate(hotel.layoutTemplate);
  const Template = tpl.component;

  return (
    <PageLayout>
      <Template
        hotel={hotel}
        summary={summary}
        rooms={rooms}
        loadingSummary={loadingSummary}
        loadingRooms={loadingRooms}
        fmtPrice={fmtPrice}
        t={t}
        heroImage={heroImage}
      />
    </PageLayout>
  );
}
