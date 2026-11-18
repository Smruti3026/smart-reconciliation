# Smart Reconciliation Platform

## 1. Project

**Name:** Smart Reconciliation Platform  
**Purpose:** A web app for Indian accountants and small businesses to reconcile
ledgers (customer and vendor) against each other.  
**Current Phase:** Phase 1 — UI shell and authentication only, with mock data.
The real matching engine (Python/FastAPI) comes in a later phase.

### Phase 1 Scope (only these 5 screens exist)

| Screen                    | Route                      | Description                                |
| ------------------------- | -------------------------- | ------------------------------------------ |
| Login                     | `/login`                   | Email + password sign-in                   |
| Sign Up                   | `/signup`                  | Email + password registration              |
| Dashboard                 | `/dashboard`               | Summary cards, charts, recent activity     |
| Customer Reconciliation   | `/customer-reconciliation` | Match customer ledger vs books             |
| Vendor Reconciliation     | `/vendor-reconciliation`   | Match vendor ledger vs books               |
| Profile                   | `/profile`                 | View/edit user profile, change password    |

**Out of scope for Phase 1:** GST reconciliation, bank reconciliation, OCR,
file-processing logic, the Python backend, and any real matching engine.

---

## 2. Tech Stack

All frontend code lives at the project root (Next.js project).  
A future `/backend` folder is reserved for Python FastAPI.

| Layer         | Technology                                   |
| ------------- | -------------------------------------------- |
| Framework     | Next.js 16 (App Router)                      |
| Language      | TypeScript (strict mode)                     |
| Styling       | Tailwind CSS v4 + CSS variables              |
| Components    | shadcn/ui (base-vega style)                  |
| Auth          | Supabase Auth via `@supabase/ssr`            |
| Icons         | lucide-react                                 |
| Charts        | Recharts                                     |
| Tables        | @tanstack/react-table                        |
| Forms         | react-hook-form + @hookform/resolvers + zod  |
| Dates         | date-fns                                     |
| Numbers       | decimal.js                                   |

---

## 3. Folder Structure

```
/
├── src/
│   ├── app/
│   │   ├── globals.css                  # Design tokens + Tailwind theme
│   │   ├── layout.tsx                   # Root layout (Inter font, metadata)
│   │   ├── (auth)/                      # Public auth routes (no sidebar)
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   └── (app)/                       # Protected app routes (with sidebar)
│   │       ├── layout.tsx               # App shell layout (sidebar + topbar)
│   │       ├── dashboard/page.tsx
│   │       ├── customer-reconciliation/page.tsx
│   │       ├── vendor-reconciliation/page.tsx
│   │       └── profile/page.tsx
│   ├── components/
│   │   ├── ui/                          # shadcn/ui primitives (button, input…)
│   │   ├── layout/                      # Sidebar, Topbar, AppShell
│   │   └── shared/                      # Reusable business components
│   ├── lib/
│   │   ├── utils.ts                     # cn() and shared helpers
│   │   ├── supabase/
│   │   │   ├── client.ts               # Browser Supabase client
│   │   │   ├── server.ts               # Server-side Supabase client
│   │   │   └── proxy.ts                # Supabase proxy helper (session refresh)
│   │   └── mock-data/                   # Static mock data for Phase 1
│   │       └── index.ts
│   └── hooks/                           # Custom React hooks
├── proxy.ts                             # Next.js 16 proxy (was middleware.ts)
├── backend/                             # Reserved for Python FastAPI (Phase 2+)
└── ...config files
```

---

## 4. Design System

### Colour Palette

| Token                | Value     | Usage                                 |
| -------------------- | --------- | ------------------------------------- |
| `--background`       | `#FAF8F3` | Page background (off-white)           |
| `--card`             | `#FFFFFF` | Card / surface background             |
| `--card-border`      | `#E8E4D9` | Card 1px border                       |
| `--primary`          | `#1F6B4A` | Primary green (buttons, links)        |
| `--primary-hover`    | `#185A3E` | Primary hover state                   |
| `--primary-light`    | `#E7F2EC` | Light green tint (badges, bg)         |
| `--foreground`       | `#1B2A22` | Primary text                          |
| `--muted-foreground` | `#6B7A71` | Secondary / muted text                |
| `--success`          | `#1F6B4A` | Success state (same as primary green) |
| `--warning`          | `#B7791F` | Warning / amber                       |
| `--destructive`      | `#B3382C` | Danger / error red                    |

### Typography

- **Font:** Inter (loaded via `next/font/google`)
- Headings use `font-semibold` or `font-bold`
- Body at `text-sm` / `text-base`

### Shape & Elevation

- Cards: `rounded-xl`, `border border-card-border`, `shadow-sm`
- Buttons: `rounded-lg`
- Generous padding (`p-6` cards, `p-4` sections)
- Soft shadow: `shadow-sm` or `shadow-md`, never harsh

### Aesthetic Rules

- Clean, professional, calm — like a finance tool
- **No gradients, no neon, no dark mode** (Phase 1)
- Fully responsive: mobile → tablet → desktop
- Accessible contrast ratios (WCAG AA) and visible focus states

---

## 5. Coding Rules

1. **TypeScript strict** — `strict: true` in tsconfig. Never use `any`.
2. **Server Components by default.** Only add `"use client"` when the component
   needs browser APIs, hooks, or event handlers.
3. **Reusable components** — extract repeated UI into `components/shared/`.
4. **Every page must handle three states:** loading, empty, and error.
5. **Plain business language** in all UI text — no jargon like "query",
   "mutation", "payload". Write as if talking to an accountant.
6. **Indian locale formats:**
   - Currency: `₹` prefix with Indian digit grouping → `₹12,34,567.50`
   - Dates: `dd/MM/yyyy` (e.g. `23/10/2026`)
7. **Imports** use the `@/` path alias (mapped to `./src/*`).
8. **File naming:** kebab-case for folders/files, PascalCase for component
   exports.

---

## 6. Auth Rules

| Rule                                  | Detail                                                           |
| ------------------------------------- | ---------------------------------------------------------------- |
| Provider                              | Supabase Auth, email + password only                             |
| Client key                            | `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`   |
| Service/secret keys                   | **Never** exposed in client code                                 |
| Session refresh                       | Handled in `proxy.ts` (Next.js 16 proxy) via `@supabase/ssr`     |
| Protected routes                      | All `(app)/*` routes — unauthenticated users redirect to `/login`|
| Public routes                         | `/login` and `/signup` — authenticated users redirect to `/dashboard` |
| Supabase clients                      | `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server), `lib/supabase/proxy.ts` (proxy helper) |

---

## 7. Workflow Rules

1. **One feature at a time.** Don't build multiple pages in parallel.
2. **Run `npm run build`** after every feature and fix all errors before marking
   it done.
3. **Small, focused changes.** Each commit should do one thing.
4. **Always state what changed** — list files created/modified and why.
5. **Next.js 16 note:** `middleware.ts` is deprecated; use `proxy.ts` with the
   exported `proxy` function (see `/node_modules/next/dist/docs/`).
