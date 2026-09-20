# 세그먼트 순차 로그 · 쓰기 완료와 보존 확정을 분리하기

검토: 2026-09-20 · 분류: 구현 패턴 / 유한 저장소·보존 / 범용 연속 데이터 설계

별칭: Segmented Append-only Log, Commit Watermark, Flash Circular Buffer, Rolling Log

적용 분야: 블랙박스, 센서 로거, 통신 spool, 오디오 기록, 서버 이벤트 로그

## 개념과 특징

한 거대 파일에 계속 덧붙이기보다 크기/시간에 따라 작은 세그먼트로 나눠 기록한다. 읽는 위치와 회수할 범위를 관리하기 쉽지만 파일을 나눴다는 사실만으로 전원 장애에 안전해지지는 않는다. received, buffered, written, durable, published의 완료 의미를 분리한다.

## 구조와 동작

획득 → 유한 RAM queue → 단일 append owner → active segment → 데이터/완료 표식 동기화 → commit watermark → sealed segment → 인덱스/독립 reader → 회수 후보

레코드 헤더는 magic·format version·길이·source/epoch/sequence·checksum을 포함하고 세그먼트에는 generation·첫/끝 위치·검증된 경계를 둔다. 이 형식은 설계 제안이지 RocksDB/FCB 포맷의 복제나 호환 구현이 아니다.

## 언제 쓰고 피할까

- 사용: 순서대로 쌓이는 센서/로그/프레임을 순차 쓰기로 저장하고 오래된 구간을 통째로 회수할 때.
- 비추천: 복잡한 동시 transaction과 random update가 주력인데 검증된 DB 대신 자체 저장 엔진을 만드는 경우. raw flash의 erase/program 제약을 파일시스템과 같게 취급하는 경우.

## 장점과 비용

- 장점: 회수·스캔·백업의 단위가 명확하고 순차 I/O에 맞는다. 부분 손상을 작은 구간에 한정하고 임시 인덱스를 다시 만들 수 있다.
- 단점·비용: tail 손상·메타데이터 commit·동기화 지연·세그먼트 경계 낭비가 생긴다. 작은 세그먼트는 메타데이터 비용, 큰 세그먼트는 삭제 granularity와 복구 시간이 커진다.

## 설계·구현 가이드

1. 레코드 최대 크기·세그먼트 한도·정렬·index 간격을 정하고 길이 검증 전에 할당하지 않는다. raw flash는 erase 단위와 최소 program 단위를 따로 확인한다.
2. 파일 기록은 short write와 flush 오류를 처리한다. Linux 파일 fsync와 디렉터리 엔트리 동기화를 구분한다. Windows/MCU는 해당 플랫폼의 보장된 동기화 경로를 사용한다.
3. 읽어도 되는 확정 위치를 내구성 요구에 맞게 게시한다. 전원 장애까지 ACK를 보장하려면 데이터와 필요한 메타데이터의 저장 조건을 충족한 뒤 응답한다. read-back 성공만으로 이를 대체하지 않는다.
4. 재시작 때 active tail을 bounded scan으로 검사하고 마지막 유효 경계까지만 복구한다. sealed manifest 교체·새 파일 생성·이전 파일 회수 순서에도 crash point를 둔다. 단일 writer가 실패하면 다음 세대로 교체한다.

## 적용 예시

1 MiB/s 로그를 4 MiB 세그먼트에 저장하면 약 4초마다 회전한다. 250 ms마다 영속 commit한다면 전원 장애에서 최근 미확정 구간을 잃을 수 있다는 계약을 남겨야 하며 실제 저장장치 cache까지 시험해야 한다. 영상은 GOP 경계 때문에 목표 세그먼트 크기를 넘을 수 있어 다음 segment용 여유를 별도로 둔다.

이 절은 독자 작성 설계 사례이며 실행 프로그램이나 바로 적용할 운영 설정 파일이 아니다.

## 실패·동시성·종료 조건

디스크 full에서 같은 실패 쓰기를 무한 반복하지 않는다. active 또는 reader가 참조 중인 세그먼트를 회수하지 않고, 이름 재사용에는 generation을 검사해 이전 tail을 새 기록으로 오인하지 않는다. flash erase·GC는 획득 ISR에서 수행하지 않으며 종료는 입력 차단→drain 기한→sync 결과→미확정 범위 기록 순이다.

## 검증 기준

레코드 header/payload/checksum, 파일 생성, sync, manifest 교체, seal 각 경계에서 fail/crash를 주입한다. 재시작 후 확정 레코드는 남고 미완성 레코드는 완성본으로 나오지 않아야 한다. peak I/O latency·RAM queue·flash erase 지연·쓰기 증폭을 실제 매체에서 측정한다.

## 관련 설계와 대안

- [WAL · 데이터보다 먼저 남기는 복구 기록](/guides/wal)
- [이중 슬롯 저장 · 이전 유효본을 남기고 교체](/guides/atomic_dual_slot)
- [순환 보존·중요 구간 보호 · 꽉 찬 저장소의 결정 규칙](/guides/retention_pin_quota)
- [무결성·복구 스캔 · 손상된 꼬리와 유효 이력 나누기](/guides/stream_integrity_recovery)
- [ACK·체크포인트·멱등성 · 한 번 처리의 보장 범위](/guides/checkpoint_delivery)

## 근거와 한계

- [Zephyr Flash Circular Buffer](https://docs.zephyrproject.org/latest/services/storage/fcb/fcb.html) — sector 단위 회수·길이/checksum·쓰기 중단 또는 오래된 데이터 회수; latest 변동 문서.
- [Linux man-pages fsync(2)](https://man7.org/linux/man-pages/man2/fsync.2.html) — Linux의 파일/디렉터리 동기화와 오류 반환; Windows·MCU에는 해당 플랫폼 저장 계약을 적용한다.
- [SQLite Atomic Commit](https://www.sqlite.org/atomiccommit.html) — 캐시·flush·전원 장애와 저장 계층 가정; 변동 문서. 자체 로그가 SQLite와 같은 보장을 갖는다는 뜻이 아니다.
- [GStreamer splitmuxsink](https://gstreamer.freedesktop.org/documentation/multifile/splitmuxsink.html) — keyframe/GOP 단위 파일 분할과 크기/시간 한도의 초과 가능성; 변동 API 문서.

출처 확인일: 2026-09-20. 공식 문서의 API·동작 계약을 참고하되 이 글의 구조 조합·숫자·절차·예제·수용 기준은 독자 작성 편집 제안이다. 외부 코드·그림은 복제하지 않았다. 고정 판본은 최신판이라는 뜻이 아니며 변동 문서는 적용 시 대상 버전과 제약을 다시 확인한다.

검증 상태: not_tested (실제 대상 환경). 설계 절차용 가이드이며 실행 코드 검증 대상이 아니다. 실제 센서/영상 취득·브로커·파일시스템·저장매체 전원 차단·RTOS/ISR/SMP/DMA·운영 부하·안전/보안 인증은 별도 검증이 필요하다. 유한 저장소와 임의 길이의 장애에서 무조건 무손실을 보장하지 않는다.
