const url='https://oodalamuvycoajdrdszi.supabase.co';
const anon='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYXNlIiwicmVmIjoib29kYWxhbXV2eWNvYWpkcmRzemkiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc0NzU0Mzc2MywiZXhwIjoyMDYzMTE5NzYzfQ.dZ9xi9WOGauVOR9aCmOYEGE2nagXCx6XitYZSai-BdQ';
async function req(path,opts={}){return fetch(url+path,{...opts,headers:{apikey:anon,Authorization:`Bearer ${anon}`,...(opts.headers||{})}})}
const catalog=await req('/rest/v1/sm_products?select=id,status&status=eq.published&limit=20');
const catalogText=await catalog.text();
if(!catalog.ok)throw new Error(`public catalog unavailable: ${catalog.status} ${catalogText.slice(0,500)}`);
const rows=JSON.parse(catalogText);if(!rows.some(x=>x.id==='p1'))throw new Error('migrated catalog IDs are not preserved');
const configRes=await req('/functions/v1/sm-public-config',{method:'GET'});if(!configRes.ok)throw new Error(`public config unavailable: ${configRes.status}`);const cfg=await configRes.json();if(!['DEMO','STAGING','PRODUCTION'].includes(cfg.mode))throw new Error('invalid public mode');if(cfg.stripePublishableKey&&String(cfg.stripePublishableKey).startsWith('sk_'))throw new Error('secret Stripe key exposed by public config');
for(const fn of ['sm-checkout','sm-refund','sm-private-file','sm-file-register','sm-readiness','sm-backup','sm-email-dispatch']){
 const r=await req(`/functions/v1/${fn}`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
 if(![401,403].includes(r.status))throw new Error(`${fn} must reject unauthenticated request, got ${r.status} ${(await r.text()).slice(0,300)}`);
}
const rpc=await req('/rest/v1/rpc/sm_prepare_checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_idempotency_key:'contract-test-no-auth',p_address_id:null})});
if(![401,403].includes(rpc.status))throw new Error(`checkout RPC must reject anon, got ${rpc.status} ${(await rpc.text()).slice(0,300)}`);
console.log('commercial MVP deployed server contract OK');