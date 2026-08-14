# 2026-08-15 Formal MVP v2 hardening migrations

These migrations were applied to Supabase production project `cpmmqqznrqeodlesyfgg` and are recorded in the Supabase migration history.

## Applied migrations

| Version | Migration |
|---|---|
| 20260814185511 | `add_missing_v2_domain_state_constraints` |
| 20260814185552 | `serialize_attendance_events_and_adjustments` |
| 20260814185727 | `clean_pending_state_on_account_withdrawal` |
| 20260814185943 | `align_recruitment_permissions_for_salon_managers` |
| 20260814190013 | `align_attendance_adjustment_permissions` |
| 20260814190052 | `allow_salon_managers_to_edit_salon_recruitment` |
| 20260814190410 | `prevent_duplicate_pending_verification_requests` |
| 20260814190528 | `formalize_report_status_and_deduplication` |
| 20260814190850 | `base_review_deadline_on_review_phase_start` |
| 20260814190942 | `configure_compensation_rounding_rule` |
| 20260814191038 | `auto_open_review_phase_after_all_payments_received` |

## What this hardening covers

- DB CHECK constraints for compensation, payment, review, work-time, and adjustment state values.
- Serialized attendance writes so concurrent double taps cannot create duplicate `work_start` / break / end transitions.
- One pending attendance adjustment per participant.
- Account withdrawal cleanup for pending applications, offers, availability slots, and draft recruitments.
- Salon recruitment handoff to active salon owner/manager while preserving stylist-personal recruitment ownership.
- Symmetric attendance correction approval between worker and Work Slot manager.
- Salon-manager editing/skill/duplicate permissions for salon recruitments before acceptance.
- One pending verification request per user/subject or salon/subject.
- Report status/target constraints and active duplicate-report prevention.
- Review deadline calculated from the start of `review_pending`, not the historical work date.
- Configurable compensation rounding (`nearest_yen`, `floor_yen`, `ceil_yen`).
- Automatic `payment_confirmed -> review_pending`, work-group read-only transition, and review notifications after the last worker confirms payment receipt.

## Acceptance test

Run `../tests/formal_mvp_v2_acceptance.sql` against a non-production connection or through an administrative SQL runner. The test intentionally rolls back all test rows, including temporary `auth.users` records, before returning its assertion result.

Latest production execution result:

```json
{
  "manager_can_accept_salon_recruitment": true,
  "manager_cannot_edit_stylist_personal_recruitment": true,
  "double_work_start_blocked": true,
  "payment_received_auto_review_pending": true,
  "work_group_read_only_after_payment": true,
  "participant_completed_after_received": true,
  "all_passed": true
}
```

Post-test leak check: `0` matching `e2e-%@example.invalid` users remained in `auth.users`.
