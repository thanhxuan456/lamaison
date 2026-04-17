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
- `GET/POST /api/bookings` — booking management
- `GET/POST /api/chat/sessions` — live chat sessions
- `WS /api/chat/ws/:sessionId` — WebSocket for live chat

## Admin Access

Only `tthanhxuan456@gmail.com` can access `/admin`. Guard is client-side via Clerk `useUser()`.

## Important Notes

- API server esbuild **CANNOT** bundle `zod` — use plain JS validation in API routes
- LANGUAGES constant lives in `lib/languages.ts` to allow Vite fast-refresh
- useT() returns safe fallback when context null (prevents HMR crashes)
- API routes are mounted at `/api/` by Express, so route handlers use paths WITHOUT `/api/` prefix (e.g. `/hotels` not `/api/hotels`)
- Dark mode: `--secondary` color is inverted (cream in dark mode) — intentional for alternating section contrast
- Navbar scrolled state uses `dark:bg-card/95` since secondary is cream in dark mode
