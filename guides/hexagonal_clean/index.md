# Hexagonal·Clean: 정책을 장치와 프레임워크에서 분리하기

문서 0.1.0 · 검토 2026-09-19 · Node.js 24 호스트 모델 포함

## 개념과 특징

[Cockburn의 Ports & Adapters 원문](https://alistair.cockburn.us/hexagonal-architecture)은 애플리케이션을 UI·DB 같은 외부 장치 없이도 구동하고 시험할 수 있게 경계를 둔다. Port는 의미 있는 상호작용 계약이고 Adapter는 구체 기술과의 변환이다. 육각형이라고 포트를 여섯 개 만들 필요는 없다.

[Clean Architecture 원저자 글](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)은 소스 의존성이 안쪽 정책을 향하는 규칙을 강조한다. 두 접근은 관련 있지만 같은 폴더 규칙이나 동일한 프레임워크는 아니다. 실제 호출 흐름과 소스 의존성 방향을 구분해야 한다.

## 구조와 동작

```text
HTTP / 버튼 / 시험 입력 → 사용 사례 → 정책
                              ↓ port 계약
                   DB / HAL / 파일 adapter
main에서 실제 adapter를 주입
```

센서 읽기는 어댑터, 임계값 판정은 정책, 표시 형식은 UI 책임으로 둔다. ADC 오류를 정상 온도 0도로 바꾸지 않는다. HAL 핸들·ORM 행 객체·HTTP Request를 핵심 규칙의 입력 타입으로 전파하지 않는다.

## 구현 순서

1. 장비 없이 시험할 규칙 하나를 고르고 입력·결과·실패를 정의한다.
2. 그 규칙이 필요로 하는 최소 기능만 포트로 만든다. 드라이버 전체 API를 그대로 복제하지 않는다.
3. 실제 장치와 시험용 메모리 어댑터를 같은 계약으로 검증한다.
4. 시작부에서 연결하고 종료부에서 자원을 정리한다. 의존성 주입 프레임워크 없이 함수 인자로 시작해도 된다.
5. 경계에서 단위·범위·타임아웃·오류를 변환하되 원인 정보는 보존한다.

## 실행 가능한 호스트 예제

아래 전체를 `ports_model.mjs`로 저장해 `node ports_model.mjs`로 실행한다. 이 예제는 동기식 가상 센서 계약만 검사하며 실제 센서 읽기·알람 구동·안전 제어를 하지 않는다.

```javascript
import assert from 'node:assert/strict';

// Keep policy independent of the concrete sensor and reject failed or invalid readings.
function assess_temperature(sensor, limit_c) {
    if (!Number.isFinite(limit_c)) throw new TypeError('invalid limit');
    const sample = sensor.read_c();
    if (!sample.ok) return { status: 'unavailable', reason: sample.error };
    if (!Number.isFinite(sample.value)) return { status: 'unavailable', reason: 'invalid_sample' };
    return { status: sample.value >= limit_c ? 'alert' : 'normal' };
}

// A deterministic adapter supplies owned values without retaining caller objects.
function memory_sensor(sample) {
    const saved = structuredClone(sample);
    return { read_c: () => structuredClone(saved) };
}

assert.deepEqual(assess_temperature(memory_sensor({ ok: true, value: 29 }), 30), { status: 'normal' });
assert.deepEqual(assess_temperature(memory_sensor({ ok: true, value: 30 }), 30), { status: 'alert' });
assert.deepEqual(assess_temperature(memory_sensor({ ok: false, error: 'timeout' }), 30),
    { status: 'unavailable', reason: 'timeout' });
assert.equal(assess_temperature(memory_sensor({ ok: true, value: NaN }), 30).status, 'unavailable');
assert.throws(() => assess_temperature(memory_sensor({ ok: true, value: 20 }), NaN), TypeError);
console.log('PASS: ports normal, boundary, failure and invalid input');
```

실제 어댑터에서는 예외를 포트 오류로 매핑하고 단위·캘리브레이션·최대 읽기 시간을 정해야 한다. 이 모델의 단일 임계값에는 히스테리시스와 시간 필터가 없으므로 현장 알람에 그대로 사용하지 않는다.

## 장점과 비용

하드웨어·DB 없이 정책 시험이 가능하고 외부 기술 변경의 파급을 줄인다. 반면 계약과 변환 코드가 늘고 잘못된 추상화가 오히려 교체를 어렵게 할 수 있다. 함수 하나에도 포트·팩토리·계층을 강제하는 것은 목적이 아니다.

## 적용·비추천 조건

다중 보드, 실제 장비/시뮬레이터 전환, 장수하는 업무 규칙, 외부 API 교체에 적합하다. 일회성 데이터 변환이나 안정적인 짧은 드라이버까지 전면 도입할 필요는 없다. ISR마다 가상 호출을 넣는 식의 비용은 목표 MCU에서 측정한다.

## 검증과 전환

핵심 모듈의 HAL/HTTP/DB import 금지, 모든 어댑터의 오류·단위 계약, 실제 하드웨어 통합을 별도로 검사한다. 기존 함수 하나에서 외부 접근부터 추출해 점진 적용한다. [모듈러 구성](/guides/layered_modular_monolith)과 함께 사용할 수 있다.

## 근거와 한계

원저자 개념 설명을 2026-09-19 확인했고 예제는 독자 작성했다. 호스트 assertion 성공은 장비 응답·메모리·실시간 보장이 아니다. 펌웨어/실기 상태는 not_tested다.
