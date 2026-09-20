# 세션 재개·세대 fencing · 끊긴 뒤 어디서 이어갈까

검토: 2026-09-20 · 분류: 구현 패턴 / 연속성·세션·시간 / 범용 연속 데이터 설계

별칭: Resume Cursor, Session State Machine, Producer Fencing, Store and Forward

적용 분야: 오프라인 로거, IoT 게이트웨이, 원격 계측, 오디오·영상 세션

## 개념과 특징

전송 연결의 수명과 논리 스트림의 수명은 다르다. 연결을 다시 열어도 같은 원본 ID로 기록을 이어갈 수 있지만, source가 재시작하거나 필요한 이력이 회수됐다면 명시적 새 세대 또는 공백이 필요하다. 세션 안정화는 실패를 숨기는 무한 재시도가 아니라 재개 가능성·시간 한도·소유권을 검증하는 상태 머신이다.

## 구조와 동작

DISCONNECTED → CONNECTING → NEGOTIATING → CATCHING_UP → LIVE → DRAINING/CLOSED

협상 입력은 source_id, producer_epoch, schema/codec, last_durable_sequence, earliest_available, committed_high_watermark다. 재개 위치가 보존 범위 밖이면 RESET_REQUIRED/GAP을 반환하며 자동으로 최신 위치에 붙여 무손실처럼 보이게 하지 않는다.

## 언제 쓰고 피할까

- 사용: 센서 데이터를 로컬에 쌓았다 연결 후 전송하는 장치, 중단 후 재생을 이어야 하는 클라이언트, 세션 교체 중 이전 callback이 남는 시스템.
- 비추천: 재생 가능한 원본이 전혀 없는데 재연결만으로 무손실을 약속하는 경우. 작업이 한 번의 짧은 요청이면 일반 timeout·멱등성으로 충분할 수 있다.

## 장점과 비용

- 장점: 불완전한 연결과 오래된 writer를 구분하고 복구 과정을 운영자가 관찰할 수 있다. 데이터 재개와 화면 준비 상태를 별도로 제어한다.
- 단점·비용: 협상 메타데이터, 로컬 spool과 재전송 부하, 세대 관리가 필요하다. 저장 기간보다 오래 끊기면 일부 이력은 복구할 수 없다.

## 설계·구현 가이드

1. 각 상태의 입장 조건·deadline·시도 횟수·중단 권한을 정하고 지수 backoff와 jitter에 총 예산을 둔다. 연결 성공은 LIVE 판정이 아니다.
2. 처리 완료/영속 확인한 cursor를 저장하고 재개 범위를 서버와 교차 검증한다. 중간 gap이 있는데 가장 큰 수신 번호만 ACK하면 앞선 누락을 덮는다.
3. 새 소유자 epoch/fencing token을 저장 경계에서도 검사한다. 클라이언트 내부 generation으로 오래된 callback을 버리는 것과 서버가 이전 writer를 차단하는 것은 별개다.
4. catch-up 처리율이 실시간 유입률보다 커야 적체가 줄어든다. 복구 I/O·CPU·시간을 제한하고 실패하면 계속 복구 중, 저하 모드 또는 명시적 포기로 전이한다. 무조건 LIVE로 표시하지 않는다.

## 적용 예시

유입 1 MiB/s, 단절 60초면 최소 60 MiB payload와 인덱스·여유가 필요하다. 재연결 후 총 drain 3 MiB/s이면 새 유입을 제외한 순 회복률은 2 MiB/s라 적체 소진에 약 30초가 걸린다. 이는 재전송 overhead가 없는 설명용 가정이다. 영상은 재개 위치 앞의 독립 복호화 지점과 codec 설정도 필요하다.

이 절은 독자 작성 설계 사례이며 실행 프로그램이나 바로 적용할 운영 설정 파일이 아니다.

## 실패·동시성·종료 조건

두 재연결 작업이 동시에 소켓을 만들지 않게 owner를 하나로 둔다. stop 중 retry timer와 미완료 I/O를 취소하고 generation을 닫는다. 인증 실패·schema 불일치는 transient 네트워크 장애와 다르게 처리한다. cursor/epoch 복구 실패를 새 데이터로 덮지 않는다.

## 검증 기준

단절 시간 0/보존 한도 직전/직후, ACK 유실, old writer 지연 쓰기, stop 직후 재연결 callback, source 재부팅, catch-up 중 또 단절을 주입한다. 중복 허용 여부, 복구 시간, 재개 불가 공지, RAM/spool 상한을 검증한다.

## 관련 설계와 대안

- [통신 실패를 설계에 넣기: 타임아웃·재시도·복구 상태](/guides/communication_recovery)
- [취소·세대 번호 · 늦은 응답이 현재 상태를 덮지 않게](/guides/cancellation_generation)
- [스트림 ID·세대·순번 · 연속성과 누락을 구분하기](/guides/stream_identity)
- [순환 보존·중요 구간 보호 · 꽉 찬 저장소의 결정 규칙](/guides/retention_pin_quota)
- [스냅샷 + Catch-up · 과거 상태와 실시간 경계를 잇기](/guides/stream_snapshot_catchup)

## 근거와 한계

- [Apache Kafka 4.0 Design](https://kafka.apache.org/40/design/design/) — 고정 4.0의 소비자 offset·전달 의미·compaction. 최신 버전이나 MCU 필수 구성이라는 뜻이 아니다.
- [PostgreSQL 17 Replication configuration](https://www.postgresql.org/docs/17/runtime-config-replication.html) — 고정 17의 replication slot 보존 상한과 재개 불가능성. 일반 reader pin API가 아니다.

출처 확인일: 2026-09-20. 공식 문서의 API·동작 계약을 참고하되 이 글의 구조 조합·숫자·절차·예제·수용 기준은 독자 작성 편집 제안이다. 외부 코드·그림은 복제하지 않았다. 고정 판본은 최신판이라는 뜻이 아니며 변동 문서는 적용 시 대상 버전과 제약을 다시 확인한다.

검증 상태: not_tested (실제 대상 환경). 설계 절차용 가이드이며 실행 코드 검증 대상이 아니다. 실제 센서/영상 취득·브로커·파일시스템·저장매체 전원 차단·RTOS/ISR/SMP/DMA·운영 부하·안전/보안 인증은 별도 검증이 필요하다. 유한 저장소와 임의 길이의 장애에서 무조건 무손실을 보장하지 않는다.
