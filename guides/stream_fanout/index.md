# 독립 소비자 Fan-out · 한 소스를 여러 뷰로 나누기

검토: 2026-09-20 · 분류: 구현 패턴 / 한 소스·다중 뷰 / 범용 연속 데이터 설계

별칭: Fan-out, Broadcast, Independent Consumer Cursor, Multi-reader Log

적용 분야: 센서 차트·원문 기록·경보 동시 처리, 로그 콘솔, 오디오 분석, 영상 멀티뷰

## 개념과 특징

한 큐에서 여러 worker가 항목을 꺼내는 경쟁 소비는 작업 분배다. 모든 뷰가 같은 레코드를 받아야 하는 fan-out과 다르다. 하나의 논리 소스에 여러 구독 cursor를 붙이고 각 소비자의 속도·실패를 별도로 관리한다. 하나의 원본이라는 말이 물리 복사 0회나 단일 장애점 허용을 뜻하지는 않는다.

## 구조와 동작

획득 owner → immutable 레코드/확정 로그 → 기록 consumer / 실시간 표시 consumer / 분석 consumer

각 분기는 독립 cursor 또는 유한 queue와 자체 실행 문맥을 가진다. 공유 payload는 참조 카운트·lease·buffer pool로 수명을 보장하고, 신뢰 경계/프로세스를 넘으면 직렬화 복사가 필요할 수 있다.

## 언제 쓰고 피할까

- 사용: 동일 입력을 여러 화면·경보·저장·분석에 동시에 쓰고 소비자 하나의 종료가 source를 끊으면 안 되는 경우.
- 비추천: 항목마다 정확히 한 worker가 처리하면 되는 작업 분배. 수신자 수·보존 기간 상한 없이 느린 reader까지 영원히 보존해야 한다는 요구.

## 장점과 비용

- 장점: 취득·파싱 중복을 줄이고 각 뷰의 표시율과 계산을 독립 조절한다. 장애를 분기별로 관측하고 격리할 수 있다.
- 단점·비용: 느린 분기가 공유 버퍼나 로그를 붙잡는다. branch queue가 있어도 full 정책이 block이면 결국 상류가 멈춘다. 복사 최소화는 반환 책임과 동시성 비용을 늘린다.

## 설계·구현 가이드

1. 기록은 전 레코드, 화면은 최신값, 경보는 순서 보존 등 분기별 계약을 먼저 정한다. 원본의 보존 위치와 공개 가능한 high-watermark를 하나로 정한다.
2. consumer별 cursor, max_lag, queue_bytes, lease deadline, drop counter를 둔다. 느린 화면은 건너뛰고 기록은 spool/역압력으로 대응하는 식으로 정책을 분리한다.
3. payload를 게시한 뒤 수정하지 않는다. 원본 소유자는 모든 참조가 끝나기 전 슬롯을 재사용하지 않으며 refcount 원자성·메모리 순서·DMA 완료는 실제 환경에서 검증한다.
4. 구독/해지·새 뷰 초기 위치를 명시한다. 최신 위치로 붙을지 보존 시작부터 읽을지 선택하고, 만료 cursor에는 GAP을 반환한다. 한 subscriber의 callback을 source lock 안에서 실행하지 않는다.

## 적용 예시

1 kHz 센서 입력을 파일 writer는 전부 저장하고 화면은 30 Hz로 요약 표시하며 경보는 개별 레코드를 검사한다. 같은 계측 소스를 세 번 열 필요는 없다. 영상도 같은 개념을 쓰지만 서로 다른 seek/재생 속도라면 decoder 상태까지 하나로 공유할 수 있는지는 별도 판단이다.

아래 코드를 `stream_fanout.mjs`로 저장하고 `node stream_fanout.mjs`로 실행한다. Node.js 24 이상, 외부 패키지가 없는 단일 프로세스 PC 모델이며 성공하면 PASS를 출력한다. 실제 I/O·영속성·멀티스레드·장치 제어 구현이 아니다.

```javascript
import assert from 'node:assert/strict';

// One immutable numeric record log; each view has a separate bounded cursor.
class ViewLog {
    #capacity; #records = []; #base = 0; #next = 0; #views = new Map();
    // The example caps views as well as log length; it is not a durable broker.
    constructor(capacity) {
        if (!Number.isInteger(capacity) || capacity < 1 || capacity > 1024) throw new RangeError('capacity');
        this.#capacity = capacity;
    }
    // Late subscribers explicitly choose oldest retained data or future data.
    subscribe(id, start = 'oldest') {
        if (typeof id !== 'string' || !id || id.length > 64 || this.#views.has(id) || this.#views.size >= 8) throw new Error('view');
        if (!['oldest', 'live'].includes(start)) throw new Error('start');
        this.#views.set(id, start === 'live' ? this.#next : this.#base);
    }
    // This policy overwrites oldest data; a lagging view must observe a gap before continuing.
    append(value) {
        if (!Number.isFinite(value) || this.#next >= Number.MAX_SAFE_INTEGER) throw new RangeError('value or sequence');
        this.#records.push(Object.freeze({ sequence: this.#next++, value }));
        if (this.#records.length > this.#capacity) { this.#records.shift(); this.#base++; }
    }
    // Cursor advance models delivery, not successful business processing or durable ACK.
    read(id) {
        if (!this.#views.has(id)) throw new Error('unknown view');
        const cursor = this.#views.get(id);
        if (cursor < this.#base) {
            this.#views.set(id, this.#base);
            return { gap: [cursor, this.#base - 1] };
        }
        if (cursor === this.#next) return { empty: true };
        this.#views.set(id, cursor + 1);
        return { record: this.#records[cursor - this.#base] };
    }
    // Disconnect releases only this subscription; it never stops the source.
    unsubscribe(id) {
        if (!this.#views.delete(id)) throw new Error('unknown view');
    }
}
const log = new ViewLog(3);
log.subscribe('chart');
log.subscribe('archive');
for (const value of [0, 1, 2]) log.append(value);
assert.equal(log.read('chart').record.value, 0);
assert.equal(log.read('archive').record.value, 0);
assert.equal(log.read('chart').record.value, 1);
assert.equal(log.read('chart').record.value, 2);
log.append(3); log.append(4);
assert.deepEqual(log.read('archive'), { gap: [1, 1] });
assert.equal(log.read('archive').record.value, 2);
assert.equal(log.read('chart').record.value, 3);
log.subscribe('late', 'live');
assert.deepEqual(log.read('late'), { empty: true });
log.append(5);
const record = log.read('late').record;
assert(Object.isFrozen(record));
assert.throws(() => { record.value = 999; }, TypeError);
log.unsubscribe('archive');
assert.throws(() => log.read('archive'), /unknown/);
assert.equal(log.read('chart').record.value, 4);
assert.throws(() => log.subscribe('chart'), /view/);
assert.throws(() => new ViewLog(0), RangeError);
console.log('PASS: independent views, immutable data, lag gap and isolated disconnect');
```

## 실패·동시성·종료 조건

공유 SPSC 링의 tail 하나를 여러 reader가 움직이게 하면 방송이 아니라 경쟁/손상이다. writer 속도를 지속적으로 못 따라가는 필수 reader는 저장 한도에서 실패 상태를 알려야 한다. unsubscribe는 그 뷰의 lease만 해제하고 source 종료는 구독 수 정책 또는 명시적 owner가 결정한다.

## 검증 기준

느린 reader·정지 reader·중도 가입/해지·callback 예외를 섞어 다른 뷰와 기록이 계약대로 동작하는지 검사한다. 같은 원본 ID를 각 필수 consumer가 받았는지, overwrite 뒤 gap이 보고되는지, 마지막 반환 후에만 버퍼가 재사용되는지 확인한다.

## 관련 설계와 대안

- [이벤트 기반·Pub/Sub: 결합을 낮추되 전달 계약은 더 엄격하게](/guides/event_driven_pubsub)
- [유한 큐 · 생산자–소비자의 속도 조정](/guides/bounded_queue)
- [제로카피 · 복사 대신 버퍼 수명 전달](/guides/zero_copy)
- [독립 재생·파생 뷰 · 원본은 하나, 시점과 표현은 여러 개](/guides/stream_replay_views)
- [순환 보존·중요 구간 보호 · 꽉 찬 저장소의 결정 규칙](/guides/retention_pin_quota)

## 근거와 한계

- [GStreamer tee](https://gstreamer.freedesktop.org/documentation/coreelements/tee.html) — 분기별 queue가 필요한 미디어 파이프라인 사례; 변동 API 문서.
- [Apache Kafka 4.0 Design](https://kafka.apache.org/40/design/design/) — 고정 4.0의 소비자 offset·전달 의미·compaction. 최신 버전이나 MCU 필수 구성이라는 뜻이 아니다.

출처 확인일: 2026-09-20. 공식 문서의 API·동작 계약을 참고하되 이 글의 구조 조합·숫자·절차·예제·수용 기준은 독자 작성 편집 제안이다. 외부 코드·그림은 복제하지 않았다. 고정 판본은 최신판이라는 뜻이 아니며 변동 문서는 적용 시 대상 버전과 제약을 다시 확인한다.

검증 상태: not_tested (실제 대상 환경). 본문 PC 모델의 assertion은 저장소 테스트에서 실행한다. 실제 센서/영상 취득·브로커·파일시스템·저장매체 전원 차단·RTOS/ISR/SMP/DMA·운영 부하·안전/보안 인증은 별도 검증이 필요하다. 유한 저장소와 임의 길이의 장애에서 무조건 무손실을 보장하지 않는다.
