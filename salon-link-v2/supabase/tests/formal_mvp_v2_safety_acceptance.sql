-- SALON LINK Formal MVP v2 safety/lifecycle rollback-only acceptance test
-- Expected result: all_passed = true
-- All auth/public rows are rolled back before the function returns.

create or replace function pg_temp.run_salon_link_v2_safety_acceptance()
returns jsonb
language plpgsql
as $$
declare
  v_owner uuid := gen_random_uuid();
  v_worker uuid := gen_random_uuid();
  v_salon uuid;
  v_slot uuid;
  v_review_slot uuid;
  v_app uuid;
  v_offer uuid;
  v_avail uuid;
  v_part uuid;
  v_review uuid;
  v_verification uuid;
  v_duplicate_verification_blocked boolean := false;
  v_application_withdrawn boolean := false;
  v_offer_declined boolean := false;
  v_availability_withdrawn boolean := false;
  v_account_withdrawn boolean := false;
  v_recent_review_not_expired boolean := false;
  v_due_review_published boolean := false;
  v_due_slot_completed boolean := false;
  v_result jsonb;
  v_err text;
begin
  begin
    insert into auth.users(
      id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,
      created_at,updated_at,is_sso_user,is_anonymous
    )
    values
      (v_owner,'authenticated','authenticated','e2e-owner-'||replace(v_owner::text,'-','')||'@example.invalid',now(),'{}'::jsonb,jsonb_build_object('role','salon','display_name','E2E Owner 2'),now(),now(),false,false),
      (v_worker,'authenticated','authenticated','e2e-assistant-'||replace(v_worker::text,'-','')||'@example.invalid',now(),'{}'::jsonb,jsonb_build_object('role','assistant','display_name','E2E Assistant 2'),now(),now(),false,false);

    update public.profiles
       set identity_verification_status='verified'
     where user_id in (v_owner,v_worker);

    insert into public.salons(owner_user_id,name,verification_status)
    values(v_owner,'E2E SAFETY SALON','verified')
    returning id into v_salon;

    insert into public.salon_members(salon_id,user_id,member_role,status,approved_at)
    values(v_salon,v_owner,'owner','active',now());

    perform set_config('request.jwt.claim.sub',v_owner::text,true);
    perform set_config('request.jwt.claim.role','authenticated',true);
    v_slot := public.create_work_slot(
      'E2E pending cleanup','assistant','salon',v_salon,
      current_date+5,'10:00','18:00',2,
      'hourly',1200,'cleanup test',
      null,null,null,null,null,null,v_owner,null,false
    );
    perform public.work_slot_publish(v_slot);

    perform set_config('request.jwt.claim.sub',v_worker::text,true);
    insert into public.applications(work_slot_id,applicant_id,message)
    values(v_slot,v_worker,'pending cleanup application')
    returning id into v_app;

    insert into public.availability_slots(
      user_id,role,available_date,start_time,end_time,areas,preferred_compensation,comment
    ) values(
      v_worker,'assistant',current_date+6,'09:00','17:00',array['東京都'],1200,'cleanup availability'
    ) returning id into v_avail;

    perform set_config('request.jwt.claim.sub',v_owner::text,true);
    insert into public.offers(
      work_slot_id,sender_id,recipient_id,salon_id,target_role,work_date,start_time,end_time,
      compensation_type,compensation_amount,description,message
    ) values(
      v_slot,v_owner,v_worker,v_salon,'assistant',current_date+5,'10:00','18:00',
      'hourly',1200,'pending offer','cleanup offer'
    ) returning id into v_offer;

    perform set_config('request.jwt.claim.sub',v_worker::text,true);
    v_verification := public.submit_verification_request('identity',null,null);
    begin
      perform public.submit_verification_request('identity',null,null);
      v_duplicate_verification_blocked := false;
    exception when others then
      v_duplicate_verification_blocked := position('VERIFICATION_PENDING' in sqlerrm)>0;
    end;

    perform public.withdraw_account();

    select (status='withdrawn') into v_application_withdrawn
      from public.applications where id=v_app;
    select (status='declined') into v_offer_declined
      from public.offers where id=v_offer;
    select (status='withdrawn') into v_availability_withdrawn
      from public.availability_slots where id=v_avail;
    select (account_status='withdrawn') into v_account_withdrawn
      from public.users where id=v_worker;

    -- An old historical work date must not expire a newly opened review phase.
    insert into public.work_slots(
      title,recruiter_type,recruiter_user_id,salon_id,target_role,
      work_date,start_time,end_time,capacity,accepted_count,status,
      compensation_type,compensation_amount,description,updated_at
    ) values(
      'E2E review deadline','salon',v_owner,v_salon,'assistant',
      current_date-30,'10:00','18:00',1,1,'review_pending',
      'fixed',10000,'review deadline test',now()
    ) returning id into v_review_slot;

    insert into public.work_participants(
      work_slot_id,user_id,source_type,status,accepted_at,completed_at
    ) values(
      v_review_slot,v_worker,'direct_add','completed',
      now()-interval '30 days',now()-interval '30 days'
    ) returning id into v_part;

    insert into public.reviews(
      work_participant_id,reviewer_id,reviewee_id,direction,
      overall_score,comment,status,submitted_at
    ) values(
      v_part,v_owner,v_worker,'recruiter_to_worker',
      5,'deadline test','submitted',now()-interval '20 days'
    ) returning id into v_review;

    perform set_config('request.jwt.claim.sub',v_owner::text,true);
    perform public.refresh_review_deadlines(14);
    select (status='submitted') into v_recent_review_not_expired
      from public.reviews where id=v_review;

    update public.work_slots
       set updated_at=now()-interval '15 days'
     where id=v_review_slot;

    perform public.refresh_review_deadlines(14);
    select (status='published') into v_due_review_published
      from public.reviews where id=v_review;
    select (status='completed') into v_due_slot_completed
      from public.work_slots where id=v_review_slot;

    v_result := jsonb_build_object(
      'duplicate_pending_verification_blocked',v_duplicate_verification_blocked,
      'withdrawal_closes_pending_application',v_application_withdrawn,
      'withdrawal_declines_incoming_offer',v_offer_declined,
      'withdrawal_closes_published_availability',v_availability_withdrawn,
      'account_soft_withdrawn',v_account_withdrawn,
      'old_work_date_does_not_expire_new_review_phase',v_recent_review_not_expired,
      'review_publishes_after_review_phase_deadline',v_due_review_published,
      'slot_completes_after_review_deadline',v_due_slot_completed,
      'all_passed',
        v_duplicate_verification_blocked
        and v_application_withdrawn
        and v_offer_declined
        and v_availability_withdrawn
        and v_account_withdrawn
        and v_recent_review_not_expired
        and v_due_review_published
        and v_due_slot_completed
    );

    raise exception 'SL_E2E_ROLLBACK';
  exception when others then
    v_err := sqlerrm;
    if v_err='SL_E2E_ROLLBACK' then return v_result; end if;
    raise;
  end;
end
$$;

select pg_temp.run_salon_link_v2_safety_acceptance() as result;
