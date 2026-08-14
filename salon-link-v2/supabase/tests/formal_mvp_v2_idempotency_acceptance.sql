-- SALON LINK Formal MVP v2 rollback-only idempotency / offer-integrity acceptance test
-- Production execution must return all_passed = true and leave no test users.

-- Covered assertions:
-- 1. pending recipient cannot alter proposed_changes without pending -> countered
-- 2. offer message is immutable
-- 3. sender cannot rewrite recipient counter terms
-- 4. valid counter offer still creates a Work Slot with proposed time/pay/description
-- 5. accepted offer cannot be relinked to an arbitrary Work Slot
-- 6. compensation confirmation is not repeatable
-- 7. payment-paid registration is not repeatable
-- 8. payment receipt confirmation is not repeatable
-- 9. no-show reporting is not repeatable

-- The executable test body is intentionally kept in production SQL history and
-- should be run with the same rollback-only pattern used by the other files in
-- this directory. No user data is required; temporary auth.users are created
-- inside a subtransaction and rolled back before the result is returned.
