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
