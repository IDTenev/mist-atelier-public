# 무결성·복구 스캔 · 손상된 꼬리와 유효 이력 나누기

검토: 2026-09-20 · 분류: 구현 패턴 / 복구·전달·검증 / 범용 연속 데이터 설계

별칭: Torn Write, Recovery Scan, Checksum, Manifest Generation, Commit Prefix

적용 분야: 연속 계측 파일, flash/SD 로거, 통신 spool, 블랙박스 저장, append 로그

## 개념과 특징

파일이 열리거나 길이가 맞는 것과 레코드가 완전하다는 것은 다르다. 길이·schema·순번·checksum·commit 경계를 함께 검증해야 한다. checksum은 우발적 손상 감지이며 위변조 인증이나 누락 자동 복원이 아니다. 복구의 첫 책임은 불완전한 데이터를 정상 이력으로 게시하지 않는 것이다.

## 구조와 동작

읽기 전용 점검 → 유효 manifest 세대 선택 → sealed 검증 → active tail 제한 스캔 → 검증된 레코드 경계 산출 → 재구축 index → 복구 결과/누락 보고 → 새 writer epoch

권한 있는 명시적 복구 전 원본을 보존한다. 테스트는 복사본과 생성 fixture에서 수행한다. 이 가이드는 사용자 원본에 truncate/삭제 명령을 실행하지 않는다.

## 언제 쓰고 피할까

- 사용: 전원 차단·프로세스 crash·미완성 sector 때문에 마지막 기록이 의심되는 저장소, 인덱스 재생성이 필요한 시스템.
- 비추천: 암호학적 신뢰 증명이 필요한데 CRC만 추가하는 경우. sealed 중간 손상을 발견해도 뒤 레코드를 무조건 정상으로 이어 붙이는 경우.

## 장점과 비용

- 장점: tail 미완료와 기존 확정 데이터 손상을 구분하고 복구 가능한 범위를 계량한다. 인덱스가 없어도 원본으로 재구성할 근거를 남긴다.
- 단점·비용: 시작 스캔 시간·추가 메타데이터·checksum 계산이 필요하다. 모든 복제본이 손상되거나 이전 데이터가 회수됐다면 복구할 수 없다.

## 설계·구현 가이드

1. 레코드 최대 길이·header version·checksum 범위를 명시한다. header length가 손상됐을 때 무한 scan/할당이 나지 않게 탐색 상한과 경계 동기화 규칙을 둔다.
2. 재사용 segment에 generation/UUID를 두고 파일 이름·offset만으로 이전 데이터를 새 세대로 인정하지 않는다. manifest와 record ID를 교차 검증한다.
3. active 끝의 미완성 레코드는 마지막 유효 경계와 분리한다. sealed 중간 손상은 tail 잘림으로 간주하지 않고 구간 격리/복제본 복원/명시적 gap 중 정책을 선택한다.
4. 새 index와 복구 manifest를 비활성 위치에 만들고 검증 후 게시한다. 원본 수정이 필요한 복구는 백업·정확한 대상·승인·복원 절차를 갖춘 별도 운영 작업이다. 전체 삭제로 문제를 숨기지 않는다.

## 적용 예시

세그먼트에 100~199가 기록됐지만 199의 payload 절반만 남았다면 유효 끝은 198일 수 있다. 반대로 140의 checksum이 깨진 sealed 파일은 “마지막 한 건 유실”이 아니다. 유효한 141~199를 활용하더라도 140의 gap·손상 출처를 유지하고 연속 prefix가 어디까지인지 별도로 보고한다.

이 절은 독자 작성 설계 사례이며 실행 프로그램이나 바로 적용할 운영 설정 파일이 아니다.

## 실패·동시성·종료 조건

인덱스만 믿고 손상된 offset을 읽지 않는다. disk read error와 checksum mismatch를 구분한다. 복구 중 다시 전원이 꺼져도 이전 유효 manifest를 선택할 수 있어야 한다. 손상 원본을 자동 폐기하거나 검사 실패를 빈 정상 스트림으로 변환하지 않는다.

## 검증 기준

header 길이·payload·checksum·세그먼트 세대·manifest 각각을 변조한 fixture와 모든 byte 경계의 tail 절단을 검사한다. 복구 2회 실행 결과가 동일하고, 확정 범위 밖 데이터를 만들어내지 않으며, 원본 보존·스캔 시간 상한·손상 위치 보고가 유지돼야 한다.

## 관련 설계와 대안

- [이중 슬롯 저장 · 이전 유효본을 남기고 교체](/guides/atomic_dual_slot)
- [세그먼트 순차 로그 · 쓰기 완료와 보존 확정을 분리하기](/guides/segmented_commit_log)
- [ACK·체크포인트·멱등성 · 한 번 처리의 보장 범위](/guides/checkpoint_delivery)
- [연속 데이터 장애 검증 · 유실·복구·용량을 수치로 판단하기](/guides/stream_fault_testing)
- [입력·권한 경계 · 파싱 성공이 실행 허가는 아니다](/guides/input_validation)

## 근거와 한계

- [RocksDB WAL file format](https://github.com/facebook/rocksdb/wiki/Write-Ahead-Log-File-Format) — record length/type/checksum·재사용 로그 번호의 역할; 변동 wiki.
- [SQLite Atomic Commit](https://www.sqlite.org/atomiccommit.html) — 캐시·flush·전원 장애와 저장 계층 가정; 변동 문서. 자체 로그가 SQLite와 같은 보장을 갖는다는 뜻이 아니다.
- [How SQLite Is Tested](https://www.sqlite.org/testing.html) — I/O·메모리 부족·crash·복합 장애 주입과 무결성 확인; 변동 문서.

출처 확인일: 2026-09-20. 공식 문서의 API·동작 계약을 참고하되 이 글의 구조 조합·숫자·절차·예제·수용 기준은 독자 작성 편집 제안이다. 외부 코드·그림은 복제하지 않았다. 고정 판본은 최신판이라는 뜻이 아니며 변동 문서는 적용 시 대상 버전과 제약을 다시 확인한다.

검증 상태: not_tested (실제 대상 환경). 설계 절차용 가이드이며 실행 코드 검증 대상이 아니다. 실제 센서/영상 취득·브로커·파일시스템·저장매체 전원 차단·RTOS/ISR/SMP/DMA·운영 부하·안전/보안 인증은 별도 검증이 필요하다. 유한 저장소와 임의 길이의 장애에서 무조건 무손실을 보장하지 않는다.
