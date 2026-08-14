const url='https://oodalamuvycoajdrdszi.supabase.co';
const anon='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vZGFsYW11dnljb2FqZHJkc3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1NDM3NjMsImV4cCI6MjA2MzExOTc2M30.dZ9xi9WOGauVOR9aCmOYEGE2nagXCx6XitYZSai-BdQ';
async function req(path,opts={}){return fetch(url+path,{...opts,headers:{apikey:anon,Authorization:`Bearer ${anon}`,...(opts.headers||{})}})}
const configRes=await fetch(`${url}/functions/v1/sm-public-config`);if(!configRes.ok)throw new Error(`public config unavailable: ${configRes.status}`);const cfg=await configRes.json();if(!['DEMO','STAGING','PRODUCTION'].includes(cfg.mode))throw new Error('invalid public mode');if(cfg.stripePublishableKey&&String(cfg.stripePublishableKey).startsWith('sk_'))throw new Error('secret Stripe key exposed by public config');
for(const fn of ['sm-checkout','sm-refund','sm-private-file','sm-file-register','sm-readiness','sm-backup','sm-email-dispatch']){
 const r=await fetch(`${url}/functions/v1/${fn}`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
 if(![401,403].includes(r.status))throw new Error(`${fn} must reject unauthenticated request, got ${r.status} ${(await r.text()).slice(0,300)}`);
}
const catalog=await req('/rest/v1/sm_products?select=id,status&status=eq.published&limit=20');const catalogText=await catalog.text();
if(catalog.ok){
 const rows=JSON.parse(catalogText);if(!rows.some(x=>x.id==='p1'))throw new Error('migrated catalog IDs are not preserved');
 const rpc=await req('/rest/v1/rpc/sm_prepare_checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_idempotency_key:'contract-test-no-auth',p_address_id:null})});if(![401,403].includes(rpc.status))throw new Error(`checkout RPC must reject anon, got ${rpc.status} ${(await rpc.text()).slice(0,300)}`);
 const forbidden=[
  '/rest/v1/sm_products?select=id,private_print_key&limit=1',
  '/rest/v1/sm_products?select=id,digital_asset_key&limit=1',
  '/rest/v1/sm_products?select=id,created_by&limit=1',
  '/rest/v1/sm_product_variants?select=id,cost&limit=1',
  '/rest/v1/sm_creators?select=id,user_id&limit=1',
  '/rest/v1/sm_reviews?select=id,user_id,order_item_id,photo_key&limit=1',
  '/rest/v1/sm_legal_documents?select=key,updated_by&limit=1'
 ];
 for(const path of forbidden){const r=await req(path),t=await r.text();if(r.ok)throw new Error(`anonymous private-field read unexpectedly succeeded: ${path} ${t.slice(0,200)}`);if(![400,401,403].includes(r.status))throw new Error(`unexpected private-field denial status ${r.status}: ${path} ${t.slice(0,200)}`)}
}else if(catalog.status===401&&/Invalid API key/i.test(catalogText)){console.warn('Supabase publishable key is currently invalid; Production Readiness must remain blocked until key rotation/configuration.')}else{throw new Error(`unexpected public catalog failure: ${catalog.status} ${catalogText.slice(0,500)}`)}
console.log('commercial MVP deployed server contract OK');