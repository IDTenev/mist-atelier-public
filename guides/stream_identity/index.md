# 스트림 ID·세대·순번 · 연속성과 누락을 구분하기

검토: 2026-09-20 · 분류: 구현 패턴 / 연속성·세션·시간 / 범용 연속 데이터 설계

별칭: Stream Identity, Epoch, Sequence Number, Gap Detection, Reorder Window

적용 분야: 센서 계측, 장치 로그, 이벤트 수집, 오디오·영상 패킷

## 개념과 특징

연속성은 하나가 아니다. 수신 바이트, 논리 레코드 순서, 디스크에 남은 범위, 처리 결과, 표시 시간은 서로 다른 계약이다. 순번이 비었다는 관찰은 아직 도착하지 않았다는 뜻일 수 있고, 유실 판정이나 복구 성공과 같지 않다. 범용 레코드에는 source_id, producer_epoch, sequence, schema_version, payload_length와 시간 기준을 둔다.

## 구조와 동작

소스 식별 → epoch 검증 → 레코드 경계/길이 검사 → 유한 재정렬 창 → 연속 prefix 게시 또는 명시적 GAP → 기록·분석·표시

동일 순번이라도 epoch가 다르면 다른 레코드다. source_id는 논리 장치/채널, epoch는 재시작/소유권 세대, sequence는 그 세대 안에서의 생성 순서다. 여러 소스에 공통 전역 순서가 필요하면 별도 sequencer나 인과관계 모델이 필요하다.

## 언제 쓰고 피할까

- 사용: 장치 재연결과 중복 재전송이 있는 수집기, 표본 누락을 계수해야 하는 계측, out-of-order 입력을 처리하는 스트림.
- 비추천: 단일 최신 상태만 필요하고 과거 gap이 업무 의미가 없는 화면. 번호만 추가하면 전원 장애·패킷 유실이 복구된다고 기대하는 경우.

## 장점과 비용

- 장점: 누락·중복·지연·세대 혼합을 구분할 수 있고 장애 위치를 원본 ID로 추적한다. 재생과 멱등성의 공통 키가 된다.
- 단점·비용: 헤더·재정렬 RAM·대기 지연이 추가된다. source가 번호를 붙이기 전에 놓친 표본은 이 번호만으로 발견하지 못하며 하드웨어 overrun 계수가 별도로 필요하다.

## 설계·구현 가이드

1. 번호를 매기는 경계를 정의한다. 획득 시점 번호와 저장 offset을 혼용하지 않고, 하나의 payload가 여러 표본이면 sample_count와 첫 표본 번호를 둔다.
2. epoch 전환은 인증된 재연결/생산자 소유권 제어로만 승인한다. 낡은 패킷이 왔다고 과거 epoch로 되돌리지 않는다. 재부팅 때 단순히 0부터 같은 ID를 재사용하지 않는다.
3. 재정렬 창을 레코드 수·byte·시간 모두로 제한한다. 창 초과와 deadline 만료는 재전송 요청, GAP 게시, 세션 중단 중 계약된 방식으로 처리한다.
4. 중복 판정 보존 범위와 sequence wrap 전략을 정한다. 고정 폭 모듈러 비교는 허용 거리 제한이 필요하고, 장시간 단절 뒤에는 새 epoch로 재동기화한다. UI의 보간값에는 원본이 아닌 추정 표시를 남긴다.

## 적용 예시

1000 sample/s 센서에서 sequence 100, 102, 101 순서로 도착했다면 102를 잠시 보류해 100·101·102로 게시한다. 101이 기한까지 없으면 GAP [101,101]을 기록한다. 이전 값을 반복 표시해 화면을 부드럽게 해도 원본 유실이 복구된 것은 아니다. RTP의 16-bit packet 번호를 그대로 수년간 저장하는 전역 ID로 쓰지 않는다.

아래 코드를 `stream_identity.mjs`로 저장하고 `node stream_identity.mjs`로 실행한다. Node.js 24 이상, 외부 패키지가 없는 단일 프로세스 PC 모델이며 성공하면 PASS를 출력한다. 실제 I/O·영속성·멀티스레드·장치 제어 구현이 아니다.

```javascript
import assert from 'node:assert/strict';

// Ordered single-source model; the caller fixes epoch through a trusted control path.
class OrderedStream {
    #epoch; #window; #next = 0; #pending = new Map();
    // A finite window bounds both accepted reordering and retained payload count.
    constructor(epoch, window_size = 4) {
        if (typeof epoch !== 'string' || !epoch || epoch.length > 64) throw new TypeError('epoch');
        if (!Number.isInteger(window_size) || window_size < 1 || window_size > 1024) throw new RangeError('window');
        this.#epoch = epoch;
        this.#window = window_size;
    }
    // Reject stale sessions and distant sequence numbers without changing accepted state.
    accept(epoch, sequence, value) {
        if (!Number.isSafeInteger(sequence) || sequence < 0 || sequence >= Number.MAX_SAFE_INTEGER) throw new RangeError('sequence');
        if (!Number.isFinite(value)) throw new TypeError('value');
        if (epoch !== this.#epoch) return { status: 'stale_epoch', values: [] };
        if (sequence < this.#next || this.#pending.has(sequence)) return { status: 'duplicate_or_late', values: [] };
        if (sequence - this.#next >= this.#window) return { status: 'window_exceeded', values: [] };
        this.#pending.set(sequence, value);
        return { status: 'accepted', values: this._drain() };
    }
    // Invoke only after the application's replay/deadline policy explicitly gives up this gap.
    expire_gap() {
        if (this.#pending.size === 0) return { gap: null, values: [] };
        const first = Math.min(...this.#pending.keys());
        const gap = [this.#next, first - 1];
        this.#next = first;
        return { gap, values: this._drain() };
    }
    // Never publish a later record while an earlier sequence is still undecided.
    _drain() {
        const values = [];
        while (this.#pending.has(this.#next)) {
            values.push({ sequence: this.#next, value: this.#pending.get(this.#next) });
            this.#pending.delete(this.#next++);
        }
        return values;
    }
}
const stream = new OrderedStream('boot-a');
assert.deepEqual(stream.accept('boot-a', 1, 10).values, []);
assert.equal(stream.accept('boot-a', 1, 10).status, 'duplicate_or_late');
assert.deepEqual(stream.accept('boot-a', 0, 0).values.map(v => v.sequence), [0, 1]);
assert.equal(stream.accept('old-boot', 2, 20).status, 'stale_epoch');
assert.equal(stream.accept('boot-a', 6, 60).status, 'window_exceeded');
assert.deepEqual(stream.accept('boot-a', 3, 30).values, []);
assert.deepEqual(stream.expire_gap(), { gap: [2, 2], values: [{ sequence: 3, value: 30 }] });
assert.equal(stream.accept('boot-a', 2, 20).status, 'duplicate_or_late');
for (let seq = 4; seq < 100; seq += 2) {
    assert.deepEqual(stream.accept('boot-a', seq + 1, seq + 1).values, []);
    assert.deepEqual(stream.accept('boot-a', seq, seq).values.map(v => v.sequence), [seq, seq + 1]);
}
assert.deepEqual(stream.expire_gap(), { gap: null, values: [] });
assert.throws(() => stream.accept('boot-a', -1, 0), RangeError);
assert.throws(() => new OrderedStream('boot-a', 0), RangeError);
console.log('PASS: bounded reorder, stale epoch, duplicate, explicit gap and zero value');
```

## 실패·동시성·종료 조건

한 소스의 순서 상태는 한 owner가 변경한다. 여러 producer가 같은 epoch를 쓰면 fencing으로 거절한다. 불신 길이/번호로 거대한 배열을 할당하지 않는다. 종료 시 pending 수·포기한 범위를 기록하고 마지막 연속 확정 위치와 마지막 관찰 위치를 별도로 저장한다.

## 검증 기준

0 값, 역순 1→0, 중복, 오래된 epoch, 창 초과, deadline gap 후 늦은 도착, wrap 경계를 검사한다. 생성·수신·확정·gap 수를 동일 ID 집합으로 대조하고, 정상적으로 관찰하지 못한 구간을 0건 유실로 보고하지 않는다.

## 관련 설계와 대안

- [링버퍼 · 순서를 지키는 유한 순환 저장소](/guides/ring_buffer)
- [점진 파서 · 조각난 바이트에서 프레임 복원](/guides/incremental_parser)
- [세션 재개·세대 fencing · 끊긴 뒤 어디서 이어갈까](/guides/stream_session_resume)
- [시간축·워터마크 · 순서와 시각을 따로 맞추기](/guides/stream_time_watermark)
- [ACK·체크포인트·멱등성 · 한 번 처리의 보장 범위](/guides/checkpoint_delivery)

## 근거와 한계

- [RFC 3550 §5.1·Appendix A](https://www.rfc-editor.org/rfc/rfc3550.html) — 2003 RTP 규격의 sequence/timestamp·유실/역순 식별. 이 글의 범용 레코드 형식 자체가 RTP는 아니다.

출처 확인일: 2026-09-20. 공식 문서의 API·동작 계약을 참고하되 이 글의 구조 조합·숫자·절차·예제·수용 기준은 독자 작성 편집 제안이다. 외부 코드·그림은 복제하지 않았다. 고정 판본은 최신판이라는 뜻이 아니며 변동 문서는 적용 시 대상 버전과 제약을 다시 확인한다.

검증 상태: not_tested (실제 대상 환경). 본문 PC 모델의 assertion은 저장소 테스트에서 실행한다. 실제 센서/영상 취득·브로커·파일시스템·저장매체 전원 차단·RTOS/ISR/SMP/DMA·운영 부하·안전/보안 인증은 별도 검증이 필요하다. 유한 저장소와 임의 길이의 장애에서 무조건 무손실을 보장하지 않는다.
