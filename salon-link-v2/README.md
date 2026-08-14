# SALON LINK Formal MVP v2

SALON LINK v2 is the smartphone-first formal MVP for salon managers, stylists, assistants, and platform administrators.

## Production URL

- `https://beauty-help-mvp-test.vercel.app/`
- Health check: `https://beauty-help-mvp-test.vercel.app/api/health`

## Current production architecture

The production path intentionally avoids the legacy fixed-length Vercel UI loader.

1. Vercel `/` rewrites to `/api/index`.
2. `api/index.js` fetches the current SALON LINK v2 HTML from the Supabase Edge Function `salon-link-v2-public`.
3. `salon-link-v2-public` reconstructs the validated gzip/Base64 standalone HTML from these nine static Edge Function chunks:
   - `sl-v2-c0`
   - `sl-v2-c1`
   - `sl-v2-c2`
   - `sl-v2-c3`
   - `sl-v2-c4`
   - `sl-v2-b0`
   - `sl-v2-b1`
   - `sl-v2-b2`
   - `sl-v2-b3`
4. The concatenated Base64 length must be exactly `44,672` characters.
5. The Edge Function decompresses the bundle server-side and returns normal UTF-8 HTML.

Do not restore the previous browser-side Base64/gzip loader or the old `app marker` compatibility path.

## Production health check

`api/health.js` performs a read-only smoke audit of the HTML returned by `salon-link-v2-public`. It does not read user data.

It verifies:

- upstream HTTP status;
- viewport + Safari Safe Area markers;
- five-route bottom navigation definition (`ホーム / 日程 / 探す / 連絡 / 設定`);
- filter/modal scroll support;
- `window.SalonBackend` and Work Slot UI presence;
- password recovery UI and `PASSWORD_RECOVERY` handling;
- syntax of every inline JavaScript block using Node `vm.Script`.

A healthy production deployment returns HTTP 200 and `{ "ok": true }`.

## Password recovery

The public renderer injects the production password recovery UI. It:

- listens for Supabase `PASSWORD_RECOVERY`;
- reuses `window.SalonBackend.client` and `window.SalonBackend.updatePassword()`;
- shows a mobile-safe `新しいパスワードを設定` dialog;
- validates 8+ characters and password confirmation;
- redirects back to `#settings` after a successful update.

The login screen already calls `resetPasswordForEmail()` with `location.origin + '/#settings'` as the redirect target.

## Server-side safety

Applications and offers may be initiated from the browser, but acceptance and validation are not UI-only.

Important database triggers and core functions re-check permissions and business rules inside the database transaction, including:

- active account state;
- work-slot capacity;
- target role;
- identity / license verification;
- blocks;
- immutable fields and allowed status transitions;
- schedule overlap / double-booking;
- participant creation and accepted-count updates.

Acceptance locks the relevant user and Work Slot rows before the final conflict/capacity checks.

## Security baseline

Latest audit confirmed:

- all `public` tables have RLS enabled;
- no `SECURITY DEFINER` function is executable by `anon`;
- `verification-documents` is a private Storage bucket;
- users may upload only under their own UUID folder;
- verification documents are readable only by platform admins.

Supabase Security Advisor may warn that authenticated users can execute `SECURITY DEFINER` functions. Many are intentional public business RPCs or RLS helper functions. Do not revoke them mechanically without checking RLS/function dependencies.

## Performance baseline

Latest Performance Advisor had no WARN/ERROR findings. Remaining messages were INFO-level unused-index notices. These indexes are retained because production traffic is not yet sufficient to classify future search/join indexes as unnecessary.

## Deployment files

- `api/index.js` — Vercel server-side HTML proxy
- `api/health.js` — production HTML/syntax smoke audit
- `vercel.json` — root rewrite
- `supabase/functions/salon-link-v2-public/index.ts` — v2 HTML reconstruction and password recovery patch

## Generated bundle policy

A previously generated `public-bundle.b64` was removed because it did not match the validated `44,672`-character bundle. The nine validated chunks plus `salon-link-v2-public` are the current source of truth for the deployed standalone HTML.
