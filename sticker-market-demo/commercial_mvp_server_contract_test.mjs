const url='https://oodalamuvycoajdrdszi.supabase.co';
const anon='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vZGFsYW11dnljb2FqZHJkc3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1NDM3NjMsImV4cCI6MjA2MzExOTc2M30.dZ9xi9WOGauVOR9aCmOYEGE2nagXCx6XitYZSai-BdQ';
async function req(path,opts={}){return fetch(url+path,{...opts,headers:{apikey:anon,...(opts.headers||{})}})}
const catalog=await req('/rest/v1/sm_products?select=id,status&status=eq.published&limit=20');
if(!catalog.ok)throw new Error(`public catalog unavailable: ${catalog.status}`);
const rows=await catalog.json();if(!rows.some(x=>x.id==='p1'))throw new Error('migrated catalog IDs are not preserved');
for(const fn of ['sm-checkout','sm-refund','sm-private-file','sm-file-register','sm-readiness','sm-backup','sm-email-dispatch']){
 const r=await req(`/functions/v1/${fn}`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
 if(![401,403].includes(r.status))throw new Error(`${fn} must reject unauthenticated request, got ${r.status}`);
}
const rpc=await req('/rest/v1/rpc/sm_prepare_checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_idempotency_key:'contract-test-no-auth',p_address_id:null})});
if(![401,403].includes(rpc.status))throw new Error(`checkout RPC must reject anon, got ${rpc.status}`);
console.log('commercial MVP deployed server contract OK');
