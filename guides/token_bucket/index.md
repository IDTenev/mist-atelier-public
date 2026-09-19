# 토큰 버킷 · 평균 유입률과 순간 burst 분리

검토: 2026-09-20 · 분류: 구현 패턴 / 보호·진단·보안 / 진입량 제어 패턴

별칭: Token Bucket, Rate Limiter, Burst Budget, 속도 제한

적용 분야: API 요청, 로그 출력, 통신 송신, 재시도 예산

## 개념과 특징

초당 r개 토큰을 최대 B개까지 쌓고 요청 비용만큼 차감한다. 비어 있으면 거절하거나 별도 유한 대기로 넘긴다. 버킷 하나로 순간 burst B와 지속 평균률 r을 분리한다.

## 구조와 동작

단조 시계로 경과 계산 → min(B, tokens+r×dt) → 비용 검사 → 허용/거절 → 마지막 시각 갱신

## 언제 쓰고 피할까

- 사용: 일시 burst를 허용하되 지속 유입량·로그·재시도 비용을 제한하고 싶을 때.
- 비추천: 동시에 실행 중인 수를 제한해야 하는데 rate limit만 사용하는 경우. 긴 작업은 별도 동시성 한도가 필요하다.

## 장점과 비용

- 장점: 짧은 burst와 지속률을 명시적으로 조절하고 상수 상태로 구현할 수 있다.
- 단점·비용: 재시작 시 초기 토큰, 여러 인스턴스의 전역 예산, 사용자별 키 관리가 추가된다. B보다 큰 비용의 요청은 strict 정책에서 영원히 허용되지 않는다.

## 설계·구현 가이드

1. 토큰 단위를 요청 수/byte/가중 비용 중 하나로 고정하고 r·B·초기량을 정한다.
2. 단조 시계와 유한 양수를 사용하고 refill+차감을 같은 원자적 경계에서 수행한다.
3. 사용자별 버킷과 전체 버킷을 조합할 때 비용 차감·실패 환불 계약을 정의한다. 무한 키 생성을 막고 만료 정책을 둔다.
4. 거절은 상태·재시도 가능 시점을 알려주되 대기열을 무한히 만들지 않는다. 멀티노드 로컬 버킷은 합산 허용량이 늘어난다.

## 적용 예시

B=10, r=2/s이고 초기 full이면 즉시 비용 1 요청 10개를 허용하고 11번째는 거절한다. 0.5초 후 하나가 보충된다. 이는 긴 작업 10개가 동시에 실행돼도 안전하다는 뜻은 아니다.

아래 코드를 `token_bucket.mjs`로 저장하고 `node token_bucket.mjs`로 실행한다. 외부 패키지가 필요 없는 Node.js 22 이상용 단일 프로세스 모델이다. 성공하면 PASS를 출력한다. 실제 펌웨어 코드가 아니며 ISR·SMP·DMA·네트워크·실기 동작은 포함하지 않는다.

```javascript
import assert from 'node:assert/strict';

// Strict, single-thread bucket with caller-supplied monotonic seconds.
class TokenBucket {
    #capacity; #rate; #tokens; #last;
    // A full initial bucket intentionally permits an immediate burst.
    constructor(capacity, rate, now = 0) {
        if (![capacity, rate, now].every(Number.isFinite) || capacity <= 0 || rate <= 0 || now < 0) throw new RangeError('configuration');
        this.#capacity = capacity; this.#tokens = capacity; this.#rate = rate; this.#last = now;
    }
    // Invalid input cannot refill or consume the budget.
    allow(cost, now) {
        if (!Number.isFinite(cost) || cost <= 0 || !Number.isFinite(now) || now < this.#last) throw new RangeError('request');
        const elapsed = now - this.#last;
        this.#tokens = Math.min(this.#capacity, this.#tokens + elapsed * this.#rate);
        this.#last = now;
        if (cost > this.#tokens) return false;
        this.#tokens -= cost;
        return true;
    }
}
assert.throws(() => new TokenBucket(0, 2), RangeError);
const bucket = new TokenBucket(10, 2);
for (let i = 0; i < 10; i++) assert(bucket.allow(1, 0));
assert.equal(bucket.allow(1, 0), false);
assert.equal(bucket.allow(1, 0.49), false);
assert.equal(bucket.allow(1, 0.5), true);
assert.equal(bucket.allow(11, 100), false);
assert.equal(bucket.allow(10, 100), true);
assert.equal(bucket.allow(1, 100), false);
assert.throws(() => bucket.allow(-1, 101), RangeError);
assert.throws(() => bucket.allow(NaN, 101), RangeError);
assert.throws(() => bucket.allow(1, 99), RangeError);
console.log('PASS: token burst, refill, ceiling and invalid input');
```

## 실패·동시성·종료 조건

wall clock 역행·음수 비용·NaN으로 한도가 풀리지 않게 한다. 로그 제한은 dropped count를 별도 집계한다. 아래 모델은 한 프로세스·한 버킷의 strict 거절 정책이며 분산 원자성을 검증하지 않는다.

## 검증 기준

초기 burst, 정확한 refill 경계, 비용>B, 음수/NaN, 시각 역행, 긴 idle 후 B 상한, 동시 차감 경합을 시험한다.

## 관련 설계와 대안

- [역압력 · 느린 소비자의 한계를 상류로 전달](/guides/backpressure)
- [장애 격리와 복원력: 타임아웃·재시도·Circuit Breaker·Bulkhead](/guides/resilience_bulkheads)
- [디바운스·스로틀 · UI 호출 빈도 줄이기](/guides/debounce_throttle)

## 근거와 한계

- [RFC 3290 Appendix A](https://www.rfc-editor.org/rfc/rfc3290.html) — 2002 Informational RFC의 토큰 버킷 모델; API 정책은 편집 설계.

출처 확인일: 2026-09-20. 위 자료는 개념·API 계약의 근거다. 적용 판단·수치·절차·예제는 독자 작성 편집 제안이며 외부 코드·그림의 복제나 제조사 권고 설정값이 아니다. 변동 문서는 적용 시 대상 판본을 다시 확인한다.

검증 상태: not_tested (실제 대상 환경). PC 모델의 assertion은 저장소 테스트에서 실행하지만 MCU 빌드·실기·운영 부하·안전/보안 인증은 별도 검증이 필요하다.
