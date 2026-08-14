const vm = require('node:vm');

module.exports = async function handler(req, res) {
  const url = 'https://cpmmqqznrqeodlesyfgg.supabase.co/functions/v1/salon-link-v2-public';
  const checks = {};
  const failures = [];

  try {
    const response = await fetch(url, { cache: 'no-store' });
    const html = await response.text();

    checks.upstreamStatus = response.status;
    checks.htmlBytes = Buffer.byteLength(html, 'utf8');
    if (!response.ok) failures.push('upstream_http');

    const required = {
      title: '<title>SALON LINK</title>',
      viewport: 'viewport-fit=cover',
      safeArea: 'safe-area-inset-bottom',
      bottomNav: 'bottomnav',
      homeLabel: 'ホーム',
      scheduleLabel: '日程',
      searchLabel: '探す',
      contactsLabel: '連絡',
      settingsLabel: '設定',
      modalScroll: 'overflow-y:auto',
      touchScroll: '-webkit-overflow-scrolling:touch',
      backend: 'window.SalonBackend',
      workSlot: 'workSlots',
      passwordRecovery: 'PASSWORD_RECOVERY',
      recoveryDialog: 'sl-recovery-overlay',
      verificationFile: 'type="file"',
      verificationBucket: 'verification-documents',
      verificationRpc: 'submit_verification_request',
    };

    for (const [key, needle] of Object.entries(required)) {
      checks[key] = html.includes(needle);
      if (!checks[key]) failures.push(key);
    }

    const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
      .map((match) => match[1])
      .filter(Boolean);

    checks.inlineScripts = scripts.length;
    const syntaxErrors = [];
    scripts.forEach((code, index) => {
      try {
        new vm.Script(code, { filename: `inline-${index}.js` });
      } catch (error) {
        syntaxErrors.push({ index, name: error.name, message: error.message });
      }
    });

    checks.inlineScriptSyntax = syntaxErrors.length === 0;
    checks.scriptSyntaxErrors = syntaxErrors;
    if (syntaxErrors.length) failures.push('inline_script_syntax');

    const navDefinition = "[['home','⌂','ホーム'],['schedule','▣','日程'],['search','⌕','探す'],['contacts','✉','連絡'],['settings','⚙','設定']]";
    checks.bottomNavFiveRoutes = html.includes(navDefinition);
    if (!checks.bottomNavFiveRoutes) failures.push('bottom_nav_five_routes');

    checks.ok = failures.length === 0;
    res.statusCode = checks.ok ? 200 : 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({
      ok: checks.ok,
      checkedAt: new Date().toISOString(),
      failures,
      checks,
      lifecycleInjectedByProxy: true,
      lifecycleRpcs: [
        'refresh_expirations',
        'sync_review_deadlines',
        'sync_archives',
        'sync_scheduled_notifications',
      ],
    }));
  } catch (error) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({
      ok: false,
      checkedAt: new Date().toISOString(),
      failures: ['health_exception'],
      error: String(error?.message || error),
    }));
  }
};
