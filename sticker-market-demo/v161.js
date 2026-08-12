/* Sticker Market v1.6.1 — focused mobile hotfixes only */
(function(){
  /* Logout: v1.6's generic critical-action interceptor must not handle logout.
     The dedicated handler below owns the full confirm -> session clear -> LP flow. */
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
      sessionStorage.removeItem('q');
      if(typeof closeModal==='function')closeModal();
      location.hash='#/landing';
      if(typeof route==='function')route();
    }catch(err){
      if(typeof v16GlobalError==='function')v16GlobalError('ログアウトできませんでした',err.message,performLogout);
      else throw err;
    }
  }

  document.addEventListener('click',function(e){
    const b=e.target.closest('button');
    if(!b)return;
    /* The confirm button itself also says "ログアウト". Never intercept it again. */
    if(b.id==='v16ConfirmDo'||b.closest('#modal')||b.dataset.v161LogoutConfirmed==='1')return;
    if((b.textContent||'').trim()!=='ログアウト')return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if(typeof v16Confirm==='function'){
      v16Confirm(
        'ログアウトしますか？',
        '現在のアカウントからログアウトします。入力途中の未保存内容は残る場合があります。',
        'ログアウト',
        performLogout,
        true
      );
    }else if(confirm('ログアウトしますか？'))performLogout();
  },true);

  /* Creator shop catalog: user-selectable 1/2/3-column layout.
     This is presentation-only and does not change product/search/shop data. */
  function shopColumnKey(cid){return 'sm_shop_columns_'+String(cid||'default')}
  function readShopColumns(cid){
    const n=Number(localStorage.getItem(shopColumnKey(cid))||2);
    return [1,2,3].includes(n)?n:2;
  }
  function applyShopColumns(cid,n){
    const grid=document.getElementById('shopProducts');
    if(!grid)return;
    n=[1,2,3].includes(Number(n))?Number(n):2;
    grid.classList.remove('shop-cols-1','shop-cols-2','shop-cols-3');
    grid.classList.add('v161-shop-grid','shop-cols-'+n);
    localStorage.setItem(shopColumnKey(cid),String(n));
    document.querySelectorAll('[data-shop-cols]').forEach(btn=>{
      const on=Number(btn.dataset.shopCols)===n;
      btn.classList.toggle('active',on);
      btn.setAttribute('aria-pressed',String(on));
    });
  }
  function enhanceShopColumns(cid,tab){
    if(!['products','new','popular'].includes(tab))return;
    const grid=document.getElementById('shopProducts');
    const tools=document.querySelector('.shop-search-tools');
    if(!grid||!tools)return;
    if(!tools.querySelector('.v161-column-picker')){
      const picker=document.createElement('div');
      picker.className='v161-column-picker';
      picker.setAttribute('role','group');
      picker.setAttribute('aria-label','商品一覧の表示列数');
      picker.innerHTML='<span>表示</span><button type="button" class="btn" data-shop-cols="1" aria-label="1列表示">1列</button><button type="button" class="btn" data-shop-cols="2" aria-label="2列表示">2列</button><button type="button" class="btn" data-shop-cols="3" aria-label="3列表示">3列</button>';
      const count=tools.querySelector('#shopCount');
      if(count)tools.insertBefore(picker,count);else tools.appendChild(picker);
      picker.querySelectorAll('[data-shop-cols]').forEach(btn=>btn.onclick=()=>applyShopColumns(cid,Number(btn.dataset.shopCols)));
    }
    applyShopColumns(cid,readShopColumns(cid));
  }

  if(typeof v14CreatorShop==='function'){
    const baseShop=v14CreatorShop;
    v14CreatorShop=function(cid,tab='top'){
      const result=baseShop(cid,tab);
      requestAnimationFrame(()=>enhanceShopColumns(cid,tab));
      return result;
    };
    creatorShop=v14CreatorShop;
  }
})();
