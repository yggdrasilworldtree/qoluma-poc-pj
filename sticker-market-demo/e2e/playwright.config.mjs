import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'.',
 timeout:90000,
 expect:{timeout:12000},
 fullyParallel:false,
 workers:1,
 retries:0,
 reporter:[['list']],
 use:{baseURL:process.env.SM_E2E_BASE_URL||'http://127.0.0.1:4173',trace:'retain-on-failure',screenshot:'only-on-failure',video:'retain-on-failure'},
 projects:[{name:'chromium-mobile',use:{...devices['iPhone 13'],browserName:'chromium'}}]
});