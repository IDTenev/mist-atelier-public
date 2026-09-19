# 워치독·헬스 체크 · 살아 있음과 정상 진행 구분

검토: 2026-09-20 · 분류: 구현 패턴 / 보호·진단·보안 / 진단·복구 패턴

별칭: Watchdog, Heartbeat, Liveness, Readiness, Progress Monitor

적용 분야: MCU 태스크, 게이트웨이, 서버 프로세스

## 개념과 특징

시간 내 정상 진행 증거가 없으면 경고·격리·재시작한다. 살아 있는지(liveness), 요청을 받을 준비가 됐는지(readiness), 시작할 시간이 필요한지(startup)는 서로 다른 질문이다.

## 구조와 동작

작업의 유효 진행 → 채널별 진행 시각 → 감시자가 deadline 검사 → 격리/안전 상태/복구 → 원인 기록

## 언제 쓰고 피할까

- 사용: 태스크 정지·교착·오래 걸리는 시작·서비스 일시 불능을 자동 감지할 필요가 있을 때.
- 비추천: 타이머 ISR이 무조건 watchdog을 feed하는 구조, 외부 DB가 잠깐 느리다는 이유로 모든 인스턴스를 재시작하는 구조.

## 장점과 비용

- 장점: 무응답 상태를 유한 시간 안에 탐지하고 트래픽 차단·복구 판단을 자동화한다.
- 단점·비용: 잘못된 timeout은 정상 작업을 재시작하고 장애 폭풍을 만든다. 같은 고장 영역의 감시자가 함께 멈출 수도 있다.

## 설계·구현 가이드

1. 각 중요 작업의 정상 최대 주기·jitter·블로킹 시간을 계산해 deadline을 정한다. idle도 정상 상태임을 구별한다.
2. 각 작업이 실제 유효 단계를 마친 뒤 진행 정보를 갱신한다. 감시 태스크 하나가 모든 성공을 가정하지 않는다.
3. 소프트웨어 감시 실패를 대비한 하드웨어 watchdog, 안전 출력, reset 원인 보존을 장비 기능에 맞춰 설계한다.
4. readiness 실패는 신규 트래픽 차단, liveness는 복구가 유효한 내부 정지에 사용한다. restart 횟수 상한·backoff·안전 모드를 둔다.

## 적용 예시

네트워크가 끊겨도 현장 제어가 정상이라면 통신 readiness는 낮추되 MCU 전체를 반복 reset할 필요는 없을 수 있다. 반대로 제어 태스크가 멈췄는데 통신 태스크만 살아 있다는 이유로 feed해서는 안 된다.

이 절은 구현 결정을 설명하는 설계 사례다. 실행 프로그램이나 장비 설정 파일이 아니다.

## 실패·동시성·종료 조건

reset 중 액추에이터 출력·flash 쓰기·부트 루프·진단 로그 폭주를 고려한다. 정상 종료/업데이트 모드의 감시 중지 권한과 기간을 제한한다.

## 검증 기준

중요 태스크별 정지·감시자 정지·외부 의존 장애·느린 시작·CPU 포화·반복 reset을 주입한다. 탐지 시간·안전 출력·재시작 상한과 원인 기록을 확인한다.

## 관련 설계와 대안

- [통신 실패를 설계에 넣기: 타임아웃·재시도·복구 상태](/guides/communication_recovery)
- [장애 격리와 복원력: 타임아웃·재시도·Circuit Breaker·Bulkhead](/guides/resilience_bulkheads)
- [PID 안티윈드업 · 출력 포화 때 적분 관리](/guides/pid_antiwindup)

## 근거와 한계

- [Zephyr Task Watchdog](https://docs.zephyrproject.org/latest/services/task_wdt/index.html) — 채널별 task 감시와 HW fallback; latest 변동 문서.
- [Kubernetes probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) — liveness/readiness/startup 구분; 변동 문서.

출처 확인일: 2026-09-20. 위 자료는 개념·API 계약의 근거다. 적용 판단·수치·절차·예제는 독자 작성 편집 제안이며 외부 코드·그림의 복제나 제조사 권고 설정값이 아니다. 변동 문서는 적용 시 대상 판본을 다시 확인한다.

검증 상태: not_tested (실제 대상 환경). 설계 절차용 가이드이며 실행 코드가 없고 MCU 빌드·실기·운영 부하·안전/보안 인증은 별도 검증이 필요하다.
