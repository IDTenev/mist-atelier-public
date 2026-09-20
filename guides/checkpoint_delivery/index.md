# ACK·체크포인트·멱등성 · 한 번 처리의 보장 범위

검토: 2026-09-20 · 분류: 구현 패턴 / 복구·전달·검증 / 범용 연속 데이터 설계

별칭: At-least-once, At-most-once, Exactly-once Effects, Checkpoint, Idempotent Sink

적용 분야: 로그 전송, 계측 집계, 메시지 기반 작업, 데이터 기록과 외부 장치 명령

## 개념과 특징

ACK가 무엇의 성공인지 먼저 정의해야 한다. RAM 수신 ACK, durable 저장 ACK, 처리 완료 ACK는 다르다. “정확히 한 번”은 데이터가 물리적으로 한 번만 이동한다는 뜻이 아니라 지정된 상태/결과에 한 번 반영되는 보장일 수 있다. 외부 장치의 비멱등 명령까지 저절로 포함되지 않는다.

## 구조와 동작

source 재생 위치 → 레코드 처리 → 결과 + dedup key + checkpoint 원자 확정 → ACK → 장애 후 확정 cursor부터 재개

결과와 cursor를 같은 transaction에 저장할 수 없으면 재전달을 전제로 멱등 키나 outbox를 사용한다. 단일 프로세스의 “처리 후 파일에 번호 저장”만으로 두 시스템의 원자성이 생기지 않는다.

## 언제 쓰고 피할까

- 사용: 재전송이 가능한 로그·이벤트를 집계/저장하고 중복 실행 비용이 있는 경우. 재시작 후 원본 재생으로 결과를 복원해야 할 때.
- 비추천: 외부 sink가 멱등성/transaction/조회 가능한 실행 ID를 전혀 제공하지 않는데 exactly-once를 선언하는 경우. 중요하지 않은 실시간 표시까지 영속 transaction으로 묶어 지연을 늘리는 경우.

## 장점과 비용

- 장점: 재시도와 장애 복구의 결과를 명확히 정의하고 cursor 전진으로 누락을 숨기는 오류를 막는다.
- 단점·비용: dedup 상태·transaction latency·checkpoint I/O가 추가된다. source 보존 기간과 dedup 기간이 맞지 않으면 오래된 재전송이 중복 처리될 수 있다.

## 설계·구현 가이드

1. 각 ACK의 경계와 실패 모델을 문서화한다. 현재 장치/OS가 보장한 내구성 범위를 넘어서 전원 차단·전체 replica 손실을 보장하지 않는다.
2. 한 consumer의 마지막 연속 적용 cursor를 관리한다. 처리 전 cursor 저장은 이후 crash에서 누락 가능, 처리 후 별도 cursor 저장은 중복 가능임을 상태 전이로 확인한다.
3. 결과·원본 ID·checkpoint를 원자 저장하거나 sink에 안정적인 멱등 키를 전달한다. 재시도마다 새 키를 만들지 않는다. dedup 삭제는 재생·지연 허용 기간과 연동한다.
4. 다중 input 상태에는 일관된 checkpoint 경계를 사용하고 source 재생 가능성, sink 계약, 세대 fencing을 함께 검토한다. 재생을 시작하기 전에 필요한 구간이 아직 보존돼 있는지 확인한다.

## 적용 예시

sequence 42의 계측값을 합계에 더한 직후 crash하고 cursor는 41이면 재생에서 42를 다시 더할 수 있다. 합계·42 처리 표시·cursor를 한 transaction으로 확정하거나 “42 결과 upsert”처럼 멱등 처리한다. 로컬 기록 성공 뒤 물리 액추에이터를 움직이는 경우에는 기록 transaction만으로 장치 동작을 되돌리거나 중복 방지할 수 없다.

이 절은 독자 작성 설계 사례이며 실행 프로그램이나 바로 적용할 운영 설정 파일이 아니다.

## 실패·동시성·종료 조건

commit timeout은 실패 확정이 아니라 결과 불명일 수 있다. 무조건 새 ID로 재시도하지 말고 원래 ID로 조회/재전달한다. ACK 유실 뒤 중복 입력에서도 결과가 한 번만 반영되는지 확인한다. 종료는 in-flight 결과와 cursor 확정 여부를 남기고 임의로 cursor를 끝까지 전진시키지 않는다.

## 검증 기준

처리 전·결과 저장 전후·cursor 저장 전후·ACK 전후에 crash/timeout을 주입한다. 참조 결과와 재생 후 상태를 비교하고 중복 효과·설명 없는 gap이 없어야 한다. dedup TTL 직전/직후와 source retention 만료에서 계약대로 실패하는지 확인한다.

## 관련 설계와 대안

- [재시도·멱등성 · 응답 유실과 중복 실행 분리](/guides/retry_idempotency)
- [Outbox·Saga: 여러 저장소의 변경과 실패를 연결하기](/guides/outbox_saga)
- [스트림 ID·세대·순번 · 연속성과 누락을 구분하기](/guides/stream_identity)
- [스냅샷 + Catch-up · 과거 상태와 실시간 경계를 잇기](/guides/stream_snapshot_catchup)
- [세그먼트 순차 로그 · 쓰기 완료와 보존 확정을 분리하기](/guides/segmented_commit_log)

## 근거와 한계

- [Apache Flink 1.20 Fault Tolerance](https://nightlies.apache.org/flink/flink-docs-release-1.20/docs/learn-flink/fault_tolerance/) — 고정 1.20의 상태 snapshot·재생 가능한 source·transactional/idempotent sink 조건.
- [Apache Kafka 4.0 Design](https://kafka.apache.org/40/design/design/) — 고정 4.0의 소비자 offset·전달 의미·compaction. 최신 버전이나 MCU 필수 구성이라는 뜻이 아니다.

출처 확인일: 2026-09-20. 공식 문서의 API·동작 계약을 참고하되 이 글의 구조 조합·숫자·절차·예제·수용 기준은 독자 작성 편집 제안이다. 외부 코드·그림은 복제하지 않았다. 고정 판본은 최신판이라는 뜻이 아니며 변동 문서는 적용 시 대상 버전과 제약을 다시 확인한다.

검증 상태: not_tested (실제 대상 환경). 설계 절차용 가이드이며 실행 코드 검증 대상이 아니다. 실제 센서/영상 취득·브로커·파일시스템·저장매체 전원 차단·RTOS/ISR/SMP/DMA·운영 부하·안전/보안 인증은 별도 검증이 필요하다. 유한 저장소와 임의 길이의 장애에서 무조건 무손실을 보장하지 않는다.
