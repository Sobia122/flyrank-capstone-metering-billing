# Verification Evidence

## 1. Idempotency Probe (`POST /generate`)
- First request with `Idempotency-Key: idem-001` returned `202 Accepted` (`tokensRecorded: 2000`, `eventCostMicroCents: 475`, `idempotentReplay: false`).
- Duplicate replay with the same `Idempotency-Key: idem-001` returned `200 OK` with the same `eventId` and `idempotentReplay: true` without adding a duplicate event.

## 2. Usage Rollup & Integer Math (`GET /usage`)
- Verified `GET /usage?tenantId=tenant_demo_free` returned integer micro-cent rollup (`microCents: 475`, `centsInteger: 0`).

## 3. Quota Enforcement (`429` / `402`)
- `recordBillableGeneration` checks projected monthly API calls and tokens against plan limits (`Free`: 1,000 calls / 100,000 tokens; `Pro`: 50,000 calls / 5,000,000 tokens) and returns `429` on quota breach or `402` when subscription status is inactive.

## 4. Forged Stripe Signature Probe (`POST /webhooks/stripe`)
- Sending a forged `Stripe-Signature` header (`t=1,v1=forged_signature`) returned `400` without mutating tenant state.

## 5. Stripe Test Mode Event Trigger & Deduplication
- Verified `stripe trigger checkout.session.completed` against sandbox account `acct_1UeEkOFmhYDEsytd`.
- Duplicate Stripe event IDs are ignored via `hasProcessedWebhookEvent` (`duplicateIgnored: true`).
