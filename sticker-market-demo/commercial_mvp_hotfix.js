/* Sticker Market Commercial MVP hotfix — public REST bearer + public runtime config. */
smMvpHeaders=function(auth=false,extra={}){
 const token=auth&&SM_MVP.auth?.access_token?SM_MVP.auth.access_token:SM_MVP_CONFIG.anonKey;
 return {apikey:SM_MVP_CONFIG.anonKey,Authorization:`Bearer ${token}`,...extra};
};
SM_MVP.stripePublishableKey=null;
async function smMvpLoadPublicConfig(){
 try{
  const r=await fetch(`${SM_MVP_CONFIG.supabaseUrl}/functions/v1/sm-public-config`,{cache:'no-store'});
  if(!r.ok)return null;const c=await r.json();SM_MVP.publicConfig=c;SM_MVP.stripePublishableKey=c?.stripePublishableKey||null;return c;
 }catch{return null}
}
smMvpStripePk=function(){return SM_MVP.stripePublishableKey||localStorage.getItem(SM_MVP_CONFIG.stripePkStorageKey)||''};

/* Public catalog is deliberately projected. Private delivery/print object keys,
 * manufacturing cost and internal user identifiers are not part of the anonymous API contract. */
smMvpLoadCatalog=async function(){
 const [ps,cs,vs,rs]=await Promise.all([
  smMvpRest('sm_products?select=id,name,creator_id,category,digital_price,physical_price,material,shape,use_cases,tags,description,metadata,public_media,status,rights,series_id,created_at,updated_at,published_at&status=eq.published&order=created_at.desc',{auth:false}),
  smMvpRest('sm_creators?select=id,shop_name,bio,status,metadata,created_at,updated_at&status=eq.active&order=created_at.asc',{auth:false}),
  smMvpRest('sm_product_variants?select=id,product_id,name,material,size,shape,price,active,metadata,created_at,updated_at&active=eq.true',{auth:false}),
  smMvpRest('sm_reviews?select=id,product_id,rating,title,body,verified,hidden,created_at,updated_at&hidden=eq.false&order=created_at.desc&limit=200',{auth:false})
 ]);
 const oldProducts=new Map(products.map(p=>[p.id,{...p}])),vmap=new Map();
 (vs||[]).forEach(v=>{if(!vmap.has(v.product_id))vmap.set(v.product_id,v)});
 const mapped=(ps||[]).map(p=>{const old=oldProducts.get(p.id)||{},v=vmap.get(p.id);return {...old,id:p.id,name:p.name,creatorId:p.creator_id,category:p.category,digital:Number(p.digital_price),physical:Number(p.physical_price),material:p.material||old.material||'',shape:p.shape||old.shape||'',size:v?.size||old.size||'50mm',variantId:v?.id||null,useCases:p.use_cases||[],tags:p.tags||[],description:p.description||'',art:p.metadata?.art||old.art||'type',color:p.metadata?.color||old.color||'#ececec',updated:p.updated_at||p.created_at,rating:old.rating||0,favs:old.favs||0,sales:old.sales||0,views:old.views||0,digitalAssetKey:null,privatePrintKey:null,publicMedia:p.public_media||[],serverStatus:p.status,rights:p.rights||{},metadata:p.metadata||{}}});
 products.splice(0,products.length,...mapped);
 const oldCreators=new Map(CREATORS.map(c=>[c.id,{...c}]));
 const cm=(cs||[]).map(c=>{const old=oldCreators.get(c.id)||{};return {...old,id:c.id,shopId:old.shopId||`shop_${c.id}`,name:c.shop_name,genre:c.metadata?.genre||old.genre||'',followers:old.followers||0,rating:old.rating||0,sales:old.sales||0,avatar:old.avatar||String(c.shop_name||'?').slice(0,1).toUpperCase(),verified:c.metadata?.verified??old.verified??false,bio:c.bio||'',accent:old.accent||'#7658d5',userId:null}});
 CREATORS.splice(0,CREATORS.length,...cm);
 db.global.reviews=(rs||[]).map(r=>({id:r.id,productId:r.product_id,userId:null,rating:r.rating,title:r.title||'',text:r.body,date:r.created_at,kind:'physical',verified:r.verified,helpful:0,photoKey:null}));
};

const smMvpHotfixBaseInit=smMvpInit;
smMvpInit=async function(){
 if(!SM_MVP.live())return smMvpHotfixBaseInit();
 const c=await smMvpLoadPublicConfig();
 if(c?.publicApiReady===false){
  SM_MVP.ready=false;db.session.userId=null;save();
  $('#app').innerHTML=`<main class="page no-nav"><div class="empty"><div class="emoji">🔐</div><h1>STAGING / PRODUCTION接続を準備中です</h1><p class="muted">Supabase Publishable Keyの更新が必要です。既存DEMOは影響を受けません。</p><button class="btn primary" onclick="smMvpSetMode('DEMO')">DEMOへ戻る</button></div></main>`;
  return;
 }
 return smMvpHotfixBaseInit();
};

/* Formal MVP acceptance: server persistence/review submission is the completion point.
 * Register the minimal local product and route immediately; nonessential UI metadata and full hydrate follow. */
const smMvpHotfixBaseCreateProduct=smMvpCreateProduct;
smMvpCreateProduct=async function(submit){
 if(!SM_MVP.live())return smMvpHotfixBaseCreateProduct(submit);
 const name=$('#smNewName')?.value.trim(),desc=$('#smNewDesc')?.value.trim(),digital=Number($('#smNewDigital')?.value),physical=Number($('#smNewPhysical')?.value),sellPhysical=$('#smNewPhysicalEnabled')?.checked,rights=$('#smNewRights')?.checked;
 if(!name||!desc||!Number.isFinite(digital)||digital<0||!rights)return toast('商品情報と権利確認を入力してください');
 const category=$('#smNewCat').value,material=$('#smNewMaterial').value,size=$('#smNewSize').value,aiUsed=$('#smNewAi').checked;
 const pub=$('#smNewPublic')?.files?.[0],digitalFile=$('#smNewDigitalFile')?.files?.[0],printFile=$('#smNewPrint')?.files?.[0];
 if(!pub)return toast('商品ページ画像が必要です');if(digital>0&&!digitalFile)return toast('デジタル納品データが必要です');if(sellPhysical&&!printFile)return toast('印刷元データが必要です');
 busy('商品下書きを保存しています…');const id=smMvpNewId('product');
 try{
  await smMvpRest('sm_products',{method:'POST',body:JSON.stringify({id,creator_id:currentUser().creatorId,name,description:desc,category,status:'draft',digital_price:digital,physical_price:sellPhysical?physical:0,material,shape:'ダイカット',use_cases:[],tags:[],rights:{ownerDeclared:true,aiUsed},metadata:{sell_physical:!!sellPhysical,art:'type',color:'#ececec'},created_by:currentUser().id}),headers:{Prefer:'return=minimal'}});
  if(sellPhysical)await smMvpRest('sm_product_variants',{method:'POST',body:JSON.stringify({id:`${id}_base`,product_id:id,name:'標準',material,size,shape:'ダイカット',price:physical,active:true,metadata:{}}),headers:{Prefer:'return=minimal'}});
  const pubAsset=await smMvpUploadAndRegister(pub,'sm-product-public','product_public','product',id);
  if(digitalFile)await smMvpUploadAndRegister(digitalFile,'sm-product-private','digital_asset','product',id);
  if(printFile)await smMvpUploadAndRegister(printFile,'sm-product-private','print_source','product',id);
  if(submit)await smMvpRpc('sm_submit_product_review',{p_product_id:id});

  const now=new Date().toISOString(),local={id,name,creatorId:currentUser().creatorId,category,digital,physical:sellPhysical?physical:0,material,shape:'ダイカット',size,variantId:sellPhysical?`${id}_base`:null,useCases:[],tags:[],description:desc,art:'type',color:'#ececec',updated:now,rating:0,favs:0,sales:0,views:0,digitalAssetKey:null,privatePrintKey:null,publicMedia:pubAsset?.publicUrl?[{url:pubAsset.publicUrl}]:[],serverStatus:submit?'reviewing':'draft',rights:{ownerDeclared:true,aiUsed},metadata:{sell_physical:!!sellPhysical,art:'type',color:'#ececec'}};
  const existing=products.find(x=>x.id===id);if(existing)Object.assign(existing,local);else products.push(local);

  /* URL transition is mandatory and precedes optional metadata/render helpers. */
  go(`work/${id}`);
  done();closeModal();toast(submit?'審査申請しました':'下書きを保存しました');
  try{if(typeof ensureWorkMeta==='function'){const m=ensureWorkMeta(local);m.status=submit?'審査中':'下書き';m.updatedAt=now;m.sellPhysical=!!sellPhysical}}catch(e){console.warn('work metadata enrichment failed',e)}
  setTimeout(()=>smMvpHydrateUser().catch(e=>console.warn('post-listing full hydrate failed',e)),0);
 }catch(e){done();toast(e.message||'商品を保存できませんでした',3500)}
};
