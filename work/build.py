import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
template=(ROOT/'work/template.html').read_text(encoding='utf-8')
css=(ROOT/'work/base.css').read_text(encoding='utf-8')
data=(ROOT/'outputs/experiment_results.json').read_text(encoding='utf-8')
csv=(ROOT/'outputs/samsung_daily.csv').read_text(encoding='utf-8-sig')
app=(ROOT/'work/app.js').read_text(encoding='utf-8').replace('__CSV__',json.dumps(csv,ensure_ascii=False))
html=template.replace('__STYLE__',css).replace('__DATA__',data.replace('</',r'<\/')).replace('__SCRIPT__',app)
assert not re.search(r'__(?:STYLE|DATA|SCRIPT|CSV)__',html)
(ROOT/'outputs/index.html').write_text(html,encoding='utf-8')
print('HTML bytes',len(html.encode('utf-8')))
