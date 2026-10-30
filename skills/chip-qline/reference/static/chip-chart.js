/* TradingView Lightweight Charts 5.2.1 adapter. All panes share one time scale. */
class ChipChart {
 static panels=[['price','日 K 線','MA5 / MA20 / MA60',240],['volume','成交量','張',75],['foreign','外資','每日買賣超／張',80],['trust','投信','每日買賣超／張',80],['main','主力','每日買賣超／張',80],['margin','融資','每日增減／張',75],['short','融券','每日增減／張',75],['borrow','借券','賣出餘額／張',75]];
 constructor(container,onHover,onRange){this.container=container;this.onHover=onHover;this.onRange=onRange;this.chart=null;this.rows=[];}
 clear(){if(this.chart){this.chart.remove();this.chart=null;}this.rows=[];this.container.replaceChildren();}
 setData(rows,period){
  this.clear();this.rows=rows;
  if(!rows.length){this.container.innerHTML='<div class="chart-wait">所選日期沒有此股的歷史資料</div>';return;}
  if(!window.LightweightCharts)throw Error('圖表套件載入失敗，請重新整理頁面。');
  const L=window.LightweightCharts;
  const host=document.createElement('div');host.className='tradingview-host';host.setAttribute('role','img');host.setAttribute('aria-label','TradingView K 線與七個籌碼副圖，共用時間軸，可拖曳及縮放');this.container.append(host);
  this.chart=L.createChart(host,{
   autoSize:true,
   layout:{background:{type:L.ColorType.Solid,color:'#ffffff'},textColor:'#8491a6',fontSize:10,fontFamily:'Microsoft JhengHei, sans-serif',attributionLogo:true,panes:{separatorColor:'#e6ecf3',separatorHoverColor:'#9eafe7',enableResize:true}},
   grid:{vertLines:{visible:false},horzLines:{color:'#f0f3f7'}},
   rightPriceScale:{borderColor:'#e8edf4',minimumWidth:76},
   timeScale:{borderColor:'#e4e9ef',timeVisible:false,secondsVisible:false,fixLeftEdge:true,fixRightEdge:true,lockVisibleTimeRangeOnResize:true},
   crosshair:{mode:L.CrosshairMode.Normal,vertLine:{color:'#8d9cb5',width:1,style:L.LineStyle.Dashed,labelBackgroundColor:'#53678d'},horzLine:{color:'#a5b0c4',labelBackgroundColor:'#53678d'}},
   localization:{locale:'zh-TW',dateFormat:'yyyy/MM/dd'},
   handleScroll:{mouseWheel:true,pressedMouseMove:true,horzTouchDrag:true,vertTouchDrag:false},
   handleScale:{mouseWheel:true,pinch:true,axisPressedMouseMove:true,axisDoubleClickReset:true}
  });
  const common={lastValueVisible:false,priceLineVisible:false};
  const candles=this.chart.addSeries(L.CandlestickSeries,{...common,upColor:'#e44f58',downColor:'#159979',wickUpColor:'#e44f58',wickDownColor:'#159979',borderVisible:false,priceFormat:{type:'price',precision:2,minMove:.01}},0);
  candles.setData(rows.map(r=>[r.open,r.high,r.low,r.close].every(Number.isFinite)?{time:r.date,open:r.open,high:r.high,low:r.low,close:r.close}:{time:r.date}));
  [5,20,60].forEach((n,j)=>{
   const line=this.chart.addSeries(L.LineSeries,{...common,color:['#d5a245','#5b86c8','#a07ac5'][j],lineWidth:1,crosshairMarkerVisible:false},0);
   line.setData(rows.map((r,i)=>{const window=rows.slice(Math.max(0,i-n+1),i+1);return i>=n-1&&window.every(x=>Number.isFinite(x.close))?{time:r.date,value:window.reduce((a,b)=>a+b.close,0)/n}:{time:r.date};}));
  });
  ChipChart.panels.slice(1).forEach(([key,title,desc,height],index)=>{
   const paneIndex=index+1,isBorrow=key==='borrow';
   const series=this.chart.addSeries(isBorrow?L.LineSeries:L.HistogramSeries,{...common,priceFormat:{type:'custom',minMove:1,formatter:v=>Number(v).toLocaleString('zh-TW',{maximumFractionDigits:0})},...(isBorrow?{color:'#7b8eae',lineWidth:2,crosshairMarkerVisible:true}:{base:0})},paneIndex);
   series.setData(rows.map(r=>Number.isFinite(r[key])?{time:r.date,value:r[key],...(isBorrow?{}:{color:key==='volume'?'#9db6d2':r[key]>=0?'#e44f58':'#159979'})}:{time:r.date}));
   if(!isBorrow&&key!=='volume')series.createPriceLine({price:0,color:'#cfd7e3',lineWidth:1,lineStyle:L.LineStyle.Dashed,axisLabelVisible:false});
   series.priceScale().applyOptions({scaleMargins:{top:.32,bottom:.1}});
  });
  candles.priceScale().applyOptions({scaleMargins:{top:.15,bottom:.1}});
  const totalHeight=ChipChart.panels.reduce((sum,p)=>sum+p[3],0);
  this.chart.panes().forEach((pane,i)=>pane.setStretchFactor(ChipChart.panels[i][3]/totalHeight));
  // Pane DOM is created during the chart's first animation frame.
  const currentChart=this.chart;
  requestAnimationFrame(()=>{
   if(this.chart!==currentChart)return;
   this.chart.panes().forEach((pane,i)=>{
    const [key,title,desc]=ChipChart.panels[i],el=pane.getHTMLElement();
    if(!el)return;el.style.position='relative';
    const label=document.createElement('div');label.className='pane-legend';label.innerHTML=`<strong>${title}</strong><span>${desc}</span><b id="val-${key}" class="current">—</b>`;el.append(label);
   });
   this.setPeriod(period);this.onHover(rows.length-1,false);
  });
  this.rowIndex=new Map(rows.map((r,i)=>[r.date,i]));
  this.chart.subscribeCrosshairMove(p=>{
   const t=typeof p.time==='string'?p.time:p.time&&typeof p.time==='object'?`${p.time.year}-${String(p.time.month).padStart(2,'0')}-${String(p.time.day).padStart(2,'0')}`:null;
   const i=this.rowIndex.get(t);this.onHover(i===undefined?rows.length-1:i,i!==undefined);
  });
  this.chart.timeScale().subscribeVisibleLogicalRangeChange(range=>{
   if(!range)return;const first=Math.max(0,Math.ceil(range.from)),last=Math.min(rows.length-1,Math.floor(range.to));
   if(last>=first)this.onRange(rows[first].date,rows[last].date,last-first+1);
  });
  this.setPeriod(period);this.onHover(rows.length-1,false);
 }
 setPeriod(period){if(!this.chart||!this.rows.length)return;this.chart.timeScale().setVisibleLogicalRange({from:Math.max(-.5,this.rows.length-period-.5),to:this.rows.length-.5});}
 zoom(factor){if(!this.chart)return;const scale=this.chart.timeScale(),r=scale.getVisibleLogicalRange();if(!r)return;const span=Math.max(10,Math.min(this.rows.length,(r.to-r.from)*factor));scale.setVisibleLogicalRange({from:Math.max(-.5,r.to-span),to:r.to});}
}
