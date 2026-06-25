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

### Phase 4: Follow-up Activities, Gift Costs, Levels & Reports
- **Activity Logging CRUD:** (`src/components/activities/activity-form.tsx`)
  - Record client touchpoints: phone calls, meetings, Line chats, emails, policy deliveries, and claim supports.
  - Link activities to policies and reminders to track workflows.
  - Render an interactive, icon-coded timeline in the customer detail page.
- **Gift Cost Management:** (`src/components/gifts/gift-form.tsx`)
  - Log expenses given to clients (birthday gifts, calendars, coffee, etc.) with title, date, cost, and notes.
  - Automatically calculate and display customer total gift cost totals.
- **Dynamic Risk Level Suggestions:**
  - Dynamic evaluation logic on the customer detail page: checks for $\ge 3$ snoozed or $\ge 1$ overdue premium payment reminders.
  - Renders a risk warning banner suggesting assigning the customer to **Watchlist**.
  - One-click auto-assignment that updates the customer's level and auto-creates the 'Watchlist' group with a red color code (`#ef4444`) if it does not already exist.
- **Analytics Reporting Dashboard:** (`src/app/(dashboard)/gifts/page.tsx`)
  - Aggregate statistics showing total gift expenses this month, this year, and unique customer counts.
  - Real-time breakdowns of budget spending by Customer, Customer Level, and Insurance Company (AXA vs AIA).
- **Customer Levels Configuration:** (`src/app/(dashboard)/settings/levels/page.tsx`)
  - Dedicated CRUD interface to configure custom customer groups with name, description, and color palette accents.
  - Updated Settings navigation and profile metadata retrieval.

### Phase 5: Google Calendar Sync Integration
- **Google Account Connection Flow:**
  - Secure server-side Google OAuth 2.0 flow with offline authorization (`access_type=offline` and `prompt=consent`) to obtain and rotate Google API tokens.
  - Encrypted/secure storage of credentials in the `google_credentials` database table, guarded by RLS policies (`owner_id = auth.uid()`).
- **Settings Configuration Dashboard:** (`src/app/(dashboard)/settings/calendar/page.tsx`)
  - Connect/Disconnect calendar action triggers.
  - Default calendar ID configuration.
  - Manual "Sync All Pending Reminders" batch utility.
- **Dynamic Sync Triggers & Controls:**
  - "Sync to Google Calendar" toggle controls added to reminder creation pages and update modals.
  - Event lifecycle handlers:
    - **Creation:** Creates an all-day event in Google Calendar, saving the Google Event ID locally to prevent duplicates.
    - **Updates:** Shifts the Google Calendar event date dynamically when the reminder due date changes.
    - **Done Status:** Prepends `[เสร็จสิ้น] ` to the event title on Google Calendar for easy visual check.
    - **Cancellation/Toggle-off:** Deletes the event from Google Calendar and clears the event ID locally.
- **Sync State Badging:**
  - Clear visual status badges (`GCal Synced` (green), `GCal Failed` (red), `GCal Pending` (gray)) shown on reminders lists and the priority action items dashboard.
    - Auto-healing sync logic: recreates event if deleted manually on Google Calendar.
  - Automatic background batch sync triggers when scanning/loading dashboards.

### Phase 6: AI-Assisted CRM & Collaborative Placeholders
- **AI Relationship Assistant Card:** (`src/app/(dashboard)/customers/[id]/page.tsx`)
  - Integration of a premium generative AI module powered by the `gemini-2.5-flash` model.
  - Fail-safe Thai rule-based local heuristics engine that computes analytics if no `GEMINI_API_KEY` is present.
  - Caches relationship summaries, level recommendation logic, action checklists, and communication drafts directly in the database (`customers` table) to maintain high performance.
  - One-click suggested level updater and manual regenerate action.
- **Future Integration & Team Collaboration Placeholders:**
  - Mock integration modules for Email (`email-service.ts`) and LINE (`line-service.ts`) notification dispatches.
  - DB schema scaffolding (`assigned_to`, `team_id`) to prepare for customer ownership delegation and multi-user configurations.

---

## 🛠️ Getting Started

### 1. Environment Configuration
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google OAuth Credentials (required for Google Calendar Sync)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Google Gemini API Key (required for live AI assisted analytics, falls back to rules if empty)
GEMINI_API_KEY=your-gemini-api-key
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
