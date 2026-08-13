/* Sticker Market v2.1.1 — stabilization patch */

/* Avoid whole-page rerender on each AI Studio keystroke so Safari keeps input focus. */
aiStudio=function(){
 const favs=userData()?.settings?.aiFavorites||[];
 const q=(v21AiState.query||'').toLowerCase();
 let bots=V21_AI_BOTS.filter(b=>(v21AiState.category==='すべて'||b.category===v21AiState.category)&&(!q||(b.name+b.category+b.desc).toLowerCase().includes(q))&&(!v21AiState.favoritesOnly||favs.includes(b.id)));
 shell(`<div class="section-head"><div><h1>AIスタジオ</h1><p>目的別の専門AIを選んで販売作業を支援します。</p></div><button class="icon-btn" onclick="aiHelp()" aria-label="AIスタジオの使い方">?</button></div><div class="notice demo">AIの回答は模擬結果です。提案→確認→適用の順で反映します。</div><div class="field"><input id="aiStudioSearch" value="${esc(v21AiState.query||'')}" placeholder="AI名・機能を検索" oninput="aiStudioQuickFilter(this.value)"></div><button class="btn full ${v21AiState.favoritesOnly?'soft':''}" onclick="v21AiState.favoritesOnly=!v21AiState.favoritesOnly;render()">♡ お気に入りのみ</button><div class="ai-cats" style="margin-top:9px">${V21_AI_CATS.map(x=>`<button class="btn ${v21AiState.category===x?'primary':''}" onclick="v21AiState.category='${x}';render()">${x}</button>`).join('')}</div><div id="aiStudioGrid" class="ai-grid section">${bots.length?bots.map(b=>`<article class="card ai-card" data-ai-id="${b.id}" data-ai-search="${esc((b.name+' '+b.category+' '+b.desc).toLowerCase())}"><button class="icon-btn plain ai-fav" onclick="event.stopPropagation();toggleAiFavorite('${b.id}')" aria-label="AIをお気に入り">${favs.includes(b.id)?'♥':'♡'}</button><div style="font-size:28px">${b.icon}</div><h3>${b.name}</h3><span class="status">${b.category}</span><p class="muted">${b.desc}</p><button class="btn primary" onclick="runAi('${b.name}')">使う</button></article>`).join(''):`<div class="empty ai-empty"><div class="emoji">🤖</div><h2>該当するAIがありません</h2><button class="btn" onclick="v21AiState={category:'すべて',query:'',favoritesOnly:false};render()">条件をクリア</button></div>`}</div>`,{title:'AIスタジオ',back:true,cart:false});
};

function aiStudioQuickFilter(value){
 v21AiState.query=value;
 const q=value.trim().toLowerCase();
 const cards=$$('#aiStudioGrid .ai-card');
 let visible=0;
 cards.forEach(card=>{const hit=!q||(card.dataset.aiSearch||'').includes(q);card.hidden=!hit;if(hit)visible++});
 let empty=$('#aiStudioQuickEmpty');
 if(!visible){
  if(!empty){empty=document.createElement('div');empty.id='aiStudioQuickEmpty';empty.className='empty ai-empty';empty.innerHTML='<div class="emoji">🤖</div><h2>該当するAIがありません</h2><p class="muted">別のキーワードを試してください。</p>';$('#aiStudioGrid')?.appendChild(empty)}
 }else empty?.remove();
}

/* v2.js performs its first render before the v2.1 overrides are loaded. Re-render once after all patches load. */
setTimeout(()=>{done();render()},0);
