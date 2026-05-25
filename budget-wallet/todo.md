# Budget Wallet Audit TODO

## Critical
- [x] Add server-side auth checks to all payment API routes so only authenticated users can create or capture payments.
- [ ] Add payment webhooks for Stripe and PayPal, with signature verification and server-side reconciliation.
- [x] Record successful payments in the database instead of relying only on client-side success callbacks.
- [x] Add strict server-side validation for payment inputs such as amount, currency, phone number, and order IDs.
- [x] Verify Supabase row-level security is enabled for all user-owned data tables.
- [ ] Move any admin-only Supabase operations to server-side code using a service role key. No admin-only Supabase flows are present yet.

## High Priority
- [ ] Add idempotency protection for payment creation endpoints to prevent duplicate charges.
- [ ] Add rate limiting for auth and payment endpoints.
- [ ] Validate and normalize transaction data on the server before inserting or updating rows.
- [ ] Move recurring-rule execution out of the client and into a server cron or scheduled job.
- [ ] Add structured logging and error monitoring for payment and database failures.
- [ ] Avoid returning raw provider/server errors directly to the client.

## Security and Privacy
- [ ] Add security headers such as CSP and HSTS.
- [ ] Reduce logging of sensitive payment or personal data.
- [ ] Add a clear data-retention policy for financial and identity-related records.
- [ ] Make env loading safer by validating required variables at startup.

## UX and Accessibility
- [ ] Add accessible error states and ARIA-friendly validation to key forms.
- [ ] Improve inline validation messages for auth, transactions, and payments.
- [ ] Add password reset and email verification flows for Supabase auth.
- [ ] Add locale-aware currency/date formatting and translation-ready strings.

## Offline and PWA
- [ ] Confirm the service worker is registered and actually caches the right assets.
- [ ] Add an offline-safe strategy for writes or a clear offline fallback.
- [ ] Test that the manifest and install flow work on mobile and desktop.

## Quality and Testing
 - [ ] Add unit tests for transaction summary and credit-score logic.
 - [x] Add integration tests for API payment routes.
 - [ ] Add end-to-end tests for the auth and payment flows using sandbox providers.
 - [x] Add a GitHub Actions workflow to run lint and tests on pull requests.
 - [ ] Add formatting and stronger lint scripts to `package.json`.

## Documentation and Operations
- [ ] Expand `README.md` with setup, env vars, payments setup, and deployment steps.
- [ ] Document Stripe, PayPal, MTN MoMo, and Flutterwave sandbox setup.
- [ ] Add a health check endpoint for uptime monitoring.
- [ ] Add deployment and production-run notes for Vercel or the chosen host.
- [ ] Add CONTRIBUTING and LICENSE files if this repo is meant to be shared.

## Nice to Have
- [ ] Add email or push notifications for budgets, recurring payments, and payment confirmations.
- [ ] Add feature flags for enabling or disabling payment providers by region.
- [ ] Add basic analytics for feature usage and payment funnel tracking.
- [ ] Add a Dockerfile or reproducible dev environment notes.

## Test Plan (what to test after all updates)

- **Auth & Access:** Verify all payment API routes require authentication; unauthorized requests return 401/403.
- **Input Validation:** Send malformed/edge-case payloads (amount=0, negative, bad currency, invalid phone) and ensure 400 responses with safe error messages.
- **Rate Limiting:** Simulate rapid repeated requests from same IP/user to payment routes and confirm 429 responses and `Retry-After` header.
- **Idempotency (client header + server store):**
	- Repeat a create-payment request with the same `Idempotency-Key` and confirm only one provider-side intent is created and repeated calls return the original result.
	- Confirm expired idempotency entries allow a new intent after TTL.
- **Duplicate-record protection:** Attempt to record the same payment twice (same user/amount/description within window) and confirm the second attempt does not create a duplicate transaction.
- **Provider Integration (sandbox):**
	- Stripe: create PaymentIntent, confirm `clientSecret` returned and capture flow works in sandbox.
	- PayPal: create + capture orders end-to-end in sandbox.
	- MTN / Flutterwave: simulate sandbox request-to-pay and confirm pending -> success flows.
- **Database Persistence:** Confirm `transactions` and `invoices` rows are created with correct fields and RLS prevents cross-user access.
- **Error Handling & Logging:** Force provider errors and confirm server returns sanitized errors and logs full details (without leaking secrets) to server logs.
- **Webhook Reconciliation (once implemented):** Send signed webhook events to the webhook endpoints and confirm idempotent processing and DB reconciliation.
- **UI End-to-End:** Use an E2E tool (Cypress/Playwright) to run user flows: login, create payment, complete provider flow, see recorded transaction in UI.
- **PWA & Offline:** Test installability, service worker caching, and offline behavior for read and safe write fallback.
- **Security Tests:** Verify CSP/HSTS headers, ensure no sensitive env or secrets are leaked to client, and validate Supabase RLS policies with direct DB access attempts.
- **Performance & Load (basic):** Run a small load-test against payment endpoints to observe rate-limiter behavior and error rates.
- **Upgrade & Migrations:** Test DB migrations on a staging copy to ensure schema changes (invoices/transactions) apply cleanly.

Include tests as unit, integration, and E2E where appropriate; prefer sandbox provider accounts for payment integration tests.
