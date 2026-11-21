# LLM Usage Metering & Billing Service

Multi-tenant usage metering, quota enforcement, integer micro-cent token cost calculation, and Stripe Test Mode subscription synchronization built with Node.js and Express.

## Architecture Overview
- **HTTP / Routes Layer (`src/routes/`)**: Validates inputs (`4xx` on invalid payloads), extracts `Idempotency-Key`, creates Stripe Checkout sessions (`POST /checkout`), and verifies Stripe webhook signatures on raw request bodies (`POST /webhooks/stripe`).
- **Billing & Metering Logic Layer (`src/services/`)**: Enforces idempotent usage recording, checks monthly `Free` and `Pro` quotas (`429` / `402`), calculates token/API costs using integer micro-cents, deduplicates replayed Stripe events, and syncs tenant subscription plans.
- **Data / Persistence Layer (`src/config/`, `src/store/`)**: Holds plan limits, pinned integer pricing rates, tenant records, usage events, idempotency entries, and processed webhook event IDs.

## Setup, Run & Seed
1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set your Stripe Test Mode keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`).
3. Start the server: `node server.js`
4. Demo tenants (`tenant_demo_free` and `tenant_demo_pro`) are seeded automatically on startup.

## Endpoints
- `GET /health` — Service health check.
- `POST /generate` — Records billable usage with `Idempotency-Key` header and quota enforcement.
- `GET /usage?tenantId=<id>` — Returns current usage rollup (`apiCalls`, `tokens`, and integer `cost`).
- `POST /checkout` — Creates a Stripe Test Mode Checkout session to upgrade a tenant to `Pro`.
- `POST /webhooks/stripe` — Verifies `Stripe-Signature`, deduplicates events, and updates tenant subscription state.

## Limitations & Non-Goals
- Uses an in-memory store for local capstone execution rather than a persistent database across restarts.
- Live LLM provider calls, live Stripe mode, invoice generation, and mid-cycle proration are out of scope.
