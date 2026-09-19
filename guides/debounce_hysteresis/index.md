# 디바운스·히스테리시스 · 전환이 흔들리지 않게

검토: 2026-09-20 · 분류: 구현 패턴 / 센서·제어 / 입력 안정화 패턴

별칭: Debounce, Hysteresis, Schmitt Trigger, 접점 튐

적용 분야: 버튼, 센서 경보, 팬 on/off, 장치 상태

## 개념과 특징

디바운스는 일정 시간 안정된 입력만 전환으로 인정한다. 히스테리시스는 켜는 문턱과 끄는 문턱을 다르게 둔다. 시간 조건과 값 조건은 서로 다른 잡음을 다루며 필요하면 조합한다.

## 구조와 동작

원시 입력 → 후보 상태/시간 갱신 → 안정 시간 검사 → 확정 상태; 측정값 → 상·하 문턱 → 이전 상태 유지/전환

## 언제 쓰고 피할까

- 사용: 기계 접점 튐이나 임계값 부근 잡음으로 상태가 반복 전환될 때.
- 비추천: 짧은 펄스를 모두 세야 하는 계수기, 과전류 차단 등 반응 deadline이 필수인데 임의 지연을 추가하는 경우.

## 장점과 비용

- 장점: 불필요한 상태 전환·릴레이 마모·경보 폭주를 줄이고 작은 상태로 구현할 수 있다.
- 단점·비용: 디바운스는 반응을 늦추고 히스테리시스는 되돌아오는 문턱을 바꾼다. 잡음 폭이 문턱 간격보다 크면 여전히 흔들릴 수 있다.

## 설계·구현 가이드

1. 신호의 튐 시간·잡음 폭을 측정하고 허용 반응시간을 먼저 정한다.
2. 버튼은 raw, candidate, stable, candidate_since를 분리한다. 후보가 바뀔 때만 시간을 다시 시작한다.
3. 경보는 low<high와 경계 포함 여부를 고정한다. 초기 상태와 invalid/NaN 입력 처리도 정의한다.
4. MCU tick wrap은 안전한 차이 계산으로 처리하고 샘플 주기가 입력 펄스를 놓치지 않는지 확인한다. ISR에서 지연 대기하지 않는다.

## 적용 예시

설명용 온도 경보를 30 이상 ON, 28 이하 OFF로 두면 29.5↔30.2 잡음 때문에 매번 꺼지지 않는다. 이는 안전 온도 권고가 아니며 센서 오차와 설비 안전 한계로 실제 값을 정해야 한다.

아래 코드를 `debounce_hysteresis.mjs`로 저장하고 `node debounce_hysteresis.mjs`로 실행한다. 외부 패키지가 필요 없는 Node.js 22 이상용 단일 프로세스 모델이다. 성공하면 PASS를 출력한다. 실제 펌웨어 코드가 아니며 ISR·SMP·DMA·네트워크·실기 동작은 포함하지 않는다.

```javascript
import assert from 'node:assert/strict';

// An invalid measurement is a fault, not a normal low reading.
function create_hysteresis(low, high, initial = false) {
    if (![low, high].every(Number.isFinite) || low >= high || typeof initial !== 'boolean') throw new RangeError('thresholds');
    let active = initial;
    // Both boundary comparisons are inclusive by contract.
    return function update(value) {
        if (!Number.isFinite(value)) throw new TypeError('invalid measurement');
        if (!active && value >= high) active = true;
        else if (active && value <= low) active = false;
        return active;
    };
}
assert.throws(() => create_hysteresis(30, 28), RangeError);
const update = create_hysteresis(28, 30);
assert.deepEqual([29, 30, 29.9, 29, 28, 29, 31].map(update),
    [false, true, true, true, false, false, true]);
assert.throws(() => update(NaN), TypeError);
assert.equal(update(29), true);
assert.equal(update(28), false);
console.log('PASS: hysteresis boundaries, retained state and invalid input');
```

## 실패·동시성·종료 조건

센서 단선 값을 정상 저온으로 처리하면 위험하다. invalid는 별도 fault 상태로 보내고 하드웨어 안전 차단을 소프트웨어 필터로 대체하지 않는다. 재시작 시 초기 상태를 명시한다.

## 검증 기준

문턱 정확히 일치·문턱 사이 반복·NaN·빠른 바운스·tick wrap·짧은 정상 펄스·부팅 초기값을 시험한다. 아래 모델은 히스테리시스 논리만 검사한다.

## 관련 설계와 대안

- [이동 평균·EMA · 부드러움과 지연의 교환](/guides/moving_average)
- [상태 머신·Active Object: 순서와 상태 변경 경로를 고정하기](/guides/state_machine_active_object)
- [디바운스·스로틀 · UI 호출 빈도 줄이기](/guides/debounce_throttle)

## 근거와 한계

- [Arduino Debounce 공식 예제](https://raw.githubusercontent.com/arduino/arduino-examples/main/examples/02.Digital/Debounce/Debounce.ino) — main 변동 소스의 시간 기반 안정화; 코드 복제 없음.
- [TI Comparator with hysteresis](https://www.ti.com/tool/CIRCUIT060076) — 상·하 문턱으로 잡음 전환 억제; SW 수치·설계는 편집 제안.

출처 확인일: 2026-09-20. 위 자료는 개념·API 계약의 근거다. 적용 판단·수치·절차·예제는 독자 작성 편집 제안이며 외부 코드·그림의 복제나 제조사 권고 설정값이 아니다. 변동 문서는 적용 시 대상 판본을 다시 확인한다.

검증 상태: not_tested (실제 대상 환경). PC 모델의 assertion은 저장소 테스트에서 실행하지만 MCU 빌드·실기·운영 부하·안전/보안 인증은 별도 검증이 필요하다.
