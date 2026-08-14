/* Sticker Market scenario-fit v1.0 — compatibility layer. Loaded after core and before operation routes. */

s1MfgStatusFromOrder=function(order){
 const s=String(order.status||'');
 if(/配送完了/.test(s))return'配送完了';
 if(/発送済/.test(s))return'発送済み';
 if(/検品|発送準備/.test(s))return'検品';
 if(/製造/.test(s))return'製造中';
 return'注文受付';
};
s1SyncOrderFromManufacturing=function(m){
 const row=s1FindOrder(m.orderId);if(!row)return;
 const map={'注文受付':'注文確定','製造中':'製造中','検品':'発送準備中','発送済み':'発送済み','配送完了':'配送完了'};
 row.order.status=map[m.status]||row.order.status;
 if(m.tracking?.number){row.order.trackingNumber=m.tracking.number;row.order.carrier=m.tracking.carrier}
};
/* Existing orders keep their pre-patch visible status while manufacturing state is inferred. */
s1AllOrders().forEach(({order})=>{
 const m=s1FindManufacturingByOrder(order.id);if(!m)return;
 if(/発送準備/.test(String(order.status))&&m.status==='注文受付'){
  m.status='検品';m.history.unshift({date:now(),status:'検品',note:'既存の発送準備状態から製造工程を補完しました。'});
 }
});
save();
