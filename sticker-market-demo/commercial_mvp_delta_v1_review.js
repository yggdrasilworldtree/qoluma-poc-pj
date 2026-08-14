/* Sticker Market MVP formal delta v1.0 — additive admin publish readiness. */
async function smMvpSaveVariantCost(id){const el=document.querySelector(`[data-sm-mvp-variant-cost="${CSS.escape(id)}"]`),cost=Number(el?.value);if(!Number.isInteger(cost)||cost<=0)return toast('製造原価は1円以上で入力してください');try{await smMvpRpc('sm_admin_set_variant_cost',{p_variant_id:id,p_cost:cost});toast('製造原価を保存しました');const pid=routePath().split('?')[0].split('/')[1];if(pid)await smMvpAdminPublishReadiness(pid,true)}catch(e){toast(e.message||'製造原価を保存できませんでした',3200)}}
async function smMvpAdminPublishReadiness(productId,refresh=false){
 const main=$('#main');if(!main||currentUser()?.role!=='admin')return;
 let sec=main.querySelector('.sm-mvp-admin-publish-readiness');
 if(refresh&&sec){sec.remove();sec=null}
 if(sec)return;
 /* Reserve the slot synchronously. Multiple render/enhancer callbacks may fire for the
  * same route; without this placeholder two async requests can append duplicate panels. */
 sec=document.createElement('section');sec.className='section card panel sm-mvp-admin-publish-readiness';sec.dataset.productId=productId;sec.innerHTML='<h2>製造・公開前確認</h2><p class="muted">入稿・製造条件を確認しています…</p>';main.appendChild(sec);
 try{
  const [variants,validation]=await Promise.all([smMvpRest(`sm_product_variants?select=id,name,material,size,cost,active&product_id=eq.${encodeURIComponent(productId)}&active=eq.true`),smMvpRpc('sm_validate_product_submission',{p_product_id:productId})]);
  if(!sec.isConnected||routePath().split('?')[0]!==`admin-work/${productId}`)return;
  const errors=validation.errors||[],warnings=validation.warnings||[],costReady=(variants||[]).length>0&&(variants||[]).every(v=>Number(v.cost)>0);
  sec.innerHTML=`<h2>製造・公開前確認</h2><p class="muted">既存の商品審査に、MVP公開に必要な製造原価と入稿確認だけを追加しています。</p>${(variants||[]).map(v=>`<div class="s1-inline-row"><div><b>${esc(v.name||v.id)}</b><div class="small muted">${esc(v.material||'')} / ${esc(v.size||'')}</div></div><div class="btn-row"><input data-sm-mvp-variant-cost="${esc(v.id)}" type="number" min="1" value="${Number(v.cost||0)}" style="width:110px" aria-label="製造原価"><button class="btn" onclick="smMvpSaveVariantCost('${v.id}')">原価保存</button></div></div>`).join('')||'<div class="notice demo">有効な物理販売仕様がありません。</div>'}<div class="divider"></div><div class="notice ${validation.ok&&costReady?'':'demo'}"><b>${validation.ok&&costReady?'公開前確認OK':'公開前に確認が必要です'}</b>${errors.length?`<ul>${errors.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}${!costReady?'<div>・物理商品の製造原価をすべて設定してください。</div>':''}${warnings.length?`<div class="small"><b>確認事項</b><ul>${warnings.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''}</div>`;
 }catch(e){if(sec.isConnected)sec.innerHTML=`<h2>製造・公開前確認</h2><div class="notice demo">確認できません：${esc(e.message||'サーバーエラー')}</div>`}
}

/* Keep the existing v2.1.2 moderation buttons. In STAGING/PRODUCTION only,
 * their action is persisted through the server-side moderation RPC; DEMO keeps the
 * original local behavior. */
const smMvpDeltaReviewBaseAdminWorkDecision=adminWorkDecision;
adminWorkDecision=async function(productId,status){
 if(!SM_MVP.live())return smMvpDeltaReviewBaseAdminWorkDecision(productId,status);
 const map={'公開中':'published','差し戻し':'rejected','非公開':'private','審査中':'reviewing'},serverStatus=map[status]||status;
 if(!['published','rejected','private','reviewing','suspended'].includes(serverStatus))return smMvpDeltaReviewBaseAdminWorkDecision(productId,status);
 let note=null;
 if(serverStatus==='rejected')note='入稿内容をご確認のうえ修正し、再申請してください。';
 busy(serverStatus==='published'?'公開前条件を確認しています…':'審査結果を保存しています…');
 try{
  await smMvpRpc('sm_admin_decide_product',{p_product_id:productId,p_status:serverStatus,p_note:note});
  const p=products.find(x=>x.id===productId);if(p)p.serverStatus=serverStatus;
  if(typeof ensureWorkMeta==='function'&&p){const m=ensureWorkMeta(p);m.status=serverStatus==='published'?'公開中':serverStatus==='rejected'?'差し戻し':serverStatus==='private'?'非公開':'審査中';m.updatedAt=new Date().toISOString()}
  done();toast(serverStatus==='published'?'商品を承認・公開しました':'審査結果を保存しました');
  if(serverStatus==='published')go('admin-review');else render();
  setTimeout(()=>smMvpHydrateUser().catch(e=>console.warn('post-moderation hydrate failed',e)),0);
 }catch(e){done();const msg={SUBMISSION_INVALID:'入稿条件を満たしていないため公開できません。',MANUFACTURING_COST_REQUIRED:'製造原価を設定してから公開してください。',FORBIDDEN:'管理者権限が必要です。'}[e.message]||e.message||'審査結果を保存できませんでした';toast(msg,3800)}
};

const smMvpDeltaReviewBaseEnhance=s1EnhanceCurrentPage;
s1EnhanceCurrentPage=function(){smMvpDeltaReviewBaseEnhance();const p=routePath().split('?')[0].split('/');if(SM_MVP.live()&&p[0]==='admin-work'&&p[1])smMvpAdminPublishReadiness(p[1])};