# 압축·Compaction·계층화 · 무엇을 줄이고 무엇을 잃는가

검토: 2026-09-20 · 분류: 구현 패턴 / 유한 저장소·보존 / 범용 연속 데이터 설계

별칭: Lossless Compression, Log Compaction, Downsampling, Tiered Storage, Wear Leveling

적용 분야: 센서 장기 추세, 로그 보존, 엣지 저장장치, 상태 이벤트 저장, 음성·영상 아카이브

## 개념과 특징

압축, compaction, downsampling, tiering은 서로 대체어가 아니다. 무손실 압축은 원래 byte 복원을 목표로 한다. key별 최신 상태만 남기는 log compaction은 중간 변경 이력을 제거한다. downsampling은 표본을 줄여 세부 정보를 잃는다. tiering은 데이터를 다른 저장 계층으로 옮길 뿐 전체 데이터량을 없애지 않는다.

## 구조와 동작

sealed 원본 → 정책/복원 요구 판정 → 별도 작업 공간에서 변환/업로드 → hash·범위·index 검증 → 새 manifest 게시 → reader 전환 → 이전본 회수

압축/요약 결과에는 원본 source·구간·schema·변환 버전·복원 가능 여부를 기록한다. 새 출력 검증 전 유일한 원본을 지우지 않는다.

## 언제 쓰고 피할까

- 사용: 원본 전체보다 장기 추세가 중요한 계측, 충분한 복원 시간으로 차가운 데이터를 외부에 보관할 수 있는 서비스, 중간 이력 없이 최신 상태 재구성이 목적일 때.
- 비추천: 감사·사고 분석에 모든 변화가 필요한데 최신 key값만 남기는 경우. 보존 원본이 필요한데 평균으로 치환하거나 이미 압축된 영상에 큰 추가 압축률을 가정하는 경우.

## 장점과 비용

- 장점: 적절한 정책이면 보존 기간과 조회 비용을 개선한다. hot 데이터는 빠르게, cold 데이터는 저렴하게 관리할 수 있다.
- 단점·비용: 재압축·병합은 CPU/I/O·임시 공간과 쓰기 증폭을 만든다. 계층화는 외부 저장 장애·권한·비용·복원 지연을 추가한다. 요약·key compaction으로 사라진 이력은 재생할 수 없다.

## 설계·구현 가이드

1. 먼저 원본 byte 복원, 원래 사건 이력, 최신 상태 재구성, 장기 통계 중 필요한 것을 구분한다. “압축률” 하나로 이들을 평가하지 않는다.
2. 비압축/압축 분포와 p99 변환 시간을 실측한다. input+output+manifest가 함께 존재하는 peak 공간을 예약하고 낮은 여유 공간에서 무조건 compaction을 시작하지 않는다.
3. 센서 요약은 평균만이 아니라 필요에 따라 count·min/max·결측·시간 범위를 남긴다. 계층화는 원격 복사 checksum·가용성·권한을 검증한 뒤 로컬을 회수하고 restore 시험을 수행한다.
4. raw flash의 erase/program 수명과 SD/eMMC 내부 FTL을 구분한다. circular append만으로 wear leveling이 완성되지 않는다. 메타데이터 hotspot과 쓰기 증폭을 측정하고 플랫폼의 검증된 저장 계층을 사용한다.

## 적용 예시

1 kHz 계측을 하루 후 1초 단위 count/min/max/sum으로 요약하면 장기 추세를 싸게 볼 수 있지만 순간 파형을 복원할 수는 없다. 최근 1시간 원본 + 사건 pin 원본 + 오래된 요약의 세 영역을 별도 예산으로 관리한다. key=장치 상태의 최신값 compaction을 블랙박스 전체 사건 이력에 적용하지 않는다.

이 절은 독자 작성 설계 사례이며 실행 프로그램이나 바로 적용할 운영 설정 파일이 아니다.

## 실패·동시성·종료 조건

업로드 성공 응답과 복원 가능한 원격 객체의 확정·해시 검증을 구분한다. 작업 중 재시작하면 old/new 중 하나의 검증된 manifest를 선택한다. 원본 삭제 정책과 개인정보/권한 철회는 원격·파생본에도 이어져야 한다. 원격 장애 시 local spool 한도를 넘으면 명시적 중단/저하가 필요하다.

## 검증 기준

무손실 압축은 byte hash 왕복 일치, key compaction은 허용된 최신 상태 일치, 요약은 정의된 통계 일치를 각각 검사한다. compaction 중 full·crash·업로드 timeout·원격 손상·복원 시간 초과를 주입하고 peak 사용량과 실제 장치 쓰기량을 측정한다.

## 관련 설계와 대안

- [순환 보존·중요 구간 보호 · 꽉 찬 저장소의 결정 규칙](/guides/retention_pin_quota)
- [세그먼트 순차 로그 · 쓰기 완료와 보존 확정을 분리하기](/guides/segmented_commit_log)
- [독립 재생·파생 뷰 · 원본은 하나, 시점과 표현은 여러 개](/guides/stream_replay_views)
- [무결성·복구 스캔 · 손상된 꼬리와 유효 이력 나누기](/guides/stream_integrity_recovery)

## 근거와 한계

- [RocksDB Compaction](https://github.com/facebook/rocksdb/wiki/Compaction) — 읽기·쓰기·공간 증폭의 trade-off; 변동 wiki.
- [Apache Kafka 4.0 Design](https://kafka.apache.org/40/design/design/) — 고정 4.0의 소비자 offset·전달 의미·compaction. 최신 버전이나 MCU 필수 구성이라는 뜻이 아니다.
- [Apache Kafka 4.0 Tiered Storage](https://kafka.apache.org/40/operations/tiered-storage/) — 고정 4.0의 local/remote retention과 업로드 후 로컬 회수 경계.
- [littlefs DESIGN](https://github.com/littlefs-project/littlefs/blob/master/DESIGN.md) — flash 제약·metadata pair·동적 wear leveling; master 변동 문서.

출처 확인일: 2026-09-20. 공식 문서의 API·동작 계약을 참고하되 이 글의 구조 조합·숫자·절차·예제·수용 기준은 독자 작성 편집 제안이다. 외부 코드·그림은 복제하지 않았다. 고정 판본은 최신판이라는 뜻이 아니며 변동 문서는 적용 시 대상 버전과 제약을 다시 확인한다.

검증 상태: not_tested (실제 대상 환경). 설계 절차용 가이드이며 실행 코드 검증 대상이 아니다. 실제 센서/영상 취득·브로커·파일시스템·저장매체 전원 차단·RTOS/ISR/SMP/DMA·운영 부하·안전/보안 인증은 별도 검증이 필요하다. 유한 저장소와 임의 길이의 장애에서 무조건 무손실을 보장하지 않는다.
