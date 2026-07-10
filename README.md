# 🌿 WIWOKDETOK

> **"No Omon-Omon"** — Turning political rhetoric into environmental accountability through AI and community action.

WIWOKDETOK is an Indonesian civic accountability platform tracking political promises against environmental realities. It serves as a "Single Source of Truth" where the *rakyat kecil* (everyday citizens) can compare what politicians *say* (The Talk) with what is actually *happening* on the ground (The Walk), while providing the legal tools to demand change.

---

## 🎯 Core Value Proposition

- **For the Citizen:** Easy-to-understand legal aid and a "BS-detector" for local promises.
- **For the Environment:** A public watchdog that never sleeps, highlighting inconsistencies between policy and practice.

---

## ✨ Key Features

### 1. 📢 The Talk Ledger
A continuously updated, publicly verifiable feed of environmental promises.
* **Daily Web Crawl:** Automatically gathers quotes from news and social media.
* **AI Breakdown:** Uses Google Gemini Flash to summarize source documents into a 3-bullet breakdown and generate standalone Watchdog Commentary.
* **Walk-o-Meter Score:** Each promise is scored based on the gap between the rhetoric and reality.

### 2. ⚖️ Bang Jaga AI
A RAG-grounded legal & policy assistant to educate citizens and guide them in drafting official complaints (*Surat Pengaduan*).
* **Guided Templates:** Simplifies the process of creating actionable legal documents.
* **Rich Interactions:** Supports image uploads and live-streaming document previews.
* **PDF Export & Share:** Export complaints to PDF or share directly to WhatsApp.

### 3. 🗺️ Walk-o-Meter
Surfaces real-world evidence on a map and feed, combining promise verifications and citizen complaints.
* **Interactive Map:** Powered by MapLibre and OpenStreetMap tiles.
* **Community Validation:** Features a Regional Leaderboard, Verification reports, and community trust tiers.
* **Data-Saver Mode:** Optimized for low-bandwidth environments.

---

## 🏗️ Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Server Actions)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) with Container Queries
- **Database & Auth:** [Supabase](https://supabase.com/) (Auth, Storage, pgvector)
- **AI Integration:** [Google Gemini Flash](https://deepmind.google/technologies/gemini/flash/) via `@google/generative-ai`
- **Mapping:** [MapLibre GL JS](https://maplibre.org/)
- **Testing:** [Playwright](https://playwright.dev/) for End-to-End (E2E) testing
- **PDF Generation:** [Puppeteer](https://pptr.dev/)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or newer recommended)
- npm, yarn, pnpm, or bun

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd WIWOKDETOK
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory. There is no `.env.example` file, so ensure you configure the following keys:

```ini
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google Gemini AI
GOOGLE_GEMINI_API_KEY=your_gemini_api_key

# Feature Flags
FEATURE_BANG_JAGA_SAVE_HISTORY=true
FEATURE_PROMISE_LINK=false
FEATURE_WALK_O_METER=true

# Resend Email Notification
RESEND_API_KEY=your_resend_api_key

# Web Push VAPID Keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key

# Crawler Config
CRAWL_CRON_SECRET=your_cron_secret
CRAWL_QUERIES="your,crawler,queries"
TAVILY_API_KEY=your_tavily_api_key
```
*Note: The `NEXT_PUBLIC_*` variables must be available when the dev server starts, as they are inlined into the client bundle at compile time.*

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the app. No local database/Docker is required since the app uses Supabase cloud for persistence.

### 5. Running the Crawler
To pull the latest news/social media promises into the database, run the standalone sync script:
```bash
npm run crawl
```

---

## 🧪 Testing

The project uses Playwright for comprehensive End-to-End (E2E) testing. Test configurations and rules are defined in `.cursor/rules/testing.mdc`.

### Run tests
```bash
# Install browsers (first time only)
npx playwright install chromium --with-deps

# Run all tests
npx playwright test

# Run a specific file
npx playwright test e2e/tests/auth.spec.ts

# Run with UI mode
npm run test:ui
```
*Note: The Playwright config automatically starts the dev server and targets `localhost:3000`.*

---

## 📂 Project Structure

- `e2e/`: Playwright test specs, Page Objects (POM), and fixtures.
- `src/`: Main Next.js application source code (components, hooks, lib).
- `public/`: Static assets.
- `docs/`: Product Requirements Document (PRD) and detailed feature specs.
- `supabase/`: configuration for Supabase migrations or setup.
- `crawler.ts`: Standalone script for the daily Talk Ledger web crawl.

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome!

---

## 📝 License
This project is proprietary and intended for civic accountability purposes.
