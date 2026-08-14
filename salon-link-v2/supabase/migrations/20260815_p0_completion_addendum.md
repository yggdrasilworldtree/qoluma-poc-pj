# SALON LINK v2 P0 completion addendum — 2026-08-15

Additional production migrations applied after the main hardening pass:

| Version | Migration |
|---|---|
| 20260814192044 | `allow_safe_availability_lifecycle_transitions` |
| 20260814192147 | `extend_availability_status_for_withdrawal` |
| 20260814192225 | `fix_review_deadline_published_at_ambiguity` |
| 20260814193001 | `harden_reviews_condition_changes_and_no_show` |

## Final P0 hardening

- recruiter-side reviews for salon Work Slots may be submitted by an active salon owner/manager;
- one worker-side and one recruiter-side review per participation are enforced with partial unique indexes;
- only one active condition-change proposal may exist per Work Slot;
- condition-change application locks participant users before schedule conflict re-check;
- accepted/rejected condition changes create notifications and audit records;
- no-show reporting is idempotent, removes the absent worker from the active work-group membership, and moves an all-no-show Work Slot to `disputed`;
- counter-offer terms were regression-tested through acceptance;
- availability lifecycle updates were regression-tested for both account withdrawal and automatic booking after acceptance.

## Rollback-only acceptance results

### Remaining P0 test

`../tests/formal_mvp_v2_remaining_p0_acceptance.sql`

Latest production result:

```json
{
  "manager_checklist_and_worker_check": true,
  "manager_can_pin_group_message": true,
  "only_one_pending_condition_change": true,
  "all_participants_accept_condition_change": true,
  "condition_change_rechecks_schedule_conflict": true,
  "counter_offer_terms_applied_on_acceptance": true,
  "salon_manager_can_review_worker": true,
  "second_manager_recruiter_review_blocked": true,
  "no_show_removes_group_membership": true,
  "all_no_show_moves_slot_to_disputed": true,
  "all_passed": true
}
```

### Availability booking regression

```json
{
  "participant_created": true,
  "overlapping_availability_auto_booked": true,
  "all_passed": true
}
```

All tests roll back temporary `auth.users` and public rows before returning. Leak checks after test execution returned `0` matching `e2e-%@example.invalid` users.
