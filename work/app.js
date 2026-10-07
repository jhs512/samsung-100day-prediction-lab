'use strict';
const D=JSON.parse(document.getElementById('experiment-data').textContent), CSV=__CSV__;
const el=id=>document.getElementById(id), won=n=>Math.round(n).toLocaleString('ko-KR')+'원', num=n=>n.toLocaleString('ko-KR',{minimumFractionDigits:2,maximumFractionDigits:2}), pct=n=>(n*100).toFixed(3)+'%';
// PURE_PREDICT_BEGIN
function predict(closes){
  const m=D.model;
  if(closes.length!==100||!closes.every(v=>Number.isFinite(v)&&v>0))throw new Error('100개의 양수 종가가 필요합니다');
  const latest=closes[99], x=m.representation==='raw'?closes:closes.map(v=>v/latest-1);
  const y=m.intercept+x.reduce((s,v,i)=>s+(v-m.mean[i])/m.scale[i]*m.coef[i],0);
  return m.representation==='raw'?y:latest*(1+y);
}
// PURE_PREDICT_END
const parityCases=D.test_rows.concat([D.latest,D.ten_ago],D.recent_cases);
const parity=Math.max(...parityCases.map(r=>Math.abs(predict(r.closes)-r.prediction)));
if(!Number.isFinite(parity)||parity>1e-7)throw new Error('Python / JavaScript 수치 불일치');
window.LAB={predict,parity,parityCases:parityCases.length};
const labels=['질문·계획','데이터','100일 입력','시간순 분할','모델 비교','미사용 시험','예측 체험'];let step=0;
labels.forEach((l,i)=>{const b=document.createElement('button');b.textContent=`0${i+1} ${l}`;b.onclick=()=>show(i);el('nav').appendChild(b)});
function show(n){step=n;labels.forEach((_,i)=>{el('s'+i).hidden=i!==n;el('nav').children[i].setAttribute('aria-current',i===n?'step':'false')});el('progress').textContent=`${n+1} / 7`;el('prev').disabled=n===0;el('next').disabled=n===6;el('next').textContent=n===6?'실험 완료':`다음: ${labels[n+1]}`;window.scrollTo({top:0,behavior:'instant'});if(n===5)requestAnimationFrame(drawComparison)}
el('prev').onclick=()=>show(Math.max(0,step-1));el('next').onclick=()=>show(Math.min(6,step+1));el('jumpDemo').onclick=()=>show(6);
document.addEventListener('keydown',e=>{if(['SELECT','INPUT','TEXTAREA','BUTTON'].includes(e.target.tagName))return;if(e.key==='ArrowRight')show(Math.min(6,step+1));if(e.key==='ArrowLeft')show(Math.max(0,step-1))});
function chart(id,dates,values,{relative=false,title='실제 종가',color='#245fd4'}={}){
  const w=window.innerWidth<=720?320:600,h=235,L=relative?60:76,R=18,T=22,B=38;let lo=Math.min(...values),hi=Math.max(...values),pad=Math.max((hi-lo)*.1,relative?.005:100);lo-=pad;hi+=pad;
  const x=i=>L+i*(w-L-R)/Math.max(1,dates.length-1), y=v=>T+(hi-v)*(h-T-B)/(hi-lo);
  let out=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}"><title>${title}</title><text x="${L}" y="13">${relative?'관측일 대비 (%)':'원'}</text>`;
  for(let k=0;k<3;k++){const v=lo+(hi-lo)*k/2,yy=y(v);out+=`<line x1="${L}" x2="${w-R}" y1="${yy}" y2="${yy}" stroke="#e2e7ed"/><text x="${L-9}" y="${yy+4}" text-anchor="end">${relative?(v*100).toFixed(1):Math.round(v).toLocaleString('ko-KR')}</text>`}
  out+=`<polyline fill="none" stroke="${color}" stroke-width="2.4" points="${values.map((v,i)=>`${x(i)},${y(v)}`).join(' ')}"/>`;
  [0,Math.floor((dates.length-1)/2),dates.length-1].forEach((i,k)=>out+=`<text x="${x(i)}" y="${h-13}" text-anchor="${k===0?'start':k===2?'end':'middle'}">${dates[i]}</text>`);
  el(id).innerHTML=out+'</svg>';
}
const src=D.source,q=src.quote_snapshot.datas?.[0],cross=src.quality.cross_provider,chosen=D.experiments.find(e=>e.name===D.selected_learned), bv=D.baseline.validation,bt=D.baseline.test;
const kpi=(label,value,note='')=>`<div class="metric"><div class="label">${label}</div><div class="big">${value}</div><p class="small" style="margin-top:9px">${note}</p></div>`;
el('dataLead').innerHTML=`${src.start} ~ ${src.end} · ${src.rows.toLocaleString()}거래일.<br>조회 ${src.retrieved_at.slice(0,19).replace('T',' ')} KST · 10월 7일 장중 자료 제외.`;
chart('overview',D.daily.map(r=>r.date),D.daily.map(r=>r.close),{title:'2019년부터 2026년 10월 6일까지 공급자 실제 일별 종가'});
el('dataKpis').innerHTML=kpi('마지막 완료 관측일',src.end,'네이버 일별 API 기준')+kpi('마지막 종가',won(D.latest.baseline),'수정주가 여부 확인 불가')+kpi('원자료 품질','결측·중복 0','2개 달력 차이는 지방선거·제헌절 휴장으로 확인');
el('qualityNote').innerHTML=`<strong>공급자 차이를 숨기지 않습니다.</strong> Yahoo 대조: 누락 ${cross.yahoo_missing_dates.length}일, 종가 불일치 ${cross.different_closes.length}일. 최신 일별 API ${won(D.latest.baseline)}, Yahoo ${won(cross.different_closes.find(r=>r.date===src.end)?.yahoo||D.latest.baseline)}. 네이버 현재가의 전일 대비로 역산한 전일값도 ${won(src.quality.quote_previous_close_crosscheck.implied_previous_close)}으로 다릅니다.<br>이 실험은 <strong>네이버 일별 API 종가 필드</strong>를 일관되게 예측합니다. KRX/NXT 집계·수정주가 정의를 확정하지 못했으며 거래소 공식 원장과 동일하다고 보장하지 않습니다.`;
el('sourceDetails').innerHTML=`<p><a href="${src.url}" target="_blank" rel="noopener">네이버 일별 시세 원응답</a> · <a href="${src.yahoo_url}" target="_blank" rel="noopener">Yahoo 대조 원응답</a> · <a href="${src.session_source}" target="_blank" rel="noopener">KRX 거래시간·휴장 규칙</a></p><p>${src.adjustment}</p><p>${src.source_choice}</p><p>${src.quality.calendar_note}</p><p><a href="https://www.nec.go.kr/site/nec/main.do" target="_blank" rel="noopener">선관위 지방선거일</a> · <a href="https://www.kpx.or.kr/board.es?act=view&bid=0045&list_no=77692&mid=a10502000000&nPage=1&tag=" target="_blank" rel="noopener">전력거래소 제헌절 공휴일 반영</a> · <a href="https://stock.mk.co.kr/news/disclosure/template/1029043" target="_blank" rel="noopener">KRX 휴장 공시 사본</a></p>`;
el('qualityDetails').textContent=JSON.stringify(src.quality,null,2);
const wd=D.daily.slice(-100).map(r=>r.date);
chart('rawWindow',wd,D.latest.closes,{title:'최신 기준까지의 실제 100거래일 종가 입력'});
chart('relativeWindow',wd,D.latest.closes.map(v=>v/D.latest.baseline-1),{relative:true,color:'#077968',title:'동일한 100일을 관측일 대비 상대가격으로 표현'});
el('windowDates').textContent=`예시 창: ${D.latest.window_start} ~ ${D.latest.date} (정확히 100개), 예측 대상: ${D.latest.target_date}.`;
[['trainCount','train'],['validCount','validation'],['testCount','test']].forEach(([id,key])=>{const p=D.partitions[key];el(id).textContent=`${p.n}개 예측 사례 · 정답 ${p.target_start} ~ ${p.target_end}`});
el('boundaries').textContent=D.boundary_removed.map(r=>`${r.observation} → ${r.target}`).join(' / ');
const repName=r=>r==='raw'?'종가 100개':'상대가격 100개';
el('validTable').innerHTML=`<tr><td>기준 · 내일도 오늘 종가</td><td class="num">${num(bv.mae)}</td><td class="num">${num(bv.rmse)}</td><td class="num">학습 없음</td></tr>`+D.experiments.map(e=>`<tr class="${e.name===D.selected_learned?'modelrow':''}"><td>${repName(e.representation)} / ${e.name.split(' / ')[1]}${e.name===D.selected_learned?' · 선택':''}</td><td class="num">${num(e.validation.mae)}</td><td class="num">${num(e.validation.rmse)}</td><td class="num">${e.nonzero_coefficients}/100</td></tr>`).join('');
el('selectionNote').innerHTML=`<strong>선택: 상대가격 Lasso α=0.001.</strong> 검증 MAE ${num(chosen.validation.mae)}원, 기준 ${num(bv.mae)}원. 개선 ${num(bv.mae-chosen.validation.mae)}원 (${((bv.mae-chosen.validation.mae)/bv.mae*100).toFixed(3)}%). 차이는 1원 미만입니다. 통계적·실용적 우위는 확인하지 못했습니다.`;
el('formula').textContent=`예측 = 오늘 종가 × (1 + ${pct(D.model.intercept)})`;
el('testLead').innerHTML=`선택을 고정한 뒤 ${D.partitions.test.n}개 다음날 예측을 평가했습니다.<br>정답 기간 ${D.partitions.test.target_start} ~ ${D.partitions.test.target_end}. 미래 정답은 포함하지 않습니다.`;
el('testKpis').innerHTML=kpi('기준 MAE',won(bt.mae),'RMSE '+won(bt.rmse))+kpi('선택 모델 MAE',won(chosen.test.mae),'RMSE '+won(chosen.test.rmse))+kpi('평균 오차 감소',num(bt.mae-chosen.test.mae)+'원',((bt.mae-chosen.test.mae)/bt.mae*100).toFixed(3)+'% · 투자 유효성 미확인');
el('lagNote').innerHTML=`<strong>실제 가격을 한 거래일 늦게 따라갑니다.</strong> 모델 예측은 이전 종가와 평균 ${num(D.lag_diagnostic.prediction_vs_previous_close_mae)}원 차이지만, 다음 실제 종가와는 평균 ${num(chosen.test.mae)}원 차이입니다. 큰 급등·급락을 미리 맞힌 모습이 아닙니다.<br>학습 창의 가격 범위 ${won(D.train_price_range[0])}~${won(D.train_price_range[1])}에 비해 최신 가격 수준이 크게 바뀌었습니다. 차트를 시간 이동해 성적을 좋게 보이게 하지 않습니다.`;
el('testTable').innerHTML=D.experiments.map(e=>`<tr class="${e.name===D.selected_learned?'modelrow':''}"><td>${e.name}${e.name===D.selected_learned?' · 고정 선택':''}</td><td class="num">${num(e.test.mae)}</td><td class="num">${num(e.test.rmse)}</td></tr>`).join('');
let compareRows=D.test_rows.slice(),compareIndex=compareRows.length-1,comparePinned=false,geo=null;
function comparisonDetail(announce=true){const r=compareRows[compareIndex];el('comparescrub').value=String(compareIndex);el('comparescrub').setAttribute('aria-valuetext',`${r.target_date} 실제 ${won(r.actual)}, 예측 ${won(r.prediction)}`);el('comparedetail').setAttribute('aria-live',announce?'polite':'off');el('comparedetail').innerHTML=`<div class="compare-date">예측 대상 ${r.target_date} <span class="small">· ${r.date}까지 관측${comparePinned?' · 선택 고정':''}</span></div><div class="compare-values"><div><span>실제 종가</span><strong>${won(r.actual)}</strong></div><div><span>모델 예측</span><strong>${won(r.prediction)}</strong></div><div><span>모델 절대오차</span><strong>${won(Math.abs(r.prediction-r.actual))}</strong></div><div><span>기준 절대오차</span><strong>${won(Math.abs(r.baseline-r.actual))}</strong></div></div>`;if(!geo)return;const xx=geo.x(compareIndex);el('compare-guide').setAttribute('x1',xx);el('compare-guide').setAttribute('x2',xx);[['actual',r.actual],['prediction',r.prediction],['baseline',r.baseline]].forEach(([n,v])=>{const p=el('compare-dot-'+n);if(p){p.setAttribute('cx',xx);p.setAttribute('cy',geo.y(v))}})}
function drawComparison(){
 const box=el('comparisonChart'),w=box.clientWidth;if(w<200)return;const h=w<500?285:345,L=76,R=16,T=20,B=53,showBase=el('comparebaseline').checked;
 const series=[{name:'actual',values:compareRows.map(r=>r.actual),color:'#245fd4',dash:''},{name:'prediction',values:compareRows.map(r=>r.prediction),color:'#b05c14',dash:'7 4'}];if(showBase)series.push({name:'baseline',values:compareRows.map(r=>r.baseline),color:'#8393a3',dash:'2 4'});
 const vals=series.flatMap(s=>s.values),low=Math.min(...vals),high=Math.max(...vals),pad=Math.max((high-low)*.1,100),lo=low-pad,hi=high+pad;
 const x=i=>L+i*(w-L-R)/(compareRows.length-1),y=v=>T+(hi-v)*(h-T-B)/(hi-lo);geo={x,y,w,L,R};
 let svg=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="2026년 실제 종가와 다음날 예측 비교"><title>같은 예측 대상일에 정렬한 실제·모델·기준 종가</title><text x="${L}" y="12">종가 (원)</text>`;
 for(let k=0;k<4;k++){const v=lo+(hi-lo)*k/3,yy=y(v);svg+=`<line x1="${L}" x2="${w-R}" y1="${yy}" y2="${yy}" stroke="#dde5ed"/><text x="${L-9}" y="${yy+4}" text-anchor="end">${Math.round(v).toLocaleString('ko-KR')}</text>`}
 series.forEach(s=>svg+=`<polyline fill="none" stroke="${s.color}" stroke-width="${s.name==='baseline'?1.5:2.4}" ${s.dash?`stroke-dasharray="${s.dash}"`:''} points="${s.values.map((v,i)=>`${x(i)},${y(v)}`).join(' ')}"/>`);
 svg+=`<line id="compare-guide" y1="${T}" y2="${h-B}" stroke="#6b7d90" stroke-dasharray="3 4"/>`;series.forEach(s=>svg+=`<circle id="compare-dot-${s.name}" r="4.5" fill="${s.color}" stroke="white" stroke-width="1.5"/>`);
 const ticks=w<500?3:6;for(let k=0;k<ticks;k++){const i=Math.round(k*(compareRows.length-1)/(ticks-1));svg+=`<text x="${x(i)}" y="${h-B+23}" text-anchor="${k===0?'start':k===ticks-1?'end':'middle'}">${compareRows[i].target_date.slice(5).replace('-','/')}</text>`}
 svg+=`<text x="${(L+w-R)/2}" y="${h-4}" text-anchor="middle">예측 대상일 (2026년)</text><rect id="compare-hit" x="${L}" y="${T}" width="${w-L-R}" height="${h-T-B}" fill="transparent" style="cursor:crosshair"/></svg>`;
 // Use a Korean axis label; all values are aligned by target date.
 box.innerHTML=svg;
 const fromPointer=e=>{const b=box.querySelector('svg').getBoundingClientRect(),px=(e.clientX-b.left)*w/b.width;compareIndex=Math.max(0,Math.min(compareRows.length-1,Math.round((px-L)/(w-L-R)*(compareRows.length-1))))};
 el('compare-hit').onpointermove=e=>{if(!comparePinned&&e.pointerType!=='touch'){fromPointer(e);comparisonDetail(false)}};el('compare-hit').onclick=e=>{fromPointer(e);comparePinned=!comparePinned;comparisonDetail()};el('baselinelegend').hidden=!showBase;comparisonDetail(false);
}
el('compareperiod').onchange=()=>{const v=el('compareperiod').value;compareRows=v==='all'?D.test_rows.slice():D.test_rows.slice(-Number(v));compareIndex=compareRows.length-1;comparePinned=false;el('comparescrub').max=compareRows.length-1;drawComparison()};
el('comparebaseline').onchange=drawComparison;el('comparescrub').max=compareRows.length-1;el('comparescrub').oninput=()=>{compareIndex=Number(el('comparescrub').value);comparePinned=true;comparisonDetail()};el('unpin').onclick=()=>{comparePinned=false;comparisonDetail()};window.addEventListener('resize',()=>{if(step===5)drawComparison()});
let caseMode='latest',caseRow=D.latest,caseStage='input',lastRandom=-1;
function randomRow(){let i;do{i=Math.floor(Math.random()*D.recent_cases.length)}while(i===lastRandom);lastRandom=i;return D.recent_cases[i]}
function setCase(mode){caseMode=mode;caseRow=mode==='latest'?D.latest:mode==='ten'?D.ten_ago:randomRow();caseStage='input';['Latest','Ten','Random'].forEach(n=>el('mode'+n).setAttribute('aria-pressed',mode===n.toLowerCase()?'true':'false'));el('caseHeader').innerHTML=`<h3>${mode==='latest'?'최신 완료 관측일 기준':mode==='ten'?'정확히 10거래일 전':'무작위 과거 사례'}</h3><p class="mono">관측일 <strong>${caseRow.date}</strong> → 예측 대상 <strong>${caseRow.target_date}</strong></p>`;const dates=D.daily.slice(caseRow.index-99,caseRow.index+1).map(r=>r.date);chart('caseChart',dates,caseRow.closes,{title:`${caseRow.window_start}부터 ${caseRow.date}까지 실제 100거래일 입력`});el('caseResult').innerHTML='<p class="small">100일 그래프를 확인한 뒤 예측 버튼을 누르세요.</p>';el('predictButton').disabled=false;el('revealButton').disabled=true;el('revealButton').hidden=mode==='latest';el('randomAgain').hidden=mode!=='random';el('caseNote').textContent=`입력 ${caseRow.window_start} ~ ${caseRow.date} · 정확히 100거래일. `+(mode==='latest'?'이 snapshot에는 다음 종가 정답이 미수집입니다.':mode==='ten'?'최신 완료 관측일에서 배열 인덱스로 10거래일 뒤로 이동했습니다.':'최신 완료 관측일 직전의 10거래일 중, 다음 종가가 있는 사례를 균등 무작위로 선택합니다. 같은 사례의 연속 선택만 방지합니다.');window.LAB.case={mode:caseMode,date:caseRow.date,target_date:caseRow.target_date,window:caseRow.closes.length,stage:caseStage}}
function displayPrediction(reveal=false){const p=predict(caseRow.closes);el('caseResult').innerHTML=`<div class="result-grid"><div><span class="label">학습 모델 예측</span><strong>${won(p)}</strong><span class="small">원 미만 표시 반올림</span></div><div><span class="label">내일도 오늘 종가 기준</span><strong>${won(caseRow.baseline)}</strong><span class="small">학습 없이 예측</span></div><div><span class="label">실제 ${caseRow.target_date} 종가</span><strong>${reveal?won(caseRow.actual):caseMode==='latest'?'미수집':'정답 숨김'}</strong><span class="small">${reveal?'공급자 관측값':caseMode==='latest'?'미래 정답을 만들지 않음':'버튼으로 정답 공개'}</span></div></div>`+(reveal?`<div class="note">모델 절대오차 <strong>${won(Math.abs(p-caseRow.actual))}</strong> · 기준 절대오차 <strong>${won(Math.abs(caseRow.baseline-caseRow.actual))}</strong><br>모델 오차 (예측 − 실제): ${num(p-caseRow.actual)}원</div>`:'');caseStage=reveal?'revealed':'predicted';window.LAB.case.stage=caseStage}
el('modeLatest').onclick=()=>setCase('latest');el('modeTen').onclick=()=>setCase('ten');el('modeRandom').onclick=()=>setCase('random');el('randomAgain').onclick=()=>setCase('random');el('predictButton').onclick=()=>{displayPrediction();el('predictButton').disabled=true;el('revealButton').disabled=caseMode==='latest'};el('revealButton').onclick=()=>{displayPrediction(true);el('revealButton').disabled=true};
el('snapshotNote').innerHTML=`<strong>제작 시점 snapshot</strong> · 최신 완료 관측 ${src.end} → 다음 거래일 ${src.next_session}. 페이지는 자동 갱신하지 않습니다.<br>` +(q?`참고 장중 현재가 ${q.closePrice}원 · ${q.localTradedAt.slice(0,19).replace('T',' ')} KST · 공급자 상태 ${q.marketStatus}. <strong>이 값은 종가 모델에 대입하지 않았습니다.</strong>`:'장중 시세 미확보.');
el('parityNote').textContent=`Python / JavaScript: 최종 시험 ${D.test_rows.length}개 + 최신·10일 전·최근 랜덤 입력 전체, 총 ${parityCases.length}회 대조. 최대 절대차 ${parity.toExponential(2)}원 (허용 0.0000001원).`;
el('versionNote').textContent='실행 버전: '+Object.entries(D.versions).map(([k,v])=>k+' '+v).join(' / ')+'. 표준화·계수 적합 마지막 정답일 '+D.model.fit_target_end;
el('modeldetail').textContent=JSON.stringify(D.model,null,2);
function download(name,content,type='text/csv;charset=utf-8'){const a=document.createElement('a'),u=URL.createObjectURL(new Blob([content],{type}));a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000)}
el('fullCsv').onclick=()=>download('samsung_daily.csv','\uFEFF'+CSV);
el('recentCsv').onclick=()=>download('samsung_recent100.csv','\uFEFF'+CSV.split('\n').filter((_,i,a)=>i===0||i>=a.length-101).join('\n'));
el('caseCsv').onclick=()=>download(`samsung_100days_${caseRow.date}.csv`,'\uFEFFdate,close\n'+D.daily.slice(caseRow.index-99,caseRow.index+1).map(r=>r.date+','+r.close).join('\n')+'\n');
el('jsondownload').onclick=()=>download('experiment_results.json',JSON.stringify(D,null,2),'application/json');
setCase('latest');show(0);
window.addEventListener('resize',()=>{
 chart('overview',D.daily.map(r=>r.date),D.daily.map(r=>r.close),{title:'2019년부터 최신 완료 관측일까지 실제 일별 종가'});
 chart('rawWindow',wd,D.latest.closes,{title:'최신 기준까지 실제 100거래일 입력'});
 chart('relativeWindow',wd,D.latest.closes.map(v=>v/D.latest.baseline-1),{relative:true,color:'#077968',title:'동일한 100일의 상대가격'});
 chart('caseChart',D.daily.slice(caseRow.index-99,caseRow.index+1).map(r=>r.date),caseRow.closes,{title:`${caseRow.window_start}부터 ${caseRow.date}까지 실제 100거래일 입력`});
});
