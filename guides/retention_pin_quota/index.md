# 순환 보존·중요 구간 보호 · 꽉 찬 저장소의 결정 규칙

검토: 2026-09-20 · 분류: 구현 패턴 / 유한 저장소·보존 / 범용 연속 데이터 설계

별칭: Retention Policy, Circular Recording, Pin Quota, Reader Lease, Pre-trigger Post-trigger

적용 분야: 한정 SD/eMMC 로거, 블랙박스 사고 구간, 장기 센서 수집, 오프라인 이벤트 spool

## 개념과 특징

유한 저장소에 양의 속도로 무한히 들어오는 데이터를 영구 보관할 수는 없다. 순환 삭제·입력 중단·유실/요약·외부 이동 중 하나 이상이 필요하다. 오래됐다는 이유만으로 삭제하면 안 되는 중요 구간 pin과 읽는 중인 reader lease를 보존 정책에 함께 넣는다.

## 구조와 동작

저장 예산 산정 → 신규 쓰기 admission → TTL/용량 후보 → sealed·비보호·lease 없음 확인 → 회수 계획 → generation 재검증/회수 → earliest_available 갱신

실제 사용량은 원본 + active + index/WAL + 보호 구간 + 임시 compaction + 파일시스템/복구 여유다. 논리 삭제 직후 공간이 즉시 반환된다고 가정하지 않는다.

## 언제 쓰고 피할까

- 사용: 최신 N시간 또는 Nbyte를 유지하면서 중요 사건 전후 구간은 별도 보호해야 하는 장치. reader의 장기 정지가 저장 전체를 고갈시키면 안 되는 서비스.
- 비추천: 모든 데이터의 무기한 보존이 절대 요구인데 저장장치·외부 보존·입력 통제 예산은 늘릴 수 없는 경우. 임의 데이터에 이 설계 문서를 그대로 적용해 자동 삭제하는 경우.

## 장점과 비용

- 장점: 공간 고갈을 예측하고 무엇이 남는지 운영자가 이해할 수 있다. 이벤트 전후 보호와 일반 순환 영역을 분리한다.
- 단점·비용: pin/lease가 많으면 신규 입력을 거절해야 할 수 있다. 세그먼트 단위 회수라 시간·크기 목표는 오차가 있고 보호 구간 중첩·경계·실패 복구가 복잡하다.

## 설계·구현 가이드

1. 총 용량에서 시스템·index·WAL·작업/복구 reserve를 빼고 원본 예산을 잡는다. 유입률 R이라면 대략 보존 가능 시간은 사용 가능 payload byte/R이며 압축률·보호 영역·경계 낭비를 보수적으로 반영한다.
2. 시간과 용량 중 먼저 위반되는 정책을 적용하되 최소 보존 약속과 충돌하면 삭제 대신 admission 실패를 선언한다. high watermark에서 회수를 시작하고 low watermark까지 내려 반복 진동을 줄인다.
3. 이벤트 발생 시 과거 pre-trigger와 미래 post-trigger 구간을 식별하고 pin한다. 겹친 이벤트는 union/참조로 관리하며 pin 전용 quota·만료/해제 권한·감사 기록을 둔다. 원본 키프레임/보정 상태 등 선행 의존 데이터도 포함한다.
4. 회수 owner 하나가 reader의 lease 획득과 삭제를 직렬화한다. 후보 선택 후 generation과 참조를 다시 검사하고 논리 철회→실제 회수→공간 확인한다. 전부 보호됐으면 조용히 pin을 깨지 말고 경보·거절·승인된 저하 정책으로 전이한다.

## 적용 예시

총 100 MiB 중 복구/메타데이터 reserve 20 MiB, 보호 구간 quota 40 MiB로 가정한다. 원본 사용 예산은 80 MiB지만 pin 30 MiB와 읽는 중인 20 MiB는 당장 회수할 수 없다. 1 MiB/s에서 “항상 최근 80초” 보존을 약속하면 틀린다. 영상·진동 모두 사건 10초 전/20초 후를 보호하되 그 요청도 quota 승인을 받아야 한다.

아래 코드를 `retention_pin_quota.mjs`로 저장하고 `node retention_pin_quota.mjs`로 실행한다. Node.js 24 이상, 외부 패키지가 없는 단일 프로세스 PC 모델이며 성공하면 PASS를 출력한다. 실제 I/O·영속성·멀티스레드·장치 제어 구현이 아니다.

```javascript
import assert from 'node:assert/strict';

// A pure admission planner: returns candidates, never deletes files or mutates caller data.
function retention_plan(segments, incoming_bytes, total_bytes, reserve_bytes, pin_quota_bytes) {
    if (!Array.isArray(segments) || segments.length > 1024) throw new TypeError('segments');
    for (const n of [incoming_bytes, total_bytes, reserve_bytes, pin_quota_bytes]) {
        if (!Number.isSafeInteger(n) || n < 0 || n > 1e12) throw new RangeError('budget');
    }
    if (reserve_bytes >= total_bytes || pin_quota_bytes > total_bytes - reserve_bytes) throw new RangeError('reserve');
    const ids = new Set();
    let used = 0, pinned = 0;
    for (const item of segments) {
        if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id) ||
            !Number.isSafeInteger(item.bytes) || item.bytes <= 0 || item.bytes > 1e12 ||
            !Number.isSafeInteger(item.order) || item.order < 0 ||
            !Number.isInteger(item.leases) || item.leases < 0 ||
            typeof item.sealed !== 'boolean' || typeof item.pinned !== 'boolean') throw new TypeError('segment');
        ids.add(item.id);
        used += item.bytes;
        if (item.pinned) pinned += item.bytes;
    }
    if (pinned > pin_quota_bytes) return { accepted: false, reason: 'pin_quota', remove: [] };
    const budget = total_bytes - reserve_bytes;
    let remaining = used;
    const remove = [];
    const candidates = segments.filter(s => s.sealed && !s.pinned && s.leases === 0)
        .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    for (const item of candidates) {
        if (remaining + incoming_bytes <= budget) break;
        remaining -= item.bytes;
        remove.push(item.id);
    }
    if (remaining + incoming_bytes > budget) return { accepted: false, reason: 'protected_or_full', remove: [] };
    return { accepted: true, remove, planned_bytes: remaining + incoming_bytes };
}
const segments = [
    { id: 'old', bytes: 20, order: 0, sealed: true, pinned: false, leases: 0 },
    { id: 'event', bytes: 30, order: 1, sealed: true, pinned: true, leases: 0 },
    { id: 'reader', bytes: 20, order: 2, sealed: true, pinned: false, leases: 1 },
    { id: 'active', bytes: 10, order: 3, sealed: false, pinned: false, leases: 0 },
];
const before = JSON.stringify(segments);
assert.deepEqual(retention_plan(segments, 10, 100, 20, 40), { accepted: true, remove: ['old'], planned_bytes: 70 });
assert.deepEqual(retention_plan(segments, 30, 100, 20, 40), { accepted: false, reason: 'protected_or_full', remove: [] });
assert.equal(retention_plan(segments, 0, 100, 20, 20).reason, 'pin_quota');
assert.deepEqual(retention_plan(segments, 0, 100, 20, 40).remove, []);
assert.equal(JSON.stringify(segments), before);
assert.throws(() => retention_plan([...segments, segments[0]], 1, 100, 20, 40), TypeError);
assert.throws(() => retention_plan([], -1, 100, 20, 40), RangeError);
assert.throws(() => retention_plan([], 1, 100, 100, 0), RangeError);
console.log('PASS: reserve, pinned data, reader leases, active segment and fail-closed admission');
```

## 실패·동시성·종료 조건

quota는 파일 크기 합계만이 아니라 실제 사용 가능 공간·다른 writer·예약 bytes와 함께 확인한다. lease가 만료됐어도 실제 reader I/O가 끝나기 전 raw block을 재사용하면 안 된다. 강제 해지는 reader fencing/종료 확인을 거친다. 영구 보호가 용량을 넘으면 정책 모순을 숨기지 않는다.

## 검증 기준

TTL 경계·최대 파일 크기·전부 pinned·읽는 중 삭제 경쟁·중첩 사건·pin 해제·reboot 복구·삭제 실패를 검사한다. accepted write에 필요한 reserve가 남는지, 보호 ID가 한 번도 삭제 후보가 되지 않는지, 만료 cursor에 gap이 반환되는지 확인한다.

## 관련 설계와 대안

- [세그먼트 순차 로그 · 쓰기 완료와 보존 확정을 분리하기](/guides/segmented_commit_log)
- [압축·Compaction·계층화 · 무엇을 줄이고 무엇을 잃는가](/guides/compaction_tiering)
- [독립 소비자 Fan-out · 한 소스를 여러 뷰로 나누기](/guides/stream_fanout)
- [세션 재개·세대 fencing · 끊긴 뒤 어디서 이어갈까](/guides/stream_session_resume)
- [연속 데이터 장애 검증 · 유실·복구·용량을 수치로 판단하기](/guides/stream_fault_testing)

## 근거와 한계

- [Prometheus Storage](https://prometheus.io/docs/prometheus/latest/storage/) — 시간/크기 보존·임시 compaction 공간·WAL과 공간 한도의 차이; latest 변동 문서.
- [PostgreSQL 17 Replication configuration](https://www.postgresql.org/docs/17/runtime-config-replication.html) — 고정 17의 replication slot 보존 상한과 재개 불가능성. 일반 reader pin API가 아니다.
- [Zephyr Flash Circular Buffer](https://docs.zephyrproject.org/latest/services/storage/fcb/fcb.html) — sector 단위 회수·길이/checksum·쓰기 중단 또는 오래된 데이터 회수; latest 변동 문서.

출처 확인일: 2026-09-20. 공식 문서의 API·동작 계약을 참고하되 이 글의 구조 조합·숫자·절차·예제·수용 기준은 독자 작성 편집 제안이다. 외부 코드·그림은 복제하지 않았다. 고정 판본은 최신판이라는 뜻이 아니며 변동 문서는 적용 시 대상 버전과 제약을 다시 확인한다.

검증 상태: not_tested (실제 대상 환경). 본문 PC 모델의 assertion은 저장소 테스트에서 실행한다. 실제 센서/영상 취득·브로커·파일시스템·저장매체 전원 차단·RTOS/ISR/SMP/DMA·운영 부하·안전/보안 인증은 별도 검증이 필요하다. 유한 저장소와 임의 길이의 장애에서 무조건 무손실을 보장하지 않는다.
