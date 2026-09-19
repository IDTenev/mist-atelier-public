# WAL · 데이터보다 먼저 남기는 복구 기록

검토: 2026-09-20 · 분류: 구현 패턴 / 저장·캐시 / 영속성·복구 패턴

별칭: Write-Ahead Log, WAL, Redo Log, 선행 기록

적용 분야: 데이터베이스, 로컬 저장 엔진, 오프라인 기록

## 개념과 특징

변경을 설명하는 복구 로그를 데이터 페이지보다 먼저 안정 저장소에 기록한다. 재시작하면 로그로 필요한 변경을 복구한다. WAL과 업무 이벤트 기록(Event Sourcing)은 목적·스키마·보관 계약이 다르다.

## 구조와 동작

변경 준비 → 로그 기록/내구성 확보 → commit 응답 → 데이터 반영 → checkpoint → 안전한 로그 회수

## 언제 쓰고 피할까

- 사용: 여러 변경의 원자성·복구가 필요하고 검증된 DB 엔진을 사용할 수 있을 때.
- 비추천: 단일 작은 설정만 드물게 교체하는 MCU에 DB 수준 로그 엔진을 직접 만드는 경우. 이미 DB가 제공하는 WAL을 애플리케이션에서 중복 구현하지 않는다.

## 장점과 비용

- 장점: 순차 로그 쓰기를 활용하고 장애 후 일관된 복구 지점을 가질 수 있다.
- 단점·비용: 로그 공간·동기화 지연·checkpoint·복구 시간이 추가된다. 저장장치와 fsync/synchronous 설정에 따라 내구성이 달라진다.

## 설계·구현 가이드

1. 성공 응답 시 보장할 손실 범위를 정의하고 엔진의 flush/commit 설정을 확인한다. OS 메모리 쓰기 완료와 전원 차단 내구성은 다르다.
2. 검증된 엔진의 transaction을 사용하고 로그 파일만 임의 삭제·복사하지 않는다.
3. 로그 증가량·checkpoint 지연·disk full·장기 reader의 영향을 관측한다.
4. 복구·백업·복제·보관을 별도 정책으로 설계한다. WAL 하나가 백업을 대신하지 않는다.

## 적용 예시

SQLite WAL 모드에서는 reader와 writer가 함께 진행할 수 있지만 writer는 한 번에 하나다. 오래 열린 read transaction은 checkpoint 완료를 방해해 WAL이 커질 수 있다. 이를 범용 WAL의 동일 동작으로 일반화하지 않는다.

이 절은 구현 결정을 설명하는 설계 사례다. 실행 프로그램이나 장비 설정 파일이 아니다.

## 실패·동시성·종료 조건

일부 파일만 복사한 백업, commit 이전 성공 응답, 로그 삭제, 잘못된 동기화 설정이 데이터 손실을 만든다. 종료는 열린 transaction과 checkpoint 정책을 엔진 계약에 맞춰 처리한다.

## 검증 기준

commit 전후 강제 프로세스 종료, disk full, 긴 reader, 재시작 복구, 공식 백업 복원 절차를 시험한다. 실제 전원 차단·장치 캐시 동작은 별도 실험이다.

## 관련 설계와 대안

- [이중 슬롯 저장 · 이전 유효본을 남기고 교체](/guides/atomic_dual_slot)
- [CQRS와 Event Sourcing: 읽기 분리와 이력 저장은 별개 결정](/guides/cqrs_event_sourcing)
- [엣지·클라우드·오프라인: 연결이 없어도 지켜야 할 책임](/guides/edge_cloud_offline)

## 근거와 한계

- [PostgreSQL WAL introduction](https://www.postgresql.org/docs/current/wal-intro.html) — 18 표시 페이지의 write-ahead 원리; current 변동.
- [SQLite WAL](https://www.sqlite.org/wal.html) — 동시 reader/writer·checkpoint·제한; 변동 문서.

출처 확인일: 2026-09-20. 위 자료는 개념·API 계약의 근거다. 적용 판단·수치·절차·예제는 독자 작성 편집 제안이며 외부 코드·그림의 복제나 제조사 권고 설정값이 아니다. 변동 문서는 적용 시 대상 판본을 다시 확인한다.

검증 상태: not_tested (실제 대상 환경). 설계 절차용 가이드이며 실행 코드가 없고 MCU 빌드·실기·운영 부하·안전/보안 인증은 별도 검증이 필요하다.
