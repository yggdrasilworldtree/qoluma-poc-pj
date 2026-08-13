/* Sticker Market v2.1.2 — creator work management flow */

function workStatusClass(status){
 return status==='公開中'?'ok':status==='審査中'?'warn':status==='差し戻し'?'danger':'';
}
function workStatusText(status){
 return status||'下書き';
}
function workDateTime(value){
 if(!value)return '—';
 try{return new Date(value).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}catch(e){return value}
}
function ensureWorkMeta(product){
 db.creator.workMeta??={};
 let meta=db.creator.workMeta[product.id];
 if(meta)return meta;
 const pending=product.id==='p6';
 meta={
  productId:product.id,
  creatorId:product.creatorId,
  status:pending?'審査中':'公開中',
  sellPhysical:product.id==='p4',
  submittedAt:pending?'2026-08-13T11:20:00Z':null,
  publishedAt:pending?null:'2026-08-10T08:00:00Z',
  updatedAt:now(),
  draft:{},
  timeline:pending?
   [{id:uid('workEvent'),type:'submit',label:'審査申請',text:'商品情報を審査へ提出しました。',date:'2026-08-13T11:20:00Z'}]:
   [{id:uid('workEvent'),type:'publish',label:'公開開始',text:'商品が公開されました。',date:'2026-08-10T08:00:00Z'}],
  messages:pending?
   [{id:uid('workMessage'),role:'admin',sender:'Sticker Market運営',text:'審査を受け付けました。権利表記と商品説明を確認しています。追加確認が必要な場合はこちらからご連絡します。',date:'2026-08-13T11:35:00Z'}]:[]
 };
 db.creator.workMeta[product.id]=meta;
 save();
 return meta;
}
function ensureAllWorkMeta(){products.forEach(p=>{if(p.creatorId)ensureWorkMeta(p)});}
function workOwnerProduct(id){
 const p=productBy(id),u=currentUser();
 if(!u||u.role!=='creator'||p.creatorId!==u.creatorId)return null;
 return p;
}
function workDraftValue(product,meta,key){return meta?.draft?.[key]??product[key]??'';}
function workTypeLabel(meta){return meta.sellPhysical?'デジタル・シール':'デジタル';}
function workPrimaryAction(product,meta){
 if(meta.status==='審査中')return `<button class="btn primary" onclick="go('work/${product.id}?tab=review')">審査状況を見る</button>`;
 if(meta.status==='差し戻し')return `<button class="btn primary" onclick="go('work/${product.id}?tab=edit')">修正する</button>`;
 if(meta.status==='下書き')return `<button class="btn primary" onclick="go('work/${product.id}?tab=edit')">編集を続ける</button>`;
 if(meta.status==='非公開')return `<button class="btn primary" onclick="submitWorkReview('${product.id}')">公開申請する</button>`;
 return `<button class="btn primary" onclick="go('product/${product.id}')">公開ページを見る</button>`;
}

worksPage=function(){
 const cid=currentUser()?.creatorId;if(!cid)return go('home');
 const ps=products.filter(p=>p.creatorId===cid);
 shell(`<div class="section-head"><div><h1>作品管理</h1><p>公開状態・審査・管理者連絡まで作品単位で管理します。</p></div><button class="btn primary" onclick="sellWizard()">＋ 作品を登録</button></div><div class="work-tabs"><button class="chip active">すべて</button><button class="chip">公開中</button><button class="chip">審査中</button><button class="chip">差し戻し</button><button class="chip">下書き</button><button class="chip">非公開</button></div><div class="work-list">${ps.map(p=>{const m=ensureWorkMeta(p);return `<button class="card work-row work-row-btn" onclick="go('work/${p.id}')" aria-label="${esc(p.name)}の管理詳細を開く"><div class="work-thumb">${artSvg(p)}</div><div class="work-row-copy"><b>${esc(workDraftValue(p,m,'name'))}</b><div class="small muted">${workTypeLabel(m)} ・ ${yen(Number(workDraftValue(p,m,'digital')||p.digital))}</div><span class="status ${workStatusClass(m.status)}">${workStatusText(m.status)}</span>${m.pendingRevision?'<span class="status warn">変更審査中</span>':''}<div class="small muted work-row-stats">♡${p.favs}　◉${p.views}</div></div><span class="work-chevron" aria-hidden="true">›</span></button>`}).join('')}</div>`,{title:'作品管理',bell:true,cart:false});
};

function workDetailPage(id){
 const p=workOwnerProduct(id);if(!p)return go('works',{replace:true});
 const m=ensureWorkMeta(p),tab=parseQuery().tab||'overview';
 const title=workDraftValue(p,m,'name');
 shell(`<section class="work-detail-hero card"><div class="work-detail-art">${artSvg(p)}</div><div class="work-detail-copy"><div class="btn-row"><span class="status ${workStatusClass(m.status)}">${workStatusText(m.status)}</span>${m.pendingRevision?'<span class="status warn">変更審査中</span>':''}</div><h1>${esc(title)}</h1><p class="muted">${workTypeLabel(m)} ・ ${yen(Number(workDraftValue(p,m,'digital')||p.digital))}</p><div class="small muted">最終更新 ${workDateTime(m.updatedAt)}</div></div></section><div class="management-tabs"><button class="${tab==='overview'?'active':''}" onclick="go('work/${id}?tab=overview')">概要</button><button class="${tab==='edit'?'active':''}" onclick="go('work/${id}?tab=edit')">編集</button><button class="${tab==='review'?'active':''}" onclick="go('work/${id}?tab=review')">審査・メッセージ${m.messages.some(x=>x.role==='admin'&&!x.read)?'<span class="badge-count" style="position:static;display:inline-grid;margin-left:4px">!</span>':''}</button></div>${tab==='overview'?workOverviewTab(p,m):tab==='edit'?workEditTab(p,m):workReviewTab(p,m)}<div class="work-detail-actions">${workPrimaryAction(p,m)}<button class="btn" onclick="go('work/${id}?tab=review')">運営に連絡</button></div>`,{title:'作品管理詳細',back:true,bell:true,cart:false});
 m.messages.forEach(x=>{if(x.role==='admin')x.read=true});save();
}
function workOverviewTab(p,m){
 const next={公開中:'購入者に公開されています。編集内容は下書きとして保存できます。',審査中:'運営審査中です。追加確認があればメッセージに届きます。',差し戻し:'運営コメントを確認し、修正後に再申請してください。',下書き:'編集を完了して審査申請してください。',非公開:'購入者には表示されていません。再公開には審査申請が必要です。'}[m.status]||'';
 return `<section class="section"><div class="card panel"><div class="section-head"><div><h2>現在の状態</h2><p>${next}</p></div></div><div class="work-flow">${['下書き','審査中','公開中'].map((s,i)=>`<div class="work-flow-step ${(m.status===s||(m.status==='差し戻し'&&s==='下書き'))?'active':''}"><span>${i+1}</span><div><b>${s}</b><small>${i===0?'商品情報を整える':i===1?'運営が権利・内容を確認':'購入者へ販売開始'}</small></div></div>`).join('')}</div></div></section><section class="section"><h2>反応</h2><div class="kpi-grid"><div class="card kpi"><span class="muted">お気に入り</span><b>${p.favs}</b></div><div class="card kpi"><span class="muted">閲覧</span><b>${p.views}</b></div><div class="card kpi"><span class="muted">販売</span><b>${p.sales}</b></div><div class="card kpi"><span class="muted">評価</span><b>${p.rating}</b></div></div></section><section class="section card panel"><h2>商品情報</h2><div class="detail-list"><div><span>カテゴリ</span><b>${esc(p.category)}</b></div><div><span>販売形式</span><b>${workTypeLabel(m)}</b></div><div><span>素材</span><b>${esc(p.material)}</b></div><div><span>公開価格</span><b>${yen(p.digital)}〜</b></div></div><div class="btn-row" style="margin-top:14px"><button class="btn" onclick="go('work/${p.id}?tab=edit')">商品情報を編集</button>${m.status==='公開中'?`<button class="btn" onclick="go('product/${p.id}')">購入者画面を確認</button><button class="btn" onclick="changeWorkVisibility('${p.id}','非公開')">非公開にする</button>`:''}${m.status==='下書き'||m.status==='差し戻し'||m.status==='非公開'?`<button class="btn primary" onclick="submitWorkReview('${p.id}')">審査申請する</button>`:''}</div></section>`;
}
function workEditTab(p,m){
 const d=m.draft||{};
 return `<section class="section"><div class="notice ${m.status==='差し戻し'?'demo':''}">${m.status==='差し戻し'?'<b>差し戻しがあります。</b> 審査・メッセージで運営コメントを確認してから修正してください。':'ここで保存した内容は管理用の下書きです。公開中の商品は審査承認まで現在の公開内容を維持します。'}</div><div class="card panel work-edit-form"><div class="field"><label>商品名</label><input id="workEditName" value="${esc(d.name??p.name)}"></div><div class="field"><label>商品説明</label><textarea id="workEditDesc">${esc(d.description??p.description)}</textarea></div><div class="search-filter-grid"><div class="field"><label>デジタル価格</label><input id="workEditPrice" type="number" min="0" value="${Number(d.digital??p.digital)}"></div><div class="field"><label>カテゴリ</label><select id="workEditCategory">${CATEGORIES.map(c=>`<option ${String(d.category??p.category)===c[0]?'selected':''}>${c[0]}</option>`).join('')}</select></div></div><div class="field"><label>タグ</label><input id="workEditTags" value="${esc((d.tags??p.tags).join('、'))}" placeholder="猫、かわいい、ギフト"></div><label class="chip"><input id="workEditPhysical" type="checkbox" ${m.sellPhysical?'checked':''}> シールとしても販売する</label><div class="btn-row" style="margin-top:16px"><button class="btn" onclick="saveWorkDraft('${p.id}',false)">下書き保存</button><button class="btn primary" onclick="saveWorkDraft('${p.id}',true)">${m.status==='公開中'?'変更内容を審査申請':'保存して審査申請'}</button></div></div></section>`;
}
function saveWorkDraft(id,submit){
 const p=workOwnerProduct(id);if(!p)return;const m=ensureWorkMeta(p);
 const name=$('#workEditName').value.trim(),desc=$('#workEditDesc').value.trim(),price=Number($('#workEditPrice').value);
 if(!name||!desc||!Number.isFinite(price)||price<0){toast('商品名・説明・価格を確認してください');return;}
 m.draft={name,description:desc,digital:price,category:$('#workEditCategory').value,tags:$('#workEditTags').value.split(/[、,]/).map(x=>x.trim()).filter(Boolean)};
 m.sellPhysical=$('#workEditPhysical').checked;m.updatedAt=now();m.timeline.unshift({id:uid('workEvent'),type:'edit',label:'下書き保存',text:'商品情報の編集内容を保存しました。',date:now()});
 if(m.status!=='公開中'&&!submit)m.status='下書き';
 save();
 if(submit){submitWorkReview(id);return;}
 toast('下書きを保存しました');go(`work/${id}?tab=overview`,{replace:true});
}
function submitWorkReview(id){
 const p=workOwnerProduct(id);if(!p)return;const m=ensureWorkMeta(p),wasPublished=m.status==='公開中';
 if(wasPublished)m.pendingRevision=true;else m.status='審査中';
 m.submittedAt=now();m.updatedAt=now();m.timeline.unshift({id:uid('workEvent'),type:'submit',label:wasPublished?'変更審査を申請':'審査申請',text:wasPublished?'公開中の商品に対する変更内容を審査へ提出しました。':'商品を公開するため審査へ提出しました。',date:now()});
 m.messages.push({id:uid('workMessage'),role:'system',sender:'システム',text:wasPublished?'変更内容の審査申請を受け付けました。':'審査申請を受け付けました。',date:now(),read:true});save();toast('審査申請しました（デモ）');go(`work/${id}?tab=review`,{replace:true});
}
function changeWorkVisibility(id,status){
 const p=workOwnerProduct(id);if(!p)return;const m=ensureWorkMeta(p);
 confirmAction(status==='非公開'?'商品を非公開にしますか？':'公開状態を変更しますか？','購入者側の表示状態を変更します。',status==='非公開'?'非公開にする':'変更する',()=>{m.status=status;m.updatedAt=now();m.timeline.unshift({id:uid('workEvent'),type:'visibility',label:status,text:`公開状態を「${status}」へ変更しました。`,date:now()});save();render()});
}
function workReviewTab(p,m){
 return `<section class="section management-grid"><div><div class="card panel"><div class="section-head"><div><h2>審査状況</h2><p>申請から公開までの履歴</p></div><span class="status ${workStatusClass(m.status)}">${workStatusText(m.status)}</span></div><div class="work-timeline">${m.timeline.length?m.timeline.map(e=>`<div class="timeline-item"><i></i><div><b>${esc(e.label)}</b><p>${esc(e.text)}</p><small>${workDateTime(e.date)}</small></div></div>`).join(''):'<p class="muted">履歴はまだありません。</p>'}</div>${m.status==='審査中'&&!m.pendingRevision?`<button class="btn" onclick="withdrawWorkReview('${p.id}')">審査申請を取り下げる</button>`:''}</div></div><div><div class="card panel"><h2>運営とのメッセージ</h2><p class="small muted">この作品の審査・権利・公開に関する連絡専用です。公開デモではブラウザ内に保存されます。</p><div class="message-thread">${m.messages.length?m.messages.map(msg=>`<div class="message-bubble ${msg.role==='creator'?'mine':msg.role==='admin'?'admin':'system'}"><b>${esc(msg.sender)}</b><p>${esc(msg.text)}</p><small>${workDateTime(msg.date)}</small></div>`).join(''):'<div class="empty"><p>まだメッセージはありません。</p></div>'}</div><div class="field"><label>運営へメッセージ</label><textarea id="workAdminMessage" placeholder="審査内容について確認したいことを入力"></textarea></div><button class="btn primary full" onclick="sendWorkAdminMessage('${p.id}')">送信する</button></div></div></section>`;
}
function withdrawWorkReview(id){
 const p=workOwnerProduct(id);if(!p)return;const m=ensureWorkMeta(p);
 confirmAction('審査申請を取り下げますか？','作品は下書きに戻り、公開されません。','取り下げる',()=>{m.status='下書き';m.pendingRevision=false;m.updatedAt=now();m.timeline.unshift({id:uid('workEvent'),type:'withdraw',label:'審査取り下げ',text:'クリエイターが審査申請を取り下げました。',date:now()});save();go(`work/${id}?tab=overview`,{replace:true})});
}
function sendWorkAdminMessage(id){
 const p=workOwnerProduct(id);if(!p)return;const m=ensureWorkMeta(p),box=$('#workAdminMessage'),text=box.value.trim();if(!text){toast('メッセージを入力してください');return;}
 m.messages.push({id:uid('workMessage'),role:'creator',sender:currentUser().name,text,date:now(),read:true});m.updatedAt=now();save();toast('運営へメッセージを送信しました（デモ）');render();
}

/* Admin counterpart: review the same creator work and reply in the same thread. */
adminReview=function(){
 if(currentUser()?.role!=='admin')return go('home');ensureAllWorkMeta();
 const pending=products.filter(p=>['審査中','差し戻し'].includes(ensureWorkMeta(p).status)||ensureWorkMeta(p).pendingRevision);
 adminWorkbench('商品審査',pending.length?`<div class="admin-review-cards">${pending.map(p=>{const m=ensureWorkMeta(p),c=creatorBy(p.creatorId);return `<button class="card work-row work-row-btn" onclick="go('admin-work/${p.id}')"><div class="work-thumb">${artSvg(p)}</div><div class="work-row-copy"><b>${esc(workDraftValue(p,m,'name'))}</b><div class="small muted">${esc(c.name)} ・ ${m.pendingRevision?'変更審査':'新規審査'}</div><span class="status ${workStatusClass(m.status)}">${m.pendingRevision?'公開中・変更審査':workStatusText(m.status)}</span><div class="small muted">申請 ${workDateTime(m.submittedAt)}</div></div><span class="work-chevron">›</span></button>`}).join('')}</div>`:`<div class="empty"><div class="emoji">✓</div><h2>審査待ちはありません</h2></div>`,'admin-review');
};
function adminWorkDetailPage(id){
 if(currentUser()?.role!=='admin')return go('home');const p=productBy(id),m=ensureWorkMeta(p),c=creatorBy(p.creatorId);
 shell(`<section class="work-detail-hero card"><div class="work-detail-art">${artSvg(p)}</div><div class="work-detail-copy"><span class="status ${workStatusClass(m.status)}">${m.pendingRevision?'公開中・変更審査':workStatusText(m.status)}</span><h1>${esc(workDraftValue(p,m,'name'))}</h1><p class="muted">${esc(c.name)} ・ ${workTypeLabel(m)}</p><div class="small muted">申請 ${workDateTime(m.submittedAt)}</div></div></section><section class="section management-grid"><div><div class="card panel"><h2>申請内容</h2><div class="detail-list"><div><span>商品名</span><b>${esc(workDraftValue(p,m,'name'))}</b></div><div><span>カテゴリ</span><b>${esc(workDraftValue(p,m,'category'))}</b></div><div><span>価格</span><b>${yen(Number(workDraftValue(p,m,'digital')||p.digital))}</b></div><div><span>販売形式</span><b>${workTypeLabel(m)}</b></div></div><h3>説明</h3><p>${esc(workDraftValue(p,m,'description'))}</p><h3>タグ</h3><p>${esc((m.draft.tags||p.tags).join('、'))}</p></div><div class="card panel" style="margin-top:12px"><h2>審査判断</h2><div class="field"><label>クリエイターへのコメント</label><textarea id="adminReviewNote" placeholder="承認理由、修正してほしい点など"></textarea></div><div class="btn-row"><button class="btn primary" onclick="adminWorkDecision('${id}','公開中')">承認する</button><button class="btn danger" onclick="adminWorkDecision('${id}','差し戻し')">差し戻す</button></div></div></div><div><div class="card panel"><h2>クリエイターとのメッセージ</h2><div class="message-thread">${m.messages.length?m.messages.map(msg=>`<div class="message-bubble ${msg.role==='admin'?'mine':msg.role==='creator'?'admin':'system'}"><b>${esc(msg.sender)}</b><p>${esc(msg.text)}</p><small>${workDateTime(msg.date)}</small></div>`).join(''):'<div class="empty"><p>まだメッセージはありません。</p></div>'}</div><div class="field"><label>返信</label><textarea id="adminWorkMessage" placeholder="クリエイターへ返信"></textarea></div><button class="btn primary full" onclick="sendAdminWorkMessage('${id}')">返信する</button></div></div></section>`,{title:'商品審査詳細',back:true,bell:true,cart:false});
}
function adminWorkDecision(id,status){
 const p=productBy(id),m=ensureWorkMeta(p),note=$('#adminReviewNote')?.value.trim()||'';
 if(status==='差し戻し'&&!note){toast('差し戻し理由を入力してください');return;}
 m.status=status;m.pendingRevision=false;m.updatedAt=now();if(status==='公開中')m.publishedAt=now();
 m.timeline.unshift({id:uid('workEvent'),type:status==='公開中'?'approve':'reject',label:status==='公開中'?'審査承認':'差し戻し',text:note||(status==='公開中'?'審査が完了し、公開可能になりました。':'修正が必要です。'),date:now()});
 m.messages.push({id:uid('workMessage'),role:'admin',sender:'Sticker Market運営',text:note||(status==='公開中'?'審査が完了しました。商品を公開しました。':'修正をお願いします。'),date:now(),read:false});
 if(status==='公開中'&&m.draft&&Object.keys(m.draft).length){m.approvedDraft={...m.draft};m.draft={};}
 save();toast(status==='公開中'?'商品を承認しました':'差し戻しました');go('admin-review',{replace:true});
}
function sendAdminWorkMessage(id){
 const p=productBy(id),m=ensureWorkMeta(p),box=$('#adminWorkMessage'),text=box.value.trim();if(!text){toast('返信内容を入力してください');return;}
 m.messages.push({id:uid('workMessage'),role:'admin',sender:'Sticker Market運営',text,date:now(),read:false});m.updatedAt=now();save();toast('クリエイターへ返信しました（デモ）');render();
}

const v212BaseRender=render;
render=function(){
 const path=routePath().split('?')[0],seg=path.split('/');
 if(seg[0]==='work'&&seg[1])return workDetailPage(seg[1]);
 if(seg[0]==='admin-work'&&seg[1])return adminWorkDetailPage(seg[1]);
 return v212BaseRender();
};

ensureAllWorkMeta();
