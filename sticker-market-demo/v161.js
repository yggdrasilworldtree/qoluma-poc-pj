/* Sticker Market v1.6.1 — focused mobile hotfixes only */
(function(){
  /* v1.6 intercepted the logout button before its original handler could run.
     Exclude logout from that generic interceptor and handle it explicitly. */
  if(typeof v16CriticalAction==='function'){
    const baseCritical=v16CriticalAction;
    v16CriticalAction=function(text){
      if(/^ログアウト$/.test(String(text||'').trim()))return null;
      return baseCritical(text);
    };
  }

  function performLogout(){
    try{
      state.user=null;
      localStorage.setItem('sm10',JSON.stringify(state));
      sessionStorage.removeItem('afterLogin');
      closeModal();
      go('landing');
    }catch(err){
      if(typeof v16GlobalError==='function')v16GlobalError('ログアウトできませんでした',err.message,performLogout);
      else throw err;
    }
  }

  document.addEventListener('click',function(e){
    const b=e.target.closest('button');
    if(!b||b.dataset.v161LogoutConfirmed==='1')return;
    if((b.textContent||'').trim()!=='ログアウト')return;
    e.preventDefault();
    e.stopImmediatePropagation();
    v16Confirm(
      'ログアウトしますか？',
      '現在のアカウントからログアウトします。入力途中の未保存内容は残る場合があります。',
      'ログアウト',
      ()=>{b.dataset.v161LogoutConfirmed='1';performLogout();},
      true
    );
  },true);
})();
