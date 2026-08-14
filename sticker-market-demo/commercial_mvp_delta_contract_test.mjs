import fs from 'node:fs';
const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('./v2.built.js',import.meta.url),'utf8');
const must=[
 'sticker-market-mvp-delta','SM_MVP_DELTA_VERSION',
 'sm_mark_manufacturing_unable','sm_submit_manufacturing_revision','sm_confirm_order_received','sm_complete_order','sm_validate_product_submission','sm_admin_cancellation_decision','sm_admin_set_manufacturer_routing',
 'revision_requested','ready_to_ship','manufacturing_revision','manufacturing_issue',
 'LEGAL_FOOTER_V2','checkout/shipping','checkout/payment','checkout/confirm','s1DemandRequestsPage','s1CustomOrderDetailPage','s1ManufacturerDashboard','s1AdminCreatorApplications'
];
for(const x of must)if(!html.includes(x)&&!js.includes(x))throw new Error(`missing MVP delta contract marker: ${x}`);
const delta=fs.readFileSync(new URL('./commercial_mvp_delta_v1.js',import.meta.url),'utf8')+fs.readFileSync(new URL('./commercial_mvp_delta_v1_cancel.js',import.meta.url),'utf8')+fs.readFileSync(new URL('./commercial_mvp_delta_v1_admin.js',import.meta.url),'utf8');
for(const forbidden of [/order\.total\s*=\s*0/,/SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['"][^'"]+/,/sk_(live|test)_[A-Za-z0-9]/])if(forbidden.test(delta))throw new Error(`forbidden delta pattern: ${forbidden}`);
if(!/physical'.*completed|kind==='physical'.*completed/s.test(js))throw new Error('physical review gating must require completed transaction');
if(!js.includes("p_status:'manufacturing'" ) && !js.includes("'manufacturing'"))throw new Error('manufacturing resume state missing');
console.log('formal MVP delta build contract OK');