/* Sticker Market Commercial MVP hotfix — public REST bearer + public runtime config. */
smMvpHeaders=function(auth=false,extra={}){
 const token=auth&&SM_MVP.auth?.access_token?SM_MVP.auth.access_token:SM_MVP_CONFIG.anonKey;
 return {apikey:SM_MVP_CONFIG.anonKey,Authorization:`Bearer ${token}`,...extra};
};
SM_MVP.stripePublishableKey=null;
async function smMvpLoadPublicConfig(){
 try{
  const r=await fetch(`${SM_MVP_CONFIG.supabaseUrl}/functions/v1/sm-public-config`,{headers:{apikey:SM_MVP_CONFIG.anonKey,Authorization:`Bearer ${SM_MVP_CONFIG.anonKey}`},cache:'no-store'});
  if(!r.ok)return null;const c=await r.json();SM_MVP.publicConfig=c;SM_MVP.stripePublishableKey=c?.stripePublishableKey||null;return c;
 }catch{return null}
}
smMvpStripePk=function(){return SM_MVP.stripePublishableKey||localStorage.getItem(SM_MVP_CONFIG.stripePkStorageKey)||''};
const smMvpHotfixBaseInit=smMvpInit;
smMvpInit=async function(){if(SM_MVP.live())await smMvpLoadPublicConfig();return smMvpHotfixBaseInit()};
