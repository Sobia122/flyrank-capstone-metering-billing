# Design Doc: Usage Metering & Billing Engine

## 1. Problem
Multi-tenant SaaS applications need accurate usage metering, quota enforcement, AI token cost calculation, and subscription synchronization via Stripe test-mode webhooks without double-counting retries or overcharging/undercharging customers[cite: 4, 6].

## 2. Data Model
- **tenants**: Tenant organization records with isolated data per tenant[cite: 7, 12].
- **plans**: Subscription tiers (`Free`: 1,000 API calls/month and 100k AI tokens/month; `Pro`: higher monthly limits)[cite: 6, 7].
- **subscriptions**: Active tenant subscription state synced from Stripe events[cite: 6, 7, 10].
- **usage_events**: Recorded billable events (`tenant_id`, `usage_type`, `quantity`, token breakdown, `idempotency_key`, timestamp)[cite: 6, 12].

Monetary values are stored as integers (cents or micro-units), never floating-point numbers[cite: 5, 12].

## 3. API Surface
- `POST /generate`: Billable endpoint that checks quotas, records idempotent usage events, and returns simulated token/usage results[cite: 6, 7].
- `GET /usage`: Returns current monthly usage rollup (`used`, `limit`, and calculated `cost`) for the tenant[cite: 6, 10, 12].
- `POST /checkout`: Creates a Stripe Checkout session (test mode) to upgrade a tenant to Pro[cite: 6, 12].
- `POST /webhooks/stripe`: Verifies Stripe webhook signatures, deduplicates replayed events, and updates tenant plan/status[cite: 6, 10, 12].

## 4. Layer Sketch
- **HTTP / Routes Layer**: Request validation (`4xx` on bad input), idempotency key extraction, webhook signature check[cite: 6, 10, 12].
- **Billing & Metering Logic Layer**: Idempotent event recording, quota boundary checks (`429` / `402`), AI token pricing math, and background/retry/alert handling[cite: 6, 10, 12].
- **Data / Persistence Layer**: Database schema/migrations, tenant-isolated queries, and pinned pricing configuration[cite: 6, 7, 10].

## 5. Explicit Non-Goal
Live LLM model API calls, real money/live Stripe mode, invoicing, and mid-cycle proration are out of core scope for this capstone[cite: 5, 7, 8].