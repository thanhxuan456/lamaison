import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/lib/i18n";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { AuthPageLayout } from "@/components/layout/AuthPageLayout";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import HotelDetail from "@/pages/hotel-detail";
import RoomListing from "@/pages/room-listing";
import RoomDetail from "@/pages/room-detail";
import Bookings from "@/pages/bookings";
import BookingDetail from "@/pages/booking-detail";
import Profile from "@/pages/profile";
import AdminDashboard from "@/pages/admin/index";
import AdminHotels from "@/pages/admin/hotels";
import AdminRooms from "@/pages/admin/rooms";
import AdminUsers from "@/pages/admin/users";
import AdminChat from "@/pages/admin/chat";
import AdminTheme from "@/pages/admin/theme";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const goldPrimary = "hsl(46, 65%, 52%)";
const darkBg = "hsl(222, 25%, 10%)";
const lightBg = "hsl(42, 33%, 98%)";

const clerkAppearance = {
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: goldPrimary,
    colorBackground: lightBg,
    colorInputBackground: "#ffffff",
    colorText: "hsl(222, 25%, 15%)",
    colorTextSecondary: "hsl(222, 30%, 28%)",
    colorInputText: "hsl(222, 25%, 15%)",
    colorNeutral: "hsl(222, 25%, 15%)",
    borderRadius: "0px",
    fontFamily: "'Playfair Display', serif",
    fontFamilyButtons: "'Playfair Display', serif",
    fontSize: "15px",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "border border-[hsl(46,65%,52%)] shadow-2xl w-full overflow-hidden",
    card: "!shadow-none !border-0 !rounded-none !bg-[hsl(42,33%,98%)]",
    footer: "!shadow-none !border-0 !rounded-none !bg-[hsl(46,30%,92%)]",
    headerTitle: { color: "hsl(222, 25%, 15%)", fontFamily: "'Playfair Display', serif", letterSpacing: "0.05em" },
    headerSubtitle: { color: "hsl(222, 30%, 28%)" },
    socialButtonsBlockButtonText: { color: "hsl(222, 25%, 15%)" },
    socialButtonsBlockButtonArrow: { color: "hsl(222, 25%, 15%)" },
    formFieldLabel: { color: "hsl(222, 25%, 15%)", letterSpacing: "0.2em", textTransform: "uppercase" as const, fontSize: "11px" },
    footerActionLink: { color: goldPrimary },
    footerActionText: { color: "hsl(222, 30%, 28%)" },
    dividerText: { color: "hsl(222, 30%, 28%)" },
    identityPreviewEditButton: { color: goldPrimary },
    formFieldSuccessText: { color: "hsl(142, 60%, 35%)" },
    alertText: { color: "hsl(0, 84%, 40%)" },
    logoBox: "flex justify-center pt-2",
    logoImage: "h-14 object-contain",
    socialButtonsBlockButton: "border border-[hsl(46,65%,52%,0.4)] hover:border-[hsl(46,65%,52%)] !rounded-none transition-colors !bg-white",
    formButtonPrimary: "!bg-[hsl(46,65%,52%)] hover:!bg-[hsl(46,65%,45%)] !text-black !rounded-none tracking-widest uppercase text-sm",
    formFieldInput: "!border !border-[hsl(46,65%,52%,0.3)] focus:!border-[hsl(46,65%,52%)] !rounded-none !bg-white !text-[hsl(222,25%,15%)]",
    footerAction: "!bg-[hsl(46,30%,92%)]",
    footerPages: { display: "none" },
    dividerLine: "bg-[hsl(46,65%,52%,0.2)]",
  },
};

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false } },
});

function SignInPage() {
  // To update login providers, app branding, or OAuth settings use the Auth
  // pane in the workspace toolbar. More information can be found in the Replit docs.
  return (
    <AuthPageLayout mode="signin">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/register`}
        fallbackRedirectUrl={`${basePath}/profile`}
      />
    </AuthPageLayout>
  );
}

function RegisterPage() {
  // To update login providers, app branding, or OAuth settings use the Auth
  // pane in the workspace toolbar. More information can be found in the Replit docs.
  return (
    <AuthPageLayout mode="register">
      <SignUp
        routing="path"
        path={`${basePath}/register`}
        signInUrl={`${basePath}/sign-in`}
        fallbackRedirectUrl={`${basePath}/profile`}
      />
    </AuthPageLayout>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/hotels/:id" component={HotelDetail} />
      <Route path="/hotels/:id/rooms" component={RoomListing} />
      <Route path="/rooms/:id" component={RoomDetail} />
      <Route path="/bookings" component={Bookings} />
      <Route path="/bookings/:id" component={BookingDetail} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/register/*?" component={RegisterPage} />
      <Route path="/profile/*?" component={Profile} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/hotels" component={AdminHotels} />
      <Route path="/admin/rooms" component={AdminRooms} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/chat" component={AdminChat} />
      <Route path="/admin/theme" component={AdminTheme} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      localization={{
        signIn: { start: { title: "Chào mừng trở lại", subtitle: "Đăng nhập để tiếp tục" } },
        signUp: { start: { title: "Tạo tài khoản", subtitle: "Tham gia Grand Palace ngay hôm nay" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="grand-palace-theme">
      <LanguageProvider>
        <WouterRouter base={basePath}>
          <ClerkProviderWithRoutes />
        </WouterRouter>
        <Toaster />
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
