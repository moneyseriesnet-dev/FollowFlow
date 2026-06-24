# FollowFlow CRM

FollowFlow is a mobile-first, production-ready insurance customer follow-up CRM dashboard designed for financial planners who manage AXA, AIA, and other policies.

## 🚀 Features Implemented

### Phase 0 & Phase 1: Foundation & OCR Pipeline
- **Supabase SSR integration** (browser, server, and middleware session rotation).
- **Glassmorphic interface** (sticky top header, sidebar navigation, mobile bottom navigation with slide-up menu).
- **Core database tables & RLS policies** (customers, policies, reminders, activities, gifts, and OCR import batches).
- **OCR Import Wizard MVP** (drag & drop upload, company formats, review grid, inline edits, status toggles, and bulk import actions).

### Phase 2: Core CRM Management
- **Customer CRM module:**
  - Dynamic list with search by name.
  - Interactive filters for customer status (`active`, `inactive`, `archived`), levels, and policy provider company.
  - CRUD operations: Manual customer profiles creation, inline note saves, contact dialing triggers, and double-confirmation cascading deletion.
  - Automatic `customer_levels` seeding (`VIP`, `Standard`, `Watchlist`).
- **Policy Management module:**
  - Search by policy number or plan name.
  - Filters for status (`active`, `pending`, `lapsed`, etc.), payment frequencies, and sorting by next premium due dates.
  - CRUD operations: Manually write/edit policies and save detailed policy notes.

### Phase 3: Reminder Engine & Priority Dashboard
- **Reminder Generation Engine:** (`src/lib/reminders/reminder-service.ts`)
  - Birthday reminders: Generates reminders 30 days and 1 day before occurrences.
  - Financial review reminders: Triggers review tasks every 6 months.
  - Premium due reminders: Calculates 5 offsets (30, 14, 7, 3, 1 day) before policy dues.
  - Self-healing background scanner to auto-generate missing reminders.
  - Payment cycle rollover: Automatically increments the policy due date and spins up the next cycle's reminders when marked `Done`.
- **Reminder List & Management UI:** (`src/app/(dashboard)/reminders/page.tsx`)
  - Status tabs (`All`, `Pending`, `Snoozed`, `Done`, `Cancelled`).
  - Search and filter options by reminder type.
  - Action modal drawer (`reminder-modal.tsx`) for notes edit and date rescheduling.
- **Priority Action Dashboard:** (`src/app/(dashboard)/page.tsx`)
  - Dashboard counts dynamically linked to live customer, policy, and reminder tables.
  - A 10-level priority ranking algorithm consolidating critical alerts (overdue, immediate premium due, Watchlist customers, VIP outreach) into a scrollable unified feed.

---

## 🛠️ Getting Started

### 1. Environment Configuration
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Database Migration Setup
Initialize your database schema using the migration file in:
- `supabase/migrations/20260624000001_initial_schema.sql`

### 3. Running Development Server
Install dependencies and run local server:
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application dashboard.
