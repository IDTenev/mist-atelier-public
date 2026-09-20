# 연속 데이터 장애 검증 · 유실·복구·용량을 수치로 판단하기

검토: 2026-09-20 · 분류: 구현 패턴 / 복구·전달·검증 / 범용 연속 데이터 설계

별칭: Fault Injection, Continuity Oracle, Storage Soak Test, Recovery SLO

적용 분야: 센서/로그 파이프라인, 데이터 로거, 다중 뷰, 오디오·영상 기록·재생

## 개념과 특징

“끊기지 않아 보임”은 데이터 연속성 검증이 아니다. 테스트 입력을 만든 기록과 각 경계의 결과를 ID 집합·checksum·시간으로 대조한다. 발견하지 못한 유실, 이미 선언한 gap, 의도적으로 요약/삭제한 구간을 구별한다. PC 모델·파일시스템 시험·실제 매체 전원 시험의 증거를 섞지 않는다.

## 구조와 동작

결정론적 입력 oracle → 획득/기록/전달/표시 경계별 관측 → 단일/복합 장애 주입 → 재시작/재생 → ID·효과·용량·시간 대조 → 수용/실패 보고

보고서에는 장치/OS/SDK/매체 firmware·설정·seed·부하·시도 수·관측 누락과 실패 파일의 해시를 남긴다. 민감 payload는 출력하지 않는다.

## 언제 쓰고 피할까

- 사용: 장기간 연속 동작·유한 저장·재개·다중 뷰가 실제 요구인 제품의 설계 검토와 인수 시험.
- 비추천: 모델 assertion 몇 개로 저장매체 내구성·실시간 성능·장비 안전 인증을 대체하는 경우. 이미 사용 중인 저장장치에 무단 전원 차단/파괴 시험을 하는 경우.

## 장점과 비용

- 장점: 재현 가능한 실패 조건과 합격 기준을 만들고 데이터 경계별 원인을 좁힌다. 정상 처리율뿐 아니라 복구 능력과 공간 상한을 검증한다.
- 단점·비용: 장애 주입 harness·독립 oracle·장시간/실물 시험 자원이 필요하다. 소프트웨어 kill은 실제 전원 차단과 같지 않고 cache/FTL 실패를 재현하지 못할 수 있다.

## 설계·구현 가이드

1. 각 환경의 최대 유입 R·burst·허용 outage·복구 시간·최대 lag·byte 상한·허용 유실을 먼저 수치화한다. 생략된 요구는 미정으로 표시하고 무손실을 기본값으로 약속하지 않는다.
2. 독립 oracle에서 source/epoch/sequence와 payload hash를 만든다. 전 경계의 trace를 같은 ID로 비교하며 관측 로그 자체 overflow도 계수한다. sum만 비교하면 누락과 중복이 상쇄될 수 있다.
3. 한 장애씩 boundary를 훑고 이후 “복구 중 full”, “pin 중 재부팅”, “late 재전송 중 schema 교체” 같은 복합 장애를 추가한다. 실제 전원 시험은 전용 fixture·안전한 장치·승인 범위에서 한다.
4. 평균뿐 아니라 최악/p99 지연, 공간 peak, recovery throughput, flash 쓰기량을 기록한다. 충분히 여러 번 순환 회수한 soak와 보존 한도 초과 outage를 포함하고, 테스트 종료 시 thread/lease/파일 handle 누수를 확인한다.

## 적용 예시

설명용 인수 예: 1000 record/s, 256 byte payload, 60초 단절을 가정하면 payload만 15,360,000 byte다. header/index·burst·보호 구간·작업 여유를 더해 spool을 잡고, 복구 drain 3000 record/s일 때 순회복 2000 record/s라 이론상 30초 이상 필요하다. 실제 합격 시간은 I/O와 재시도 여유를 포함해 시험 전에 정한다.

### 9개 장애 시험: 주입 → 관측 → 합격

1. **중복·역순·old epoch·누락** → 원본 ID와 gap을 대조한다. 중복 효과가 없고 모든 누락이 설명되어야 한다.
2. **느린 뷰·해지·seek 경쟁** → 뷰별 cursor/lease를 관측한다. 다른 필수 consumer가 계약대로 진행해야 한다.
3. **ACK 전후 crash** → durable prefix와 결과를 대조한다. 확정 데이터/결과가 보존되고 미확정 상태가 구분되어야 한다.
4. **header/payload 부분 쓰기** → recovery scan 결과를 확인한다. 가짜 완성 레코드가 없고 손상 범위를 보고해야 한다.
5. **disk full·전부 pin·삭제 실패** → reserve와 admission을 확인한다. 보호 데이터는 유지하고 신규 쓰기를 명시적으로 거절/중단해야 한다.
6. **snapshot 경계 중 입력** → catch-up 최종 상태를 대조한다. 기준 재생과 같고 전환 gap이 없어야 한다.
7. **compaction/업로드 중 crash** → old/new manifest를 확인한다. 검증된 판본만 게시하고 유일 원본을 먼저 삭제하지 않아야 한다.
8. **시계 역행·idle 복귀** → lateness와 skew를 관측한다. 사전 정의된 시간 정책을 지켜야 한다.
9. **여러 번 용량 순환·재부팅** → peak byte·쓰기량·leak를 측정한다. 저장 예산과 자원 상한이 유지되어야 한다.

이 절은 독자 작성 설계 사례이며 실행 프로그램이나 바로 적용할 운영 설정 파일이 아니다.

## 실패·동시성·종료 조건

테스트가 source를 멈춰놓고 consumer만 확인하면 과부하/회수 경쟁을 놓친다. 소프트웨어 종료와 전원 실패를 별개 test case로 둔다. no-loss 결과에는 시험한 고장 모델·시간·입력 범위를 붙인다. 기대된 GAP도 상위 업무 요구가 무손실이면 합격이 아니라 계약 미충족이다.

## 검증 기준

이 백과에 포함한 모델은 순번/epoch/창, 독립 cursor/명시적 gap, pin/lease/reserve admission만 실행 검증한다. 실제 브로커·저장매체 fault injection·부하·영상 codec·RTOS/DMA·전원 차단은 not_tested다. 제품 적용 시 위 matrix를 채우고 원본 생성→확정→복구→각 필수 consumer의 ID 집합을 최종 대조한다.

## 관련 설계와 대안

- [스트림 ID·세대·순번 · 연속성과 누락을 구분하기](/guides/stream_identity)
- [독립 소비자 Fan-out · 한 소스를 여러 뷰로 나누기](/guides/stream_fanout)
- [순환 보존·중요 구간 보호 · 꽉 찬 저장소의 결정 규칙](/guides/retention_pin_quota)
- [무결성·복구 스캔 · 손상된 꼬리와 유효 이력 나누기](/guides/stream_integrity_recovery)
- [아키텍처를 검증하고 바꾸기: C4·ADR·관측·위협 모델](/guides/architecture_validation)

## 근거와 한계

- [How SQLite Is Tested](https://www.sqlite.org/testing.html) — I/O·메모리 부족·crash·복합 장애 주입과 무결성 확인; 변동 문서.
- [Apache Flink 1.20 Fault Tolerance](https://nightlies.apache.org/flink/flink-docs-release-1.20/docs/learn-flink/fault_tolerance/) — 고정 1.20의 상태 snapshot·재생 가능한 source·transactional/idempotent sink 조건.

출처 확인일: 2026-09-20. 공식 문서의 API·동작 계약을 참고하되 이 글의 구조 조합·숫자·절차·예제·수용 기준은 독자 작성 편집 제안이다. 외부 코드·그림은 복제하지 않았다. 고정 판본은 최신판이라는 뜻이 아니며 변동 문서는 적용 시 대상 버전과 제약을 다시 확인한다.

검증 상태: not_tested (실제 대상 환경). 설계 절차용 가이드이며 실행 코드 검증 대상이 아니다. 실제 센서/영상 취득·브로커·파일시스템·저장매체 전원 차단·RTOS/ISR/SMP/DMA·운영 부하·안전/보안 인증은 별도 검증이 필요하다. 유한 저장소와 임의 길이의 장애에서 무조건 무손실을 보장하지 않는다.
