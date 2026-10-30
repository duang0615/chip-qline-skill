const $=id=>document.getElementById(id);
const num=(v,d=0)=>v==null?'—':Number(v).toLocaleString('zh-TW',{maximumFractionDigits:d});
const signed=(v,d=0)=>v==null?'—':`${v>0?'+':''}${num(v,d)}`;
const tone=v=>v==null?'':v>0?'up':v<0?'down':'';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let source='live', stock=null, results=[], period=65, visible=[], hoverIndex=-1, requestId=0, screenId=0, cutoff='', ready=false, initialLoaded=false;
const ruleNames={foreign:'外資連續買超',trust:'投信連續買超',main:'主力連續買超',breakout:'收盤突破前 20 日高點'};
async function api(path,options){const r=await fetch(path,options);const x=await r.json();if(!r.ok)throw Error(typeof x.detail==='string'?x.detail:'資料查詢失敗');return x;}
function banner(s,error=false){$('banner').textContent=s;$('banner').classList.toggle('error',error);}
function selectedRules(){return [...document.querySelectorAll('.rule input:checked')].map(e=>e.value);}
function settings(open){$('settings').hidden=!open;$('toggle-settings').setAttribute('aria-expanded',String(open));$('toggle-settings').innerHTML=`策略條件 <span>${open?'收合 −':'調整條件 ＋'}</span>`;}
$('toggle-settings').onclick=()=>settings($('settings').hidden);
function describe(){const rules=selectedRules();$('rule-description').textContent=rules.length?rules.map(k=>k==='breakout'?ruleNames[k]:ruleNames[k].replace('連續',`連續 ${$('days').value} 個交易日`)).join('，且')+`；當日成交量至少 ${num($('min-volume').value)} 張。`:'請勾選至少一項策略。';}
document.querySelectorAll('.rules input,#days,#min-volume').forEach(e=>e.addEventListener('change',describe));
async function status(){
 try{const s=await api('/api/status');ready=s.ready;
 if(source==='live'){$('status').textContent=s.ready?`雪鴞已連線 · ${s.date}`:s.message;$('status-dot').style.background=s.ready?'#159979':'#e4a13e';}
 if(s.ready&&!initialLoaded&&source==='live'){initialLoaded=true;$('asof').value=s.date;banner(`資料已就緒，最新交易日 ${s.date}。請啟動左側選股策略。`);await loadStock('2330');}
 if(!s.ready&&source==='live')banner(s.message,!s.message.includes('正在'));
 }catch(e){if(source==='live')banner('本機服務無法連接，請重新啟動「啟動籌碼Q線」。',true);}
}
setInterval(status,5000);status();
$('run').onclick=async()=>{
 const rules=selectedRules();if(!rules.length){banner('請至少勾選一項策略。',true);return;}
 if(!$('min-volume').checkValidity()){banner('最低成交量請輸入大於或等於 0 的數字。',true);return;}
 const token=++screenId;const mode=source;$('run').disabled=true;$('run').textContent='正在掃描股池…';banner('正在依條件比對股票資料，首次執行可能需要下載資料。');
 try{const q=new URLSearchParams({mode,rules:rules.join(','),days:$('days').value,min_volume:$('min-volume').value,asof:$('asof').value});const s=await api('/api/screen?'+q);
 if(token!==screenId||mode!==source)return;
 results=s.stocks;cutoff=s.date;$('count').textContent=results.length;$('export').disabled=!results.length;$('filter').value='';settings(false);renderResults();
 banner(`${mode==='demo'?'【模擬資料】':''}${s.date} · 掃描 ${num(s.scanned)} 檔，${results.length} 檔符合條件。結果依成交量排序。`);
 if(results.length)await loadStock(results[0].code);else{if(stock)draw();banner(`${s.date} · 沒有個股符合目前條件，可調整天數或條件後重試。${source==='demo'?'（模擬資料）':''}`);}
 }catch(e){if(token===screenId)banner(e.message,true);}
 finally{if(token===screenId){$('run').disabled=false;$('run').textContent='▶　啟動選股策略';}}
};
function renderResults(){const q=$('filter').value.trim();const list=results.filter(s=>`${s.code}${s.name}`.includes(q));$('results').innerHTML=list.length?list.map(s=>`<button class="result ${stock?.code===s.code?'active':''}" data-code="${esc(s.code)}"><span><b>${esc(s.name)}</b><small>${esc(s.code)} · ${num(s.volume)} 張</small></span><span class="result-price"><b>${num(s.close,2)}</b><small class="${tone(s.change)}">${signed(s.change,2)}%</small></span></button>`).join(''):`<div class="empty"><span>⌕</span><b>${results.length?'沒有相符的搜尋結果':'目前沒有符合訊號的個股'}</b><p>可調整條件，再啟動一次策略。</p></div>`;document.querySelectorAll('.result').forEach(b=>b.onclick=()=>loadStock(b.dataset.code));}
$('filter').oninput=renderResults;
async function loadStock(code){const token=++requestId;const mode=source;$('symbol').value=code;$('charts').style.opacity='.45';try{const s=await api(`/api/stock/${encodeURIComponent(code)}?mode=${mode}`);if(token!==requestId||mode!==source)return;stock=s;renderResults();draw();if(s.warnings.length)banner(`部分籌碼欄位未取得：${s.warnings.join('、')}；缺值顯示為「—」。`,true);}catch(e){if(token===requestId)banner(e.message,true);}finally{if(token===requestId)$('charts').style.opacity='1';}}
$('search-form').onsubmit=e=>{e.preventDefault();cutoff=$('asof').value;loadStock($('symbol').value.trim());};
$('mode').onchange=async()=>{source=$('mode').value;++requestId;++screenId;stock=null;chartView.clear();results=[];cutoff='';$('count').textContent='—';$('export').disabled=true;$('run').disabled=false;$('run').textContent='▶　啟動選股策略';$('charts').innerHTML='<div class="chart-wait">正在準備資料…</div>';['stock-name','stock-price','stock-change','main-net','ohlc','data-range','hover-date'].forEach(k=>$(k).textContent='—');$('metrics').innerHTML='';$('stock-code').textContent='等待資料';renderResults();
 if(source==='demo'){$('status').textContent='教學示範 · 模擬資料';$('status-dot').style.background='#e4a13e';$('source-tag').textContent='模擬資料';$('asof').value='';banner('目前為教學示範模式：價格、籌碼與選股結果皆為模擬資料。');await loadStock('2330');}
 else{$('source-tag').textContent='雪鴞歷史資料';initialLoaded=false;status();}
};
$('retry').onclick=async()=>{try{initialLoaded=false;await api('/api/reconnect',{method:'POST'});status();}catch(e){banner(e.message,true);}};
$('export').onclick=()=>{const keys=['code','name','close','change','volume','foreign','trust','main'];const rows=[['觀察日期','資料來源','股票代號','名稱','收盤價','漲跌幅(%)','成交量(張)','外資買賣超(張)','投信買賣超(張)','主力買賣超(張)'],...results.map(s=>[cutoff,source==='live'?'雪鴞':'模擬',...keys.map(k=>s[k]??'')])];const csv='\uFEFF'+rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');const u=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download=`籌碼Q線_${source}_${cutoff}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
$('help-btn').onclick=()=>$('help').showModal();$('close-help').onclick=()=>$('help').close();$('focus-btn').onclick=()=>{document.body.classList.toggle('projector');};
document.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>{period=+b.dataset.period;document.querySelectorAll('[data-period]').forEach(x=>x.classList.toggle('selected',x===b));chartView.setPeriod(period);});
document.addEventListener('keydown',e=>{if(!['ArrowUp','ArrowDown'].includes(e.key)||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)||$('help').open)return;const btns=[...document.querySelectorAll('.result')];if(!btns.length)return;e.preventDefault();let i=btns.findIndex(b=>b.dataset.code===stock?.code);i=Math.max(0,Math.min(btns.length-1,i+(e.key==='ArrowDown'?1:-1)));btns[i].click();btns[i].scrollIntoView({block:'nearest'});});
const panelSpecs=ChipChart.panels;
const chartView=new ChipChart($('charts'),updateHover,(first,last,count)=>{
 $('data-range').textContent=`${first} — ${last} · ${count} 根`;
});
$('zoom-in').onclick=()=>chartView.zoom(.75);
$('zoom-out').onclick=()=>chartView.zoom(1.3333);
$('reset-chart').onclick=()=>chartView.setPeriod(period);
function draw(){
 if(!stock)return;
 visible=stock.rows.filter(r=>!cutoff||r.date<=cutoff);
 $('stock-name').textContent=stock.name;$('stock-code').textContent=stock.code;$('source-tag').textContent=source==='live'?'雪鴞歷史資料':'模擬資料';
 const last=visible.at(-1),prev=visible.at(-2);
 $('stock-price').textContent=num(last?.close,2);
 const pct=prev?.close&&last?.close?(last.close/prev.close-1)*100:null;
 $('stock-change').textContent=pct==null?'—':`${signed(pct,2)}%`;$('stock-change').className=tone(pct);$('stock-price').className=tone(pct);
 if(!last){['data-range','hover-date','ohlc','main-net','snapshot-date'].forEach(k=>$(k).textContent='—');$('metrics').innerHTML='';}
 chartView.setData(visible,period);
}
function updateHover(i,show){
 const r=visible[i];if(!r)return;hoverIndex=i;
 $('hover-date').textContent=r.date;
 $('ohlc').textContent=`開 ${num(r.open,2)}　高 ${num(r.high,2)}　低 ${num(r.low,2)}　收 ${num(r.close,2)}`;
 panelSpecs.forEach(([key])=>{const el=$('val-'+key);if(!el)return;el.textContent=key==='price'?num(r.close,2):key==='volume'||key==='borrow'?num(r[key]):signed(r[key]);el.className='current '+(['price','volume','borrow'].includes(key)?'':tone(r[key]));});
 $('snapshot-date').textContent=`${r.date} · ${show?'游標所在交易日':'最新資料交易日'}`;
 $('main-net').textContent=signed(r.main);$('main-net').className=tone(r.main);
 const fields=[['外資買賣超','foreign',' 張'],['投信買賣超','trust',' 張'],['自營商買賣超','dealer',' 張'],['融資增減','margin',' 張'],['融券增減','short',' 張'],['20 日籌碼集中度','concentration','%']];
 $('metrics').innerHTML=fields.map(([label,k,unit])=>`<div><span>${label}</span><b class="${tone(r[k])}">${signed(r[k],k==='concentration'?2:0)}${r[k]==null?'':unit}</b></div>`).join('');
}
describe();
