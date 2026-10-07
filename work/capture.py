import ast, json, hashlib, traceback
from pathlib import Path
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import requests
import pandas as pd
import exchange_calendars as xc

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs'
now=datetime.now(ZoneInfo('Asia/Seoul'))
assert now.date().isoformat()=='2026-10-07', now
today=now.strftime('%Y%m%d')
url=f'https://api.finance.naver.com/siseJson.naver?symbol=005930&requestType=1&startTime=20190101&endTime={today}&timeframe=day'
s=requests.Session(); s.headers['User-Agent']='Mozilla/5.0'
r=s.get(url,timeout=60); r.raise_for_status()
(OUT/'naver_raw.txt').write_text(r.text,encoding='utf-8')
rows=ast.literal_eval(r.text.strip())[1:]
df=pd.DataFrame(rows,columns=['date','open','high','low','close','volume','foreign_ratio'])
df['date']=pd.to_datetime(df.date,format='%Y%m%d').dt.strftime('%Y-%m-%d')
excluded=df[df.date>=now.date().isoformat()].to_dict('records') if now.hour<15 or (now.hour==15 and now.minute<30) else []
if excluded: df=df[df.date<now.date().isoformat()]
df=df[df.date<=now.date().isoformat()].sort_values('date').reset_index(drop=True)
assert df.notna().all().all() and df.date.is_unique and (df.close>0).all()
assert ((df.low<=df.close)&(df.close<=df.high)&(df.low<=df.open)&(df.open<=df.high)).all()
df.to_csv(OUT/'samsung_daily.csv',index=False,encoding='utf-8-sig')
cal=xc.get_calendar('XKRX',start='2019-01-01',end='2026-12-31')
sessions=cal.sessions_in_range(df.date.min(),df.date.max()).strftime('%Y-%m-%d').tolist()
missing=sorted(set(sessions)-set(df.date)); extra=sorted(set(df.date)-set(sessions))
last=pd.Timestamp(df.date.iloc[-1]); nxt=cal.next_session(last).strftime('%Y-%m-%d')
p1=int(datetime(2019,1,1,tzinfo=ZoneInfo('Asia/Seoul')).timestamp())
p2=int((now.replace(hour=0,minute=0,second=0,microsecond=0)+timedelta(days=1)).timestamp())
yu=f'https://query1.finance.yahoo.com/v8/finance/chart/005930.KS?period1={p1}&period2={p2}&interval=1d'
cross={}
try:
    yr=s.get(yu,timeout=60); yr.raise_for_status(); yj=yr.json()
    (OUT/'yahoo_raw.json').write_text(json.dumps(yj),encoding='utf-8')
    j=yj['chart']['result'][0]; q=j['indicators']['quote'][0]
    yd={datetime.fromtimestamp(t,ZoneInfo('Asia/Seoul')).strftime('%Y-%m-%d'):c for t,c in zip(j['timestamp'],q['close']) if c is not None}
    nd=dict(zip(df.date,df.close))
    differences=[dict(date=d,naver=float(c),yahoo=float(yd[d])) for d,c in nd.items() if d in yd and abs(c-yd[d])>0.01]
    cross=dict(yahoo_missing_dates=sorted(set(nd)-set(yd)),yahoo_extra_dates=sorted(d for d in set(yd)-set(nd) if d<=df.date.max()),different_closes=differences,matched_close_rows=sum(d in yd and abs(c-yd[d])<=.01 for d,c in nd.items()),status='downloaded')
except Exception as e: cross=dict(status='unavailable',error=str(e))
liveurl='https://polling.finance.naver.com/api/realtime/domestic/stock/005930'
try:
    lr=s.get(liveurl,timeout=30); lr.raise_for_status(); live=lr.json(); (OUT/'quote_snapshot.json').write_text(json.dumps(live,ensure_ascii=False,indent=2),encoding='utf-8')
except Exception as e: live={'error':str(e)}
meta=dict(symbol='005930',provider='네이버 증권 일별 시세 API',url=url,yahoo_url=yu,quote_url=liveurl,retrieved_at=now.isoformat(),retrieval_finished_at=datetime.now(ZoneInfo('Asia/Seoul')).isoformat(),market_status='정규장 마감 전: 오늘 자료 제외',excluded_intraday_rows=excluded,start=df.date.min(),end=df.date.max(),rows=len(df),next_session=nxt,adjustment='응답에 수정주가 플래그 없음: 공급자 조정 여부 확인 불가. API 종가 그대로 사용, 자체 배당·분할 조정 없음. Yahoo 비조정 Close와 대조.',quality=dict(null_cells=int(df.isna().sum().sum()),duplicate_dates=int(df.date.duplicated().sum()),calendar_library='exchange_calendars '+xc.__version__,calendar_missing=missing,calendar_extra=extra,calendar_note='XKRX 라이브러리 달력 대조는 보조 확인이며 공식 거래소 원장과 동일하다는 보장은 없음',ohlc_valid=True,cross_provider=cross),quote_snapshot=live,session_source='https://regulation.krx.co.kr/contents/RGL/03/03010100/RGL03010100T1.jsp',source_choice='네이버 단일 시계열 사용. 공급자 차이 날짜는 보존하고 서로 섞거나 보간하지 않음.',csv_sha256=hashlib.sha256((OUT/'samsung_daily.csv').read_bytes()).hexdigest())
(OUT/'source.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:meta[k] for k in ['retrieved_at','start','end','rows','next_session','excluded_intraday_rows']},ensure_ascii=False))
print(json.dumps(meta['quality'],ensure_ascii=False))
print(json.dumps(live,ensure_ascii=False)[:2500])
