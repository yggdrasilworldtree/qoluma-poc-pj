/* Sticker Market scenario-fit v1.0 — completion and regression-safety layer. */

/* CROSS-01: creator is an additional capability of the same account data, not a replacement account. */
db.users.forEach(u=>{u.roles??=(u.role==='creator'?['buyer','creator']:[u.role]);if(u.role==='creator'&&!u.roles.includes('buyer'))u.roles.unshift('buyer')});
s1Scenario().violations??=[];save();

/* D-08: preserve each custom-order state explicitly; payment remains existing checkout. */
s1CustomTransition=function(id,status){
 const x=s1Scenario().customOrders.find(v=>v.id===id);if(!x||!s1CanAccessCustom(x))return;
 const before=x.status;x.status=status;x.updatedAt=now();if(status==='修正')x.revisionCount++;
 s1Audit('オーダーメイド状態更新',before,x.status,'オーダーメイド');
 s1Notify(x.userId,'order',`オーダーメイド「${x.title}」：${x.status}`,{customOrderId:id});
 s1NotifyCreator(x.creatorId,'order',`オーダーメイド「${x.title}」：${x.status}`,{customOrderId:id});save();render();
};
const s1StableCustomDetail=s1CustomOrderDetailPage;
s1CustomOrderDetailPage=function(id){
 s1StableCustomDetail(id);const x=s1Scenario().customOrders.find(v=>v.id===id),u=currentUser();if(!x||!u)return;
 const target=$('#main .management-grid .card.panel');if(!target)return;
 if(u.role==='creator'&&u.creatorId===x.creatorId&&x.status==='受注'){
  const row=document.createElement('div');row.className='btn-row s1-custom-start';row.style.marginTop='12px';row.innerHTML=`<button class="btn primary" onclick="s1CustomTransition('${id}','制作中')">制作を開始する</button>`;target.appendChild(row);
 }
};

/* Existing order creation is still authoritative. This only closes the custom-order state after that order exists. */
const s1StablePlaceOrder=placeOrder;
placeOrder=function(){
 const customIds=(userData()?.cart||[]).map(x=>productBy(x.productId)?.privateCustomOrderId).filter(Boolean);
 s1StablePlaceOrder();
 if(customIds.length)setTimeout(()=>{customIds.forEach(id=>{const x=s1Scenario().customOrders.find(v=>v.id===id);if(x){x.status='決済';x.updatedAt=now();const latest=userData()?.orders?.[0];if(latest)x.orderId=latest.id;s1NotifyCreator(x.creatorId,'order',`オーダーメイド「${x.title}」の決済が完了しました`,{customOrderId:id,orderId:x.orderId})}});save()},1200);
};

/* D-09: pre-production cancellation can be approved; after production starts it becomes a consultation. */
function s1ApproveCancellation(id){
 const x=s1Scenario().supportCases.find(v=>v.id===id),row=s1FindOrder(x?.orderId),m=s1FindManufacturingByOrder(x?.orderId);if(!x||!row)return;
 const stage=m?S1_MFG_FLOW.indexOf(m.status):0;
 if(stage>0){x.status='要相談';x.type='製造後キャンセル相談';x.resolution='製造開始後のため即時取消ではなく個別相談へ移行';s1Notify(x.userId,'support',`注文 ${x.orderId} は製造開始後のためキャンセル相談へ移行しました`,{supportCaseId:id});save();render();return}
 confirmAction('キャンセルを承認しますか？','製造開始前のため注文をキャンセルし、関連報酬も調整します。','キャンセル承認',()=>{x.status='キャンセル済み';x.resolution='製造開始前キャンセル承認';row.order.status='キャンセル';if(m){m.status='キャンセル';m.updatedAt=now();m.history.unshift({date:now(),status:'キャンセル',note:'サポート案件から製造開始前キャンセル'})}s1Scenario().payouts.filter(p=>p.orderId===row.order.id).forEach(p=>p.status='調整済み');s1Notify(x.userId,'support',`注文 ${x.orderId} のキャンセルが承認されました`,{supportCaseId:id});s1Audit('注文キャンセル', '受付','キャンセル済み','問い合わせ管理');save();render()});
}
function s1EnhanceSupportCase(){
 const path=routePath().split('?')[0],seg=path.split('/');if(seg[0]!=='support'||!seg[1]||seg[1]==='new'||currentUser()?.role!=='admin')return;const x=s1Scenario().supportCases.find(v=>v.id===seg[1]);if(!x||x.type!=='キャンセル'||$('#main .s1-cancel-admin'))return;const card=document.createElement('section');card.className='section card panel s1-cancel-admin';card.innerHTML=`<h2>キャンセル判定</h2><p class="muted">製造開始前だけ即時キャンセルできます。製造開始後は相談案件へ切り替えます。</p><button class="btn danger" onclick="s1ApproveCancellation('${x.id}')">キャンセル可否を判定</button>`;$('#main').appendChild(card);
}

/* D-12 / ADM-04: violations are append-only operational history; repeat violations can lead to account suspension. */
const s1StableModerationAction=s1ModerationAction;
s1ModerationAction=function(id,status){
 const r=s1Scenario().reports.find(x=>x.id===id),before=r?.status;s1StableModerationAction(id,status);if(!r||status!=='非表示')return;
 let userId=null,productId=null;if(r.targetType==='product'){const p=productBy(r.targetId);productId=p?.id;userId=s1CreatorUser(p?.creatorId)?.id||null}else if(r.targetType==='creator')userId=s1CreatorUser(r.targetId)?.id||null;else if(r.targetType==='user')userId=r.targetId;else if(r.targetType==='review')userId=db.global.reviews.find(x=>x.id===r.targetId)?.userId||null;
 s1Scenario().violations.unshift({id:uid('violation'),reportId:id,targetType:r.targetType,targetId:r.targetId,userId,productId,reason:r.reason,status:'記録',date:now()});if(userId)s1Notify(userId,'moderation','運営によるコンテンツ確認・制限が記録されました',{reportId:id});s1Audit('違反履歴追加',before,status,'通報管理');save();
};
function s1SuspendUser(userId){const u=db.users.find(x=>x.id===userId);if(!u)return;confirmAction('アカウントを利用停止しますか？','繰り返し違反の確認後に利用停止状態へ変更します。','利用停止',()=>{const before=u.status||'active';u.status='suspended';s1Audit('アカウント利用停止',before,'suspended','権利管理');save();render()})}
function s1EnhanceRightsAdmin(){if(routePath().split('?')[0]!=='admin-rights'||$('#main .s1-violation-history'))return;const rows=s1Scenario().violations,counts={};rows.forEach(v=>{if(v.userId)counts[v.userId]=(counts[v.userId]||0)+1});const sec=document.createElement('section');sec.className='section card panel s1-violation-history';sec.innerHTML=`<h2>違反履歴</h2>${rows.length?rows.slice(0,20).map(v=>`<div class="s1-inline-row"><div><b>${esc(v.targetType)} / ${esc(v.targetId)}</b><div class="small muted">${esc(v.reason)} ・ ${s1Date(v.date)}</div></div>${v.userId?`<div><span class="status ${counts[v.userId]>=3?'danger':'warn'}">累計 ${counts[v.userId]}件</span>${counts[v.userId]>=3?`<button class="btn danger" onclick="s1SuspendUser('${v.userId}')">利用停止</button>`:''}</div>`:''}</div>`).join(''):'<p class="muted">違反履歴はありません。</p>'}`;$('#main').appendChild(sec)}

/* CRE-03 / CRE-14: cost and variants are attached to current product management; published changes still use review. */
const s1StableWorkDetailEnhance=s1EnhanceWorkDetail;
s1EnhanceWorkDetail=function(){
 s1StableWorkDetailEnhance();const path=routePath(),seg=path.split('?')[0].split('/'),tab=parseQuery().tab||'overview';if(seg[0]!=='work'||!seg[1]||tab!=='edit')return;const p=productBy(seg[1]),m=ensureWorkMeta(p),form=$('#main .work-edit-form');if(!p||!form||form.querySelector('.s1-commercial-edit'))return;const variants=m.draftVariants||p.variants||[];const sec=document.createElement('div');sec.className='s1-commercial-edit';sec.innerHTML=`<div class="divider"></div><h2>製造原価・バリエーション</h2><div class="field"><label>製造原価（1点あたり・参考）</label><input id="s1WorkCost" type="number" min="0" value="${Number(p.cost||0)}"></div><div id="s1VariantList">${variants.map(v=>`<div class="s1-inline-row"><span><b>${esc(v.name)}</b><div class="small muted">${esc(v.material)} / ${esc(v.size)}</div></span><b>${yen(v.price)}</b></div>`).join('')}</div><div class="btn-row" style="margin-top:10px"><button class="btn" onclick="s1VariantModal('${p.id}')">＋ バリエーション</button><button class="btn" onclick="s1SaveCommercial('${p.id}')">原価を保存</button></div>`;form.appendChild(sec);
};
function s1SaveCommercial(id){const p=workOwnerProduct(id);if(!p)return;const cost=Number($('#s1WorkCost').value);if(!Number.isFinite(cost)||cost<0)return toast('原価を確認してください');p.cost=cost;save();toast('製造原価を保存しました')}
function s1VariantModal(id){const p=workOwnerProduct(id);if(!p)return;showModal(`<div class="section-head"><h2>バリエーションを追加</h2><button class="icon-btn" onclick="closeModal()">×</button></div><div class="field"><label>名称</label><input id="svName" placeholder="例：70mm 耐水PET"></div><div class="search-filter-grid"><div class="field"><label>素材</label><select id="svMaterial">${['耐水PET','上質紙','透明PET','ホログラム'].map(x=>`<option>${x}</option>`).join('')}</select></div><div class="field"><label>サイズ</label><select id="svSize">${['30mm','50mm','70mm','100mm'].map(x=>`<option>${x}</option>`).join('')}</select></div><div class="field"><label>価格</label><input id="svPrice" type="number" min="0" value="${p.physical||p.digital}"></div></div><button class="btn primary" onclick="s1AddVariant('${id}')">追加</button>`)}
function s1AddVariant(id){const p=workOwnerProduct(id);if(!p)return;const m=ensureWorkMeta(p),name=$('#svName').value.trim(),price=Number($('#svPrice').value);if(!name||!Number.isFinite(price))return toast('名称と価格を確認してください');m.draftVariants??=(p.variants||[]).map(x=>({...x}));m.draftVariants.push({id:uid('variant'),name,material:$('#svMaterial').value,size:$('#svSize').value,price});m.updatedAt=now();save();closeModal();toast('バリエーションを下書きへ追加しました');render()}
if(typeof adminWorkDecision==='function'){
 const s1StableAdminDecision=adminWorkDecision;
 adminWorkDecision=function(id,status){const p=productBy(id),m=ensureWorkMeta(p),variants=m.draftVariants?.map(x=>({...x}));const result=s1StableAdminDecision(id,status);if(status==='公開中'&&variants?.length){p.variants=variants;delete m.draftVariants;save()}return result};
}
const s1StableVisibility=changeWorkVisibility;
changeWorkVisibility=function(id,status){if(status==='非公開'){const open=s1AllOrders().filter(({order})=>s1OrderHasProduct(order,id)&&!/(配送完了|ダウンロード可能|キャンセル|返金済み)/.test(String(order.status)));if(open.length){showModal(`<div class="section-head"><h2>販売停止前の確認</h2><button class="icon-btn" onclick="closeModal()">×</button></div><p>この商品を含む未処理注文が ${open.length}件あります。注文対応を完了してから販売停止してください。</p><button class="btn" onclick="closeModal();go('creator-orders')">注文管理へ</button>`);return}}return s1StableVisibility(id,status)};

/* D-13: add a lightweight transparency check for local image files. */
const s1StableValidate=s1ValidateSubmission;
s1ValidateSubmission=function(input,targetId){s1StableValidate(input,targetId);const f=input.files?.[0],out=$('#'+targetId);if(!f||!out||!/^image\//.test(f.type))return;if(/jpe?g$/i.test(f.name)){out.textContent+=' / JPEGは透過情報を保持しません';return}if(!/png$/i.test(f.name))return;const img=new Image(),url=URL.createObjectURL(f);img.onload=()=>{try{const c=document.createElement('canvas'),max=96,scale=Math.min(1,max/Math.max(img.width,img.height));c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,c.width,c.height);const data=ctx.getImageData(0,0,c.width,c.height).data;let transparent=0;for(let i=3;i<data.length;i+=4)if(data[i]<250)transparent++;out.textContent+=transparent?` / 透過ピクセル確認 ${transparent}点`:' / 透過ピクセルは検出されませんでした'}catch(e){out.textContent+=' / 透過確認は省略されました'}URL.revokeObjectURL(url)};img.src=url};

/* D-14: AI results go to a creator draft after explicit confirmation, never directly to publication. */
executeV21Ai=function(name){const btn=$('#aiRunBtn');if(btn)btn.disabled=true;busy('AIを実行しています…');setTimeout(()=>{done();if(btn)btn.disabled=false;const box=$('#aiResult');if(!box)return;box.innerHTML=`<b>AIによる提案（デモ）</b><p>${esc(name)}の観点では、用途説明を先頭へ移し、商品名・タグを検索意図に合わせて整理する案が有効です。</p><div class="btn-row"><button class="btn" onclick="toast('変更前後を比較表示しました（デモ）')">変更前後を比較</button><button class="btn primary" onclick="s1ApplyAiSuggestion('${esc(name)}')">確認して商品下書きへ反映</button><button class="btn" onclick="toast('提案を適用しませんでした')">適用しない</button></div>`},700)};
function s1ApplyAiSuggestion(name){const pid=$('#aiProduct')?.value,p=productBy(pid);if(!p||currentUser()?.role!=='creator'||p.creatorId!==currentUser().creatorId)return toast('自分の商品を選択してください');const m=ensureWorkMeta(p),base=m.draft||{};m.draft={...base,name:base.name??p.name,description:`【おすすめ用途】${(p.useCases||[]).join('・')}\n${base.description??p.description}`,digital:base.digital??p.digital,category:base.category??p.category,tags:[...new Set([...(base.tags??p.tags),'おすすめ用途','人気'])]};m.timeline.unshift({id:uid('workEvent'),type:'ai',label:`${name}の提案を下書きへ反映`,text:'AI提案を確認後、商品下書きへ反映しました。公開状態は変更していません。',date:now()});m.updatedAt=now();save();closeModal();go(`work/${p.id}?tab=edit`)}

/* ADM-09 / D-18: manufacturer assignment and quality fields stay in the manufacturing layer. */
function s1EnhanceManufacturerOrder(){const path=routePath().split('?')[0],seg=path.split('/');if(seg[0]!=='manufacturer-order'||!seg[1]||currentUser()?.role!=='admin'||$('#main .s1-mfg-assignment'))return;const m=s1Scenario().manufacturingOrders.find(x=>x.id===seg[1]);if(!m)return;const sec=document.createElement('section');sec.className='section card panel s1-mfg-assignment';sec.innerHTML=`<h2>製造先割当</h2><div class="field"><select id="s1MfgAssign">${s1Scenario().manufacturers.map(x=>`<option value="${x.id}" ${x.id===m.manufacturerId?'selected':''}>${esc(x.name)} / ${x.active?'稼働中':'停止'}</option>`).join('')}</select></div><button class="btn primary" onclick="s1AssignManufacturer('${m.id}')">割当を更新</button>`;$('#main').appendChild(sec)}
function s1AssignManufacturer(id){const m=s1Scenario().manufacturingOrders.find(x=>x.id===id),next=$('#s1MfgAssign').value;if(!m||!next)return;const before=m.manufacturerId;m.manufacturerId=next;m.updatedAt=now();m.history.unshift({date:now(),status:m.status,note:`製造先を ${s1FindManufacturer(next)?.name||next} へ変更`});s1Audit('製造先割当',before,next,'製造管理');save();toast('製造先を更新しました');render()}
s1ManufacturerModal=function(id=''){const m=s1FindManufacturer(id)||{id:uid('manufacturer'),name:'',materials:['耐水PET'],sizes:['50mm'],baseCost:100,leadDays:5,active:true,defectRate:0,onTimeRate:100};showModal(`<div class="section-head"><h2>製造事業者</h2><button class="icon-btn" onclick="closeModal()">×</button></div><div class="field"><label>会社名</label><input id="mfName" value="${esc(m.name)}"></div><div class="field"><label>対応素材（カンマ区切り）</label><input id="mfMaterials" value="${esc(m.materials.join(','))}"></div><div class="field"><label>対応サイズ（カンマ区切り）</label><input id="mfSizes" value="${esc(m.sizes.join(','))}"></div><div class="search-filter-grid"><div class="field"><label>基準原価</label><input id="mfCost" type="number" value="${m.baseCost}"></div><div class="field"><label>標準納期（日）</label><input id="mfLead" type="number" value="${m.leadDays}"></div><div class="field"><label>不良率（%）</label><input id="mfDefect" type="number" step="0.1" value="${m.defectRate}"></div><div class="field"><label>納期遵守率（%）</label><input id="mfOnTime" type="number" step="0.1" value="${m.onTimeRate}"></div></div><label class="chip"><input id="mfActive" type="checkbox" ${m.active?'checked':''}> 稼働中</label><button class="btn primary" onclick="s1SaveManufacturerStable('${id}')">保存</button>`)};
function s1SaveManufacturerStable(id){const rows=s1Scenario().manufacturers,old=s1FindManufacturer(id),v={id:old?.id||uid('manufacturer'),name:$('#mfName').value.trim(),materials:$('#mfMaterials').value.split(',').map(x=>x.trim()).filter(Boolean),sizes:$('#mfSizes').value.split(',').map(x=>x.trim()).filter(Boolean),baseCost:Number($('#mfCost').value),leadDays:Number($('#mfLead').value),active:$('#mfActive').checked,defectRate:Number($('#mfDefect').value),onTimeRate:Number($('#mfOnTime').value)};if(!v.name)return toast('会社名を入力してください');if(old)Object.assign(old,v);else rows.push(v);save();closeModal();render()}

/* CROSS-01 / CRE-01: approve creator capability on the same user record and keep buyer data untouched. */
function s1AdminCreatorApplications(){if(currentUser()?.role!=='admin')return go('home');const pending=db.users.filter(u=>s1UserData(u.id).creatorApplication?.status==='pending');adminWorkbench('クリエイター登録審査',`${pending.length?pending.map(u=>{const a=s1UserData(u.id).creatorApplication;return `<article class="card panel" style="margin:9px 0"><div class="section-head"><div><span class="status warn">審査中</span><h3>${esc(a.shop)}</h3><div class="small muted">${esc(u.name)} / ${esc(a.category)}</div></div></div><p>${esc(a.bio)}</p><div class="btn-row"><button class="btn primary" onclick="s1ApproveCreator('${u.id}')">承認</button><button class="btn danger" onclick="s1RejectCreator('${u.id}')">差し戻し</button></div></article>`}).join(''):'<div class="empty"><h2>審査待ちはありません</h2></div>'}`,'admin-users')}
function s1ApproveCreator(userId){const u=db.users.find(x=>x.id===userId),d=s1UserData(userId),a=d.creatorApplication;if(!u||!a)return;const cid=u.creatorId||uid('creator');u.role='creator';u.creatorId=cid;u.roles=[...new Set([...(u.roles||['buyer']),'buyer','creator'])];if(!CREATORS.some(c=>c.id===cid))CREATORS.push({id:cid,name:a.shop,avatar:'✦',genre:a.category,verified:false,rating:0,followers:0,sales:0,bio:a.bio,reply:'—',response:'—',positive:'—',since:'2026',accent:'#7557c9'});db.creator.works[cid]??=[];db.creator.shop[cid]??={intro:a.bio,notice:'',accent:'#7557c9'};db.creator.sales[cid]??={month:0,last:0,count:0,favs:0};a.status='approved';a.approvedAt=now();s1Notify(userId,'moderation','クリエイター登録が承認されました。購入者機能はそのまま利用できます。',{creatorId:cid});s1Audit('クリエイター登録承認','buyer','buyer+creator','ユーザー管理');save();toast('同一アカウントへクリエイター権限を追加しました');render()}
function s1RejectCreator(userId){const a=s1UserData(userId).creatorApplication;if(!a)return;a.status='returned';a.updatedAt=now();s1Notify(userId,'moderation','クリエイター登録申請が差し戻されました。内容を確認してください。');save();render()}

/* D-19: category sales is appended below existing admin KPI; no card rearrangement. */
function s1EnhanceAdminCategories(){if(routePath().split('?')[0]!=='admin'||$('#main .s1-category-kpi'))return;const sums={};products.filter(p=>!p.hidden).forEach(p=>sums[p.category]=(sums[p.category]||0)+(p.sales||0)*(p.digital||0));const sec=document.createElement('section');sec.className='section card panel s1-category-kpi';sec.innerHTML=`<h2>カテゴリ別売上</h2>${Object.entries(sums).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>`<div class="s1-inline-row"><span>${esc(k)}</span><b>${yen(v)}</b></div>`).join('')}`;$('#main').appendChild(sec)}

/* D-21: published features are appended to the existing home; no home replacement. */
function s1EnhanceHomeFeatures(){const path=routePath().split('?')[0];if(!['landing','home'].includes(path)||$('#main .s1-feature-home'))return;const feature=s1Scenario().features.find(x=>x.status==='公開');if(!feature)return;const ps=feature.productIds.map(productBy).filter(Boolean).filter(p=>!p.hidden);if(!ps.length)return;const sec=document.createElement('section');sec.className='section s1-feature-home';sec.innerHTML=`<div class="section-head"><div><span class="eyebrow">FEATURE</span><h2>${esc(feature.title)}</h2></div></div><div class="h-scroll">${ps.map(productCard).join('')}</div>`;const usage=[...$('#main section')].find(x=>x.textContent.includes('Sticker Marketの使い方'));if(usage)$('#main').insertBefore(sec,usage);else $('#main').appendChild(sec)}

/* Common analytics: visible product impressions share the same event store as search, views and purchases. */
function s1TrackImpressions(){const path=routePath();if(!path.startsWith('search'))return;const ids=$$('#main .product-card[data-product-id]').map(x=>x.dataset.productId).filter(Boolean),key='s1_imp_'+path+'_'+ids.join(',');if(!ids.length||sessionStorage.getItem(key))return;sessionStorage.setItem(key,'1');s1Track('product_impression',{productIds:ids})}

/* Admin review detail gets rights/evidence without altering the existing review form. */
function s1EnhanceAdminWorkRights(){const path=routePath().split('?')[0],seg=path.split('/');if(seg[0]!=='admin-work'||!seg[1]||$('#main .s1-admin-rights-summary'))return;const p=productBy(seg[1]);if(!p)return;const sec=document.createElement('section');sec.className='section card panel s1-admin-rights-summary';sec.innerHTML=`<h2>権利・入稿申告</h2><div class="detail-list"><div><span>権利保有・許諾</span><b>${p.rights?.ownerDeclared?'申告済み':'未申告'}</b></div><div><span>AI利用</span><b>${p.rights?.aiUsed?'あり':'なし'}</b></div><div><span>証明資料</span><b>${esc((p.rights?.evidence||[]).join('、')||'なし')}</b></div><div><span>違反警告</span><b>${esc(p.rights?.warning||'なし')}</b></div></div>`;$('#main').appendChild(sec)}

/* Login help for the newly-added manufacturing business actor. */
function s1EnhanceLogin(){if(routePath().split('?')[0]!=='login'||$('#main .s1-mfg-login'))return;const notices=$$('#main .notice');if(!notices.length)return;const p=document.createElement('div');p.className='small s1-mfg-login';p.style.marginTop='8px';p.innerHTML='<b>製造事業者</b> mfg@example.test / demo';notices[0].appendChild(p)}

/* Extend already-added admin menu, not the main navigation. */
function s1EnhanceAdminScenarioMenu(){if(routePath().split('?')[0]!=='admin-menu'||$('#main .s1-admin-creator-app'))return;const extra=$('#main .s1-admin-menu-extra')||$('#main .btn-row');if(!extra)return;const b=document.createElement('button');b.className='btn s1-admin-creator-app';b.textContent='クリエイター登録審査';b.onclick=()=>go('admin-creator-apps');extra.appendChild(b)}

/* One enhancer coordinates only additive UI fragments. */
const s1StableEnhanceCurrent=s1EnhanceCurrentPage;
s1EnhanceCurrentPage=function(){s1StableEnhanceCurrent();s1EnhanceSupportCase();s1EnhanceRightsAdmin();s1EnhanceManufacturerOrder();s1EnhanceAdminCategories();s1EnhanceHomeFeatures();s1TrackImpressions();s1EnhanceAdminWorkRights();s1EnhanceLogin();s1EnhanceAdminScenarioMenu()};

/* Add one route to the existing additive router. */
const s1StableRender=render;
render=function(){const path=routePath().split('?')[0];if(path==='admin-creator-apps')return s1AdminCreatorApplications();return s1StableRender()};

save();setTimeout(()=>{done();render()},0);
