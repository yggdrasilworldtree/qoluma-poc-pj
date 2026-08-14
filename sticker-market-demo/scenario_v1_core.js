/* Sticker Market scenario-fit patch v1.0 — additive core only. */

const S1_SCENARIO_VERSION=1;
const S1_USE_CASES=['PC・スマホ','手帳','文具','車','屋外','店舗','ギフト'];
const S1_MFG_FLOW=['注文受付','製造中','検品','発送済み','配送完了'];
const S1_PAYOUT_FLOW=['未確定','確定','支払予定','支払済み','調整済み'];

function s1Scenario(){db.scenario??={};return db.scenario}
function s1CreatorUser(creatorId){return db.users.find(u=>u.creatorId===creatorId)||null}
function s1UserData(userId){db.userData[userId]??=baseUserData();return db.userData[userId]}
function s1AllOrders(){const rows=[];Object.entries(db.userData||{}).forEach(([userId,d])=>(d.orders||[]).forEach(o=>rows.push({userId,order:o})));return rows}
function s1FindOrder(id){for(const row of s1AllOrders())if(row.order.id===id||row.order.orderId===id)return row;return null}
function s1FindManufacturingByOrder(orderId){return (s1Scenario().manufacturingOrders||[]).find(x=>x.orderId===orderId)||null}
function s1FindManufacturer(id){return (s1Scenario().manufacturers||[]).find(x=>x.id===id)||null}
function s1Date(v){try{return new Date(v).toLocaleString('ja-JP')}catch(e){return String(v||'—')}}
function s1StatusClass(v){return /完了|済み|確定|公開|承認|正常/.test(v)?'ok':/差し戻し|停止|返金|不良|取消|却下|高/.test(v)?'danger':/中|待ち|予定|受付|保留|検品/.test(v)?'warn':''}
function s1ProductCurrentPrice(item){const p=productBy(item.productId);if(!p)return item.price||0;if(item.kind==='digital')return Number(p.digital||0);return Number(p.physical||item.price||0)}
function s1OrderHasProduct(order,productId){return (order.items||[]).some(x=>x.productId===productId)}
function s1PurchasedProduct(userId,productId){const d=db.userData[userId];return !!d?.orders?.some(o=>s1OrderHasProduct(o,productId)&&!String(o.status).includes('キャンセル')&&!String(o.status).includes('返金'))}

function s1Notify(userId,type,text,ref={}){
 const d=s1UserData(userId),cfg=d.settings?.notify||{};
 if(cfg[type]===false)return;
 d.notifications??=[];
 d.notifications.unshift({id:uid('notice'),type,text,ref,read:false,date:now()});
}
function s1NotifyCreator(creatorId,type,text,ref={}){const u=s1CreatorUser(creatorId);if(u)s1Notify(u.id,type,text,ref)}
function s1Track(type,data={}){
 const sc=s1Scenario();sc.analytics??={events:[]};sc.analytics.events??=[];
 sc.analytics.events.push({id:uid('event'),type,userId:currentUser()?.id||null,date:now(),...data});
 if(sc.analytics.events.length>1200)sc.analytics.events=sc.analytics.events.slice(-1200);
 save();
}
function s1Audit(action,before,after,source='scenario-fit'){
 db.admin.audit??=[];
 db.admin.audit.unshift({id:uid('audit'),date:now(),userId:currentUser()?.id||'system',action,before,after,source});
}

function s1UseCasesForProduct(p,i){
 const text=[p.category,p.use,...(p.tags||[])].filter(Boolean).join(' ');
 const out=[];
 if(/PC|スマホ|宇宙|Y2K|文字|ロゴ/.test(text))out.push('PC・スマホ');
 if(/手帳|花|植物|かわいい|シンプル/.test(text))out.push('手帳','文具');
 if(/屋外|アウトドア|風景|自然|山|耐水/.test(text))out.push('屋外');
 if(/店舗|ビジネス|ロゴ|食べ物|カフェ/.test(text))out.push('店舗');
 if(/ギフト|花|かわいい|動物|ペット/.test(text))out.push('ギフト');
 if(/車|カー/.test(text))out.push('車');
 if(!out.length)out.push(S1_USE_CASES[i%S1_USE_CASES.length]);
 return [...new Set(out)];
}
function s1SeriesSeed(){
 return [
  {id:'series_nature',name:'風景と夜空コレクション',description:'風景・自然・夜空をテーマにしたシリーズ。'},
  {id:'series_pet',name:'どうぶつ日和',description:'動物・ペットをテーマにしたシリーズ。'},
  {id:'series_cafe',name:'喫茶とおやつ',description:'カフェ・食べ物をテーマにしたシリーズ。'}
 ];
}
function s1SeriesForProduct(p){if(/風景|自然|宇宙|夜空/.test(p.category+' '+(p.tags||[]).join(' ')))return'series_nature';if(/動物|ペット|猫|ねこ|うさぎ/.test(p.category+' '+p.name))return'series_pet';if(/食べ物|カフェ|喫茶|コーヒー/.test(p.category+' '+p.name))return'series_cafe';return null}

function s1MfgStatusFromOrder(order){const s=String(order.status||'');if(/配送完了/.test(s))return'配送完了';if(/発送済/.test(s))return'発送済み';if(/検品/.test(s))return'検品';if(/製造/.test(s))return'製造中';return'注文受付'}
function s1EnsureManufacturing(order,userId){
 if(!(order.items||[]).some(x=>x.kind==='physical'))return null;
 const sc=s1Scenario();let m=sc.manufacturingOrders.find(x=>x.orderId===order.id);if(m)return m;
 const mf=sc.manufacturers.find(x=>x.active)!;
 m={id:uid('mfgOrder'),manufacturingOrderId:uid('mfgOrder'),orderId:order.id,userId,manufacturerId:mf.id,status:s1MfgStatusFromOrder(order),createdAt:order.date||now(),updatedAt:now(),inspection:{status:'未実施',note:''},tracking:{carrier:'',number:'',shippedAt:null,deliveredAt:null},reproductionOf:null,history:[{date:now(),status:s1MfgStatusFromOrder(order),note:'既存注文に製造注文を関連付けました。'}]};
 sc.manufacturingOrders.push(m);return m;
}
function s1SyncOrderFromManufacturing(m){
 const row=s1FindOrder(m.orderId);if(!row)return;
 const map={'注文受付':'注文確定','製造中':'製造中','検品':'検品中','発送済み':'発送済み','配送完了':'配送完了'};
 row.order.status=map[m.status]||row.order.status;
 if(m.tracking?.number){row.order.trackingNumber=m.tracking.number;row.order.carrier=m.tracking.carrier}
}
function s1SetManufacturingStatus(id,status,note=''){
 const m=s1Scenario().manufacturingOrders.find(x=>x.id===id);if(!m||!S1_MFG_FLOW.includes(status))return;
 const before=m.status,from=S1_MFG_FLOW.indexOf(before),to=S1_MFG_FLOW.indexOf(status);
 if(to<from&&currentUser()?.role!=='admin'){toast('前の工程には戻せません');return}
 m.status=status;m.updatedAt=now();m.history.unshift({date:now(),status,note:note||`${status}へ更新`});
 if(status==='検品')m.inspection.status='確認中';
 if(status==='発送済み'&&!m.tracking.shippedAt)m.tracking.shippedAt=now();
 if(status==='配送完了'&&!m.tracking.deliveredAt)m.tracking.deliveredAt=now();
 s1SyncOrderFromManufacturing(m);s1Audit('製造状態更新',before,status,'製造管理');
 const row=s1FindOrder(m.orderId);if(row)s1Notify(row.userId,'shipping',`注文 ${m.orderId}：${status}`,{orderId:m.orderId,manufacturingOrderId:m.id});
 save();render();
}

function s1EnsureScenario(){
 const sc=s1Scenario();sc.version=S1_SCENARIO_VERSION;
 sc.series??=s1SeriesSeed();sc.demandRequests??=[];sc.customOrders??=[];sc.supportCases??=[];sc.reports??=[];sc.rightsCases??=[];sc.manufacturingOrders??=[];sc.manufacturers??=[];sc.payouts??=[];sc.features??=[];sc.riskFlags??=[];sc.analytics??={events:[]};sc.accountClosures??=[];sc.featuredCollections??=[];
 if(!sc.manufacturers.length)sc.manufacturers.push({id:'mfg_demo_001',name:'Demo Print Works',materials:['耐水PET','上質紙','透明PET','ホログラム'],sizes:['30mm','50mm','70mm','100mm'],baseCost:120,leadDays:5,active:true,defectRate:1.2,onTimeRate:97.8});
 if(!db.users.some(u=>u.role==='manufacturer')){const mu={id:'user_mfg_001',role:'manufacturer',manufacturerId:'mfg_demo_001',name:'Demo Print Works',email:'mfg@example.test',password:'demo',points:0};db.users.push(mu);db.userData[mu.id]=baseUserData()}
 products.forEach((p,i)=>{p.useCases??=s1UseCasesForProduct(p,i);p.seriesId??=s1SeriesForProduct(p);p.variants??=[{id:`${p.id}_base`,name:'標準',material:p.material,size:p.size||'50mm',price:p.physical||p.digital}];p.cost??=Math.max(40,Math.round((p.physical||p.digital)*.34));p.feeRate??=.12;p.rights??={ownerDeclared:true,aiUsed:!!p.aiGenerated,evidence:[],warning:null};p.hidden??=false});
 Object.entries(db.userData||{}).forEach(([uid0,d])=>{d.settings??={};d.settings.notify??={order:true,shipping:true,review:true,creator:true,demand:true,moderation:true,payout:true,support:true};d.savedSearches??=[]});
 s1AllOrders().forEach(({userId,order})=>s1EnsureManufacturing(order,userId));
 products.filter(p=>p.creatorId).forEach(p=>{if(!sc.payouts.some(x=>x.productId===p.id))sc.payouts.push({id:uid('payout'),creatorId:p.creatorId,productId:p.id,orderId:null,gross:Math.round((p.sales||0)*(p.digital||0)*.03),cost:Math.round((p.sales||0)*(p.cost||0)*.01),fee:Math.round((p.sales||0)*(p.digital||0)*.003),amount:Math.max(0,Math.round((p.sales||0)*(p.digital||0)*.02)),status:'確定',updatedAt:now()})});
 if(!sc.features.length)sc.features.push({id:'feature_001',title:'夏のステッカー特集',status:'公開',productIds:products.slice(0,4).map(p=>p.id),updatedAt:now()});
 save();
}

/* D-04: reorder uses current catalog values instead of historic prices. */
reorder=function(id){
 const row=s1FindOrder(id);if(!row||row.userId!==currentUser()?.id)return;
 const missing=[];
 row.order.items.forEach(old=>{const p=productBy(old.productId);if(!p||p.hidden){missing.push(old.productId);return}const fresh={...old,id:uid('cartItem'),cartItemId:uid('cartItem'),price:s1ProductCurrentPrice(old)};userData().cart.push(fresh)});
 save();s1Track('reorder',{orderId:id});if(missing.length)toast('販売終了商品を除いて現在価格でカートへ追加しました');go('cart');
};

const s1BaseOrderCard=orderCard;
orderCard=function(o){
 const m=s1FindManufacturingByOrder(o.id);const html=s1BaseOrderCard(o);
 const detail=`<button class="btn primary" onclick="go('order/${encodeURIComponent(o.id)}')">注文詳細</button>`;
 const manufacturing=m?`<span class="status ${s1StatusClass(m.status)}">製造：${m.status}</span>`:'';
 return html.replace('<div class="btn-row" style="margin-top:9px">',`${manufacturing}<div class="btn-row" style="margin-top:9px">${detail}`).replace("onclick=\"toast('問い合わせ画面を開きました（デモ）')\"",`onclick="go('support/new?order=${encodeURIComponent(o.id)}')"`);
};

const s1BaseReviewCard=reviewCard;
reviewCard=function(r){const html=s1BaseReviewCard(r);return html.replace('</article>',`<div class="btn-row" style="margin-top:8px"><button class="link-btn" onclick="s1HelpfulReview('${r.id}')">役に立った</button><button class="link-btn" onclick="s1ReportOpen('review','${r.id}')">通報</button></div></article>`)};
function s1HelpfulReview(id){const r=db.global.reviews.find(x=>x.id===id);if(!r)return;r.helpful=(r.helpful||0)+1;save();toast('参考になったを記録しました')}

submitReview=function(id){
 if(!requireAuth(`review/${id}`,'レビュー投稿にはログインが必要です。'))return;
 if(!s1PurchasedProduct(currentUser().id,id)){toast('購入済みの商品だけレビューできます');return}
 const t=$('#reviewText')?.value.trim();if(!t){toast('レビュー本文を入力してください');return}
 const file=$('.review-form input[type=file]')?.files?.[0];const order=s1UserData(currentUser().id).orders.find(o=>s1OrderHasProduct(o,id));const item=order?.items.find(x=>x.productId===id);
 db.global.reviews.unshift({id:uid('review'),productId:id,userId:currentUser().id,rating:reviewStars,text:t,date:now(),kind:item?.kind||'physical',verified:true,helpful:0,photoName:file?.name||null,purchaseSpec:item?{material:item.material,size:item.size,shape:item.shape}:null});
 const p=productBy(id);s1NotifyCreator(p.creatorId,'review',`${p.name} に新しいレビューが届きました`,{productId:id});s1Track('review',{productId:id,rating:reviewStars});save();toast('レビューを投稿しました');go('product/'+id);
};

const s1BaseViewProduct=viewProduct;
viewProduct=function(id){s1Track('product_view',{productId:id});return s1BaseViewProduct(id)};
const s1BaseToggleFav=toggleFav;
toggleFav=function(id){const before=!!userData()?.favorites?.includes(id);const out=s1BaseToggleFav(id);if(currentUser())s1Track(before?'favorite_remove':'favorite_add',{productId:id});return out};
const s1BaseAddCart=addCart;
addCart=function(id,kind,opt={}){s1Track('cart_add',{productId:id,kind});return s1BaseAddCart(id,kind,opt)};

const s1BaseRoleHome=roleHome;
roleHome=function(u){return u?.role==='manufacturer'?'manufacturer-dashboard':s1BaseRoleHome(u)};
const s1BaseNav=nav;
nav=function(){
 const u=currentUser();if(u?.role!=='manufacturer')return s1BaseNav();
 const p=routePath().split('?')[0],items=[['manufacturer-dashboard','⌂','製造トップ'],['manufacturer-orders','▤','製造注文'],['notifications','🔔','通知'],['mypage','♙','マイページ']];
 return `<nav class="mobile-nav" style="--nav-count:${items.length}" aria-label="製造事業者ナビ">${items.map(i=>`<button class="${p===i[0]||p.startsWith(i[0]+'/')?'active':''}" onclick="go('${i[0]}')"><span>${i[1]}</span><span>${i[2]}</span></button>`).join('')}</nav>`;
};

/* New-publish notifications extend current approval; existing approval remains source of truth. */
if(typeof adminWorkDecision==='function'){
 const s1BaseAdminWorkDecision=adminWorkDecision;
 adminWorkDecision=function(id,status){
  const p=productBy(id),was=ensureWorkMeta(p).status;const result=s1BaseAdminWorkDecision(id,status);
  if(status==='公開中'&&was!=='公開中'){
   Object.entries(db.userData||{}).forEach(([userId,d])=>{if((d.follows||[]).includes(p.creatorId))s1Notify(userId,'creator',`${creatorBy(p.creatorId).name} の新作「${p.name}」が公開されました`,{productId:id,creatorId:p.creatorId})});
   s1Track('product_publish',{productId:id,creatorId:p.creatorId});save();
  }
  return result;
 };
}

s1EnsureScenario();
