# Frontend — Component Tests

## Stack

- **Vitest 2** — test runner (Vite-native, no Babel transpile step)
- **@testing-library/react 16** — component rendering + queries
- **@testing-library/user-event 14** — realistic user interactions
- **@testing-library/jest-dom 6** — DOM matchers (`toBeInTheDocument`, etc.)
- **MSW 2** (`msw/node` + `setupServer`) — API mocking in jsdom
- **jsdom 25** — browser environment emulation

## Structure

```
src/test/
├── setup.ts          — global test setup: jest-dom, MSW lifecycle, window mocks
├── test-utils.tsx    — renderWithProviders() wrapping QueryClient + MemoryRouter + AuthProvider
├── msw-handlers.ts   — MSW request handlers (POST /auth/login, GET /productos)
└── README.md         — this file

Test files (co-located with source):
src/components/RoleProtectedRoute.test.tsx  — Tests 7.1–7.3
src/contexts/AuthContext.test.tsx           — Tests 8.1–8.3
src/pages/auth/LoginPage.test.tsx           — Tests 6.1–6.3
```

## Running locally (Docker)

```bash
# Run tests inside the frontend container
docker compose exec frontend npm test

# Watch mode
docker compose exec frontend npm run test:watch

# Coverage
docker compose exec frontend npm run test:coverage

# Vitest UI (browser-based test explorer)
docker compose exec frontend npm run test:ui
```

## Running in CI

The CI workflow (`/.github/workflows/ci.yml`) sets `VITE_API_URL=http://localhost:3100/api`
as an env var. This must match the BASE URL in `msw-handlers.ts`.

## Key setup notes

### MSW URL must match VITE_API_URL

`msw-handlers.ts` intercepts requests to `http://localhost:3100/api/*`.
This matches `VITE_API_URL` set in `docker-compose.yml` → `environment`.
If `VITE_API_URL` changes, update `BASE` in `msw-handlers.ts` accordingly.

### window.matchMedia mock

`useTheme` (zustand + persist) calls `window.matchMedia` on init.
jsdom does not implement it — the mock in `setup.ts` is mandatory.

### Form submission in tests

`LoginPage` uses a `motion.button type="submit"` from framer-motion.
`userEvent.click` on framer-motion buttons can miss the form submit event
in jsdom. Use `fireEvent.submit(button.closest('form')!)` for validation tests.

### MemoryRouter import

Must import from `react-router-dom` (v7), NOT from `react-router`.
`renderWithProviders` in `test-utils.tsx` wraps with `MemoryRouter`.

## Known bugs documented in tests

| Test | Bug | Status |
|------|-----|--------|
| `AuthContext.test.tsx` TEST 8.3 | Covered by MSW — no known bug | passing |
| `LoginPage.test.tsx` TEST 6.2 | Covered by MSW — no known bug | passing |
