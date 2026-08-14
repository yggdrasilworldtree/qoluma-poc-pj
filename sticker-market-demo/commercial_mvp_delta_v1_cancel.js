/* Sticker Market MVP formal delta v1.0 — live cancellation persistence only. */
const smMvpDeltaDemoApproveCancellation=typeof s1ApproveCancellation==='function'?s1ApproveCancellation:null;
s1ApproveCancellation=async function(id){
 if(!SM_MVP.live())return smMvpDeltaDemoApproveCancellation?.(id);
 const x=s1Scenario().supportCases.find(v=>v.id===id);if(!x)return toast('キャンセル案件を確認できません');
 busy('キャンセル可否を確認しています…');
 try{
  const d=await smMvpRpc('sm_admin_cancellation_decision',{p_support_case_id:id});done();
  if(d.mode==='already_closed'){await smMvpHydrateUser();toast('この注文は既に返金・キャンセル処理済みです');return render()}
  if(d.mode==='consultation'){await smMvpHydrateUser();toast('製造開始後のためキャンセル相談へ移行しました');return render()}
  if(d.mode!=='refund')throw new Error('CANCELLATION_DECISION_INVALID');
  confirmAction('キャンセル・返金を実行しますか？',`製造開始前です。${yen(Number(d.amount||0))} を決済Provider経由で返金します。Provider返金が確定するまで注文を返金済みにはしません。`,'返金してキャンセル',async()=>{
   busy('返金を処理しています…');
   try{
    const key=`cancel:${String(id).replace(/[^A-Za-z0-9._:-]/g,'').slice(0,130)}:${String(d.orderId).slice(-24)}`;
    await smMvpEdge('sm-refund',{orderId:d.orderId,reason:'製造開始前キャンセル',amount:Number(d.amount),idempotencyKey:key});
    await smMvpHydrateUser();done();toast('キャンセル返金を受け付けました');render();
   }catch(e){done();toast(e.message||'キャンセル返金に失敗しました',3600)}
  });
 }catch(e){done();toast(e.message||'キャンセル可否を判定できませんでした',3600)}
};