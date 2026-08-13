/* Sticker Market v2.1 — interaction/regression patch. v2.0 visual spec remains the source of truth. */

const V21_AI_BOTS=[
 {id:'bot_description',icon:'✍️',name:'商品説明AI',category:'商品制作',desc:'商品説明・メリット・用途説明を改善します。'},
 {id:'bot_title',icon:'📝',name:'商品名改善AI',category:'商品制作',desc:'魅力が伝わる商品名候補を整理します。'},
 {id:'bot_tags',icon:'🏷️',name:'タグ最適化AI',category:'SEO・タグ',desc:'検索タグと関連キーワードを提案します。'},
 {id:'bot_seo',icon:'🔎',name:'SEOタイトルAI',category:'SEO・タグ',desc:'検索意図を踏まえたタイトルを提案します。'},
 {id:'bot_price',icon:'¥',name:'価格戦略AI',category:'価格',desc:'価格候補・利益率・比較ポイントを整理します。'},
 {id:'bot_analysis',icon:'📊',name:'販売分析AI',category:'分析',desc:'閲覧・売上・CVRから改善点を整理します。'},
 {id:'bot_ads',icon:'📣',name:'広告コピーAI',category:'広告',desc:'SNS投稿文や短い広告コピーを作成します。'},
 {id:'bot_customer',icon:'💬',name:'顧客対応AI',category:'顧客対応',desc:'問い合わせ内容を要約し、返信案を作成します。'},
 {id:'bot_review',icon:'🛡️',name:'審査対応AI',category:'審査対応',desc:'差し戻し理由を整理し、修正候補を提案します。'},
 {id:'bot_trend',icon:'📈',name:'トレンドAI',category:'トレンド',desc:'売れ筋傾向から次の商品企画を支援します。'}
];
const V21_AI_CATS=['すべて','商品制作','SEO・タグ','価格','分析','広告','顧客対応','審査対応','トレンド'];
let v21AiState={category:'すべて',query:'',favoritesOnly:false};
let v21AiDesignState={style:'ポップ',palette:'#34bca0'};
let v21GalleryState={};

products.forEach((p,i)=>{
 if(!p.size)p.size=['30mm','50mm','70mm','100mm'][i%4];
 if(typeof p.aiGenerated!=='boolean')p.aiGenerated=['p3','p9'].includes(p.id);
});
Object.values(db.userData||{}).forEach(d=>{d.aiHistory??=[];d.settings??={};d.settings.aiFavorites??=[];d.settings.backgroundPrefs??={opacity:15,blur:0,tile:false,fixed:false,productId:null};});
save();

/* Keep mobile creator navigation task-focused. Secondary menu moves to the header. */
nav=function(){
 const u=currentUser();if(!u)return'';
 let items;
 if(u.role==='creator')items=[['creator-dashboard','⌂','ダッシュボード'],['works','▦','作品管理'],['creator-orders','▤','注文管理'],['sales','↗','売上管理']];
 else if(u.role==='admin')items=[['admin','⌂','管理トップ'],['admin-review','✓','商品審査'],['admin-orders','▤','注文管理'],['admin-users','♙','ユーザー'],['admin-menu','☰','メニュー']];
 else items=[['home','⌂','ホーム'],['search','⌕','探す'],['favorites','♡','お気に入り'],['mypage','♙','マイページ']];
 const p=routePath().split('?')[0];
 return `<nav class="mobile-nav" style="--nav-count:${items.length}" aria-label="主要ナビゲーション">${items.map(i=>`<button class="${p===i[0]||p.startsWith(i[0]+'/')?'active':''}" onclick="go('${i[0]}')"><span>${i[1]}</span><span>${i[2]}</span></button>`).join('')}</nav>`;
};

const v20ProductCard=productCard;
productCard=function(p){
 const html=v20ProductCard(p);
 return html.replace('<article class="card product-card">',`<article class="card product-card" data-product-id="${p.id}" data-category="${esc(p.category)}">`);
};

const v20Shell=shell;
shell=function(content,opts={}){
 v20Shell(content,opts);
 setTimeout(enhanceV21,0);
};

function enhanceV21(){
 const path=routePath().split('?')[0];
 const u=currentUser();
 if(u?.role==='creator'){
  const actions=$('.header-actions');
  if(actions&&!actions.querySelector('.header-menu-btn')){
   const b=document.createElement('button');b.className='icon-btn header-menu-btn';b.setAttribute('aria-label','クリエイターメニュー');b.textContent='☰';b.onclick=creatorMenuSheet;
   const account=[...actions.querySelectorAll('.icon-btn')].find(x=>x.getAttribute('aria-label')==='マイページ');
   actions.insertBefore(b,account||null);
  }
 }
 if(path.startsWith('product/'))enhanceProductGallery(path.split('/')[1]);
 if(path.startsWith('creator/'))enhanceCreatorShopSort();
 if(path==='works')enhanceWorkTabs();
 if(path==='orders')enhanceOrderTabs();
 if(path==='downloads')enhanceDownloadTabs();
 if(path==='coupons')enhanceCouponTabs();
 if(path==='creator-dashboard')enhanceCreatorDashboardNotices();
}

function creatorMenuSheet(){
 const c=currentUser()?.creatorId;
 showSheet(`<div class="section-head"><h2>クリエイターメニュー</h2><button class="icon-btn" onclick="closeModal()">×</button></div><div class="menu-list"><button class="menu-row" onclick="closeModal();go('creator/${c}')"><span>公開ショップを見る</span><span>›</span></button><button class="menu-row" onclick="closeModal();go('shop-manage')"><span>ショップ管理</span><span>›</span></button><button class="menu-row" onclick="closeModal();go('ai-studio')"><span>AIスタジオ</span><span>›</span></button><button class="menu-row" onclick="closeModal();go('messages')"><span>メッセージ</span><span>›</span></button><button class="menu-row" onclick="closeModal();go('notifications')"><span>通知</span><span>›</span></button><button class="menu-row" onclick="closeModal();go('mypage')"><span>購入者マイページ</span><span>›</span></button><button class="menu-row" onclick="closeModal();go('settings')"><span>設定</span><span>›</span></button></div>`);
}

/* Landing guidance: explain before navigating, and gate creator selling by role/application. */
landing=function(){
 const top=[...products].sort((a,b)=>b.favs-a.favs);
 shell(`<section class="hero-v2"><div class="hero-copy"><span class="eyebrow">STICKER MARKETPLACE</span><h1>お気に入りのデザインで、<br>世界にひとつのシールを。</h1><p>デザインデータを買う。シールとして注文する。自分のデザインを形にする。すべてをひとつの場所で。</p><div class="btn-row"><button class="btn primary" onclick="go('search')">シールを探す</button><button class="btn" onclick="go('ai-design')">AIデザインを作る</button></div></div><div class="hero-art">${top.slice(0,4).map(p=>`<div class="hero-tile">${artSvg(p)}</div>`).join('')}</div></section><section class="section"><div class="section-head"><div><span class="eyebrow">CATEGORY</span><h2>人気のカテゴリ</h2></div><button class="link-btn" onclick="go('categories')">すべて見る ›</button></div><div class="category-grid">${categoryItems()}</div></section><section class="section"><div class="section-head"><div><span class="eyebrow">POPULAR</span><h2>おすすめのデザイン</h2></div><button class="link-btn" onclick="go('search')">すべて見る ›</button></div><div class="h-scroll">${top.slice(0,8).map(productCard).join('')}</div></section><section class="section"><div class="section-head"><h2>人気クリエイター</h2><button class="link-btn" onclick="go('creators')">一覧 ›</button></div><div class="creator-strip">${CREATORS.map(creatorMini).join('')}</div></section><section class="section"><div class="panel"><h2>Sticker Marketの使い方</h2><p class="muted">目的を選ぶと、操作の流れと次に進むボタンを表示します。</p><div class="btn-row"><button class="btn" onclick="openHowto('buy')">買う</button><button class="btn" onclick="openHowto('make')">作る</button><button class="btn" onclick="openHowto('sell')">売る</button></div></div></section>`,{search:true,footer:true,noNav:!currentUser()});
};
home=function(){landing()};

function openHowto(type){
 const config={
  buy:{title:'Sticker Marketで買う',steps:['デザインを検索する','データまたはシールを選ぶ','必要ならサイズ・素材を選ぶ','カートへ追加して注文する'],primary:'商品検索に進む',action:"closeModal();go('search')",secondary:'人気作品を見る',secondaryAction:"closeModal();go('search?sort=popular')"},
  make:{title:'オリジナルシールを作る',steps:['自分の画像をアップロード','形と素材を選ぶ','サイズ・数量を選ぶ','仕上がりと見積を確認','カートへ追加して注文する'],primary:'シールを作る',action:"closeModal();go('create-sticker')",secondary:'AIでデザインを作る',secondaryAction:"closeModal();go('ai-design')"}
 };
 if(type==='sell')return sellHowto();
 const c=config[type];
 showModal(`<div class="section-head"><h2>${c.title}</h2><button class="icon-btn" onclick="closeModal()">×</button></div><div class="howto-list">${c.steps.map((s,i)=>`<div class="howto-step"><b>${i+1}</b><div>${s}</div></div>`).join('')}</div><div class="btn-row"><button class="btn primary" onclick="${c.action}">${c.primary}</button><button class="btn" onclick="${c.secondaryAction}">${c.secondary}</button></div>`);
}
function sellHowto(){
 const u=currentUser();
 if(!u){showModal(`<div class="section-head"><h2>Sticker Marketで売る</h2><button class="icon-btn" onclick="closeModal()">×</button></div><p>作品を販売するにはアカウントとクリエイター権限が必要です。</p><div class="howto-list">${['アカウントを作成またはログイン','クリエイター登録を申請','承認後にショップと作品を登録','審査後に公開・販売'].map((s,i)=>`<div class="howto-step"><b>${i+1}</b><div>${s}</div></div>`).join('')}</div><div class="btn-row"><button class="btn" onclick="closeModal();go('login')">ログイン</button><button class="btn primary" onclick="closeModal();go('signup')">無料登録</button></div>`);return;
 }
 if(u.role==='creator'){showModal(`<div class="section-head"><h2>Sticker Marketで売る</h2><button class="icon-btn" onclick="closeModal()">×</button></div><p>クリエイターとして販売管理を利用できます。</p><div class="btn-row"><button class="btn primary" onclick="closeModal();go('creator-dashboard')">販売センターへ</button><button class="btn" onclick="closeModal();go('works')">作品を登録</button></div>`);return;}
 const app=userData().creatorApplication;
 if(app?.status==='pending'){showModal(`<div class="section-head"><h2>クリエイター登録</h2><button class="icon-btn" onclick="closeModal()">×</button></div><div class="notice creator-apply-status"><b>現在、申請を審査中です。</b><p class="muted">公開デモでは実審査は行いません。申請日時：${fmtDate(app.date)}</p></div>`);return;}
 showModal(`<div class="section-head"><h2>Sticker Marketで売る</h2><button class="icon-btn" onclick="closeModal()">×</button></div><p>購入者アカウントからクリエイター登録を申請できます。</p><div class="howto-list">${['活動内容・販売予定カテゴリを登録','必要に応じて本人確認','運営審査','承認後にショップを公開'].map((s,i)=>`<div class="howto-step"><b>${i+1}</b><div>${s}</div></div>`).join('')}</div><button class="btn primary" onclick="creatorApplyModal()">クリエイター登録へ</button>`);
}
function creatorApplyModal(){
 showModal(`<div class="section-head"><h2>クリエイター登録申請</h2><button class="icon-btn" onclick="closeModal()">×</button></div><div class="field"><label>ショップ名</label><input id="caShop" placeholder="例：Haru Atelier"></div><div class="field"><label>活動内容</label><textarea id="caBio" placeholder="制作している作品や活動内容"></textarea></div><div class="field"><label>販売予定カテゴリ</label><select id="caCat">${CATEGORIES.map(c=>`<option>${c[0]}</option>`).join('')}</select></div><div class="field"><label>SNS / ポートフォリオ（任意）</label><input id="caUrl" placeholder="https://..."></div><label class="chip"><input id="caAgree" type="checkbox"> クリエイター規約に同意</label><button class="btn primary full" style="margin-top:14px" onclick="submitCreatorApply()">申請する</button>`);
}
function submitCreatorApply(){
 if(!$('#caShop').value.trim()||!$('#caBio').value.trim()||!$('#caAgree').checked){toast('必須項目と規約同意を確認してください');return;}
 userData().creatorApplication={status:'pending',shop:$('#caShop').value.trim(),bio:$('#caBio').value.trim(),category:$('#caCat').value,url:$('#caUrl').value.trim(),date:now()};save();closeModal();toast('クリエイター登録を申請しました（デモ）');
}

/* Product gallery: real swipe, arrows on desktop, and dot navigation. */
function enhanceProductGallery(id){
 const main=$('.gallery-main');if(!main||main.dataset.v21==='1')return;main.dataset.v21='1';
 const p=productBy(id),fav=userData()?.favorites.includes(id);v21GalleryState[id]=0;
 main.innerHTML=`<div class="gallery-track" id="galleryTrack">${[0,1,2].map((n)=>`<div class="gallery-slide ${n===1?'usecase':n===2?'detail':''}">${artSvg(p)}</div>`).join('')}</div><button class="gallery-arrow prev" onclick="galleryMove('${id}',-1)" aria-label="前の画像">‹</button><button class="gallery-arrow next" onclick="galleryMove('${id}',1)" aria-label="次の画像">›</button><div class="gallery-actions"><button class="icon-btn" onclick="toggleFav('${id}')" aria-label="お気に入り">${fav?'♥':'♡'}</button><button class="icon-btn" onclick="shareProduct('${id}')" aria-label="共有">↗</button></div>`;
 const dots=$('.gallery-dots');if(dots)dots.innerHTML=[0,1,2].map(i=>`<button class="${i===0?'active':''}" onclick="galleryGo('${id}',${i})" aria-label="画像${i+1}を表示"></button>`).join('');
 let sx=0,sy=0;main.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY},{passive:true});main.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy))galleryMove(id,dx<0?1:-1)},{passive:true});
}
function galleryMove(id,delta){galleryGo(id,clamp((v21GalleryState[id]||0)+delta,0,2))}
function galleryGo(id,index){v21GalleryState[id]=index;const track=$('#galleryTrack');if(track)track.scrollTo({left:track.clientWidth*index,behavior:'smooth'});$$('.gallery-dots button').forEach((b,i)=>b.classList.toggle('active',i===index));}

/* Search: connect every visible filter, removable chips, page size and guest column persistence. */
function v21Params(){return new URLSearchParams(routePath().split('?')[1]||'')}
function v21SearchUrl(params){const s=params.toString();return 'search'+(s?'?'+s:'')}
searchPage=function(){
 const sp=v21Params(),keyword=sp.get('q')||'',cat=sp.get('category')||'',material=sp.get('material')||'',shape=sp.get('shape')||'',size=sp.get('size')||'',min=Number(sp.get('min')||0),max=Number(sp.get('max')||5000),excludeAi=sp.get('excludeAi')==='1',sort=sp.get('sort')||'relevance';
 const savedCols=currentUser()?Number(userData()?.settings?.columns||2):Number(localStorage.getItem('sm20_guest_cols')||2);const cols=clamp(savedCols,1,3);
 let list=products.map(p=>[p,score(p,keyword)]).filter(([p,s])=>(!keyword||s>0)&&(!cat||p.category===cat)&&(!material||p.material===material)&&(!shape||p.shape===shape)&&(!size||p.size===size)&&p.digital>=min&&p.digital<=max&&(!excludeAi||!p.aiGenerated));
 if(sort==='popular')list.sort((a,b)=>b[0].sales-a[0].sales);else if(sort==='rating')list.sort((a,b)=>b[0].rating-a[0].rating);else if(sort==='new')list.sort((a,b)=>String(b[0].updated).localeCompare(String(a[0].updated)));else list.sort((a,b)=>b[1]-a[1]);
 list=list.map(x=>x[0]);
 const pageSize=Number(sp.get('pageSize')||6),pages=Math.max(1,Math.ceil(list.length/pageSize)),page=clamp(Number(sp.get('page')||1),1,pages),shown=list.slice((page-1)*pageSize,page*pageSize);
 const chipEntries=[['q',keyword],['category',cat],['material',material],['shape',shape],['size',size],['excludeAi',excludeAi?'AI生成除外':'']].filter(x=>x[1]);
 const rel=v21Related(keyword,cat,list);
 shell(`<div class="section-head"><div><h1>検索結果</h1><p>${list.length}件の作品</p></div><button class="btn" onclick="filterSheet()">⚙ 絞り込み</button></div><div class="toolbar"><div class="filter-chips">${chipEntries.map(([k,v])=>`<button class="filter-chip-btn" onclick="removeSearchParam('${k}')">${esc(v)} <span class="x">×</span></button>`).join('')}${chipEntries.length?`<button class="link-btn" onclick="go('search')">すべてクリア</button>`:''}</div><div class="btn-row"><select class="btn" onchange="searchSet('sort',this.value)"><option value="relevance" ${sort==='relevance'?'selected':''}>関連順</option><option value="popular" ${sort==='popular'?'selected':''}>人気順</option><option value="rating" ${sort==='rating'?'selected':''}>評価順</option><option value="new" ${sort==='new'?'selected':''}>新着順</option></select><div class="segmented" aria-label="表示列数"><button class="${cols===1?'active':''}" onclick="setCols(1)">1列</button><button class="${cols===2?'active':''}" onclick="setCols(2)">2列</button><button class="${cols===3?'active':''}" onclick="setCols(3)">3列</button></div></div></div>${shown.length?`<div id="searchGrid" class="product-grid" data-cols="${cols}" style="--cols:${cols}">${shown.map(productCard).join('')}</div><div class="toolbar"><div class="pager" style="flex:1"><button class="btn" ${page<=1?'disabled':''} onclick="searchPageMove(${page-1})">‹ 前へ</button><div class="center">${Array.from({length:pages},(_,i)=>i+1).slice(Math.max(0,page-2),Math.max(0,page-2)+5).map(n=>`<button class="page-dot ${n===page?'active':''}" onclick="searchPageMove(${n})">${n}</button>`).join('')}</div><button class="btn" ${page>=pages?'disabled':''} onclick="searchPageMove(${page+1})">次へ ›</button></div><label class="small">表示件数 <select class="btn" onchange="searchSet('pageSize',this.value);searchSet('page','1')"><option ${pageSize===6?'selected':''}>6</option><option ${pageSize===12?'selected':''}>12</option><option ${pageSize===24?'selected':''}>24</option></select></label></div>`:`<div class="empty"><div class="emoji">🔎</div><h2>該当する作品がありません</h2><p class="muted">条件を少し変えると見つかるかもしれません。</p><button class="btn primary" onclick="go('search')">条件をクリア</button></div>`}<section class="section"><h2>関連する検索をもっと見る</h2><div class="btn-row">${rel.map(x=>`<button class="chip" onclick="go('search?q=${encodeURIComponent(x)}')">${esc(x)}</button>`).join('')}</div></section>`,{title:'検索結果',back:true,search:true,footer:true});
};
function v21Related(keyword,cat,list){const found=list[0]||products.find(p=>p.category===cat);const base=[...(found?.tags||[]),found?.category,keyword].filter(Boolean);const map={'動物':['かわいい動物','猫ステッカー','ペットステッカー'],'食べ物':['カフェステッカー','スイーツ','レトロ喫茶'],'風景・自然':['星空','山と湖','アウトドア'],'花・植物':['花ステッカー','ボタニカル','ギフト'],'Y2K・トレンド':['宇宙','ポップ','Y2K']};return [...new Set([...(map[found?.category]||[]),...base])].filter(x=>x!==keyword).slice(0,7)}
function removeSearchParam(k){const sp=v21Params();sp.delete(k);sp.set('page','1');go(v21SearchUrl(sp))}
function searchSet(k,v){const sp=v21Params();if(v)sp.set(k,v);else sp.delete(k);go(v21SearchUrl(sp),{replace:true})}
function searchPageMove(n){const sp=v21Params();sp.set('page',String(n));go(v21SearchUrl(sp));}
setCols=function(n){if(!currentUser())localStorage.setItem('sm20_guest_cols',String(n));else{userData().settings.columns=n;save()}const g=$('#searchGrid');if(g){g.dataset.cols=n;g.style.setProperty('--cols',n)}$$('.segmented button').forEach((b,i)=>b.classList.toggle('active',i+1===n));};
filterSheet=function(){
 const sp=v21Params(),mn=Number(sp.get('min')||0),mx=Number(sp.get('max')||5000);
 showSheet(`<div class="section-head"><h2>絞り込み</h2><button class="icon-btn" onclick="closeModal()">×</button></div><div class="search-filter-grid"><div class="field"><label>カテゴリ</label><select id="fCat"><option value="">指定なし</option>${CATEGORIES.map(c=>`<option ${sp.get('category')===c[0]?'selected':''}>${c[0]}</option>`).join('')}</select></div><div class="field"><label>素材</label><select id="fMat"><option value="">指定なし</option>${['耐水PET','上質紙','透明PET','ホログラム'].map(v=>`<option ${sp.get('material')===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label>形状</label><select id="fShape"><option value="">指定なし</option>${['ダイカット','円形','角丸','スクエア'].map(v=>`<option ${sp.get('shape')===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label>サイズ</label><select id="fSize"><option value="">指定なし</option>${['30mm','50mm','70mm','100mm'].map(v=>`<option ${sp.get('size')===v?'selected':''}>${v}</option>`).join('')}</select></div></div><div class="field"><label>価格帯</label><div class="range-values"><span id="fMinLabel">${yen(mn)}</span><span>〜</span><span id="fMaxLabel">${yen(mx)}${mx>=5000?'+':''}</span></div><input id="fMin" type="range" min="0" max="5000" step="100" value="${mn}" oninput="v21SyncRange()"><input id="fMax" type="range" min="0" max="5000" step="100" value="${mx}" oninput="v21SyncRange()"></div><label class="chip"><input id="fAi" type="checkbox" ${sp.get('excludeAi')==='1'?'checked':''}> AI生成作品を除外</label><div class="btn-row" style="margin-top:18px"><button class="btn" onclick="closeModal();go('search')">条件をクリア</button><button class="btn primary" onclick="applyV21Filters()">絞り込む</button></div>`);
};
function v21SyncRange(){let a=Number($('#fMin').value),b=Number($('#fMax').value);if(a>b){if(document.activeElement===$('#fMin'))b=a;else a=b;$('#fMin').value=a;$('#fMax').value=b}$('#fMinLabel').textContent=yen(a);$('#fMaxLabel').textContent=yen(b)+(b>=5000?'+':'');}
function applyV21Filters(){const sp=v21Params();[['category',$('#fCat').value],['material',$('#fMat').value],['shape',$('#fShape').value],['size',$('#fSize').value],['min',$('#fMin').value],['max',$('#fMax').value]].forEach(([k,v])=>{if(v&&!(k==='min'&&v==='0')&&!(k==='max'&&v==='5000'))sp.set(k,v);else sp.delete(k)});if($('#fAi').checked)sp.set('excludeAi','1');else sp.delete('excludeAi');sp.set('page','1');closeModal();go(v21SearchUrl(sp));}

/* Creator shop sort/tabs and creator-order ownership correction. */
function enhanceCreatorShopSort(){const seg=$('.toolbar .segmented');if(!seg||seg.dataset.v21)return;seg.dataset.v21='1';const btns=seg.querySelectorAll('button');if(btns[0])btns[0].onclick=()=>shopSort('popular',btns);if(btns[1])btns[1].onclick=()=>shopSort('new',btns);}
function shopSort(mode,btns){const grid=$('#shopProducts');if(!grid)return;const cards=[...grid.children];cards.sort((a,b)=>{const pa=productBy(a.dataset.productId),pb=productBy(b.dataset.productId);return mode==='new'?String(pb.updated).localeCompare(String(pa.updated)):pb.sales-pa.sales});cards.forEach(c=>grid.appendChild(c));btns.forEach((b,i)=>b.classList.toggle('active',(mode==='popular'&&i===0)||(mode==='new'&&i===1)));toast(mode==='popular'?'人気順に並べました':'新着順に並べました');}
function enhanceWorkTabs(){const tabs=$$('.work-tabs .chip');if(!tabs.length)return;tabs.forEach(b=>b.onclick=()=>{tabs.forEach(x=>x.classList.remove('active'));b.classList.add('active');const f=b.textContent.trim();$$('.work-row').forEach(r=>{const st=r.querySelector('.status')?.textContent.trim()||'';r.hidden=f!=='すべて'&&st!==f})});}
function enhanceOrderTabs(){const tabs=$$('.tabs button');if(tabs.length<3)return;const orders=userData()?.orders||[];tabs.slice(0,3).forEach((b,idx)=>b.onclick=()=>{tabs.forEach(x=>x.classList.remove('active'));b.classList.add('active');$$('.order-card').forEach((r,i)=>{const o=orders[i],hasD=o?.items?.some(x=>x.kind==='digital'),hasP=o?.items?.some(x=>x.kind==='physical');r.hidden=idx===1&&!hasD||idx===2&&!hasP})});}
function enhanceDownloadTabs(){const tabs=$$('.tabs button');if(tabs.length<3)return;const dl=userData()?.downloads||[];tabs.slice(0,3).forEach((b,idx)=>b.onclick=()=>{tabs.forEach(x=>x.classList.remove('active'));b.classList.add('active');$$('.download-card').forEach((r,i)=>{const expired=new Date(dl[i]?.expires||0)<new Date();r.hidden=idx===1&&expired||idx===2&&!expired})});}
function enhanceCouponTabs(){const tabs=$$('.tabs button');tabs.forEach((b,idx)=>b.onclick=()=>{tabs.forEach(x=>x.classList.remove('active'));b.classList.add('active');const card=$('.tabs + .card');if(card)card.hidden=idx!==0;});}
creatorOrders=function(){
 const cid=currentUser()?.creatorId;if(!cid)return go('home');
 const sales=[];Object.entries(db.userData).forEach(([buyerId,d])=>(d.orders||[]).forEach(o=>{const items=(o.items||[]).filter(x=>productBy(x.productId).creatorId===cid);if(items.length)sales.push({...o,buyerId,items,total:items.reduce((a,x)=>a+x.price*x.qty,0)})}));
 shell(`<div class="section-head"><div><h1>注文管理</h1><p>あなたの商品を含む購入注文だけを表示します。</p></div></div>${sales.length?sales.map(orderCard).join(''):`<div class="empty"><div class="emoji">📦</div><h2>対象注文はありません</h2><p class="muted">購入者側の注文履歴とは分離されています。</p></div>`}`,{title:'注文管理',bell:true,cart:false});
};

/* Creator dashboard KPI interactions and action-oriented sales report. */
creatorDashboard=function(){
 const u=currentUser();if(u?.role!=='creator')return go('home');const s=db.creator.sales[u.creatorId]||{month:0,last:0,count:0,favs:0},diff=Math.round((s.month-s.last)/Math.max(1,s.last)*100);
 shell(`<div class="creator-dashboard-hero"><div class="small">今月の売上</div><h1 style="font-size:38px;margin:5px 0">${yen(s.month)}</h1><div>前月比 ${diff>=0?'+':''}${diff}%</div></div><div class="creator-shortcuts section"><button class="card btn" onclick="go('works')">▦<br>商品管理</button><button class="card btn" onclick="go('creator-orders')">▤<br>注文管理</button><button class="card btn" onclick="go('sales')">↗<br>売上レポート</button><button class="card btn" onclick="creatorMenuSheet()">☰<br>メニュー</button></div><button class="notice" style="width:100%;border:0;text-align:left" onclick="go('reviews')">🔔 新しいレビューが3件届いています <b style="float:right">›</b></button><section class="section"><div class="section-head"><h2>売上サマリー</h2><button class="link-btn" onclick="go('sales')">すべて見る ›</button></div><div class="kpi-grid"><button class="card kpi clickable-kpi" onclick="salesMetricModal('revenue')"><span class="muted">今月</span><b>${yen(s.month)}</b><span class="kpi-hint">分析を見る ›</span></button><button class="card kpi clickable-kpi" onclick="salesMetricModal('count')"><span class="muted">販売数</span><b>${s.count}</b><span class="kpi-hint">分析を見る ›</span></button><button class="card kpi clickable-kpi" onclick="salesMetricModal('favorites')"><span class="muted">お気に入り</span><b>${s.favs}</b><span class="kpi-hint">分析を見る ›</span></button><button class="card kpi clickable-kpi" onclick="salesMetricModal('cvr')"><span class="muted">CVR</span><b>2.6%</b><span class="kpi-hint">分析を見る ›</span></button></div></section>`,{title:'クリエイターダッシュボード',bell:true,cart:false});
};
function enhanceCreatorDashboardNotices(){}
function salesMetricData(metric){return {revenue:{title:'売上',value:'¥128,450',prev:'¥108,450',change:'+18.4%',avg:'+9.2%',what:'上位2商品の販売が伸び、今月売上が前月を上回っています。',why:'検索流入増加と新作公開後の再訪が主因です。',next:'売上寄与の高い商品の関連商品を増やしてください。'},count:{title:'販売数',value:'342件',prev:'306件',change:'+11.8%',avg:'+6.4%',what:'販売件数が前月より36件増えています。',why:'デジタル商品の購入回数増加が寄与しています。',next:'人気商品のバリエーション追加を検討してください。'},favorites:{title:'お気に入り',value:'1,245',prev:'1,118',change:'+11.4%',avg:'+8.1%',what:'お気に入り登録が継続して増えています。',why:'一覧での露出増加と商品画像改善が寄与しています。',next:'お気に入りが多く購入率の低い商品を優先改善してください。'},cvr:{title:'CVR',value:'2.6%',prev:'2.2%',change:'+0.4pt',avg:'カテゴリ平均 3.1%',what:'購入率は改善していますがカテゴリ平均を下回っています。',why:'一部商品の商品詳細離脱率が高いことが主因候補です。',next:'商品画像・価格・購入形式の見せ方をA/B比較してください。'}}[metric]}
function salesMetricModal(metric){const d=salesMetricData(metric);showModal(`<div class="section-head"><div><h2>${d.title}分析</h2><p class="muted">${d.value} / 前月 ${d.prev}</p></div><button class="icon-btn" onclick="closeModal()">×</button></div><div class="kpi-grid"><div class="card kpi"><span>前月比</span><b>${d.change}</b></div><div class="card kpi"><span>比較</span><b style="font-size:17px">${d.avg}</b></div></div><h3>何が起きたか</h3><p>${d.what}</p><h3>なぜ起きたか</h3><p>${d.why}</p><h3>次に何をするか</h3><p>${d.next}</p><button class="btn primary" onclick="closeModal();go('sales?detail=${metric}')">詳細レポートを見る</button>`)}
const v21SalesActions=[{id:'a1',priority:'今すぐやる',title:'商品画像を3枚以上にする',text:'画像が3枚以上の商品は購入率が高い傾向です。上位商品の使用例画像を追加してください。'},{id:'a2',priority:'今週やる',title:'用途タグを追加する',text:'耐水PET商品の用途タグ追加で検索露出改善が見込めます。'},{id:'a3',priority:'様子を見る',title:'価格は現状維持',text:'カテゴリ中央値に近いため、大幅な価格変更はまだ不要です。'}];
salesPage=function(){
 const detail=parseQuery().detail,s=db.creator.sales[currentUser().creatorId]||{month:128450,count:342,favs:1245};if(detail)return salesDetailPage(detail);
 const doneIds=userData().salesActionsDone||[];
 shell(`<div class="section-head"><div><h1>売上レポート</h1><p>2026/08/01 - 2026/08/13</p></div></div><section class="section card panel"><div class="section-head"><div><h2>販売戦略サマリ</h2><p>重要度順に、次の行動へつながる形で整理しています。</p></div></div>${v21SalesActions.map(a=>`<article class="card sales-action ${doneIds.includes(a.id)?'done':''}"><div><div class="sales-priority">${a.priority}</div><h3>${a.title}</h3><p class="muted">${a.text}</p></div><div class="btn-row"><button class="btn" onclick="toggleSalesAction('${a.id}')">${doneIds.includes(a.id)?'未完了に戻す':'実行済みにする'}</button><button class="btn soft" onclick="runAi('販売分析AI')">AIで改善案</button></div></article>`).join('')}</section><div class="kpi-grid"><button class="card kpi clickable-kpi" onclick="salesMetricModal('revenue')"><span>今月売上</span><b>${yen(s.month)}</b><span class="kpi-hint">詳細 ›</span></button><button class="card kpi clickable-kpi" onclick="salesMetricModal('count')"><span>販売数</span><b>${s.count}</b><span class="kpi-hint">詳細 ›</span></button><button class="card kpi clickable-kpi" onclick="salesMetricModal('favorites')"><span>お気に入り</span><b>${s.favs}</b><span class="kpi-hint">詳細 ›</span></button><button class="card kpi clickable-kpi" onclick="salesMetricModal('cvr')"><span>CVR</span><b>2.6%</b><span class="kpi-hint">詳細 ›</span></button></div><section class="section card panel"><h2>売上推移</h2><div class="chart">${[20,43,35,71,48,67,82,54,69,75,59,88,73,100].map(n=>`<i style="height:${n}%"></i>`).join('')}</div></section>`,{title:'売上レポート',bell:true,cart:false});
};
function toggleSalesAction(id){userData().salesActionsDone??=[];const a=userData().salesActionsDone,i=a.indexOf(id);if(i>=0)a.splice(i,1);else a.push(id);save();render();}
function salesDetailPage(metric){const d=salesMetricData(metric);shell(`<div class="section-head"><div><h1>${d.title} 詳細レポート</h1><p>前月・カテゴリ平均・商品別寄与を確認します。</p></div></div><div class="kpi-grid"><div class="card kpi"><span>現在</span><b>${d.value}</b></div><div class="card kpi"><span>前月</span><b>${d.prev}</b></div><div class="card kpi"><span>変化</span><b>${d.change}</b></div><div class="card kpi"><span>比較</span><b style="font-size:16px">${d.avg}</b></div></div><section class="section card panel"><h2>コンバージョンファネル</h2><div class="quote"><div class="quote-row"><span>商品閲覧</span><b>4,820</b></div><div class="quote-row"><span>お気に入り / カート</span><b>1,245 / 486</b></div><div class="quote-row"><span>購入</span><b>125</b></div></div></section><section class="section card panel"><h2>分析</h2><h3>何が起きたか</h3><p>${d.what}</p><h3>原因候補</h3><p>${d.why}</p><h3>推奨アクション</h3><p>${d.next}</p></section>`,{title:`${d.title}詳細`,back:true,bell:true,cart:false});}

/* AI Studio: category/search/favorites/templates are now functional. */
aiStudio=function(){
 const favs=userData()?.settings?.aiFavorites||[];
 const q=v21AiState.query.toLowerCase();let bots=V21_AI_BOTS.filter(b=>(v21AiState.category==='すべて'||b.category===v21AiState.category)&&(!q||(b.name+b.category+b.desc).toLowerCase().includes(q))&&(!v21AiState.favoritesOnly||favs.includes(b.id)));
 shell(`<div class="section-head"><div><h1>AIスタジオ</h1><p>目的別の専門AIを選んで販売作業を支援します。</p></div><button class="icon-btn" onclick="aiHelp()" aria-label="AIスタジオの使い方">?</button></div><div class="notice demo">AIの回答は模擬結果です。提案→確認→適用の順で反映します。</div><div class="field"><input id="aiStudioSearch" value="${esc(v21AiState.query)}" placeholder="AI名・機能を検索" oninput="v21AiState.query=this.value;render()"></div><button class="btn full ${v21AiState.favoritesOnly?'soft':''}" onclick="v21AiState.favoritesOnly=!v21AiState.favoritesOnly;render()">♡ お気に入りのみ</button><div class="ai-cats" style="margin-top:9px">${V21_AI_CATS.map(x=>`<button class="btn ${v21AiState.category===x?'primary':''}" onclick="v21AiState.category='${x}';render()">${x}</button>`).join('')}</div><div class="ai-grid section">${bots.length?bots.map(b=>`<article class="card ai-card"><button class="icon-btn plain ai-fav" onclick="event.stopPropagation();toggleAiFavorite('${b.id}')" aria-label="AIをお気に入り">${favs.includes(b.id)?'♥':'♡'}</button><div style="font-size:28px">${b.icon}</div><h3>${b.name}</h3><span class="status">${b.category}</span><p class="muted">${b.desc}</p><button class="btn primary" onclick="runAi('${b.name}')">使う</button></article>`).join(''):`<div class="empty ai-empty"><div class="emoji">🤖</div><h2>該当するAIがありません</h2><button class="btn" onclick="v21AiState={category:'すべて',query:'',favoritesOnly:false};render()">条件をクリア</button></div>`}</div>`,{title:'AIスタジオ',back:true,cart:false});
};
function toggleAiFavorite(id){const a=userData().settings.aiFavorites??=[],i=a.indexOf(id);if(i>=0)a.splice(i,1);else a.push(id);save();render();}
const V21_AI_TEMPLATES={improve:'現在の商品情報をもとに、購入者へメリットが伝わる商品ページ改善案を作成してください。',short:'現在の商品情報を、重要な情報を残して短く要約してください。',beginner:'専門用語を避け、初めて購入する人にも分かる説明にしてください。'};
runAi=function(name){
 showModal(`<div class="section-head"><h2>${esc(name)}</h2><button class="icon-btn" onclick="closeModal()">×</button></div><div class="field"><label>テンプレート</label><div class="btn-row" id="aiTpls"><button class="chip" onclick="selectAiTemplate(this,'improve')">商品ページを改善</button><button class="chip" onclick="selectAiTemplate(this,'short')">短く要約</button><button class="chip" onclick="selectAiTemplate(this,'beginner')">初心者向け</button></div></div><div class="field"><label>対象商品</label><select id="aiProduct">${products.filter(p=>p.creatorId===currentUser()?.creatorId).concat(products.slice(0,2)).slice(0,5).map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}</select></div><button class="btn" onclick="useCurrentProductForAi()">現在の商品情報を使う</button><div class="field"><label>入力</label><textarea id="aiInput"></textarea></div><button class="btn primary" id="aiRunBtn" onclick="executeV21Ai('${esc(name)}')">実行（デモ）</button><div id="aiResult" class="notice" style="margin-top:12px">結果はここに表示されます。</div>`);
};
function selectAiTemplate(btn,key){$$('#aiTpls .chip').forEach(x=>x.classList.remove('active'));btn.classList.add('active');$('#aiInput').value=V21_AI_TEMPLATES[key];}
function useCurrentProductForAi(){const p=productBy($('#aiProduct').value);$('#aiInput').value=`商品名：${p.name}\nカテゴリ：${p.category}\n価格：${yen(p.digital)}〜\n説明：${p.description}\nタグ：${p.tags.join('、')}\nこの商品情報をもとに改善案を作成してください。`;}
function executeV21Ai(name){const btn=$('#aiRunBtn');btn.disabled=true;busy('AIを実行しています…');setTimeout(()=>{done();btn.disabled=false;const box=$('#aiResult');if(!box)return;box.innerHTML=`<b>提案</b><p>${esc(name)}の観点では、商品名・用途説明・タグの順で改善すると効果を確認しやすいです。</p><div class="btn-row"><button class="btn" onclick="toast('変更前後を比較表示しました（デモ）')">変更前後を比較</button><button class="btn primary" onclick="toast('商品下書きへ適用しました（デモ）');closeModal()">確認して適用</button><button class="btn" onclick="toast('直前の適用を元に戻しました（デモ）')">元に戻す</button></div>`;},700);}

/* AI design controls and history now persist in the browser demo DB. */
aiDesignPage=function(){
 shell(`<div class="section-head"><div><h1>AIデザインを作る</h1><p>作りたいイメージを文章で入力してください。</p></div><button class="btn" onclick="go('ai-history')">履歴</button></div><div class="notice demo">AI画像生成は公開デモの模擬処理です。</div><div class="field"><label>イメージ</label><textarea id="aiPrompt" maxlength="300" placeholder="宇宙を旅する猫、かわいい、ポップな色合い、ステッカーにしたい"></textarea></div><h3>スタイル</h3><div class="option-grid" id="aiStyles">${['ポップ','シンプル','レトロ','リアル'].map(x=>`<button class="option-btn ${v21AiDesignState.style===x?'active':''}" onclick="chooseAiStyle(this,'${x}')">${x}</button>`).join('')}</div><h3>カラーパレット</h3><div class="btn-row" id="aiPalette">${['#34bca0','#f6bd43','#8a6b50','#ef5966','#7457c8','#2e6cad'].map(c=>`<button class="icon-btn ${v21AiDesignState.palette===c?'active':''}" style="background:${c};${v21AiDesignState.palette===c?'box-shadow:0 0 0 4px var(--primary-2)':''}" onclick="chooseAiPalette(this,'${c}')" aria-label="色を選択"></button>`).join('')}</div><button class="btn primary full" style="margin-top:18px" onclick="generateAi()">生成する ✨</button><section id="aiGenerated" class="section hidden"><h2>生成結果（例）</h2><div class="product-grid" style="--cols:2">${[products[2],products[8],products[0],products[3]].map((p,i)=>`<div class="card">${artHtml(p)}<div class="product-info"><button class="btn full" onclick="saveAiGeneration(${i})">保存</button><button class="btn primary full" style="margin-top:6px" onclick="go('create-sticker')">シールにする</button></div></div>`).join('')}</div></section>`,{title:'AIデザインを作る',back:true,cart:false});
};
function chooseAiStyle(btn,v){v21AiDesignState.style=v;$$('#aiStyles .option-btn').forEach(x=>x.classList.remove('active'));btn.classList.add('active')}
function chooseAiPalette(btn,v){v21AiDesignState.palette=v;$$('#aiPalette .icon-btn').forEach(x=>x.style.boxShadow='');btn.style.boxShadow='0 0 0 4px var(--primary-2)'}
generateAi=function(){const prompt=$('#aiPrompt').value.trim();if(!prompt){toast('作りたいイメージを入力してください');return}busy('AIデザインを生成しています…');setTimeout(()=>{done();const sec=$('#aiGenerated');if(sec)sec.classList.remove('hidden');userData().lastAiDraft={prompt,style:v21AiDesignState.style,palette:v21AiDesignState.palette,date:now()};save();toast('4案を生成しました（デモ）')},900)};
function saveAiGeneration(index){const d=userData(),draft=d.lastAiDraft||{prompt:'デザイン案',style:v21AiDesignState.style,palette:v21AiDesignState.palette};d.aiHistory??=[];d.aiHistory.unshift({id:uid('generation'),generationId:uid('generation'),prompt:draft.prompt,style:draft.style,palette:draft.palette,resultIndex:index,date:now()});save();toast('生成結果を保存しました（デモ）')}
aiHistoryPage=function(){const a=userData().aiHistory||[];shell(`<div class="section-head"><div><h1>AI生成履歴</h1><p>${a.length}件</p></div></div>${a.length?a.map(h=>`<div class="card panel" style="margin:9px 0"><b>${esc(h.prompt)}</b><div class="small muted">${fmtDate(h.date)} ・ ${h.style} ・ ${h.palette}</div><div class="btn-row" style="margin-top:10px"><button class="btn" onclick="reuseAiHistory('${h.id}')">再利用</button><button class="btn" onclick="deleteAiHistory('${h.id}')">削除</button></div></div>`).join(''):`<div class="empty"><div class="emoji">✨</div><h2>生成履歴はまだありません</h2><button class="btn primary" onclick="go('ai-design')">AIデザインを作る</button></div>`}`,{title:'AI生成履歴',back:true,cart:false})};
function reuseAiHistory(id){const h=(userData().aiHistory||[]).find(x=>x.id===id);if(!h)return;userData().aiReuse=h;save();v21AiDesignState={style:h.style,palette:h.palette};go('ai-design');setTimeout(()=>{const t=$('#aiPrompt');if(t)t.value=h.prompt},80)}
function deleteAiHistory(id){confirmAction('生成履歴を削除','この履歴を削除します。','削除',()=>{userData().aiHistory=(userData().aiHistory||[]).filter(x=>x.id!==id);save();render()})}

/* Shop settings now save draft/public state instead of toast-only controls. */
shopManage=function(){
 const c=creatorBy(currentUser().creatorId);db.creator.shop[c.id]??={};const publicS=db.creator.shop[c.id],draft=publicS.draft||{intro:publicS.intro||c.bio,notice:publicS.notice||'',accent:publicS.accent||c.accent,categories:publicS.categories||[],sns:publicS.sns||''};publicS.draft=draft;save();
 shell(`<div class="section-head"><div><h1>ショップ管理</h1><p>下書きを保存してから公開プレビューで確認できます。</p></div></div><div class="field"><label>カバー画像</label><input type="file" accept="image/*"></div><div class="field"><label>ショップアイコン</label><input type="file" accept="image/*"></div><div class="field"><label>テーマカラー</label><input id="shopAccent" type="color" value="${draft.accent}"></div><div class="field"><label>紹介文</label><textarea id="shopIntro">${esc(draft.intro)}</textarea></div><div class="field"><label>お知らせ</label><input id="shopNotice" value="${esc(draft.notice)}"></div><div class="field"><label>ショップカテゴリ</label><div class="option-grid">${CATEGORIES.slice(0,10).map(x=>`<label class="chip"><input class="shopCat" type="checkbox" value="${x[0]}" ${draft.categories.includes(x[0])?'checked':''}> ${x[0]}</label>`).join('')}</div></div><div class="field"><label>SNSリンク</label><input id="shopSns" value="${esc(draft.sns||'')}" placeholder="https://..."></div><div class="shop-savebar"><button class="btn" onclick="saveShopDraft()">下書き保存</button><button class="btn" onclick="saveShopDraft();go('creator/${c.id}')">公開プレビュー</button><button class="btn primary" onclick="publishShop()">公開に反映</button></div>`,{title:'ショップ管理',back:true,cart:false});
};
function collectShopForm(){return{intro:$('#shopIntro').value,notice:$('#shopNotice').value,accent:$('#shopAccent').value,categories:$$('.shopCat:checked').map(x=>x.value),sns:$('#shopSns').value}}
function saveShopDraft(){const c=currentUser().creatorId;db.creator.shop[c].draft=collectShopForm();save();toast('ショップ下書きを保存しました')}
function publishShop(){const c=currentUser().creatorId,v=collectShopForm();db.creator.shop[c]={...db.creator.shop[c],...v,draft:v,publishedAt:now()};save();toast('ショップ設定を公開しました（デモ）')}

/* Theme/background settings now persist visible controls. */
settingsPage=function(){
 const s=userData().settings,bg=s.backgroundPrefs||{opacity:15,blur:0,tile:false,fixed:false,productId:null};const themes=[['light','ライト','#fff'],['dark','ダーク','#17181d'],['blue','ブルー','#eaf2ff'],['pink','ピンク','#fdebf2'],['purple','パープル','#ede6ff'],['charcoal','チャコール','#30333a']];const eligible=(userData().downloads||[]).map(d=>productBy(d.productId));
 shell(`<h1>表示・テーマ設定</h1><p class="muted">テーマはサイト全体、カード、ボタン、背景に適用されます。</p><div class="theme-grid">${themes.map(t=>`<button class="card theme-card" onclick="setTheme('${t[0]}')"><div class="theme-preview" style="background:${t[2]}"></div><b>${t[1]}</b>${s.theme===t[0]?'<span class="status ok">適用中</span>':''}</button>`).join('')}</div><section class="section card panel"><h2>背景デザイン</h2><p class="muted">購入済みデジタル商品のうち、背景利用可能なデザインを候補として扱うデモです。</p><div class="field"><label>背景</label><select id="bgProduct" onchange="previewBackground()"><option value="">無料の標準背景</option>${eligible.map(p=>`<option value="${p.id}" ${bg.productId===p.id?'selected':''}>${p.name}</option>`).join('')}</select></div><div id="bgPreview" class="theme-bg-preview">${bg.productId?artSvg(productBy(bg.productId)):'<span class="muted">標準背景</span>'}</div><div class="field"><label>明度オーバーレイ <span id="bgOpacityLabel">${bg.opacity}%</span></label><input id="bgOpacity" type="range" min="0" max="50" value="${bg.opacity}" oninput="$('#bgOpacityLabel').textContent=this.value+'%'" /></div><div class="field"><label>ぼかし <span id="bgBlurLabel">${bg.blur}px</span></label><input id="bgBlur" type="range" min="0" max="20" value="${bg.blur}" oninput="$('#bgBlurLabel').textContent=this.value+'px'" /></div><label class="chip"><input id="bgTile" type="checkbox" ${bg.tile?'checked':''}> タイル表示</label><label class="chip"><input id="bgFixed" type="checkbox" ${bg.fixed?'checked':''}> 固定表示</label><button class="btn primary full" style="margin-top:14px" onclick="saveBackgroundPrefs()">背景設定を保存</button></section>`,{title:'設定',back:true});
};
function previewBackground(){const id=$('#bgProduct').value;$('#bgPreview').innerHTML=id?artSvg(productBy(id)):'<span class="muted">標準背景</span>'}
function saveBackgroundPrefs(){userData().settings.backgroundPrefs={productId:$('#bgProduct').value||null,opacity:Number($('#bgOpacity').value),blur:Number($('#bgBlur').value),tile:$('#bgTile').checked,fixed:$('#bgFixed').checked};save();toast('背景設定を保存しました')}

/* Admin AI management gets add/edit state instead of toast-only control. */
adminAi=function(){db.admin.aiBots??=V21_AI_BOTS.map(x=>({...x,status:'公開',target:'creator'}));const bots=db.admin.aiBots;adminWorkbench('AIボット管理',`<div class="section-head"><p>管理者のみAIボットの追加・編集・公開状態を変更できます。</p><button class="btn primary" onclick="adminAiModal()">＋ AIボット追加</button></div><div class="table-wrap"><table class="table"><tr><th>botId</th><th>名称</th><th>カテゴリ</th><th>対象</th><th>状態</th><th>操作</th></tr>${bots.map(b=>`<tr><td>${b.id}</td><td>${b.name}</td><td>${b.category}</td><td>${b.target}</td><td>${b.status}</td><td><button class="btn" onclick="adminAiModal('${b.id}')">編集</button></td></tr>`).join('')}</table></div>`,'admin-ai')};
function adminAiModal(id){const b=(db.admin.aiBots||[]).find(x=>x.id===id)||{id:uid('bot'),name:'',category:'商品制作',desc:'',target:'creator',status:'下書き'};showModal(`<div class="section-head"><h2>${id?'AIボット編集':'AIボット追加'}</h2><button class="icon-btn" onclick="closeModal()">×</button></div><div class="field"><label>botId</label><input id="abId" value="${esc(b.id)}" ${id?'disabled':''}></div><div class="field"><label>名称</label><input id="abName" value="${esc(b.name)}"></div><div class="field"><label>カテゴリ</label><select id="abCat">${V21_AI_CATS.slice(1).map(x=>`<option ${b.category===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>説明</label><textarea id="abDesc">${esc(b.desc)}</textarea></div><div class="field"><label>対象</label><select id="abTarget"><option ${b.target==='creator'?'selected':''}>creator</option><option ${b.target==='admin'?'selected':''}>admin</option></select></div><div class="field"><label>状態</label><select id="abStatus"><option ${b.status==='公開'?'selected':''}>公開</option><option ${b.status==='停止'?'selected':''}>停止</option><option ${b.status==='下書き'?'selected':''}>下書き</option></select></div><button class="btn primary" onclick="saveAdminBot('${id||''}')">保存</button>`)}
function saveAdminBot(oldId){const v={id:oldId||$('#abId').value.trim(),name:$('#abName').value.trim(),category:$('#abCat').value,desc:$('#abDesc').value,target:$('#abTarget').value,status:$('#abStatus').value};if(!v.id||!v.name){toast('botIdと名称は必須です');return}db.admin.aiBots??=[];const i=db.admin.aiBots.findIndex(x=>x.id===oldId);if(i>=0)db.admin.aiBots[i]={...db.admin.aiBots[i],...v};else db.admin.aiBots.push(v);db.admin.audit??=[];db.admin.audit.unshift({date:now(),userId:currentUser().id,action:oldId?'AIボット編集':'AIボット追加',before:oldId||'—',after:v.id,source:'AIボット管理'});save();closeModal();render();}

/* Keep busy UI from getting stranded after route changes/reloads. */
window.addEventListener('hashchange',()=>{done();setTimeout(enhanceV21,0)});
window.addEventListener('pageshow',()=>done());
setTimeout(enhanceV21,0);
