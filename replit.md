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
- **User profile dashboard**: at `/profile` — booking stats, rewards, recent bookings
- **Live chat**: WebSocket real-time chat at `/api/chat/*` + floating widget on all pages
- **LocationSwitcher**: hotel thumbnail dropdown, persists to localStorage
- **Back-to-top button**, ornamental gold corners, Playfair Display serif font

## DB Tables

- `hotels`, `rooms`, `bookings` — core hotel data
- `chat_sessions`, `chat_messages` — live chat

## Admin Access

Only `tthanhxuan456@gmail.com` can access `/admin`. Guard is client-side via Clerk `useUser()`.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
