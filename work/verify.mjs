import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=fs.readFileSync('outputs/index.html','utf8');
const D=JSON.parse(html.match(/<script id="experiment-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const code=html.split('// PURE_PREDICT_BEGIN')[1].split('// PURE_PREDICT_END')[0];
const ctx=vm.createContext({D}); vm.runInContext(code,ctx);
const rows=[...D.test_rows,D.latest,D.ten_ago,...D.recent_cases];
let max=0;
for(const r of rows){
 assert.equal(r.closes.length,100);
 assert.deepEqual(r.closes,D.daily.slice(r.index-99,r.index+1).map(x=>x.close));
 assert.equal(r.window_start,D.daily[r.index-99].date);
 assert.equal(r.date,D.daily[r.index].date);
 assert.equal(r.baseline,r.closes[99]);
 if(r.actual!==null){assert.equal(r.actual,D.daily[r.index+1].close);assert.equal(r.target_date,D.daily[r.index+1].date)}
 max=Math.max(max,Math.abs(ctx.predict(r.closes)-r.prediction));
}
assert(max<=1e-7);
assert.equal(D.latest.index-D.ten_ago.index,10);
assert.equal(D.ten_ago.date,'2026-09-17');
assert.equal(D.latest.actual,null);
assert.equal(D.recent_cases.length,10);
assert.equal(D.model.fit_target_end,'2024-12-30');
const lock=JSON.parse(fs.readFileSync('outputs/selection_lock.json','utf8'));
assert(!lock.validation_results.some(e=>'test' in e));
assert.equal(lock.selected,D.selected_learned);
const chosen=D.experiments.find(e=>e.name===D.selected_learned);
const mae=D.test_rows.reduce((s,r)=>s+Math.abs(r.prediction-r.actual),0)/D.test_rows.length;
assert(Math.abs(mae-chosen.test.mae)<1e-7);
const app=html.split('<script>')[1].split('</script>')[0];new vm.Script(app);
const csv=JSON.parse(app.match(/CSV=(".*?");\r?\n/)[1]);
const recent=csv.split('\n').filter((_,i,a)=>i===0||i>=a.length-101).join('\n');
assert.equal(recent.trim().split('\n').length,101);
assert.equal(recent.trim().split('\n')[1].split(',')[0],D.latest.window_start);
assert.equal(recent.trim().split('\n').at(-1).split(',')[0],D.latest.date);
const report={checked_at:new Date().toISOString(),cases:rows.length,max_python_js_absolute_difference_won:max,test_mae_recalculated:mae,all_windows_match_snapshot:true,ten_sessions_before:D.ten_ago.date,latest_target:D.latest.target_date,latest_answer:null,selection_lock_contains_no_test_metrics:true,csv_recent_rows:100,javascript_syntax:'passed'};
fs.writeFileSync('outputs/numerical_verification.json',JSON.stringify(report,null,2));console.log(report);
