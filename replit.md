# Workspace — Grand Palace Hotels & Resorts

## Overview

Luxury Vietnamese hotel booking system. pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5 + WebSocket (ws) for live chat
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Clerk (Google OAuth + email)
- **Frontend**: React 19 + Vite + Tailwind v4 + shadcn/ui
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Features

- **3 locations**: Hà Nội (HAN), Đà Nẵng (DAD), Hồ Chí Minh (SGN)
- **4 languages**: Vietnamese (default), English, Chinese, Korean
- **Dark/Light theme** with luxury gold scrollbar
- **Clerk Auth**: Google OAuth + email sign-in/sign-up
- **Admin email**: `tthanhxuan456@gmail.com` has admin access to `/admin`
- **Admin dashboard**: widgets (hotels, bookings, revenue, rating), hotel table, quick actions
- **Admin pages**: Hotels (CRUD modals), Rooms (CRUD + hotel filter), Users (roles + affiliate + guest bookings), Chat (live monitoring), Theme (colors/fonts/toggles), Pages/Posts/CMS, Settings (Payment/General/Affiliate/OAuth/OTA)
- **User profile dashboard**: at `/profile` — booking stats, rewards, recent bookings
- **Live chat**: WebSocket real-time chat at `/api/chat/*` + floating widget on all pages
- **LocationSwitcher**: hotel thumbnail dropdown, scrollable, persists to localStorage
- **Back-to-top button**, ornamental gold corners, Playfair Display serif font
- **OTA Channel Manager**: 8 channels (Booking.com, Agoda, Expedia, Airbnb, Traveloka, TripAdvisor, Trip.com, Klook)
- **System pages**: 404, Maintenance (dark), Server Error (500/503/403)

## DB Tables

- `hotels`, `rooms`, `bookings` — core hotel data
- `chat_sessions`, `chat_messages` — live chat
- `user_roles` — admin role/permission system

## API Routes (all under /api/)

- `GET/POST /api/hotels` — list/create hotels
- `GET/PUT/DELETE /api/hotels/:id` — hotel CRUD
- `GET /api/hotels/:id/rooms` — hotel rooms
- `GET/POST /api/rooms` — list/create rooms
- `GET/PUT/DELETE /api/rooms/:id` — room CRUD
- `GET/POST/PUT/DELETE /api/users` — user roles (user_roles table)
- `GET /api/ota/channels` — OTA channel list
- `PUT /api/ota/channels/:id` — update OTA channel config
- `POST /api/ota/channels/:id/test` — test OTA connection
- `POST /api/ota/channels/:id/sync` — trigger OTA sync
- `POST /api/ota/channels/:id/ingest` — ingest a real booking from an OTA (idempotent on `(source, externalRef)`; auto-dedups guest by normalized email; sets room → reserved)
- `GET/POST /api/bookings` — booking management
- `POST /api/bookings/:id/check-in` — flips booking → `checked_in` + `checkedInAt`; room → `occupied`
- `POST /api/bookings/:id/check-out` — flips booking → `checked_out` + `checkedOutAt`; room → `cleaning`
- `GET /api/guests` — merged guest list (one row per normalized email) with totalBookings + sources + lastStayAt
- `GET /api/guests/:id` — single guest with full booking history across all OTA sources
- `GET /api/guests/export.csv` · `POST /api/guests/bulk-checkout` · `DELETE /api/guests` (refuses guests with active bookings)
- `GET/POST /api/chat/sessions` — live chat sessions
- `WS /api/chat/ws/:sessionId` — WebSocket for live chat

## Admin Access

Only `tthanhxuan456@gmail.com` can access `/admin`. Guard is client-side via Clerk `useUser()`.

## Important Notes

- API server esbuild **CANNOT** bundle `zod` — use plain JS validation in API routes
- LANGUAGES constant lives in `lib/languages.ts` to allow Vite fast-refresh
- useT() returns safe fallback when context null (prevents HMR crashes)
- API routes are mounted at `/api/` by Express, so route handlers use paths WITHOUT `/api/` prefix (e.g. `/hotels` not `/api/hotels`)
- API server requires `CLERK_SECRET_KEY` in production. In local Replit development, Clerk server middleware is enabled only when that secret is present so public/API health routes can run during import.
- Dark mode: `--secondary` color is inverted (cream in dark mode) — intentional for alternating section contrast
- Navbar scrolled state uses `dark:bg-card/95` since secondary is cream in dark mode

## Customizable Site Config (Menu / Footer)

- Server-backed via `app_settings` table. Generic safelisted endpoints `/api/settings/:key` (`theme`, `mainMenu`, `footer`).
- Client providers in `src/lib/site-config.tsx`: `MainMenuProvider`, `FooterConfigProvider` + hooks `useMainMenu()`, `useFooterConfig()`. localStorage cache + server fetch + save.
- `Navbar.tsx` and `Footer.tsx` consume these hooks (no more hardcoded links).
- Admin editor at `/admin/menus`: drag-order menu items, add/toggle/edit, optional CTA button, footer widget editor (brand about, newsletter, columns w/ links, socials, contact, bottom bar).
- `/contact` route registered in App.tsx, page at `src/pages/contact.tsx`.

## E-Invoice Integration (Real Backend)

- Admin page `/admin/integrations?tab=einvoice` — real integration (not mockup)
- Credentials stored securely in Neon PostgreSQL (`app_settings` table, key: `einvoice-config`)
- API routes in `artifacts/api-server/src/routes/integrations.ts`:
  - `GET /api/integrations/einvoice` — returns config with password masked as `••••••••`
  - `PUT /api/integrations/einvoice` — saves to DB; if password sent as `••••••••`, keeps existing
  - `POST /api/integrations/einvoice/test` — makes real HTTP call to provider's login API
- Supports 4 Vietnamese providers: **Viettel sinvoice**, **MISA meInvoice**, **VNPT Invoice**, **FAST Invoice**
- Each provider has a dedicated test function with real `fetch()` calls and proper response parsing
- Frontend (`integrations.tsx`) loads from API on mount, shows DB badge, has "Test kết nối thực tế" button
