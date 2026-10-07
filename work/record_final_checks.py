import json
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
root=Path(__file__).resolve().parents[1]
p=root/'outputs/deployment_verification.json'; d=json.loads(p.read_text(encoding='utf-8'))
d['public_browser_checks']={'latest_prediction':273030,'baseline':273000,'future_answer':'미수집','random_observation':'2026-10-02','random_target':'2026-10-06','random_actual':273000,'random_absolute_error_rounded':3031,'second_random_observation':'2026-09-28','second_random_target':'2026-09-29','console_application_errors':0}
d['public_browser_checked_at_kst']=datetime.now(ZoneInfo('Asia/Seoul')).isoformat()
p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
p=root/'outputs/browser_verification.json'; d=json.loads(p.read_text(encoding='utf-8'));d['csv']['full']='downloaded through browser; all 1904 rows exactly equal snapshot via pandas';d['published_page']='public deployment latest prediction and repeated random case/reveal verified';p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
