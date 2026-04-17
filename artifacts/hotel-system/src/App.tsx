import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/lib/i18n";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import HotelDetail from "@/pages/hotel-detail";
import RoomListing from "@/pages/room-listing";
import RoomDetail from "@/pages/room-detail";
import Bookings from "@/pages/bookings";
import BookingDetail from "@/pages/booking-detail";
import SignIn from "@/pages/sign-in";
import Register from "@/pages/register";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/hotels/:id" component={HotelDetail} />
      <Route path="/hotels/:id/rooms" component={RoomListing} />
      <Route path="/rooms/:id" component={RoomDetail} />
      <Route path="/bookings" component={Bookings} />
      <Route path="/bookings/:id" component={BookingDetail} />
      <Route path="/sign-in" component={SignIn} />
      <Route path="/register" component={Register} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="grand-palace-theme">
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
