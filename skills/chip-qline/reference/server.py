"""Local classroom workbench. Snowyowl credentials never leave this process."""
from pathlib import Path
from functools import lru_cache
from threading import Thread, Lock
from contextlib import asynccontextmanager
import contextlib, io, json, re, random, os
from datetime import date, timedelta
from typing import Literal
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).parent
state = {'ready': False, 'message': '正在連接雪鴞並載入歷史資料…', 'date': None}
api = None
names = {}
matrix_lock = Lock()
FIELDS = {
 'open': ('日_K','Open'), 'high': ('日_K','High'), 'low': ('日_K','Low'),
 'close': ('日_K','Close'), 'volume': ('日_K','Volume'),
 'foreign': ('日_三大法人','外資買賣超張數'),
 'trust': ('日_三大法人','投信買賣超張數'),
 'dealer': ('日_三大法人','自營買賣超張數'),
 'main': ('日_三大法人','主力買賣超張數'),
 'margin': ('日_融資券','融資增減_張'),
 'short': ('日_融資券','融券增減_張'),
 'borrow': ('日_融資券','借券賣出餘額_張'),
 'concentration': ('其他_籌碼集中','籌碼集中度_20日'),
}

@lru_cache(maxsize=20)
def matrix(key):
    with matrix_lock:
        t,f=FIELDS[key]
        df=pd.DataFrame(api.MSMP.get(t,f)).copy()
        df.columns=df.columns.astype(str)
        df.index=pd.to_datetime(df.index.astype(str))
        return df.loc[~df.index.duplicated(keep='last')].sort_index()

def connect():
    global api, names
    try:
        # Vendor diagnostics can contain account identifiers; discard them.
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            import snowyowl as so
            user,pwd=os.getenv('SNOWYOWL_USER'),os.getenv('SNOWYOWL_PASSWORD')
            if not (user and pwd):
                lines=(Path.home()/'.snowyowl/chip-qline.credentials').read_text(encoding='utf-8-sig').strip().splitlines()
                user,pwd=[x.replace('：',':').split(':',1)[-1].strip() for x in lines[:2]]
            api=so.login(user,pwd)
        if not hasattr(api,'MSMP'):
            raise RuntimeError('No MSMP')
        df=matrix('close')
        if hasattr(api,'Data'):
            try:
                info=api.Data.get('上市櫃/ETF清單(含當沖限制)')
                names=dict(zip(info['股票代號'].astype(str),info['股票名稱'].astype(str)))
            except Exception:
                pass
        for k in ['foreign','trust','main']:
            matrix(k)
        state.update(ready=True, message='雪鴞歷史資料已連線',date=str(df.index[-1].date()))
    except Exception as e:
        state.update(ready=False,message='雪鴞連線未完成（'+type(e).__name__+'）。可重試連線或切換教學示範。')

@asynccontextmanager
async def lifespan(app):
    Thread(target=connect,daemon=True).start()
    yield

app=FastAPI(lifespan=lifespan)
app.mount('/static',StaticFiles(directory=ROOT/'static'),name='static')

@app.get('/')
def index(): return FileResponse(ROOT/'static/index.html')

@app.get('/api/status')
def status(): return {**state,'version':'0.1.1'}

@app.post('/api/reconnect')
def reconnect():
    if '正在' not in state['message']:
        state.update(ready=False,message='正在重新連接雪鴞…')
        matrix.cache_clear()
        Thread(target=connect,daemon=True).start()
    return state

def require_live():
    if not state['ready']: raise HTTPException(503,state['message'])

def finite(x):
    try: return round(float(x),4) if np.isfinite(float(x)) else None
    except (ValueError,TypeError): return None

def demo(code):
    labels={'2330':'台積電','2317':'鴻海','2454':'聯發科','2308':'台達電','2382':'廣達','3231':'緯創','2345':'智邦','3711':'日月光投控'}
    rng=random.Random(int(code)); rows=[]; p=100+int(code)%500
    d=date(2026,3,2)
    while len(rows)<160:
        if d.weekday()<5:
            o=p+rng.uniform(-4,4);p=max(10,o+rng.uniform(-7,8))
            rows.append(dict(date=str(d),open=round(o,2),high=round(max(o,p)+rng.uniform(1,5),2),low=round(min(o,p)-rng.uniform(1,5),2),close=round(p,2),volume=rng.randint(3000,50000),foreign=rng.randint(-4000,5000),trust=rng.randint(-1500,2200),main=rng.randint(-3000,4000),dealer=rng.randint(-500,800),margin=rng.randint(-800,900),short=rng.randint(-200,200),borrow=rng.randint(1000,30000),concentration=round(rng.uniform(-8,15),2)))
        d+=timedelta(days=1)
    return {'code':code,'name':labels.get(code,'示範個股'),'rows':rows,'mode':'demo','warnings':[]}

@app.get('/api/stock/{code}')
def stock(code:str,mode:Literal['live','demo']='live'):
    if not re.fullmatch(r'\d{4,6}',code): raise HTTPException(400,'請輸入 4–6 碼股票代號')
    if mode=='demo': return demo(code)
    require_live()
    close=matrix('close')
    if code not in close.columns: raise HTTPException(404,'查無此股票代號')
    dates=close[code].dropna().index[-250:]
    data=pd.DataFrame(index=dates); warnings=[]
    for k in FIELDS:
        try:
            m=matrix(k)
            data[k]=m[code].reindex(dates) if code in m else np.nan
        except Exception:
            data[k]=np.nan;warnings.append(k)
    rows=[{'date':str(i.date()),**{k:finite(v) for k,v in r.items()}} for i,r in data.iterrows()]
    return {'code':code,'name':names.get(code,code),'mode':'live','rows':rows,'warnings':warnings}

@app.get('/api/screen')
def screen(mode:Literal['live','demo']='live',rules:str='foreign',days:int=Query(3,ge=1,le=20),min_volume:int=Query(1000,ge=0),asof:str=''):
    selected=[r for r in rules.split(',') if r]
    if not selected or any(r not in ['foreign','trust','main','breakout'] for r in selected):
        raise HTTPException(400,'請至少選擇一項有效策略')
    if mode=='demo':
        allstocks=[demo(c) for c in ['2330','2317','2454','2308','2382','3231','2345','3711']]
        if asof and not re.fullmatch(r'\d{4}-\d{2}-\d{2}',asof): raise HTTPException(400,'日期格式錯誤')
        out=[]
        for s in allstocks:
            rows=[r for r in s['rows'] if not asof or r['date']<=asof]
            if len(rows)<max(days,21):continue
            r=rows[-1]
            ok=r['volume']>=min_volume and all(all(x[k]>0 for x in rows[-days:]) if k!='breakout' else r['close']>max(x['close'] for x in rows[-21:-1]) for k in selected)
            if ok: out.append(summary(s['code'],s['name'],r,rows[-2]['close']))
        return {'stocks':out,'date':min(asof,allstocks[0]['rows'][-1]['date']) if asof else allstocks[0]['rows'][-1]['date'],'mode':'demo','scanned':8}
    require_live()
    close=matrix('close')
    try:
        cut=pd.Timestamp(asof) if asof else close.index[-1]
    except Exception: raise HTTPException(400,'日期格式錯誤')
    eligible=close.loc[:cut]
    if len(eligible)<max(21,days):raise HTTPException(400,'所選日期缺少足夠歷史資料')
    dt=eligible.index[-1]; codes=[c for c in close.columns if re.fullmatch('[1-9][0-9]{3}',c)]
    volume=matrix('volume').reindex(index=close.index,columns=codes)
    mask=close.loc[dt,codes].notna() & (volume.loc[dt]>=min_volume)
    fields={}
    for key in selected:
        if key=='breakout':
            mask &= eligible.loc[:,codes].iloc[-1]>eligible.loc[:,codes].iloc[-21:-1].max()
        else:
            m=matrix(key).reindex(index=close.index,columns=codes)
            window=m.loc[:dt].tail(days)
            mask &= (window>0).all() & (window.notna().sum()==days)
            fields[key]=m
    out=[]
    for c in mask[mask].index:
        r={'date':str(dt.date()),'close':close.at[dt,c],'volume':volume.at[dt,c]}
        for k in ['foreign','trust','main']:
            m=fields.get(k)
            if m is None:m=matrix(k)
            r[k]=m.at[dt,c] if dt in m.index and c in m.columns else None
        prev=eligible[c].dropna()
        out.append(summary(c,names.get(c,c),r,prev.iloc[-2] if len(prev)>1 else None))
    out.sort(key=lambda x:x['volume'] or 0,reverse=True)
    return {'stocks':out,'date':str(dt.date()),'mode':'live','scanned':len(codes)}

def summary(code,name,r,prev):
    p=finite(prev);c=finite(r['close'])
    return {'code':code,'name':name,'close':c,'change':finite((c/p-1)*100) if p and c else None,**{k:finite(r.get(k)) for k in ['volume','foreign','trust','main']}}
