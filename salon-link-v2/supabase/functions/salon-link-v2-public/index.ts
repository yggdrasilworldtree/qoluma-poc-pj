const BASE_URL = 'https://cpmmqqznrqeodlesyfgg.supabase.co/functions/v1/';
const PARTS = ['sl-v2-c0','sl-v2-c1','sl-v2-c2','sl-v2-c3','sl-v2-c4','sl-v2-b0','sl-v2-b1','sl-v2-b2','sl-v2-b3'];

async function fetchPart(name: string) {
  const response = await fetch(BASE_URL + name, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${name}:${response.status}`);
  return (await response.text()).trim();
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function injectPasswordRecovery(html: string) {
  const patch = String.raw`
<style id="sl-recovery-style">
#sl-recovery-overlay{position:fixed;inset:0;z-index:2147483000;background:rgba(37,29,26,.48);display:none;align-items:flex-end;justify-content:center;padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom));box-sizing:border-box}
#sl-recovery-overlay.is-open{display:flex}
#sl-recovery-dialog{width:min(100%,520px);max-height:calc(100dvh - 32px - env(safe-area-inset-top));overflow:auto;background:#fffdfc;border:1px solid #eaded8;border-radius:24px;padding:22px;box-sizing:border-box;box-shadow:0 24px 70px rgba(45,31,26,.22)}
#sl-recovery-dialog h2{margin:0 0 8px;font-size:22px;line-height:1.35;color:#251d1a}
#sl-recovery-dialog p{margin:0 0 18px;color:#756963;font-size:14px;line-height:1.65}
#sl-recovery-dialog label{display:block;margin:13px 0 6px;font-size:13px;font-weight:700;color:#4d403b}
#sl-recovery-dialog input{width:100%;min-height:48px;border:1px solid #d9cbc5;border-radius:14px;padding:12px 14px;font:inherit;font-size:16px;box-sizing:border-box;background:#fff;color:#251d1a}
#sl-recovery-dialog input:focus{outline:3px solid rgba(239,111,92,.18);border-color:#ef6f5c}
#sl-recovery-submit{width:100%;min-height:48px;margin-top:18px;border:0;border-radius:14px;background:#ef6f5c;color:#fff;font:inherit;font-weight:800;cursor:pointer}
#sl-recovery-submit:disabled{opacity:.55;cursor:wait}
#sl-recovery-message{min-height:22px;margin-top:12px;font-size:13px;line-height:1.55}
#sl-recovery-message.error{color:#b42318}#sl-recovery-message.success{color:#18794e}
@media(min-width:641px){#sl-recovery-overlay{align-items:center}}
</style>
<div id="sl-recovery-overlay" role="dialog" aria-modal="true" aria-labelledby="sl-recovery-title">
  <form id="sl-recovery-dialog" autocomplete="off">
    <h2 id="sl-recovery-title">新しいパスワードを設定</h2>
    <p>本人確認が完了しました。新しいパスワードを入力してください。</p>
    <label for="sl-recovery-password">新しいパスワード</label>
    <input id="sl-recovery-password" name="password" type="password" minlength="8" autocomplete="new-password" required placeholder="8文字以上">
    <label for="sl-recovery-confirm">新しいパスワード（確認）</label>
    <input id="sl-recovery-confirm" name="confirm" type="password" minlength="8" autocomplete="new-password" required placeholder="もう一度入力">
    <button id="sl-recovery-submit" type="submit">パスワードを更新</button>
    <div id="sl-recovery-message" aria-live="polite"></div>
  </form>
</div>
<script id="sl-recovery-script">
(function(){
  var STORAGE_KEY='sl_password_recovery_pending';
  var attempts=0;
  var opened=false;
  function recoveryUrl(){
    var href=String(location.href||'');
    var hash=String(location.hash||'');
    var search=String(location.search||'');
    return /(?:[?#&])type=recovery(?:[&#]|$)/.test(href) || (hash.indexOf('#settings')===0 && /(?:^|[?&])code=/.test(search));
  }
  function openRecovery(){
    if(opened)return;
    var overlay=document.getElementById('sl-recovery-overlay');
    var first=document.getElementById('sl-recovery-password');
    if(!overlay)return;
    opened=true;
    overlay.classList.add('is-open');
    document.body.style.overflow='hidden';
    setTimeout(function(){if(first)first.focus({preventScroll:true});},40);
  }
  function cleanRecoveryUrl(){
    try{
      localStorage.removeItem(STORAGE_KEY);
      var target=location.origin+location.pathname+'#settings';
      history.replaceState({},document.title,target);
    }catch(_e){}
  }
  function install(){
    var backend=window.SalonBackend;
    if(!backend || !backend.client || typeof backend.updatePassword!=='function'){
      attempts+=1;
      if(attempts<120)setTimeout(install,50);
      return;
    }
    if(typeof backend.resetPassword==='function' && !backend.resetPassword.__slRecoveryWrapped){
      var original=backend.resetPassword.bind(backend);
      var wrapped=async function(email){
        try{localStorage.setItem(STORAGE_KEY,'1');}catch(_e){}
        return original(email);
      };
      wrapped.__slRecoveryWrapped=true;
      backend.resetPassword=wrapped;
    }
    try{
      backend.client.auth.onAuthStateChange(function(event){
        if(event==='PASSWORD_RECOVERY'){
          try{localStorage.setItem(STORAGE_KEY,'1');}catch(_e){}
          openRecovery();
        }
      });
    }catch(_e){}
    var shouldCheck=recoveryUrl();
    try{shouldCheck=shouldCheck || (localStorage.getItem(STORAGE_KEY)==='1' && location.hash.indexOf('#settings')===0);}catch(_e){}
    if(shouldCheck){
      backend.client.auth.getSession().then(function(result){
        if(result && result.data && result.data.session)openRecovery();
      }).catch(function(){});
    }
    var form=document.getElementById('sl-recovery-dialog');
    if(form && !form.__slBound){
      form.__slBound=true;
      form.addEventListener('submit',async function(event){
        event.preventDefault();
        var pass=document.getElementById('sl-recovery-password');
        var confirm=document.getElementById('sl-recovery-confirm');
        var button=document.getElementById('sl-recovery-submit');
        var message=document.getElementById('sl-recovery-message');
        var password=pass?pass.value:'';
        var confirmation=confirm?confirm.value:'';
        message.className='';
        message.textContent='';
        if(password.length<8){message.className='error';message.textContent='パスワードは8文字以上で入力してください。';return;}
        if(password!==confirmation){message.className='error';message.textContent='確認用パスワードが一致しません。';return;}
        button.disabled=true;
        button.textContent='更新中…';
        try{
          await backend.updatePassword(password);
          cleanRecoveryUrl();
          message.className='success';
          message.textContent='パスワードを更新しました。';
          button.textContent='更新しました';
          setTimeout(function(){location.hash='#settings';location.reload();},700);
        }catch(error){
          message.className='error';
          message.textContent=(error&&error.message)?error.message:'パスワードを更新できませんでした。もう一度お試しください。';
          button.disabled=false;
          button.textContent='パスワードを更新';
        }
      });
    }
  }
  install();
})();
</script>`;
  return html.includes('</body>') ? html.replace('</body>', patch + '</body>') : html + patch;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'content-type,authorization',
    }});
  }
  try {
    const parts = await Promise.all(PARTS.map(fetchPart));
    const bundle = parts.join('');
    if (bundle.length !== 44672) throw new Error(`bundle ${bundle.length}`);
    const htmlBuffer = await new Response(new Blob([base64ToBytes(bundle)]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    let html = new TextDecoder().decode(htmlBuffer);
    if (!html.includes('SALON LINK')) throw new Error('invalid app');
    html = injectPasswordRecovery(html);
    return new Response(html, { headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    }});
  } catch (error) {
    console.error('SALON LINK v2 public reconstruction failed', error);
    return new Response('<!doctype html><meta charset="utf-8"><title>SALON LINK</title><h1>SALON LINK</h1><p>アプリの読み込みに失敗しました。</p>', { status: 500, headers: {
      'Content-Type': 'text/html; charset=utf-8','Cache-Control': 'no-store','Access-Control-Allow-Origin': '*'
    }});
  }
});