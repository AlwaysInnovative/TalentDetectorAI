# TalentDetectorAI — Security and Production Readiness Audit

Audit date: 2026-10-19  
Reviewed ref: `main` at `58706479618a050907668fad4690b3cac39c33da`  
Remediation branch: `fix/production-readiness-audit`

## Executive summary

The repository is a Next.js 14 / React 18 application with Supabase-backed candidate, agency, and hiring-manager workflows. The repository root contains a nested project directory rather than the application directly, and the latest commit is dated 2026-01-04. The repository has no `.github/workflows` files and the Actions API reports no workflow runs. No passing build or end-to-end test evidence was available during this connector-based review.

**Do not treat the current default branch as production-ready until the authorization, email delivery, and workflow tests below are resolved.** This is a source review, not a live penetration test; database policies, deployment environment variables, and deployed behavior were not accessible/verified here.

## Findings

### P0/P1 — API routes use Supabase service-role credentials without caller authentication/ownership checks

Examples reviewed:
- `app/api/candidate/respond-to-interest/route.ts`
- `app/api/generate-candidate-summary/route.ts`
- `app/api/generate-rtr-auto/route.ts`
- `app/api/generate-rtr-pdf/route.ts`
- `app/api/send-summary-to-hm/route.ts`

These handlers accept an identifier from the request and query/update records with a service-role client, but the reviewed implementations do not validate a caller session or prove that the caller owns/is authorized for the referenced candidate interest, summary, or hiring-manager workflow. This creates a likely IDOR / unauthorized data access or mutation risk if endpoints are reachable publicly. Add verified Supabase JWT/session checks and server-side role + record-relationship authorization to each route. Do not rely on client-side routing or UUID unpredictability as access control.

### P1 — Email queue endpoint reported success without sending email (fixed on remediation branch)

The original `app/api/send-emails/route.ts` explicitly left actual delivery as a TODO while marking rows as `sent`. It also exposed queue status via an unauthenticated GET and used a query-string secret for POST. The remediation branch now uses a Bearer `CRON_SECRET`, sends through Resend, and only records `sent` after provider acceptance. It uses an atomic pending-to-processing claim and logs errors without returning recipient details.

Required deployment configuration:
- `CRON_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The new migration adds `processing` to the queue status constraint. Apply migrations before deploying the updated handler. Confirm the sender domain is verified in Resend before enabling scheduled delivery.

### P1 — Sensitive personal data and AI-generated candidate assessments

The candidate summary endpoint sends candidate name, location, experience, skills, email, and job information to an external AI provider, and requests subjective fields such as “cultural fit” and “leadership potential.” Confirm a lawful basis and candidate notice/consent where required, minimize personal data sent to the model, document retention/deletion, and make scores explainable and human-reviewed. Do not use protected characteristics or proxies to make automated employment decisions. Validate model output against a schema and treat it as decision support, not a hiring decision.

### P1 — Right-to-represent agreement is generated from a hard-coded template

The reviewed `generate-rtr-auto` implementation writes an agreement with 12-month exclusivity and states that it is legally binding. That is a legal claim and a material contract term. Obtain jurisdiction-specific legal review, make terms configurable and explicitly accepted by the candidate, capture reliable signing evidence, and never represent a generated document as legally valid in every jurisdiction without review.

### P1 — Email queue needs operational recovery semantics

The queue schema previously allowed only `pending`, `sent`, and `failed`; the remediation migration adds `processing`. Production operations must define recovery for jobs stranded in `processing` after a crash, safe retry/idempotency semantics, and monitoring for repeated delivery failures. A provider acceptance response does not guarantee inbox delivery.

### P2 — No CI workflow or automated release gate found

No `.github/workflows` directory or workflow runs were found in the inspected repository tree. Add CI for dependency installation with the committed lockfile, TypeScript checks, lint, production build, migration validation, and targeted API authorization tests. Block production promotion on failures.

### P2 — Dependency and type safety posture

The inspected `package.json` uses Next.js 14, TypeScript strict mode is disabled, and `skipLibCheck` is enabled. Review dependency vulnerabilities with a current lockfile audit, upgrade dependencies deliberately, and incrementally enable strict typing. A version declaration alone is not proof of a vulnerability; run `npm audit` and build/test in a clean environment.

### P2 — Missing operational documentation

The root README is absent; a README exists only inside the nested application folder and is a short feature checklist. Document the real project root, environment variables, database migration order, storage bucket privacy, cron schedule, rollback, backups, local setup, and production smoke-test procedure.

## Changes made on remediation branch

1. Hardened `app/api/send-emails/route.ts`:
   - requires an Authorization Bearer cron secret for both POST and GET;
   - uses Resend to actually deliver queued messages;
   - avoids returning recipient addresses or raw internal errors;
   - only marks messages sent after provider acceptance;
   - claims queue rows with an atomic status transition.
2. Added `supabase/migrations/20261019170000_email_queue_processing_status.sql` to allow the `processing` state.

## Validation status

- Source inspection: completed for selected configuration and API routes.
- GitHub Actions: no workflows/runs found at the time of review.
- Build/typecheck/tests: **not run**; this connector does not execute the repository locally.
- Live API authorization tests: **not run**.
- Supabase migration: **not applied or verified against a live database**.
- Production deployment: **not changed**.

## Release checklist

- [ ] Apply migration to a non-production Supabase environment and verify the constraint/index.
- [ ] Configure and verify Resend sender domain and required environment variables.
- [ ] Add tests for missing/incorrect cron secret, provider errors, atomic queue claims, and retry/recovery behavior.
- [ ] Add authenticated ownership/role checks to every service-role API route.
- [ ] Review RLS policies, storage bucket visibility, and signed-document access.
- [ ] Add CI and get clean install, typecheck, lint, build, and automated tests passing.
- [ ] Run browser end-to-end flows for candidate registration/sign-in, job interest, RTR generation/signing/PDF, summary generation, hiring-manager delivery, and email notifications.
- [ ] Perform a human security/privacy/legal review before production promotion.
