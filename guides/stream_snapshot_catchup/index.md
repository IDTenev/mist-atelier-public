# 스냅샷 + Catch-up · 과거 상태와 실시간 경계를 잇기

검토: 2026-09-20 · 분류: 구현 패턴 / 한 소스·다중 뷰 / 범용 연속 데이터 설계

별칭: Snapshot Catch-up, High-watermark Handoff, Replay to Live, Consistent Cut

적용 분야: 장치 상태 모니터, 대용량 로그 재생, 집계 상태 복원, 늦게 참여한 뷰

## 개념과 특징

현재 상태를 복사한 다음 실시간 구독을 시작하면 두 작업 사이 이벤트가 빠질 수 있다. snapshot이 포함한 정확한 로그 경계 B를 함께 보존하고 B 이후를 같은 로그에서 읽으면 누락/중복을 판별할 수 있다. 상태 snapshot은 원시 파형·영상 전체 이력을 대신하지 않는다.

## 구조와 동작

경계 B의 상태 + schema/hash/cursor vector 생성 → B 이후 로그 보존 pin → snapshot 로드 → B+1부터 catch-up → high-watermark 도달 → 같은 cursor로 live 읽기

여러 partition이라면 B는 단일 숫자가 아니라 partition별 offset vector다. 이것만으로 임의 다중 시스템의 일관된 cut이 성립하지 않으므로 transaction/barrier 또는 업무별 일관성 계약이 필요하다.

## 언제 쓰고 피할까

- 사용: 긴 이벤트 이력을 매번 처음부터 읽기 어려운 뷰, 새 소비자 가입, 재시작 후 계산 상태 복구.
- 비추천: 정확한 snapshot 경계를 알 수 없고 이력 보존도 할 수 없는 source. 최근 원시 데이터를 모두 보관해야 하는 요구를 최종 상태 snapshot만으로 대체하려는 경우.

## 장점과 비용

- 장점: 복구와 새 뷰 준비 시간을 줄이고 snapshot과 tail 사이 공백을 명시적으로 없앨 수 있다.
- 단점·비용: snapshot 생성 비용과 pin 보존 공간이 추가된다. 생성 중 쓰기와의 일관성·schema 호환·catch-up 처리율이 필요하고 보존 한도 초과 시 처음부터 다시 동기화해야 한다.

## 설계·구현 가이드

1. snapshot을 생성할 원자 경계 또는 barrier를 정하고 그 시점의 상태와 마지막 적용 cursor를 한 단위로 저장한다. 상태와 cursor를 다른 시각에 따로 읽지 않는다.
2. B 이후 필요한 로그를 reader lease 또는 보존 계약으로 확보한다. lease의 시간·byte 한도를 넘으면 갱신 실패를 알리고 새 snapshot을 요청한다.
3. 검증된 snapshot을 비활성 뷰에 로드하고 같은 schema/변환 버전의 B+1 이후 레코드를 적용한다. 중복은 원본 ID로 판정한다.
4. catch-up에서 live로 바뀔 때 새 push 채널로 갈아타기보다 같은 cursor를 유지한다. 채널을 꼭 전환하면 먼저 subscribe하여 버퍼링한 범위와 replay 경계를 대조하고 중복 제거 후 전환한다.

## 적용 예시

snapshot은 sequence 100까지 반영했는데 전송 도중 101~120이 생성됐다. 새 화면은 snapshot을 설치한 뒤 101부터 읽어야 한다. 구독 시작 당시 최신 121로 붙으면 20개가 사라진다. 센서 평균 상태에는 count·sum·창 경계와 cursor가 함께 있어야 이전 표본을 두 번 합산하지 않는다.

이 절은 독자 작성 설계 사례이며 실행 프로그램이나 바로 적용할 운영 설정 파일이 아니다.

## 실패·동시성·종료 조건

snapshot 다운로드 성공과 내용 무결성·schema 검증 성공을 구분한다. pin 만료 후 cursor가 earliest_available보다 작으면 live로 점프하지 말고 reset 또는 gap을 표시한다. 영상의 decoder 준비용 keyframe/초기화 정보와 업무 상태 snapshot은 서로 다른 개념이다.

## 검증 기준

snapshot 생성 전후·복사 중·설치 직후·catch-up 완료 직전마다 새 이벤트와 crash를 주입한다. 최종 상태는 동일 경계까지 원본을 처음부터 계산한 reference와 같아야 한다. source/뷰 버전 불일치와 pin 만료에서 명시적 재동기화가 발생해야 한다.

## 관련 설계와 대안

- [독립 재생·파생 뷰 · 원본은 하나, 시점과 표현은 여러 개](/guides/stream_replay_views)
- [세션 재개·세대 fencing · 끊긴 뒤 어디서 이어갈까](/guides/stream_session_resume)
- [ACK·체크포인트·멱등성 · 한 번 처리의 보장 범위](/guides/checkpoint_delivery)
- [순환 보존·중요 구간 보호 · 꽉 찬 저장소의 결정 규칙](/guides/retention_pin_quota)

## 근거와 한계

- [Microsoft Event Sourcing pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing) — snapshot과 eventstream, 재생과 멱등성의 관계; 변동 문서.
- [Apache Flink 1.20 Fault Tolerance](https://nightlies.apache.org/flink/flink-docs-release-1.20/docs/learn-flink/fault_tolerance/) — 고정 1.20의 상태 snapshot·재생 가능한 source·transactional/idempotent sink 조건.

출처 확인일: 2026-09-20. 공식 문서의 API·동작 계약을 참고하되 이 글의 구조 조합·숫자·절차·예제·수용 기준은 독자 작성 편집 제안이다. 외부 코드·그림은 복제하지 않았다. 고정 판본은 최신판이라는 뜻이 아니며 변동 문서는 적용 시 대상 버전과 제약을 다시 확인한다.

검증 상태: not_tested (실제 대상 환경). 설계 절차용 가이드이며 실행 코드 검증 대상이 아니다. 실제 센서/영상 취득·브로커·파일시스템·저장매체 전원 차단·RTOS/ISR/SMP/DMA·운영 부하·안전/보안 인증은 별도 검증이 필요하다. 유한 저장소와 임의 길이의 장애에서 무조건 무손실을 보장하지 않는다.
