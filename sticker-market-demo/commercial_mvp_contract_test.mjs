import fs from 'node:fs';
const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('./v2.built.js',import.meta.url),'utf8');
const must=[
 'sticker-market-commercial-mvp','Sticker Market Commercial MVP v1.0','SM_MVP_CONFIG','sm-checkout','sm-refund','sm-private-file','sm-file-register',
 'checkout/shipping','checkout/payment','checkout/confirm','LEGAL_FOOTER_V2','s1DemandRequestsPage','s1CustomOrderDetailPage','s1ManufacturerDashboard','s1AdminCreatorApplications',
 'profileEditPage','profileImageChanged','profile-social-grid','sm-profile-avatar','sm-profile-public','profile_handle','social_links','adminSectionSelect','admin-creator-apps','admin-ai-analysis'
];
for(const x of must)if(!html.includes(x)&&!js.includes(x))throw new Error(`missing build contract marker: ${x}`);
if(/sk_(live|test)_[A-Za-z0-9]/.test(html))throw new Error('Stripe secret key leaked into browser build');
if(/SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['\"][^'\"]+/.test(html))throw new Error('Supabase service role value leaked into browser build');
if(!html.includes('https://js.stripe.com/v3/'))throw new Error('Stripe.js is not loaded from the official origin');
if(!js.includes("modeStorageKey:'sm_mvp_mode'"))throw new Error('MVP mode adapter missing');
if(!js.includes("SM_MVP.mode=['DEMO','STAGING','PRODUCTION']"))throw new Error('DEMO/STAGING/PRODUCTION modes missing');
if(!js.includes('smMvpEnsureCheckout'))throw new Error('server checkout adapter missing');
if(!js.includes('smMvpUploadAndRegister'))throw new Error('server storage adapter missing');
console.log('commercial MVP build contract OK');
