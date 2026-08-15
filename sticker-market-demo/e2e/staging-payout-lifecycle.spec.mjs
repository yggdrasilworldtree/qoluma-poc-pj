import {test,expect} from '@playwright/test';
const E=process.env;
const required=['SM_STAGING_CREATOR_EMAIL','SM_STAGING_CREATOR_PASSWORD','SM_STAGING_ADMIN_EMAIL','SM_STAGING_ADMIN_PASSWORD','SM_STAGING_FULFILLMENT_ORDER_ID','SM_STAGING_PRODUCT_ID'];
async function login(page,email,password){await page.goto('/?sm_mode=STAGING#/login');await expect(page.getByRole('heading',{name:'ログイン'})).toBeVisible();await page.locator('#loginEmail').fill(email);await page.locator('#loginPass').fill(password);await page.locator('#main').getByRole('button',{name:'ログイン',exact:true}).click();await page.waitForFunction(()=>location.hash!=='#/login',{timeout:20000});}
async function rest(page,path){return page.evaluate(async p=>await smMvpRest(p),path)}
async function rpc(page,name,args){return page.evaluate(async({name,args})=>await smMvpRpc(name,args),{name,args})}
test.beforeAll(()=>{const missing=required.filter(k=>!E[k]);if(missing.length)throw new Error(`Missing payout acceptance config: ${missing.join(', ')}`)});
test('PAYOUT-01 physical payout: confirmed → scheduled → paid',async({browser})=>{
 const creatorCtx=await browser.newContext(),creator=await creatorCtx.newPage();await login(creator,E.SM_STAGING_CREATOR_EMAIL,E.SM_STAGING_CREATOR_PASSWORD);
 let sales=await rpc(creator,'sm_creator_sales_detail',{});let row=sales.find(x=>x.order_id===E.SM_STAGING_FULFILLMENT_ORDER_ID&&x.product_id===E.SM_STAGING_PRODUCT_ID);expect(row).toBeTruthy();expect(row.payout_status).toBe('confirmed');expect(Number(row.payout_confirmed)).toBeGreaterThan(0);
 const adminCtx=await browser.newContext(),admin=await adminCtx.newPage();await login(admin,E.SM_STAGING_ADMIN_EMAIL,E.SM_STAGING_ADMIN_PASSWORD);
 const payouts=await rest(admin,`sm_creator_payouts?select=id,status,amount,status_history&order_id=eq.${encodeURIComponent(E.SM_STAGING_FULFILLMENT_ORDER_ID)}`);expect(payouts.length).toBeGreaterThan(0);const p=payouts[0];expect(p.status).toBe('confirmed');
 await rpc(admin,'sm_set_payout_status',{p_payout_id:p.id,p_status:'scheduled'});await expect.poll(async()=>{const r=await rest(admin,`sm_creator_payouts?select=status&id=eq.${encodeURIComponent(p.id)}`);return r?.[0]?.status}).toBe('scheduled');
 sales=await rpc(creator,'sm_creator_sales_detail',{});row=sales.find(x=>x.order_id===E.SM_STAGING_FULFILLMENT_ORDER_ID&&x.product_id===E.SM_STAGING_PRODUCT_ID);expect(row?.payout_status).toBe('scheduled');
 await rpc(admin,'sm_set_payout_status',{p_payout_id:p.id,p_status:'paid'});await expect.poll(async()=>{const r=await rest(admin,`sm_creator_payouts?select=status,status_history&id=eq.${encodeURIComponent(p.id)}`);return r?.[0]?.status}).toBe('paid');
 sales=await rpc(creator,'sm_creator_sales_detail',{});row=sales.find(x=>x.order_id===E.SM_STAGING_FULFILLMENT_ORDER_ID&&x.product_id===E.SM_STAGING_PRODUCT_ID);expect(row?.payout_status).toBe('paid');expect(Number(row?.payout_confirmed||0)).toBeGreaterThan(0);
 await adminCtx.close();await creatorCtx.close();
});