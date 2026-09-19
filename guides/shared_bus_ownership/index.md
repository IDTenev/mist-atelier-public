# 여러 장치가 한 버스를 쓸 때: 소유권과 계층 나누기

문서 0.1.0 · 검토 2026-09-19 · 아키텍처 가이드

## 언제 이 가이드를 쓰나

여러 센서·통신 작업이 하나의 I2C/SPI 컨트롤러나 통신 포트를 공유하면서 요청이 섞이거나 특정 작업이 오래 기다리는 상황이다. 여기서는 단일 컨트롤러의 요청 소유권을 설명한다. 멀티마스터 버스 중재, 실제 전기적 복구, CAN 프로토콜 전체를 구현하는 문서가 아니다.

하드웨어 독립 구조 제안이며 API 비교 근거는 ESP-IDF 5.5.1 I2C 문서다. 실행 예제는 Node.js 24 이상의 PC 모델이고, MCU 드라이버나 RTOS 스케줄러가 아니다. 보드 핀·풀업·전압·주파수는 해당 보드/장치 사양에서 별도로 결정한다.

## 무엇을 선택하나

| 대안 | 적용을 검토할 때 | 주의점 |
|---|---|---|
| 한 실행 흐름에서 직접 호출 | 요청자가 하나이고 호출 순서가 명확 | 불필요한 태스크·큐를 추가하지 않음 |
| 드라이버의 동기화된 API 사용 | 문서상 해당 API와 조합의 동시 호출이 보장됨 | API 한 번의 보호와 여러 호출에 걸친 장치 절차의 보호는 다름 |
| 버스 소유자 + 유한 요청 큐 | 여러 요청자의 순서·마감·공정성·종료를 한곳에서 관리해야 함 | 큐 메모리, 대기 지연, head-of-line blocking과 취소 정책 필요 |

추천 구조는 세 번째 조건을 가진 경우에 한정한다. 장치마다 큐가 있어도 실제 송신을 전체 장치의 전역 락 하나가 보호하면 독립된 버스까지 직렬화할 수 있다. 반대로 같은 물리 버스에 락을 장치별로만 두면 공통 컨트롤러 접근이 충돌할 수 있다. 보호 대상은 장치 이름이 아니라 공유 자원과 원자적으로 지켜야 할 작업 범위다.

## 책임과 데이터 흐름

```text
센서 서비스 A ─┐
              ├→ 장치 드라이버 → 유한 요청 큐 → 버스 소유자 → Port/HAL
센서 서비스 B ─┘                                  │
             요청 ID로 결과 받기 ←────────────────┘
```

- Service는 측정 주기와 데이터 유효 상태를 소유한다.
- Driver는 장치 명령·응답 해석을 소유한다. 레지스터 주소나 메시지 형식은 여기서 정한다.
- 버스 소유자는 요청 순서, 전송 완료와 실패, 종료 시 자원 정리를 관리한다.
- Port는 지정된 전송을 수행하고 실제 오류를 반환한다. 장비 동작 정책을 결정하지 않는다.

폴더 예시는 `app/main`, `service/sensor`, `driver/sensor_device`, `port/i2c_bus`다. 각 항목은 책임의 예시이며 파일을 의무적으로 네 개 만들라는 뜻이 아니다. 한 모듈로 충분하면 유지한다.

## 실행 예제: 유한 큐와 마감 처리

아래 전체 코드를 `bus_demo.mjs`로 저장하고 `node bus_demo.mjs`로 실행한다. 실제 장치 대신 동기 함수가 응답한다. 이 모델의 시각은 시험 입력값이며 wall-clock이나 실제 전송 timeout이 아니다.

```javascript
import assert from 'node:assert/strict';

const MAX_PENDING = 2;
const MAX_PAYLOAD_BYTES = 8;
const g_pending = [];

// 제출 시 데이터를 복사해 호출자가 이후 수정해도 요청이 바뀌지 않게 한다.
function bus_submit(request) {
    if (!request || !Number.isSafeInteger(request.id) || request.id < 0 ||
        !Number.isSafeInteger(request.deadline_ms) || request.deadline_ms < 0 ||
        !(request.bytes instanceof Uint8Array) || request.bytes.length < 1 ||
        request.bytes.length > MAX_PAYLOAD_BYTES) return 'invalid';
    if (g_pending.some(item => item.id === request.id)) return 'duplicate';
    if (g_pending.length >= MAX_PENDING) return 'full';
    g_pending.push({ id: request.id, deadline_ms: request.deadline_ms,
        bytes: request.bytes.slice() });
    return 'accepted';
}

// 한 소유자만 호출하며, 시작 전에 만료된 요청은 하드웨어로 보내지 않는다.
function bus_step(now_ms, transfer) {
    if (!Number.isSafeInteger(now_ms) || now_ms < 0 || typeof transfer !== 'function') {
        throw new TypeError('Invalid bus step');
    }
    const request = g_pending.shift();
    if (!request) return null;
    if (now_ms >= request.deadline_ms) return { id: request.id, status: 'expired' };
    try {
        const result = transfer(request.bytes);
        if (!(result instanceof Uint8Array) || result.length > MAX_PAYLOAD_BYTES) {
            return { id: request.id, status: 'invalid_response' };
        }
        return { id: request.id, status: 'ok', bytes: result.slice() };
    } catch {
        return { id: request.id, status: 'io_error' };
    }
}

const g_payload = new Uint8Array([7]);
assert.equal(bus_submit({ id: 1, deadline_ms: 100, bytes: g_payload }), 'accepted');
g_payload[0] = 99;
assert.equal(bus_submit({ id: 1, deadline_ms: 100, bytes: g_payload }), 'duplicate');
assert.equal(bus_submit({ id: 2, deadline_ms: 10, bytes: g_payload }), 'accepted');
assert.equal(bus_submit({ id: 3, deadline_ms: 100, bytes: g_payload }), 'full');
assert.deepEqual(bus_step(5, bytes => bytes), { id: 1, status: 'ok', bytes: new Uint8Array([7]) });
assert.deepEqual(bus_step(10, () => { throw new Error('Must not execute'); }), { id: 2, status: 'expired' });
assert.equal(bus_step(10, bytes => bytes), null);
assert.equal(bus_submit({ id: 4, deadline_ms: 20, bytes: g_payload }), 'accepted');
assert.deepEqual(bus_step(11, () => { throw new Error('Mock transport error'); }), { id: 4, status: 'io_error' });
console.log('PASS: copy, duplicate, full, expired, empty, io_error');
```

예상 출력은 `PASS: copy, duplicate, full, expired, empty, io_error`다. 모든 assertion이 통과한 경우에만 출력된다. 이 예제는 요청 수와 payload 크기를 제한하지만 JS 배열/복사는 동적 할당을 사용하므로 MCU 정적 메모리 구현으로 간주하지 않는다.

## MCU로 옮길 때의 실패·복구 설계

- 큐 포화는 요청자에게 반환한다. 제어 명령을 몰래 폐기하거나 무한 재시도하지 않는다. 최신 센서값 덮어쓰기처럼 의미가 다른 데이터는 별도 정책을 둔다.
- 위 모델은 전송 시작 전 만료만 처리한다. 실제 시스템은 전송 자체의 제한 시간, 취소 가능 여부, 완료 콜백 이후 버퍼 해제까지 정의해야 한다. timeout이 이미 시작된 동작의 취소 성공을 뜻하지 않는다.
- RTOS에는 동시성 안전한 큐 또는 검증한 동기화가 필요하다. 이 JS 큐를 ISR/멀티코어 공유 배열로 직역하지 않는다. ISR 경로는 해당 SDK의 ISR 전용 API와 실행 문맥 제한을 확인한다.
- 큐 관리 락은 짧게 유지하고 잡은 채 통신 완료를 기다리지 않는다. 버스 점유는 소유자 안의 유한 전송으로 관리한다. 별도 버스라면 소유자도 독립시킬 수 있다.
- 우선순위가 높은 요청도 앞의 긴 전송 때문에 기다릴 수 있다. 요청별 최장 전송 시간·기한·굶주림 방지 정책을 측정하고 설계한다. 채널이나 태스크 수만으로 처리량을 주장하지 않는다.
- 종료는 새 요청 차단 → 대기 요청 취소 통보 → 진행 요청 완료/중단 확인 → 버퍼·핸들 해제 순서로 설계한다. 완료 전에 버퍼를 재사용하지 않는다.

## 검증 상태와 출처

자동 테스트는 위 Node.js 코드블록을 직접 실행한다. 검증 범위는 모델의 복사·유한 큐·시작 전 만료·오류 반환이며 실제 RTOS 경쟁 조건이나 버스 신호 시험이 아니다. MCU 빌드·실기는 `not_tested`다.

이 큐 모델과 구조도는 독자 작성이다. 원문 번역·복제를 포함하지 않으며 일반 재배포 라이선스는 별도 부여하지 않는다. 아래 원문의 API 사실과 편집자의 소유자 패턴 추천은 별개다.

- [ESP-IDF 5.5.1 I2C 문서 원문](https://github.com/espressif/esp-idf/blob/v5.5.1/docs/en/api-reference/peripherals/i2c.rst): bus/device 모델과 Thread Safety 절에서 각 API의 보호 범위를 확인한다. 모든 드라이버·모든 복합 절차가 동시성 안전하다는 뜻이 아니다.
