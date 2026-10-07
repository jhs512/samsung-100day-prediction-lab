# 삼성전자 최근 100거래일 예측 실험실

공개 보고서: https://jhs512.github.io/samsung-100day-prediction-lab/

2020~2024년 학습 / 2025년 검증 선택 / 2026년 미사용 최종 시험.
2019년 이력은 최초 100일 창을 위한 자료입니다. 관측일과 정답일이 경계를 넘는 행은 제외합니다.

`outputs/index.html` 하나로 7단계 수업, 100일 입력, 최신 다음날 예측, 정확히 10거래일 전 테스트, 최근 10일 랜덤 체험, 실제/예측 비교와 CSV 다운로드가 작동합니다. 별도 서버나 API키가 필요 없습니다.

자료는 2026-10-07 12:58:34 KST에 조회한 네이버 일별 API 005930 snapshot이며 마지막 완료 관측일은 2026-10-06입니다. 당일 장중 행은 제외했습니다. 공급자 종가의 수정주가·KRX/NXT 집계 정의는 확정하지 못했습니다. Yahoo와 39개 종가 차이, 3일 누락 및 네이버 현재가 역산 전일값과 최신 일별 API의 1,000원 차이를 source.json과 HTML에 공개합니다. 다른 공급자 자료를 섞거나 보간하지 않습니다.

10개 학습 후보와 persistence를 실제 비교했습니다. 2025년 최저 MAE로 고정 선택한 상대가격 Lasso α=0.001의 100개 계수는 모두 0입니다. 학습기 평균 다음날 수익률을 현재 종가에 곱하는 형태로 축소됐습니다. 2025년 MAE 1,250.24원 (기준 1,251.04원), 2026년 MAE 9,443.63원 (기준 9,446.20원). 긴 가격 흐름의 실용적 예측력이 확인된 실험이 아닙니다. 2026년 시험에서 더 좋은 다른 후보로 재선택하지 않았습니다.

재현 (다운로드 없이 고정 snapshot 사용):

```powershell
python -m venv work/venv
work/venv/Scripts/python.exe -m pip install -r outputs/requirements.txt
work/venv/Scripts/python.exe outputs/reproduce.py
work/venv/Scripts/python.exe work/build.py
node work/verify.mjs
```

Python 3.12 실행 기준입니다. 버전은 requirements.txt와 experiment_results.json에 보존합니다. 수치 검증은 최종 시험 184개와 최신·10일 전·최근 랜덤 입력 총 196회, Python/JS 최대 차이 0원입니다.

보존 파일: 사전 계획 experiment_plan.json, 선택 고정 selection_lock.json, 가격 CSV, 공급자 원응답, 출처 metadata, 장중 quote snapshot, 전체 모델 점수·계수·입력 JSON, 재현 Python, 수치·브라우저·배포 검증 기록.

기존 프로젝트는 읽기 참고만 했습니다. 이 프로젝트는 별도 저장소와 별도 GitHub Pages에 배포합니다.
