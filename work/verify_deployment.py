import json,hashlib
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
import requests
ROOT=Path(__file__).resolve().parents[1]
base='https://jhs512.github.io/samsung-100day-prediction-lab/'
checks=[]
for name in ['index.html','samsung_daily.csv','source.json']:
    local=(ROOT/'outputs'/name).read_bytes()
    response=requests.get(base+name,timeout=40)
    response.raise_for_status()
    assert response.content==local,(name,len(response.content),len(local))
    checks.append(dict(file=name,status=response.status_code,bytes=len(local),sha256=hashlib.sha256(local).hexdigest(),exact_match=True))
report=dict(checked_at_kst=datetime.now(ZoneInfo('Asia/Seoul')).isoformat(),url=base,checks=checks)
(ROOT/'outputs/deployment_verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
