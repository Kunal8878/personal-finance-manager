# aura. — Private Wealth & Financial Intelligence Platform

> **aura.** is an enterprise-grade Personal Finance & Private Wealth Management application built with a **Quiet Luxury** aesthetic, multi-currency ledger, real-time Server-Sent Events (SSE) synchronization, and financial analytics.

---

## ✨ Key Features

### 1. Private Wealth Design Identity
* **Quiet Luxury aesthetic:** Tailored light (`#F2EFE7`) and dark (`#111914`) themes with forest green (`#183D32` / `#A5C6A9`) and warm gold (`#B49A68` / `#C5AD7B`) accents.
* **Refined Typography:** `Cormorant Garamond` (editorial serif headings), `Inter` (UI elements), and `DM Sans` (financial numbers with tabular figures).
* **Cross-Device Responsive:** Crafted for desktop, tablet, and mobile views.

### 2. Multi-Currency Ledger Engine
* **Non-destructive storage:** Preserves exact original amount, currency code, and symbol for every transaction (e.g. ₹2,000 INR vs $15.00 USD).
* **Live Exchange Rate Engine:** Real-time conversion to user's reporting currency (defaulting to INR, switchable to USD, EUR, GBP, AED, SGD, CAD, AUD).
* **Prominent Display:** Shows original currency prominently with clear secondary conversions (`≈ ₹X`).
* **Multi-Currency Accounts:** Support for checking, savings, investment custody, and multi-currency credit lines.

### 3. Real-Time Synchronization (SSE + TanStack Query)
* **Server-Sent Events (SSE):** Push notifications from `/api/stream` whenever a transaction is created, updated, or removed.
* **Instant UI Reactivity:** Updates Net Worth, cash flow, Recharts charts, budget adherence, and categories across all open sessions without full page reloads.

### 4. Financial Analytics & Dashboard
* **Net Worth Overview:** Prominent hero with period comparisons, percentage changes, and a sensitive balance hide/show toggle (`••••••`).
* **KPI Metrics:** Total Inflow, Total Outflow, Net Cash Flow, and Savings Rate with previous-period delta benchmarks.
* **Recharts Visualizations:** Wealth Growth area chart, Monthly Inflow vs Outflow comparative bars, Category Donut breakdown, and Surplus trajectory.
* **Wealth Tools:** Recurring subscriptions monitor, category budgets, financial goals, loan amortizations, and AI financial insights.

---

## 🛠️ Tech Stack

* **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Recharts, Lucide Icons.
* **Backend:** Node.js, Express, TypeScript, Prisma ORM, Server-Sent Events (SSE), JWT Authentication.
* **Database:** SQLite (with migration scripts & Prisma client).

---

## 🚀 Quick Start Guide

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher)
* `npm` (v9 or higher)

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone <YOUR_REPOSITORY_URL>
cd personal-finance-manager

# Install Backend dependencies
cd backend
npm install
npx prisma generate

# Install Frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

* Backend (`backend/.env`):
  ```env
  PORT=5001
  DATABASE_URL="file:./dev.db"
  JWT_SECRET="super-secret-finance-jwt-key-change-in-prod"
  NODE_ENV="development"
  ```
* Frontend (`frontend/.env`):
  ```env
  VITE_API_BASE=http://localhost:5001/api
  ```

### 3. Initialize & Seed Database

```bash
cd backend
npm run seed
```

### 4. Run Development Servers

**Backend Server (Port 5001):**
```bash
cd backend
npm run dev
```

**Frontend Client (Port 3000):**
```bash
cd frontend
npm run dev
```

Open your browser at **`http://localhost:3000`**.

---

## 🔑 Pre-Seeded Credentials

| Account | Email | Password | Pre-seeded Portfolio |
| :--- | :--- | :--- | :--- |
| **Client Portfolio** | `rahul@test.com` | `password123` | Mixed INR & USD accounts, active loans, budgets |
| **Administrator** | `admin@example.com` | `adminpassword` | Full wealth vault, multi-currency transactions |

---

## 📄 License
ISC License. Built with `aura.` design system.
