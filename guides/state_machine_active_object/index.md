# 상태 머신·Active Object: 순서와 상태 변경 경로를 고정하기

문서 0.1.0 · 검토 2026-09-19 · MCU·프로토콜 · Node.js 24 모델

## 개념과 특징

상태 머신은 현재 상태와 입력 이벤트로 허용 전이를 정한다. Active Object는 상태를 소유하는 실행 주체가 큐의 이벤트를 처리하는 구성이다. 상태 머신은 메인 루프·RTOS·Actor 안에 들어갈 수 있으므로 RTOS와 양자택일이 아니다.

[Zephyr 3.7.0 SMF](https://docs.zephyrproject.org/3.7.0/services/smf/index.html)는 상태 진입·실행·종료 및 계층 상태를 제공한다. [QP/C Active Object 계약](https://www.state-machine.com/qpc/srs-qp_ao.html)은 이벤트의 run-to-completion 처리를 설명한다. 이는 현재 이벤트 처리를 끝내고 다음 이벤트를 받는다는 뜻이지 인터럽트 금지나 선점 불가능을 뜻하지 않는다.

## 구조와 동작

```text
입력 / 타이머 → 유한 이벤트 큐 → 상태 소유자 → 출력 요청
                  full 정책       현재 상태 + 전이표
출력 완료 → 별도 이벤트로 되돌림
```

긴 작업을 이벤트 처리 함수 안에서 기다리면 뒤의 이벤트가 막힌다. 시작 요청을 내보내고 완료·타임아웃을 새 이벤트로 받아야 한다. 늦게 도착한 완료에는 연결 세대나 요청 ID를 붙여 현재 작업과 구분한다.

## 구현 순서

1. 정상 상태뿐 아니라 초기화·중단·실패·재시작을 포함한 전이표를 작성한다.
2. 한 이벤트 처리 시간의 상한과 큐 크기, 포화 시 버릴 대상·거절·상위 오류 보고를 정한다.
3. 상태를 변경하는 진입점을 하나로 모은다. UI나 ISR이 상태 변수를 직접 고치지 않는다.
4. 타이머 취소와 이미 큐에 들어간 timeout을 구별한다. 세대 번호가 다른 입력은 무시하거나 기록한다.
5. 공통 동작이 반복될 때 계층 상태를 검토한다. 처음부터 모든 상태를 상속 구조로 만들지 않는다.

## 실행 가능한 호스트 예제

전체를 `state_model.mjs`로 저장해 `node state_model.mjs`로 실행한다. 연결 결과를 판정하는 순수 함수이며 큐·타이머·실제 연결은 구현하지 않는다.

```javascript
import assert from 'node:assert/strict';

// Ignore stale completions and keep failed sessions closed until an explicit new start.
function transition(state, event) {
    if (!['idle', 'waiting', 'ready', 'fault'].includes(state.phase)) throw new TypeError('invalid state');
    if (event.type === 'start') {
        if (!Number.isSafeInteger(event.generation) || event.generation <= state.generation) return state;
        return { phase: 'waiting', generation: event.generation };
    }
    if (event.type === 'stop') return { ...state, phase: 'idle' };
    if (state.phase !== 'waiting' || event.generation !== state.generation) return state;
    if (event.type === 'connected') return { ...state, phase: 'ready' };
    if (event.type === 'timeout') return { ...state, phase: 'fault' };
    return state;
}

let state = { phase: 'idle', generation: 0 };
state = transition(state, { type: 'start', generation: 1 });
assert.equal(state.phase, 'waiting');
assert.strictEqual(transition(state, { type: 'connected', generation: 0 }), state);
state = transition(state, { type: 'timeout', generation: 1 });
assert.equal(state.phase, 'fault');
assert.strictEqual(transition(state, { type: 'connected', generation: 1 }), state);
state = transition(state, { type: 'start', generation: 2 });
state = transition(state, { type: 'connected', generation: 2 });
assert.equal(state.phase, 'ready');
assert.equal(transition(state, { type: 'stop' }).phase, 'idle');
assert.throws(() => transition({ phase: 'bad' }, {}), TypeError);
console.log('PASS: state transitions, stale events, timeout and restart');
```

세대 번호는 이 모델의 생존 기간에만 유일하다. 실제 재부팅·서버 재시작을 넘는 고유성, 번호 순환, 취소된 외부 작업의 정리는 별도 계약이다. ‘이벤트 무시’가 실제 자원 해제를 대신하지 않는다.

## 장점과 비용

불가능한 상태 조합을 줄이고 전이를 재현하기 쉽다. 대신 이벤트 설계·큐·타이머 수명 관리가 추가된다. 많은 독립 속성을 하나의 상태 enum에 곱해 넣으면 상태 수가 폭발한다. 독립 영역을 분리하되 상호작용 규칙을 시험해야 한다.

## 적용·비추천 조건

연결·부팅·업데이트·통신 복구처럼 순서와 재진입이 중요한 흐름에 적합하다. 단순 계산 함수에는 이점이 작다. 짧은 제어 마감은 이벤트 모델만으로 보장되지 않는다. [RTOS 실행 예산](/guides/rtos_task_architecture)과 [통신 복구](/guides/communication_recovery)를 함께 검토한다.

## 검증과 전환

전이표의 허용·금지 입력, 중복 완료, timeout 직후 성공, stop 후 늦은 응답을 시험한다. 기존 boolean 묶음을 한 가지 실행 흐름부터 전이 함수로 옮긴다. 큐 지연과 최대 처리 시간은 실제 타깃에서 따로 측정한다.

## 근거와 한계

Zephyr 문서는 3.7.0 고정 판본, QP/C 링크는 2026-09-19의 변동 문서다. 외부 프레임워크 코드는 복제하지 않았다. 위 Node 모델은 독자 작성한 상태 전이 시험이며 MCU/RTOS·실기 검증은 not_tested다.
