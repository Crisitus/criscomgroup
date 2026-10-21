# Backend — Integration Tests

## Stack

- **Jest 29** (`--runInBand --forceExit`) — tests run serially, one DB connection
- **Supertest 7** — HTTP assertions against the Express app
- **MySQL 8** (isolated `erp_computacion_test` DB, port 3307)

## Structure

```
__tests__/
├── helpers/
│   ├── db.js       — setupTestDb() / teardownTestDb()
│   ├── seed.js     — createUser, createProducto, createCodigoBarras, createEmpresa
│   ├── auth.js     — getAuthToken(user) → signed JWT
│   └── cleanup.js  — truncateAll() (re-seeds roles after wipe)
├── fixtures/
│   ├── users.fixture.js     — gerente, vendedor, admin plain objects
│   └── productos.fixture.js — productoConStock, productoSinStock
├── integration/
│   ├── auth.test.js      — Tests 1–2: login happy path + error cases
│   ├── productos.test.js — Tests 3: auth guard + list endpoint
│   └── ventas.test.js    — Tests 4–5: happy path venta + stock=0 rejection
└── setup.env.js    — loads .env.test with override:true (bypasses docker env_file)
```

## Running locally (Docker)

```bash
# Start the test DB (one-time or keep running)
docker compose up db-test -d

# Run tests inside the backend container
docker compose exec backend npm test

# Watch mode
docker compose exec backend npm run test:watch

# Coverage
docker compose exec backend npm run test:coverage
```

## Running directly on the host (no Docker required)

```bash
npm test
```

The host runner automatically uses an isolated SQLite database in memory. To
exercise MySQL-specific behaviour, start `db-test` and run:

```bash
npm run test:mysql
```

## Running in CI

The CI workflow (`/.github/workflows/ci.yml`) spins up a `mysql:8.0` service container
and injects env vars directly — no `.env.test` file needed.

## Environment

Tests load `Backend/.env.test` via `setup.env.js` with `dotenv override: true`.
This is MANDATORY because `docker compose env_file` injects production vars into
the OS environment before Node starts. Without `override: true`, `dotenv.config()`
is a no-op and tests connect to the production DB.

| Variable      | Test value                                  |
|---------------|---------------------------------------------|
| DB_HOST       | db-test (Docker) / 127.0.0.1 (CI)          |
| DB_PORT       | 3306 (Docker) / 3307 (CI)                  |
| DB_NAME       | erp_computacion_test                        |
| DB_USER       | erpcomp_test                                |
| DB_PASSWORD   | test_password                               |
| JWT_SECRET    | test_jwt_secret_for_ci_do_not_use_in_prod   |

## Known bugs documented in tests

| Test | Bug | Status |
|------|-----|--------|
| `auth.test.js` TEST 2.1 | Login with wrong password returns HTTP 400 instead of 401 | `it.skip` — documents current behaviour |
