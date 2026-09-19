# CQRS와 Event Sourcing: 읽기 분리와 이력 저장은 별개 결정

문서 0.1.0 · 검토 2026-09-19 · 데이터 모델 · Node.js 24 예제

## 개념과 특징

[CQRS 공식 설명](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs)은 명령으로 상태를 바꾸는 모델과 조회 모델을 분리한다. 같은 데이터 저장소를 사용해도 된다. 두 DB, 메시지 브로커, Event Sourcing은 필수 조건이 아니다.

[Event Sourcing 설명](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)은 현재 상태 대신 사실의 연속을 기준 기록으로 저장하고 재생해 상태를 구성하는 방식이다. 일반 로그와 달리 이벤트 판본·순서·재생 규칙이 업무 데이터 계약이 된다. 외부 projection을 비동기로 만들면 지연이 생기지만 이벤트 저장 자체가 모든 읽기를 반드시 비동기로 만들라는 뜻은 아니다.

## 구조와 동작

```text
CQRS: 명령 → 규칙/갱신 모델 → 저장
      조회 → 조회 모델     → 저장 또는 projection
Event Sourcing: 명령 → 기대 revision 검사 → 이벤트 append
                                        → 재생/조회 모델
```

이벤트를 재생할 때 과거의 메일·장치 제어·결제를 다시 실행하지 않는다. 상태 계산과 외부 부작용을 분리한다. 개인정보 삭제 요구·schema 변화·snapshot 신뢰 경계는 도입 전 결정한다.

## 구현 순서

1. 먼저 읽기/쓰기 요구가 실제로 다른지 확인한다. 단순 CRUD는 기준안으로 유지한다.
2. 필요하면 같은 DB에서 명령·조회 로직만 분리해 효과를 측정한다.
3. 이력 재구성이 제품 요구일 때만 이벤트 저장을 추가 검토한다. 이벤트 이름·판본·aggregate ID·revision·중복 키를 정의한다.
4. 기대 revision과 append를 저장소에서 원자적으로 처리한다. 별도 읽기 모델에는 반영 revision과 지연 상태를 노출한다.
5. schema 변환·snapshot 재생·잘못된 이벤트 처리·자료 보존 정책을 실제 복구 연습으로 확인한다.

## 실행 가능한 호스트 예제

전체를 `event_log_model.mjs`로 저장해 `node event_log_model.mjs`로 실행한다. 동시성·DB·영속성 없는 유한 메모리 모델이며 분산 exactly-once 구현이 아니다.

```javascript
import assert from 'node:assert/strict';
const MAX_EVENTS = 4;

// Detect conflicting idempotency keys and revision changes before a bounded append.
function append_adjustment(events, id, delta, expected_revision) {
    if (typeof id !== 'string' || !/^[a-z0-9_]{1,32}$/.test(id) || !Number.isSafeInteger(delta)) throw new TypeError('invalid command');
    const previous = events.find(event => event.id === id);
    if (previous) {
        if (previous.delta !== delta) throw new Error('id conflict');
        return events;
    }
    if (expected_revision !== events.length) throw new Error('revision conflict');
    if (events.length >= MAX_EVENTS) throw new Error('log full');
    const value = events.reduce((sum, event) => sum + event.delta, 0) + delta;
    if (!Number.isSafeInteger(value) || value < 0) throw new RangeError('invalid resulting count');
    return [...events, Object.freeze({ id, delta, revision: events.length + 1 })];
}

// Replay only internal validated events; no external action is invoked here.
function project_count(events) {
    return { revision: events.length, count: events.reduce((sum, event) => sum + event.delta, 0) };
}

let events = append_adjustment([], 'first', 2, 0);
assert.strictEqual(append_adjustment(events, 'first', 2, 0), events);
assert.throws(() => append_adjustment(events, 'first', 3, 1), /id conflict/);
assert.throws(() => append_adjustment(events, 'second', 1, 0), /revision conflict/);
assert.throws(() => append_adjustment(events, 'negative', -3, 1), /resulting count/);
events = append_adjustment(events, 'second', -1, 1);
assert.deepEqual(project_count(events), { revision: 2, count: 1 });
events = append_adjustment(events, 'third', 0, 2);
events = append_adjustment(events, 'fourth', 0, 3);
assert.throws(() => append_adjustment(events, 'fifth', 1, 4), /log full/);
assert.throws(() => append_adjustment([], 'bad', NaN, 0), TypeError);
console.log('PASS: replay, duplicate, conflicting command, revision and bounds');
```

읽기 모델이 같은 revision이면 이 예제의 결과는 재생과 일치한다. 실제 저장소에서는 프로세스 두 개가 동시에 길이를 읽어 append하지 않도록 저장소 수준 경쟁 검사를 구현해야 한다.

## 장점과 비용

읽기 최적화·이력 설명·재생에 유리하다. 반면 운영 도구, projection 재구축 시간, 이벤트 장기 호환 비용이 늘어난다. append-only가 무조건 저렴하거나 빠르다는 보장은 없다. 불변 기록에 민감 데이터를 넣으면 삭제·수정 정책이 어려워진다.

## 적용·비추천 조건

복잡한 업무 갱신과 조회 형태가 다르면 CQRS를, 상태 변화 이유와 재구성이 핵심이면 Event Sourcing을 선택적으로 검토한다. 단순 설정·주소록·짧은 실험에는 비용이 더 클 수 있다. 작은 MCU의 모든 상태 변화를 flash에 기록하는 설계는 쓰기 수명·전원 차단 시험 없이는 도입하지 않는다.

## 검증과 전환

중복 키 충돌, 동시 append, 오래된 이벤트 판본, snapshot 제거 후 재생, projection 지연을 시험한다. 먼저 한 도메인에만 적용한다. 과거 현재값을 완전한 사건 이력으로 복원할 수 없다면 초기 snapshot이라는 사실을 명시한다.

## 근거와 한계

2026-09-19 확인한 공식 문서와 독자 모델이다. 모델은 유효한 내부 이벤트만 재생한다. 외부 이벤트 검증·영속 저장·원자성·복구·개인정보 정책·MCU 실기는 not_tested다.
