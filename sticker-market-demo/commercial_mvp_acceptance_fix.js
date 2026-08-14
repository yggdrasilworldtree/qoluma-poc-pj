/* Sticker Market formal MVP acceptance fixes — additive, loaded last. */
const SM_MVP_ACCEPTANCE_FIX_VERSION='1.0.2';

/* Keep the existing modal/UI, but bind STAGING/PRODUCTION submission to a deterministic
 * server-persist -> route sequence. This avoids full-account rehydrate becoming part of
 * the user's listing-completion transaction. */
const smMvpAcceptanceBaseSellWizard=sellWizard;
sellWizard=function(){
 const out=smMvpAcceptanceBaseSellWizard();
 if(!SM_MVP.live())return out;
 queueMicrotask(()=>{
  const buttons=[...document.querySelectorAll('#modal .btn-row .btn')];
  const draft=buttons.find(b=>b.textContent.trim()==='下書き保存');
  const submit=buttons.find(b=>b.textContent.trim()==='保存して審査申請');
  if(draft)draft.setAttribute('onclick','smMvpAcceptanceCreateProduct(false)');
  if(submit)submit.setAttribute('onclick','smMvpAcceptanceCreateProduct(true)');
 });
 return out;
};

async function smMvpAcceptanceCreateProduct(submit){
 const name=$('#smNewName')?.value.trim(),desc=$('#smNewDesc')?.value.trim();
 const digital=Number($('#smNewDigital')?.value),physical=Number($('#smNewPhysical')?.value);
 const sellPhysical=!!$('#smNewPhysicalEnabled')?.checked,rights=!!$('#smNewRights')?.checked;
 if(!name||!desc||!Number.isFinite(digital)||digital<0||!rights)return toast('商品情報と権利確認を入力してください');
 const category=$('#smNewCat')?.value||'その他',material=$('#smNewMaterial')?.value||'耐水PET',size=$('#smNewSize')?.value||'50mm',aiUsed=!!$('#smNewAi')?.checked;
 const pub=$('#smNewPublic')?.files?.[0],digitalFile=$('#smNewDigitalFile')?.files?.[0],printFile=$('#smNewPrint')?.files?.[0];
 if(!pub)return toast('商品ページ画像が必要です');
 if(digital>0&&!digitalFile)return toast('デジタル納品データが必要です');
 if(sellPhysical&&!printFile)return toast('印刷元データが必要です');
 const u=currentUser();if(!u?.creatorId)return toast('クリエイター権限が必要です');
 const id=smMvpNewId('product'),variantId=sellPhysical?`${id}_base`:null,now0=new Date().toISOString();
 busy(submit?'入稿を確認して審査申請しています…':'商品下書きを保存しています…');
 try{
  await smMvpRest('sm_products',{method:'POST',body:JSON.stringify({id,creator_id:u.creatorId,name,description:desc,category,status:'draft',digital_price:digital,physical_price:sellPhysical?physical:0,material,shape:'ダイカット',use_cases:[],tags:[],rights:{ownerDeclared:true,aiUsed},metadata:{sell_physical:sellPhysical,art:'type',color:'#ececec'},created_by:u.id}),headers:{Prefer:'return=minimal'}});
  if(sellPhysical)await smMvpRest('sm_product_variants',{method:'POST',body:JSON.stringify({id:variantId,product_id:id,name:'標準',material,size,shape:'ダイカット',price:physical,active:true,metadata:{}}),headers:{Prefer:'return=minimal'}});
  const pubAsset=await smMvpUploadAndRegister(pub,'sm-product-public','product_public','product',id);
  if(digitalFile)await smMvpUploadAndRegister(digitalFile,'sm-product-private','digital_asset','product',id);
  if(printFile)await smMvpUploadAndRegister(printFile,'sm-product-private','print_source','product',id);
  if(submit)await smMvpRpc('sm_submit_product_review',{p_product_id:id});

  const local={id,name,creatorId:u.creatorId,category,digital,physical:sellPhysical?physical:0,material,shape:'ダイカット',size,variantId,useCases:[],tags:[],description:desc,art:'type',color:'#ececec',updated:now0,rating:0,favs:0,sales:0,views:0,digitalAssetKey:null,privatePrintKey:null,publicMedia:pubAsset?.publicUrl?[{url:pubAsset.publicUrl}]:[],serverStatus:submit?'reviewing':'draft',rights:{ownerDeclared:true,aiUsed},metadata:{sell_physical:sellPhysical,art:'type',color:'#ececec'}};
  const existing=products.find(p=>p.id===id);if(existing)Object.assign(existing,local);else products.push(local);

  closeModal();
  history.pushState({},'',`#/work/${id}`);
  render();
  done();
  toast(submit?'審査申請しました':'下書きを保存しました');
  setTimeout(()=>smMvpHydrateUser().catch(e=>console.warn('post-listing hydrate failed',e)),0);
  return id;
 }catch(e){
  done();
  toast(e?.message||'商品を保存できませんでした',3600);
  return null;
 }
}

/* v2.1.2 owns the work-detail routes, but later commercial/scenario render wrappers
 * can otherwise fall through to their role dashboards. Resolve these two legacy routes
 * before the final base router, without changing any URL or navigation structure. */
const smMvpAcceptanceBaseRender=render;
render=function(){
 const path=routePath().split('?')[0],seg=path.split('/');
 if(seg[0]==='work'&&seg[1])return workDetailPage(seg[1]);
 if(seg[0]==='admin-work'&&seg[1]){
  const out=adminWorkDetailPage(seg[1]);
  if(SM_MVP.live()&&typeof smMvpAdminPublishReadiness==='function')setTimeout(()=>smMvpAdminPublishReadiness(seg[1]),0);
  return out;
 }
 return smMvpAcceptanceBaseRender();
};

/* The original v2 listeners captured the original render function before v2.1.2 and
 * commercial routers were layered on. Remove that stale listener and bind the final
 * router so hash navigation/back-forward always resolves the current route table. */
if(typeof v212BaseRender==='function'){
 window.removeEventListener('hashchange',v212BaseRender);
 window.removeEventListener('popstate',v212BaseRender);
}
window.addEventListener('hashchange',render);
window.addEventListener('popstate',render);
