import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { ThemeApplier } from "@/components/ThemeApplier";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/lib/i18n";
import { SiteContentProvider } from "@/lib/site-content";
import { PageBlocksProvider } from "@/lib/page-blocks";
import { BrandingProvider } from "@/lib/branding";
import { MainMenuProvider, FooterConfigProvider, ContactMapProvider } from "@/lib/site-config";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { AuthPageLayout } from "@/components/layout/AuthPageLayout";
import NotFound from "@/pages/not-found";
import Maintenance from "@/pages/maintenance";
import ServerError from "@/pages/server-error";

import Home from "@/pages/home";
import HotelDetail from "@/pages/hotel-detail";
import RoomListing from "@/pages/room-listing";
import RoomDetail from "@/pages/room-detail";
import CheckoutPage from "@/pages/checkout";
import Bookings from "@/pages/bookings";
import BookingDetail from "@/pages/booking-detail";
import ContractView from "@/pages/contract-view";
import Profile from "@/pages/profile";
import AdminDashboard from "@/pages/admin/index";
import AdminHotels from "@/pages/admin/hotels";
import AdminRooms from "@/pages/admin/rooms";
import AdminUsers from "@/pages/admin/users";
import AdminChat from "@/pages/admin/chat";
import AdminChatTickets from "@/pages/admin/chat-tickets";
import AdminChatTemplates from "@/pages/admin/chat-templates";
import AdminTheme from "@/pages/admin/theme";
import AdminPages from "@/pages/admin/pages";
import AdminBranchPages from "@/pages/admin/branch-pages";
import AdminPaymentConfirm from "@/pages/admin/payment-confirm";
import AdminSettings from "@/pages/admin/settings";
import AdminSeo from "@/pages/admin/seo";
import AdminBuilder from "@/pages/admin/builder";
import AdminPageBuilder from "@/pages/admin/page-builder";
import CmsPagePublic from "@/pages/cms-page";
import AdminMenu from "@/pages/admin/menu";
import AdminInvoices from "@/pages/admin/invoices";
import AdminBookings from "@/pages/admin/bookings";
import AdminGuests from "@/pages/admin/guests";
import AdminMenus from "@/pages/admin/menus";
import AdminBlogs from "@/pages/admin/blogs";
import { AdminPostEditor, AdminPageEditor } from "@/pages/admin/content-editor";
import AdminIntegrations from "@/pages/admin/integrations";
import RoomsLandingPage from "@/pages/rooms";
import SpaPage from "@/pages/spa";
import AboutPage from "@/pages/about";
import ContactPage from "@/pages/contact";
import NewsList from "@/pages/news";
import NewsDetail from "@/pages/news-detail";
import InvoiceView from "@/pages/invoice-view";
import { CancellationPage, MembershipBuilderPage, PrivacyBuilderPage, TermsBuilderPage, FaqPage } from "@/pages/builder-page";
import BranchAuth from "@/pages/branch-auth";
import { useSyncBranchOnSignIn } from "@/lib/use-me";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function resolveClerkProxyUrl(): string | undefined {
  const raw = import.meta.env.VITE_CLERK_PROXY_URL;
  if (!raw) return undefined;
  // Clerk proxy ONLY works with live production keys (pk_live_).
  // Dev/test instances (pk_test_) do not support proxying — using a proxy URL
  // with a test key causes Clerk to silently fail and the sign-in UI never renders.
  if (!clerkPubKey || clerkPubKey.startsWith("pk_test_")) return undefined;
  try {
    const { hostname } = new URL(raw);
    if (!hostname || hostname === "YOUR_SERVER_IP" || hostname === "localhost") return undefined;
    return raw;
  } catch {
    return undefined;
  }
}
const clerkProxyUrl = resolveClerkProxyUrl();

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

function BranchSyncRunner() {
  useSyncBranchOnSignIn();
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/hotels/:slug" component={HotelDetail} />
      <Route path="/hotels/:slug/rooms" component={RoomListing} />
      <Route path="/rooms/:id" component={RoomDetail} />
      <Route path="/checkout/:bookingId" component={CheckoutPage} />
      <Route path="/rooms" component={RoomsLandingPage} />
      <Route path="/spa" component={SpaPage} />
      <Route path="/bookings" component={Bookings} />
      <Route path="/bookings/:id/contract" component={ContractView} />
      <Route path="/bookings/:id" component={BookingDetail} />
      <Route path="/about" component={AboutPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/news" component={NewsList} />
      <Route path="/news/:slug" component={NewsDetail} />
      <Route path="/faq" component={FaqPage} />
      <Route path="/cancellation-policy" component={CancellationPage} />
      <Route path="/membership" component={MembershipBuilderPage} />
      <Route path="/privacy" component={PrivacyBuilderPage} />
      <Route path="/terms" component={TermsBuilderPage} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/register/*?" component={RegisterPage} />
      <Route path="/hotels/:slug/sign-in/*?" component={() => <BranchAuth mode="sign-in" />} />
      <Route path="/hotels/:slug/register/*?" component={() => <BranchAuth mode="register" />} />
      <Route path="/profile/*?" component={Profile} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/hotels" component={AdminHotels} />
      <Route path="/admin/rooms" component={AdminRooms} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/chat" component={AdminChat} />
      <Route path="/admin/chat/tickets" component={AdminChatTickets} />
      <Route path="/admin/chat/templates" component={AdminChatTemplates} />
      <Route path="/admin/theme" component={AdminTheme} />
      <Route path="/admin/pages" component={AdminPages} />
      <Route path="/admin/branch-pages" component={AdminBranchPages} />
      <Route path="/admin/payment-confirm" component={AdminPaymentConfirm} />
      <Route path="/admin/content/posts/new" component={AdminPostEditor} />
      <Route path="/admin/content/posts/:id" component={AdminPostEditor} />
      <Route path="/admin/content/pages/new" component={AdminPageEditor} />
      <Route path="/admin/content/pages/:id" component={AdminPageEditor} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/seo" component={AdminSeo} />
      <Route path="/admin/builder" component={AdminBuilder} />
      <Route path="/admin/pages/:id/builder" component={AdminPageBuilder} />
      <Route path="/p/:key" component={CmsPagePublic} />
      <Route path="/admin/menu" component={AdminMenu} />
      <Route path="/admin/invoices" component={AdminInvoices} />
      <Route path="/admin/bookings" component={AdminBookings} />
      <Route path="/admin/guests" component={AdminGuests} />
      <Route path="/admin/menus" component={AdminMenus} />
      <Route path="/admin/blogs" component={AdminBlogs} />
      <Route path="/admin/integrations" component={AdminIntegrations} />
      <Route path="/invoices/:id" component={InvoiceView} />
      <Route path="/maintenance" component={Maintenance} />
      <Route path="/error" component={() => <ServerError code={500} />} />
      <Route path="/forbidden" component={() => <ServerError code={403} />} />
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
        signUp: { start: { title: "Tạo tài khoản", subtitle: "Tham gia MAISON DELUXE ngay hôm nay" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <BranchSyncRunner />
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
      <ThemeApplier />
      <LanguageProvider>
       <BrandingProvider>
        <SiteContentProvider>
          <PageBlocksProvider>
            <MainMenuProvider>
              <FooterConfigProvider>
                <ContactMapProvider>
                  <WouterRouter base={basePath}>
                    <ClerkProviderWithRoutes />
                  </WouterRouter>
                  <Toaster />
                </ContactMapProvider>
              </FooterConfigProvider>
            </MainMenuProvider>
          </PageBlocksProvider>
        </SiteContentProvider>
       </BrandingProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
