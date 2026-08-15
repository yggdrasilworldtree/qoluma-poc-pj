import {test,expect} from '@playwright/test';
const E=process.env;
const required=['SM_STAGING_BUYER_EMAIL','SM_STAGING_BUYER_PASSWORD','SM_STAGING_CREATOR_EMAIL','SM_STAGING_CREATOR_PASSWORD','SM_STAGING_ADMIN_EMAIL','SM_STAGING_ADMIN_PASSWORD','SM_STAGING_MANUFACTURER_EMAIL','SM_STAGING_MANUFACTURER_PASSWORD','SM_STAGING_FULFILLMENT_ORDER_ID','SM_STAGING_FULFILLMENT_MFG_ID','SM_STAGING_PRODUCT_ID'];
async function login(page,email,password){await page.goto('/?sm_mode=STAGING#/login');await expect(page.getByRole('heading',{name:'ログイン'})).toBeVisible();await page.locator('#loginEmail').fill(email);await page.locator('#loginPass').fill(password);await page.locator('#main').getByRole('button',{name:'ログイン',exact:true}).click();await page.waitForFunction(()=>location.hash!=='#/login',{timeout:20000});}
async function rest(page,path){return page.evaluate(async p=>await smMvpRest(p),path)}
async function rpc(page,name,args){return page.evaluate(async({name,args})=>await smMvpRpc(name,args),{name,args})}
async function currentStatus(page,table,id){const r=await rest(page,`${table}?select=status&id=eq.${encodeURIComponent(id)}`);return r?.[0]?.status||null}
test.beforeAll(()=>{const missing=required.filter(k=>!E[k]);if(missing.length)throw new Error(`Missing payout acceptance config: ${missing.join(', ')}`)});
test('PAYOUT-01 physical payout: confirmed → scheduled → paid',async({browser})=>{
 const orderId=E.SM_STAGING_FULFILLMENT_ORDER_ID,mfgId=E.SM_STAGING_FULFILLMENT_MFG_ID;
 let buyerCtx=null,manufacturerCtx=null;
 const probeCtx=await browser.newContext(),probe=await probeCtx.newPage();await login(probe,E.SM_STAGING_ADMIN_EMAIL,E.SM_STAGING_ADMIN_PASSWORD);let orderStatus=await currentStatus(probe,'sm_orders',orderId);await probeCtx.close();
 if(orderStatus!=='completed'){
  manufacturerCtx=await browser.newContext();const manufacturer=await manufacturerCtx.newPage();await login(manufacturer,E.SM_STAGING_MANUFACTURER_EMAIL,E.SM_STAGING_MANUFACTURER_PASSWORD);
  const flow=['confirmed','manufacturing','inspection','ready_to_ship','shipped'];let mfgStatus=await currentStatus(manufacturer,'sm_manufacturing_orders',mfgId);let pos=flow.indexOf(mfgStatus);
  if(pos<0&&mfgStatus!=='delivered')throw new Error(`Unexpected manufacturing status for payout fixture: ${mfgStatus}`);
  if(mfgStatus!=='delivered')for(let i=pos+1;i<flow.length;i++){const next=flow[i];await rpc(manufacturer,'sm_set_manufacturing_status',{p_mfg_id:mfgId,p_status:next,p_carrier:next==='shipped'?'STAGING Payout Carrier':null,p_tracking:next==='shipped'?`PAYOUT-${Date.now()}`:null});}
  await manufacturerCtx.close();
  buyerCtx=await browser.newContext();const buyer=await buyerCtx.newPage();await login(buyer,E.SM_STAGING_BUYER_EMAIL,E.SM_STAGING_BUYER_PASSWORD);orderStatus=await currentStatus(buyer,'sm_orders',orderId);if(orderStatus!=='delivered'&&orderStatus!=='completed')await rpc(buyer,'sm_confirm_order_received',{p_order_id:orderId});orderStatus=await currentStatus(buyer,'sm_orders',orderId);if(orderStatus!=='completed')await rpc(buyer,'sm_complete_order',{p_order_id:orderId});await expect.poll(()=>currentStatus(buyer,'sm_orders',orderId)).toBe('completed');await buyerCtx.close();
 }
 const creatorCtx=await browser.newContext(),creator=await creatorCtx.newPage();await login(creator,E.SM_STAGING_CREATOR_EMAIL,E.SM_STAGING_CREATOR_PASSWORD);
 let sales=await rpc(creator,'sm_creator_sales_detail',{});let row=sales.find(x=>x.order_id===orderId&&x.product_id===E.SM_STAGING_PRODUCT_ID);expect(row).toBeTruthy();expect(row.payout_status).toBe('confirmed');expect(Number(row.payout_confirmed)).toBeGreaterThan(0);
 const adminCtx=await browser.newContext(),admin=await adminCtx.newPage();await login(admin,E.SM_STAGING_ADMIN_EMAIL,E.SM_STAGING_ADMIN_PASSWORD);
 const payouts=await rest(admin,`sm_creator_payouts?select=id,status,amount,status_history&order_id=eq.${encodeURIComponent(orderId)}`);expect(payouts.length).toBeGreaterThan(0);const p=payouts[0];expect(p.status).toBe('confirmed');
 await rpc(admin,'sm_set_payout_status',{p_payout_id:p.id,p_status:'scheduled'});await expect.poll(async()=>await currentStatus(admin,'sm_creator_payouts',p.id)).toBe('scheduled');
 sales=await rpc(creator,'sm_creator_sales_detail',{});row=sales.find(x=>x.order_id===orderId&&x.product_id===E.SM_STAGING_PRODUCT_ID);expect(row?.payout_status).toBe('scheduled');
 await rpc(admin,'sm_set_payout_status',{p_payout_id:p.id,p_status:'paid'});await expect.poll(async()=>await currentStatus(admin,'sm_creator_payouts',p.id)).toBe('paid');
 const hist=(await rest(admin,`sm_creator_payouts?select=status_history&id=eq.${encodeURIComponent(p.id)}`))?.[0]?.status_history||[];expect(hist.some(x=>x.status==='scheduled')).toBe(true);expect(hist.some(x=>x.status==='paid')).toBe(true);
 sales=await rpc(creator,'sm_creator_sales_detail',{});row=sales.find(x=>x.order_id===orderId&&x.product_id===E.SM_STAGING_PRODUCT_ID);expect(row?.payout_status).toBe('paid');expect(Number(row?.payout_confirmed||0)).toBeGreaterThan(0);
 await adminCtx.close();await creatorCtx.close();
});