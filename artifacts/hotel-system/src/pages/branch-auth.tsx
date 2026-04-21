import { useEffect } from "react";
import { useRoute, Link } from "wouter";
import { SignIn, SignUp } from "@clerk/react";
import { useGetHotel } from "@workspace/api-client-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { MapPin, Star, ChevronLeft } from "lucide-react";
import { setBranchContext } from "@/lib/branch-context";
import { BranchLoader } from "@/components/BranchLoader";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Props {
  mode: "sign-in" | "register";
}

function BranchAuthShell({ slug, mode }: { slug: string; mode: "sign-in" | "register" }) {
  const { data: hotel, isLoading } = useGetHotel(slug as any);

  // Set branch context vao localStorage de sau khi Clerk dang nhap xong,
  // hook trong App.tsx tu dong goi /api/me/branch luu vao DB.
  useEffect(() => {
    if (slug) setBranchContext(slug);
  }, [slug]);

  // Hien BranchLoader animation trong khi tai thong tin chi nhanh
  if (isLoading) {
    const guessCity = slug.includes("hanoi") || slug.includes("ha-noi") ? "Hà Nội"
      : slug.includes("danang") || slug.includes("da-nang") ? "Đà Nẵng"
      : slug.includes("hcm") || slug.includes("ho-chi-minh") || slug.includes("saigon") ? "Hồ Chí Minh"
      : null;
    return <BranchLoader city={guessCity} message={mode === "sign-in" ? "Đang chuẩn bị trang đăng nhập..." : "Đang chuẩn bị trang đăng ký..."} />;
  }

  let heroImage = "/images/hero.png";
  if (hotel?.city.includes("Hà Nội") || hotel?.city.includes("Ha Noi")) heroImage = "/images/hotel-hanoi.png";
  if (hotel?.city.includes("Đà Nẵng") || hotel?.city.includes("Da Nang")) heroImage = "/images/hotel-danang.png";
  if (hotel?.city.includes("Hồ Chí Minh") || hotel?.city.includes("Ho Chi Minh")) heroImage = "/images/hotel-hcmc.png";

  const branchPath = `${basePath}/hotels/${slug}`;
  const signInPath = `${basePath}/hotels/${slug}/sign-in`;
  const registerPath = `${basePath}/hotels/${slug}/register`;

  return (
    <PageLayout>
      <section className="relative min-h-[calc(100vh-80px)] grid grid-cols-1 lg:grid-cols-2 mt-16">
        {/* Branch hero side */}
        <div className="relative bg-secondary text-white overflow-hidden min-h-[300px] lg:min-h-0 flex items-center justify-center px-8 py-16 lg:px-16">
          <img src={heroImage} alt={hotel?.name ?? ""} className="absolute inset-0 w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/80 via-secondary/60 to-secondary/90"></div>

          <div className="relative z-10 max-w-md">
            <Link href={`/hotels/${slug}`} className="inline-flex items-center text-primary text-xs uppercase tracking-[0.3em] mb-8 hover:text-primary/80 transition-colors">
              <ChevronLeft size={14} className="mr-1" /> Về chi nhánh
            </Link>

            <div className="text-primary text-xs uppercase tracking-[0.3em] mb-4">
              {mode === "sign-in" ? "Đăng nhập tại" : "Đăng ký tại"}
            </div>

            {isLoading ? (
              <div className="space-y-3">
                <div className="h-12 bg-white/10 animate-pulse w-3/4"></div>
                <div className="h-4 bg-white/10 animate-pulse w-1/2"></div>
              </div>
            ) : hotel ? (
              <>
                <h1 className="font-serif text-4xl lg:text-5xl mb-4 leading-tight">{hotel.name}</h1>
                <div className="flex items-center gap-1 text-primary mb-6">
                  {[...Array(5)].map((_, i) => (<Star key={i} size={14} fill="currentColor" />))}
                </div>
                <div className="flex items-start gap-2 text-white/80 text-sm mb-8 font-light">
                  <MapPin size={16} className="text-primary mt-0.5 flex-shrink-0" />
                  <span>{hotel.address}, {hotel.city}, {hotel.location}</span>
                </div>
                <p className="text-white/70 font-light leading-relaxed text-sm line-clamp-4">
                  {hotel.description}
                </p>

                <div className="mt-8 pt-8 border-t border-primary/20 text-xs text-white/50 leading-relaxed">
                  Tài khoản của bạn được lưu tại hệ thống MAISON DELUXE chính.
                  Bạn có thể đăng nhập từ bất kỳ chi nhánh nào, hệ thống sẽ ghi nhớ chi nhánh bạn đang ghé thăm.
                </div>
              </>
            ) : (
              <h1 className="font-serif text-4xl">Chi nhánh không tồn tại</h1>
            )}
          </div>
        </div>

        {/* Clerk form side */}
        <div className="flex items-center justify-center bg-background px-4 py-12 lg:px-8">
          <div className="w-full max-w-md">
            {mode === "sign-in" ? (
              <SignIn
                routing="path"
                path={signInPath}
                signUpUrl={registerPath}
                fallbackRedirectUrl={branchPath}
              />
            ) : (
              <SignUp
                routing="path"
                path={registerPath}
                signInUrl={signInPath}
                fallbackRedirectUrl={branchPath}
              />
            )}
          </div>
        </div>
      </section>
    </PageLayout>
  );
}

export default function BranchAuth({ mode }: Props) {
  const [, params] = useRoute(mode === "sign-in" ? "/hotels/:slug/sign-in/*?" : "/hotels/:slug/register/*?");
  const slug = params?.slug ?? "";
  if (!slug) {
    return (
      <PageLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Đường dẫn chi nhánh không hợp lệ.</p>
        </div>
      </PageLayout>
    );
  }
  return <BranchAuthShell slug={slug} mode={mode} />;
}
