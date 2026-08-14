-- SALON LINK Formal MVP v2 rollback-only acceptance test
--
-- This script creates temporary auth/public data inside a PL/pgSQL exception
-- subtransaction, captures the assertions, and then intentionally raises
-- SL_E2E_ROLLBACK. PostgreSQL rolls back every test row (including auth.users)
-- before returning the result JSON from the exception handler.
--
-- Expected result: all_passed = true

create or replace function pg_temp.run_salon_link_v2_acceptance()
returns jsonb
language plpgsql
as $$
declare
  v_owner uuid := gen_random_uuid();
  v_manager uuid := gen_random_uuid();
  v_assistant uuid := gen_random_uuid();
  v_stylist uuid := gen_random_uuid();
  v_salon uuid;
  v_slot uuid;
  v_personal_slot uuid;
  v_app uuid;
  v_part uuid;
  v_comp uuid;
  v_first_event uuid;
  v_manager_accept boolean := false;
  v_personal_denied boolean := false;
  v_double_start_blocked boolean := false;
  v_review_pending boolean := false;
  v_group_read_only boolean := false;
  v_participant_completed boolean := false;
  v_result jsonb;
  v_err text;
begin
  begin
    insert into auth.users(
      id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,
      created_at,updated_at,is_sso_user,is_anonymous
    )
    values
      (v_owner,'authenticated','authenticated','e2e-owner-'||replace(v_owner::text,'-','')||'@example.invalid',now(),'{}'::jsonb,jsonb_build_object('role','salon','display_name','E2E Owner'),now(),now(),false,false),
      (v_manager,'authenticated','authenticated','e2e-manager-'||replace(v_manager::text,'-','')||'@example.invalid',now(),'{}'::jsonb,jsonb_build_object('role','salon','display_name','E2E Manager'),now(),now(),false,false),
      (v_assistant,'authenticated','authenticated','e2e-assistant-'||replace(v_assistant::text,'-','')||'@example.invalid',now(),'{}'::jsonb,jsonb_build_object('role','assistant','display_name','E2E Assistant'),now(),now(),false,false),
      (v_stylist,'authenticated','authenticated','e2e-stylist-'||replace(v_stylist::text,'-','')||'@example.invalid',now(),'{}'::jsonb,jsonb_build_object('role','stylist','display_name','E2E Stylist'),now(),now(),false,false);

    update public.profiles
       set identity_verification_status='verified'
     where user_id in (v_owner,v_manager,v_assistant,v_stylist);
    update public.profiles
       set license_verification_status='verified'
     where user_id=v_stylist;

    insert into public.salons(owner_user_id,name,verification_status)
    values(v_owner,'E2E SALON','verified')
    returning id into v_salon;

    insert into public.salon_members(salon_id,user_id,member_role,status,approved_at)
    values
      (v_salon,v_owner,'owner','active',now()),
      (v_salon,v_manager,'manager','active',now()),
      (v_salon,v_stylist,'stylist','active',now());

    -- Salon owner creates and publishes an assistant Work Slot.
    perform set_config('request.jwt.claim.sub',v_owner::text,true);
    perform set_config('request.jwt.claim.role','authenticated',true);
    v_slot := public.create_work_slot(
      'E2E assistant recruitment','assistant','salon',v_salon,
      current_date+2,'10:00','18:00',1,
      'hourly',1200,'E2E work',
      null,null,null,null,null,null,v_manager,null,false
    );
    perform public.work_slot_publish(v_slot);

    -- Assistant applies from another auth identity.
    perform set_config('request.jwt.claim.sub',v_assistant::text,true);
    insert into public.applications(work_slot_id,applicant_id,message)
    values(v_slot,v_assistant,'E2E application')
    returning id into v_app;

    -- A different active salon manager accepts the application.
    perform set_config('request.jwt.claim.sub',v_manager::text,true);
    update public.applications
       set status='accepted',updated_at=now()
     where id=v_app;

    select id into v_part
      from public.work_participants
     where work_slot_id=v_slot and user_id=v_assistant;

    v_manager_accept := v_part is not null
      and exists(select 1 from public.applications where id=v_app and status='accepted')
      and exists(select 1 from public.work_slots where id=v_slot and accepted_count=1 and status='filled');

    -- A salon manager must NOT be able to take over a stylist's personal
    -- assistant recruitment.
    perform set_config('request.jwt.claim.sub',v_stylist::text,true);
    v_personal_slot := public.create_work_slot(
      'E2E personal assistant recruitment','assistant','stylist',v_salon,
      current_date+3,'11:00','17:00',1,
      'fixed',10000,'Personal stylist work',
      null,null,null,null,null,null,v_stylist,null,true
    );

    perform set_config('request.jwt.claim.sub',v_manager::text,true);
    begin
      perform public.update_work_slot_draft(
        v_personal_slot,
        jsonb_build_object('title','SHOULD NOT UPDATE')
      );
      v_personal_denied := false;
    exception when others then
      v_personal_denied := position('PERMISSION_DENIED' in sqlerrm)>0;
    end;

    -- Attendance must serialize rapid duplicate actions.
    perform set_config('request.jwt.claim.sub',v_assistant::text,true);
    v_first_event := public.record_work_time(v_part,'work_start');
    begin
      perform public.record_work_time(v_part,'work_start');
      v_double_start_blocked := false;
    exception when others then
      v_double_start_blocked := position('WORK_ALREADY_STARTED' in sqlerrm)>0;
    end;

    perform pg_sleep(0.01);
    perform public.record_work_time(v_part,'work_end');

    -- Manager approves attendance, compensation, and external payment.
    perform set_config('request.jwt.claim.sub',v_manager::text,true);
    v_comp := public.approve_work_time(v_part);
    perform public.confirm_compensation(v_comp,0);
    perform public.mark_payment_paid(v_comp,'E2E-EXTERNAL',null);

    -- Worker confirms receipt. This must auto-enter review_pending and make the
    -- work group read-only without a recruiter-only extra click.
    perform set_config('request.jwt.claim.sub',v_assistant::text,true);
    perform public.confirm_payment_received(v_comp,'E2E received');

    select (status='review_pending')
      into v_review_pending
      from public.work_slots
     where id=v_slot;

    select coalesce(bool_and(read_only),false)
      into v_group_read_only
      from public.conversations
     where type='work_group' and work_slot_id=v_slot;

    select (status='completed')
      into v_participant_completed
      from public.work_participants
     where id=v_part;

    v_result := jsonb_build_object(
      'manager_can_accept_salon_recruitment',v_manager_accept,
      'manager_cannot_edit_stylist_personal_recruitment',v_personal_denied,
      'double_work_start_blocked',v_double_start_blocked,
      'payment_received_auto_review_pending',v_review_pending,
      'work_group_read_only_after_payment',v_group_read_only,
      'participant_completed_after_received',v_participant_completed,
      'all_passed',
        v_manager_accept
        and v_personal_denied
        and v_double_start_blocked
        and v_review_pending
        and v_group_read_only
        and v_participant_completed
    );

    raise exception 'SL_E2E_ROLLBACK';
  exception when others then
    v_err := sqlerrm;
    if v_err='SL_E2E_ROLLBACK' then
      return v_result;
    end if;
    raise;
  end;
end
$$;

select pg_temp.run_salon_link_v2_acceptance() as result;

-- Optional leak check after the function returns:
-- select count(*) from auth.users where email like 'e2e-%@example.invalid';
-- Expected: 0
