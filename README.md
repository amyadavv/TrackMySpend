# TrackMySpend

A production-grade personal finance tracker built with **React + Vite** (frontend) and **Node.js + Express** (backend). The project was scoped to demonstrate real-world engineering patterns — idempotency, retry logic, atomic file writes, and network-resilience simulation — within a timebox.

---

## Quick Start

### Backend
```bash
cd backend
cp .env.example .env          # adjust PORT/HOST if needed
npm install
npm run dev                   # node --env-file=.env --watch server.js
```

### Frontend
```bash
cd frontend
cp .env.example .env          # adjust VITE_API_URL if needed
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Project Structure

```
TrackMySpend/
├── backend/
│   ├── server.js             # Express routes (GET, POST, DELETE /expenses)
│   ├── db.js                 # File-based JSON store with in-memory cache
│   ├── data/expenses.json    # Runtime data file (gitignored)
│   ├── .env                  # Local env vars (gitignored)
│   └── .env.example          # Template — safe to commit
└── frontend/
    ├── src/
    │   ├── App.jsx           # Root orchestrator — global state only
    │   ├── constants.js      # CATEGORIES list + BASE_URL from env
    │   ├── api/
    │   │   └── expenseApi.js # All fetch() calls in one place
    │   └── components/
    │       ├── Header.jsx            # Logo, network-mode selector, theme toggle
    │       ├── ExpenseForm.jsx       # Form with retry + idempotency logic
    │       ├── NetworkConsole.jsx    # Real-time HTTP transaction log
    │       ├── SummaryCards.jsx      # Total spent + transaction count
    │       ├── CategoryBreakdown.jsx # Per-category spend bars
    │       └── ExpenseLedger.jsx     # Filter + expense list + delete UX
    ├── .env                  # Local env vars (gitignored)
    └── .env.example          # Template — safe to commit
```

---

## Key Design Decisions

### 1. Integer-cent money storage
All amounts are stored as **integer cents** on the backend (e.g. ₹155.50 → `15550`). This eliminates floating-point rounding errors that accumulate when adding many decimal values together. The frontend divides by 100 only at display time via `Intl.NumberFormat`.

### 2. Client-side idempotency keys
Before submitting, the form generates a `crypto.randomUUID()` and sends it as both the `Idempotency-Key` header and inside the request body. The server deduplicates against this key, so if the network fails *after* the server writes but *before* the client receives the response, a retry will return the original record instead of creating a duplicate.

### 3. Automatic retry with delay
`ExpenseForm` retries failed POST requests up to **3 times** with a 1.5-second delay between attempts. Every attempt — including retries, cache hits, and failures — is written to the **Network Console** so the flow is fully observable.

### 4. Atomic file writes
`db.js` writes JSON to a `.tmp` file first, then renames it over the target. On POSIX systems this rename is atomic at the OS level, so a server crash mid-write cannot leave `expenses.json` in a corrupt or partially-written state.

### 5. Separation of concerns — API layer
All `fetch()` calls live in `src/api/expenseApi.js`. Components never construct URLs or set headers directly; they call named functions (`getExpenses`, `postExpense`, `deleteExpense`). This means swapping the transport layer (e.g. to Axios, SWR, or React Query) is a single-file change.

### 6. Component decomposition
`App.jsx` is a slim orchestrator (~120 lines) that owns only shared state (expenses list, filters, network mode, theme, logs). All rendering and local state lives in the six leaf components. Each component receives the minimum props it needs.

### 7. Environment variables
- **Frontend** uses Vite's `VITE_` prefix convention — variables are inlined at build time and never leak non-prefixed secrets to the bundle.
- **Backend** uses Node 20.6+'s native `--env-file=.env` flag — zero runtime dependencies for env loading.

### 8. Dark-mode-safe dropdowns
Browser `<select>` elements use the OS native panel, which ignores CSS `background: transparent`. All dropdowns are given an explicit `background-color: var(--select-bg)` with matching `color-scheme` set on `:root` / `[data-theme="light"]`, so the native panel is always readable in both themes.

---

## Trade-offs Made Because of the Timebox

| Area | Decision | Reason |
|---|---|---|
| **Storage** | Flat JSON file instead of a real DB | Zero setup friction; atomic writes keep it safe enough for a local demo |
| **Auth** | None | Out of scope; CORS is open (`*`) for the same reason |
| **Tests** | No unit or integration tests written | Would need a test DB fixture and mock fetch layer — time was spent on resilience features instead |
| **State management** | React `useState` / prop drilling | The component tree is shallow enough that a context or external store would be premature abstraction |
| **Pagination** | All expenses loaded in one request | The dataset is local and small; pagination adds significant API + UI complexity for no gain here |
| **Optimistic updates** | Delete waits for the server round-trip | Ensures the UI always reflects true server state; optimistic removal would require rollback logic |
| **Error boundaries** | Not added | React's default error display is acceptable for a local dev tool; production apps would need them |

---

## Intentionally Not Done

- **User accounts / multi-tenancy** — the app is designed as a single-user local tool; adding auth would be the first step before any production deployment.
- **Edit expense** — updating a record requires either PUT/PATCH semantics or an idempotency strategy for partial updates; this was left out to keep the scope clean.
- **Recurring expenses / budgets** — domain features that belong in a follow-up iteration once the core CRUD loop is solid.
- **Mobile app / PWA** — the UI is responsive down to ~360 px but is not installable as a PWA; that would require a service worker and offline data strategy.
- **Real database** — migrating from the JSON file store to SQLite or PostgreSQL is a straightforward `db.js` swap (the rest of the codebase is storage-agnostic) but was not needed for the timebox.
- **CI/CD pipeline** — no GitHub Actions or deployment config; the focus was on the application layer, not the delivery pipeline.
- **Currency conversion API** — the app displays amounts in INR but uses a fixed exchange rate (user enters amounts directly in rupees). A live exchange-rate feed was explicitly out of scope.

---

## API Reference

See [`backend/README.md`](./backend/README.md) for the full API specification including request/response shapes and header contracts.