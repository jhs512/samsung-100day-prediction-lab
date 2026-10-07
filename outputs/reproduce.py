"""Offline: python reproduce.py. Reads frozen plan and CSV, no downloads.
Install versions from requirements.txt. Model selection precedes test scoring.
All coefficients/scalers fit ONLY 2020-2024. No final refit.
"""
import json, hashlib, platform, warnings
from pathlib import Path
import numpy as np
import pandas as pd
import sklearn
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.exceptions import ConvergenceWarning

ROOT=Path(__file__).resolve().parent
plan=json.loads((ROOT/'experiment_plan.json').read_text(encoding='utf-8'))
source=json.loads((ROOT/'source.json').read_text(encoding='utf-8'))
df=pd.read_csv(ROOT/'samsung_daily.csv')
assert df.date.is_unique and df.date.is_monotonic_increasing and df.notna().all().all()
assert df.date.max()==source['end'] and df.date.max()<='2026-10-06'
assert hashlib.sha256((ROOT/'samsung_daily.csv').read_bytes()).hexdigest()==source['csv_sha256']
prices=df.close.to_numpy(dtype=float); dates=df.date.to_numpy(); W=plan['window']
idx=np.arange(W-1,len(df)-1)
X=np.array([prices[i-W+1:i+1] for i in idx]); y=prices[idx+1]; current=X[:,-1]
obs=dates[idx]; targets=dates[idx+1]
train=(obs>='2020-01-01')&(obs<'2025-01-01')&(targets<'2025-01-01')
valid=(obs>='2025-01-01')&(obs<'2026-01-01')&(targets<'2026-01-01')
test=(obs>='2026-01-01')&(targets<=source['end'])
assert not np.any(train&valid|train&test|valid&test)
assert targets[train].max()<obs[valid].min() and targets[valid].max()<obs[test].min()
def score(mask,p):
    yy=y[mask]; cc=current[mask]
    return dict(mae=float(mean_absolute_error(yy,p)),rmse=float(np.sqrt(mean_squared_error(yy,p))),direction_accuracy=float(np.mean(np.sign(p-cc)==np.sign(yy-cc))),n=int(mask.sum()))
experiments=[]; fitted={}; all_predictions={}
for rep in ['raw','relative']:
    xx=X if rep=='raw' else X/current[:,None]-1
    yy=y if rep=='raw' else y/current-1
    sc=StandardScaler().fit(xx[train])
    assert int(sc.n_samples_seen_)==int(train.sum())
    candidates=[('LinearRegression',LinearRegression())]
    candidates += [(f'Ridge alpha={a}',Ridge(alpha=a)) for a in [1,100]]
    candidates += [(f'Lasso alpha={a:g}',Lasso(alpha=a,max_iter=200000,tol=1e-8)) for a in ([1,100] if rep=='raw' else [1e-5,1e-3])]
    for title,est in candidates:
        name=f'{rep} / {title}'
        with warnings.catch_warnings(record=True) as ws:
            warnings.simplefilter('always',ConvergenceWarning)
            est.fit(sc.transform(xx[train]),yy[train])
        if any(issubclass(w.category,ConvergenceWarning) for w in ws): raise RuntimeError(f'Nonconvergence {name}')
        pv=est.predict(sc.transform(xx[valid]))
        if rep=='relative': pv=current[valid]*(1+pv)
        experiments.append(dict(name=name,representation=rep,validation=score(valid,pv),nonzero_coefficients=int(np.count_nonzero(est.coef_)),iterations=None if getattr(est,'n_iter_',None) is None else int(est.n_iter_)))
        fitted[name]=(sc,est,rep)
# FREEZE choice before any access to test predictions or metrics.
selected=min(experiments,key=lambda e:e['validation']['mae'])['name']
bv=score(valid,current[valid])
recommendation=selected if min(e['validation']['mae'] for e in experiments)<bv['mae'] else '내일도 오늘 종가'
lock=dict(selected=selected,recommendation=recommendation,selection_period='2025',validation_baseline=bv,validation_results=experiments)
(ROOT/'selection_lock.json').write_text(json.dumps(lock,ensure_ascii=False,indent=2),encoding='utf-8')
for e in experiments:
    sc,est,rep=fitted[e['name']]; xx=X if rep=='raw' else X/current[:,None]-1
    p=est.predict(sc.transform(xx[test]))
    if rep=='relative': p=current[test]*(1+p)
    e['test']=score(test,p); all_predictions[e['name']]=p
sc,est,rep=fitted[selected]
model=dict(name=selected,representation=rep,mean=sc.mean_.tolist(),scale=sc.scale_.tolist(),coef=est.coef_.tolist(),intercept=float(est.intercept_),window=W,order='oldest to newest',fit_start=obs[train].min(),fit_target_end=targets[train].max())
def make_row(i):
    c=prices[i-W+1:i+1]; xx=c if rep=='raw' else c/c[-1]-1
    pred=float(est.predict(sc.transform([xx]))[0]); pred=pred if rep=='raw' else float(c[-1]*(1+pred))
    return dict(index=int(i),date=dates[i],window_start=dates[i-W+1],closes=c.tolist(),prediction=pred,baseline=float(c[-1]),target_date=dates[i+1] if i+1<len(df) else source['next_session'],actual=float(prices[i+1]) if i+1<len(df) else None)
test_rows=[make_row(int(i)) for i in idx[test]]
latest=make_row(len(df)-1); ten_ago=make_row(len(df)-11)
recent=[make_row(i) for i in range(len(df)-11,len(df)-1)]
assert latest['index']-ten_ago['index']==10
assert len(recent)==10 and all(r['actual'] is not None for r in recent)
def partition(mask):
    return dict(n=int(mask.sum()),start=obs[mask].min(),end=obs[mask].max(),target_start=targets[mask].min(),target_end=targets[mask].max())
bound=[dict(observation=a,target=b) for a,b in zip(obs,targets) if a[:4]!=b[:4] and a[:4] in ['2019','2024','2025']]
chosen=next(e for e in experiments if e['name']==selected)
p=all_predictions[selected]; actual=y[test]; base=current[test]
lag_diagnostic=dict(same_date_mae=float(np.mean(np.abs(p-actual))),prediction_vs_previous_close_mae=float(np.mean(np.abs(p-base))),next_actual_vs_previous_close_mae=float(np.mean(np.abs(actual-base))),note='예측이 이전 종가와 가까운지 확인하는 기술통계. 시간 이동으로 성적을 재산정하거나 모델을 선택하지 않음.')
result=dict(plan=plan,source=source,versions=dict(python=platform.python_version(),numpy=np.__version__,pandas=pd.__version__,sklearn=sklearn.__version__),partitions={k:partition(m) for k,m in [('train',train),('validation',valid),('test',test)]},boundary_removed=bound,baseline=dict(validation=bv,test=score(test,base)),experiments=experiments,selected_learned=selected,recommendation=recommendation,model=model,test_rows=test_rows,latest=latest,ten_ago=ten_ago,recent_cases=recent,daily=df[['date','close']].to_dict('records'),lag_diagnostic=lag_diagnostic,train_price_range=[float(X[train].min()),float(X[train].max())],warmup_rows=99,selection_lock_sha256=hashlib.sha256((ROOT/'selection_lock.json').read_bytes()).hexdigest())
(ROOT/'experiment_results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
df.tail(100).to_csv(ROOT/'samsung_recent100.csv',index=False,encoding='utf-8-sig')
preds=pd.DataFrame([dict(date=r['date'],target_date=r['target_date'],actual=r['actual'],prediction=r['prediction'],baseline=r['baseline']) for r in test_rows]); preds.to_csv(ROOT/'test_predictions.csv',index=False,encoding='utf-8-sig')
print(json.dumps({k:result[k] for k in ['partitions','baseline','selected_learned','recommendation','lag_diagnostic','train_price_range']},ensure_ascii=False,indent=2))
for e in experiments: print(e['name'],e['validation']['mae'],e['test']['mae'])
print('latest',latest['date'],latest['target_date'],latest['baseline'],latest['prediction'])
