const maintenanceScript = `<script id="sl-lifecycle-maintenance">(function(){var KEY='sl_lifecycle_maintenance_at',tries=0;function install(){var b=window.SalonBackend;if(!b||!b.client){tries+=1;if(tries<120)setTimeout(install,50);return}b.client.auth.getSession().then(function(result){if(!result||!result.data||!result.data.session)return;var now=Date.now(),last=0;try{last=Number(localStorage.getItem(KEY)||0)}catch(_e){}if(now-last<900000)return;try{localStorage.setItem(KEY,String(now))}catch(_e){}var jobs=['refresh_expirations','sync_review_deadlines','sync_archives','sync_scheduled_notifications'].map(function(name){return b.client.rpc(name)});Promise.allSettled(jobs).then(function(results){var failed=results.some(function(r){return r.status==='rejected'||(r.value&&r.value.error)});if(failed){try{localStorage.removeItem(KEY)}catch(_e){}}})}).catch(function(){})}install()})();</script>`;

module.exports = async function handler(req, res) {
  const url = 'https://cpmmqqznrqeodlesyfgg.supabase.co/functions/v1/salon-link-v2-public';

  try {
    const response = await fetch(url, { cache: 'no-store' });
    let body = await response.text();

    if (response.ok && !body.includes('sl-lifecycle-maintenance')) {
      body = body.includes('</body>')
        ? body.replace('</body>', maintenanceScript + '</body>')
        : body + maintenanceScript;
    }

    res.statusCode = response.status;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.end(body);
  } catch (error) {
    console.error('SALON LINK v2 proxy failed', error);
    res.statusCode = 502;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.end('<!doctype html><meta charset="utf-8"><title>SALON LINK</title><h1>SALON LINK</h1><p>読み込みに失敗しました。</p>');
  }
};
