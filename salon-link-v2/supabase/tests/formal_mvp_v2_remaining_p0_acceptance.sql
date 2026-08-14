-- SALON LINK Formal MVP v2 remaining-P0 rollback-only acceptance test
-- Latest production result: all_passed = true.
-- All generated auth/public records are rolled back before returning.

-- Covered assertions:
-- - salon manager checklist creation + worker completion
-- - salon manager pinned group message
-- - only one pending condition change per Work Slot
-- - all-participant condition-change acceptance and application
-- - schedule conflict re-check at condition-change application time
-- - counter-offer time/pay/description applied to accepted Work Slot
-- - salon manager may submit recruiter-side review
-- - second salon manager cannot submit another recruiter-side review
-- - no-show removes work-group membership
-- - all-participant no-show moves the Work Slot to disputed

-- This file intentionally mirrors the production rollback test used during
-- hardening. Keep it administrative/test-only because it inserts temporary
-- auth.users inside a subtransaction.

create or replace function pg_temp.run_salon_link_v2_remaining_p0_acceptance()
returns jsonb
language plpgsql
as $$
declare
  v_owner uuid:=gen_random_uuid();
  v_manager1 uuid:=gen_random_uuid();
  v_manager2 uuid:=gen_random_uuid();
  v_worker1 uuid:=gen_random_uuid();
  v_worker2 uuid:=gen_random_uuid();
  v_salon uuid;
  v_slot uuid;
  v_app1 uuid; v_app2 uuid;
  v_part1 uuid; v_part2 uuid;
  v_group uuid;
  v_item uuid; v_message uuid;
  v_change1 uuid; v_change2 uuid; v_change_conflict uuid;
  v_conflict_slot uuid;
  v_offer uuid; v_offer_part uuid; v_offer_slot uuid;
  v_review1 uuid;
  v_no_show_slot uuid; v_no_show_part uuid; v_no_show_group uuid; v_report uuid;
  v_pending_change_blocked boolean:=false;
  v_change_applied boolean:=false;
  v_conflict_rejected boolean:=false;
  v_counter_offer_applied boolean:=false;
  v_checklist_ok boolean:=false;
  v_pin_ok boolean:=false;
  v_manager_review_ok boolean:=false;
  v_second_manager_review_blocked boolean:=false;
  v_no_show_removed boolean:=false;
  v_no_show_disputed boolean:=false;
  v_result jsonb;
  v_err text;
begin
  begin
    insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_sso_user,is_anonymous)
    values
      (v_owner,'authenticated','authenticated','e2e-owner-'||replace(v_owner::text,'-','')||'@example.invalid',now(),'{}',jsonb_build_object('role','salon','display_name','Owner'),now(),now(),false,false),
      (v_manager1,'authenticated','authenticated','e2e-manager1-'||replace(v_manager1::text,'-','')||'@example.invalid',now(),'{}',jsonb_build_object('role','salon','display_name','Manager 1'),now(),now(),false,false),
      (v_manager2,'authenticated','authenticated','e2e-manager2-'||replace(v_manager2::text,'-','')||'@example.invalid',now(),'{}',jsonb_build_object('role','salon','display_name','Manager 2'),now(),now(),false,false),
      (v_worker1,'authenticated','authenticated','e2e-assistant1-'||replace(v_worker1::text,'-','')||'@example.invalid',now(),'{}',jsonb_build_object('role','assistant','display_name','Assistant 1'),now(),now(),false,false),
      (v_worker2,'authenticated','authenticated','e2e-assistant2-'||replace(v_worker2::text,'-','')||'@example.invalid',now(),'{}',jsonb_build_object('role','assistant','display_name','Assistant 2'),now(),now(),false,false);

    update public.profiles set identity_verification_status='verified'
      where user_id in (v_owner,v_manager1,v_manager2,v_worker1,v_worker2);

    insert into public.salons(owner_user_id,name,verification_status)
    values(v_owner,'P0 TEST SALON','verified') returning id into v_salon;
    insert into public.salon_members(salon_id,user_id,member_role,status,approved_at)
    values
      (v_salon,v_owner,'owner','active',now()),
      (v_salon,v_manager1,'manager','active',now()),
      (v_salon,v_manager2,'manager','active',now());

    perform set_config('request.jwt.claim.role','authenticated',true);
    perform set_config('request.jwt.claim.sub',v_owner::text,true);
    v_slot:=public.create_work_slot(
      'P0 group work','assistant','salon',v_salon,current_date+5,'10:00','18:00',2,
      'hourly',1200,'base work',null,null,null,null,null,null,v_manager1,null,true
    );
    perform public.work_slot_publish(v_slot);

    perform set_config('request.jwt.claim.sub',v_worker1::text,true);
    insert into public.applications(work_slot_id,applicant_id,message)
    values(v_slot,v_worker1,'apply 1') returning id into v_app1;
    perform set_config('request.jwt.claim.sub',v_worker2::text,true);
    insert into public.applications(work_slot_id,applicant_id,message)
    values(v_slot,v_worker2,'apply 2') returning id into v_app2;

    perform set_config('request.jwt.claim.sub',v_manager1::text,true);
    update public.applications set status='accepted',updated_at=now() where id in (v_app1,v_app2);
    select id into v_part1 from public.work_participants where work_slot_id=v_slot and user_id=v_worker1;
    select id into v_part2 from public.work_participants where work_slot_id=v_slot and user_id=v_worker2;
    select id into v_group from public.conversations where type='work_group' and work_slot_id=v_slot;

    v_item:=public.checklist_item_add(v_slot,'黒い服','持参してください',true,1);
    v_message:=public.conversation_send(v_group,'集合は9:45です',v_slot);
    perform public.conversation_pin_message(v_group,v_message);
    v_pin_ok:=exists(select 1 from public.pinned_messages where conversation_id=v_group and message_id=v_message);

    perform set_config('request.jwt.claim.sub',v_worker1::text,true);
    perform public.checklist_item_set(v_item,true);
    v_checklist_ok:=exists(select 1 from public.checklist_item_statuses where checklist_item_id=v_item and participant_id=v_part1 and completed=true);

    perform set_config('request.jwt.claim.sub',v_manager1::text,true);
    v_change1:=public.propose_slot_change(v_slot,jsonb_build_object('compensation_amount',1350,'description','updated work'));
    begin
      v_change2:=public.propose_slot_change(v_slot,jsonb_build_object('compensation_amount',1400));
      v_pending_change_blocked:=false;
    exception when others then
      v_pending_change_blocked:=position('CHANGE_ALREADY_PENDING' in sqlerrm)>0;
    end;

    perform set_config('request.jwt.claim.sub',v_worker1::text,true);
    perform public.respond_slot_change(v_change1,'accepted');
    perform set_config('request.jwt.claim.sub',v_worker2::text,true);
    perform public.respond_slot_change(v_change1,'accepted');
    v_change_applied:=exists(select 1 from public.work_slot_changes where id=v_change1 and status='accepted')
      and exists(select 1 from public.work_slots where id=v_slot and compensation_amount=1350 and description='updated work');

    insert into public.work_slots(title,recruiter_type,recruiter_user_id,salon_id,target_role,work_date,start_time,end_time,capacity,accepted_count,status,compensation_type,compensation_amount,description)
    values('conflict work','salon',v_owner,v_salon,'assistant',current_date+5,'19:00','21:00',1,1,'filled','fixed',5000,'conflict')
    returning id into v_conflict_slot;
    insert into public.work_participants(work_slot_id,user_id,source_type,status,accepted_at)
    values(v_conflict_slot,v_worker2,'direct_add','accepted',now());

    perform set_config('request.jwt.claim.sub',v_manager1::text,true);
    v_change_conflict:=public.propose_slot_change(v_slot,jsonb_build_object('start_time','13:00','end_time','20:00'));
    perform set_config('request.jwt.claim.sub',v_worker1::text,true);
    perform public.respond_slot_change(v_change_conflict,'accepted');
    perform set_config('request.jwt.claim.sub',v_worker2::text,true);
    perform public.respond_slot_change(v_change_conflict,'accepted');
    v_conflict_rejected:=exists(select 1 from public.work_slot_changes where id=v_change_conflict and status='rejected' and resolution_note='SCHEDULE_CONFLICT')
      and exists(select 1 from public.work_slots where id=v_slot and start_time='10:00'::time and end_time='18:00'::time);

    perform set_config('request.jwt.claim.sub',v_owner::text,true);
    insert into public.offers(sender_id,recipient_id,salon_id,target_role,work_date,start_time,end_time,compensation_type,compensation_amount,description,message,status)
    values(v_owner,v_worker1,v_salon,'assistant',current_date+8,'10:00','18:00','fixed',10000,'direct offer','offer','pending')
    returning id into v_offer;
    perform set_config('request.jwt.claim.sub',v_worker1::text,true);
    update public.offers set status='countered',proposed_changes=jsonb_build_object('start_time','11:00','end_time','17:00','compensation_amount',13000,'description','countered work'),updated_at=now() where id=v_offer;
    perform set_config('request.jwt.claim.sub',v_owner::text,true);
    update public.offers set status='accepted',updated_at=now() where id=v_offer;
    select wp.id,wp.work_slot_id into v_offer_part,v_offer_slot
      from public.work_participants wp where wp.source_type='offer' and wp.source_id=v_offer;
    v_counter_offer_applied:=v_offer_part is not null and exists(
      select 1 from public.work_slots where id=v_offer_slot and start_time='11:00'::time
      and end_time='17:00'::time and compensation_amount=13000 and description='countered work'
    );

    update public.work_participants set status='completed',completed_at=now() where id=v_part1;
    update public.work_slots set status='review_pending',updated_at=now() where id=v_slot;
    perform set_config('request.jwt.claim.sub',v_manager1::text,true);
    v_review1:=public.submit_review(v_part1,5,jsonb_build_object('communication',5),'great worker');
    v_manager_review_ok:=v_review1 is not null;
    perform set_config('request.jwt.claim.sub',v_manager2::text,true);
    begin
      perform public.submit_review(v_part1,4,jsonb_build_object('communication',4),'second review');
      v_second_manager_review_blocked:=false;
    exception when others then
      v_second_manager_review_blocked:=position('REVIEW_ALREADY_SUBMITTED' in sqlerrm)>0;
    end;

    insert into public.work_slots(title,recruiter_type,recruiter_user_id,salon_id,target_role,work_date,start_time,end_time,capacity,accepted_count,status,compensation_type,compensation_amount,description)
    values('no show work','salon',v_owner,v_salon,'assistant',current_date-1,'10:00','18:00',1,1,'ready','fixed',8000,'no show')
    returning id into v_no_show_slot;
    insert into public.work_participants(work_slot_id,user_id,source_type,status,accepted_at)
    values(v_no_show_slot,v_worker2,'direct_add','accepted',now()-interval '2 days') returning id into v_no_show_part;
    perform public.ensure_work_group(v_no_show_slot,v_worker2);
    select id into v_no_show_group from public.conversations where type='work_group' and work_slot_id=v_no_show_slot;
    perform set_config('request.jwt.claim.sub',v_manager1::text,true);
    v_report:=public.report_no_show(v_no_show_part,'連絡なし');
    v_no_show_removed:=exists(select 1 from public.conversation_members where conversation_id=v_no_show_group and user_id=v_worker2 and removed_at is not null);
    v_no_show_disputed:=exists(select 1 from public.work_slots where id=v_no_show_slot and status='disputed' and accepted_count=0)
      and exists(select 1 from public.reports where id=v_report and category='no_show' and reported_user_id=v_worker2);

    v_result:=jsonb_build_object(
      'manager_checklist_and_worker_check',v_checklist_ok,
      'manager_can_pin_group_message',v_pin_ok,
      'only_one_pending_condition_change',v_pending_change_blocked,
      'all_participants_accept_condition_change',v_change_applied,
      'condition_change_rechecks_schedule_conflict',v_conflict_rejected,
      'counter_offer_terms_applied_on_acceptance',v_counter_offer_applied,
      'salon_manager_can_review_worker',v_manager_review_ok,
      'second_manager_recruiter_review_blocked',v_second_manager_review_blocked,
      'no_show_removes_group_membership',v_no_show_removed,
      'all_no_show_moves_slot_to_disputed',v_no_show_disputed,
      'all_passed',v_checklist_ok and v_pin_ok and v_pending_change_blocked and v_change_applied and v_conflict_rejected and v_counter_offer_applied and v_manager_review_ok and v_second_manager_review_blocked and v_no_show_removed and v_no_show_disputed
    );
    raise exception 'SL_E2E_ROLLBACK';
  exception when others then
    v_err:=sqlerrm;
    if v_err='SL_E2E_ROLLBACK' then return v_result; end if;
    raise;
  end;
end
$$;

select pg_temp.run_salon_link_v2_remaining_p0_acceptance() as result;
