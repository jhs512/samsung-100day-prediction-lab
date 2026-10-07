import json
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'outputs/source.json'
d=json.loads(p.read_text(encoding='utf-8'))
d['quality']['calendar_raw_missing']=d['quality']['calendar_missing']
d['quality']['holiday_resolutions']=[{'date':'2026-06-03','reason':'전국동시지방선거일','source':'https://www.nec.go.kr/site/nec/main.do'},{'date':'2026-07-17','reason':'제헌절 공휴일','source':'https://www.kpx.or.kr/board.es?act=view&bid=0045&list_no=77692&mid=a10502000000&nPage=1&tag='}]
d['quality']['holiday_market_notice']='https://stock.mk.co.kr/news/disclosure/template/1029043'
d['quality']['calendar_unexplained_missing']=[]
d['quality']['calendar_note']='XKRX 4.13.2 달력의 2개 차이는 지방선거일·제헌절 공휴일로 확인. 정부 공휴일과 KRX 휴장 규칙 적용 시 설명되지 않은 결측 0개. 보간 없음.'
q=d['quote_snapshot']['datas'][0]
prior=float(q['closePriceRaw'])-float(q['compareToPreviousClosePriceRaw'])
d['quality']['quote_previous_close_crosscheck']={'implied_previous_close':prior,'daily_api_last_close':273000,'difference':273000-prior,'note':'네이버 현재가 응답의 전일 대비 값으로 역산한 전일값 272,000원과 일별 API 273,000원 차이 1,000원. 시장·집계·조정 정의의 차이를 공급자 설명으로 확정하지 못함. 종가 원장의 진위를 확정하는 검증은 아님; 모델은 일별 API만 일관 사용.'}
d['definition_limitation']='네이버 일별 API의 종가 필드 예측. KRX/NXT 집계 및 수정주가 정의가 응답에 명시되지 않아 거래소 공식 종가와 동일함을 보장하지 않음.'
p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
