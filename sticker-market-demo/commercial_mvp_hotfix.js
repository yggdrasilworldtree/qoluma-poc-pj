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

/* Formal MVP acceptance hotfix:
 * Once product persistence + review submission succeed, do not make the user wait
 * for the full account/operations hydrate before entering the existing work detail.
 * The lightweight catalog merge is sufficient for the work route; the complete
 * hydrate runs after navigation and remains the server source-of-truth refresh.
 */
const smMvpHotfixBaseCreateProduct=smMvpCreateProduct;
smMvpCreateProduct=async function(submit){
 if(!SM_MVP.live())return smMvpHotfixBaseCreateProduct(submit);
 const fullHydrate=smMvpHydrateUser;
 let fastHydrateUsed=false;
 smMvpHydrateUser=async function(){
  fastHydrateUsed=true;
  await smMvpMergeAccessibleProducts();
  return currentUser();
 };
 try{
  return await smMvpHotfixBaseCreateProduct(submit);
 }finally{
  smMvpHydrateUser=fullHydrate;
  if(fastHydrateUsed)setTimeout(()=>fullHydrate().catch(e=>console.warn('post-listing hydrate failed',e)),0);
 }
};
