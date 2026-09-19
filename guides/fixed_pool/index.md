# 고정 메모리 풀 · 할당량과 반환 책임 고정

검토: 2026-09-20 · 분류: 구현 패턴 / 메모리·자원 수명 / 메모리 할당 패턴

별칭: Fixed Block Pool, Memory Slab, 고정 블록 풀

적용 분야: 통신 패킷, RTOS 이벤트, 영상 descriptor

## 개념과 특징

같은 크기의 블록 N개를 미리 확보해 free list에서 빌리고 돌려준다. 가변 크기 힙의 외부 단편화 문제를 피하지만 작은 payload에도 한 블록을 쓰는 내부 낭비가 있다.

## 구조와 동작

FREE → 할당/세대 부여 → 한 소유자가 사용 → 반환 검증 → FREE

## 언제 쓰고 피할까

- 사용: 최대 동시 객체 수와 크기를 계산할 수 있고 RAM 예측성이 중요할 때.
- 비추천: 크기·수명이 매우 다양한 객체를 하나의 거대한 블록 크기로 맞추는 경우. 크기별 풀 또는 검증된 allocator를 비교한다.

## 장점과 비용

- 장점: 고정 상한과 재사용이 명료하다. free-list 기반 할당·반환은 O(1)로 구성할 수 있다.
- 단점·비용: 모든 블록을 빌리면 즉시 고갈된다. 이중 반환·다른 풀 반환·반환 후 접근을 막는 책임이 남는다.

## 설계·구현 가이드

1. 최대 생산 중+큐 대기+처리 중+DMA 중 블록을 모두 합산하고 제어용 reserve를 따로 둔다.
2. 정렬을 반영한 블록 크기와 N을 정한다. 128-byte×32는 payload만 4096 byte이며 관리 정보는 추가다.
3. 할당 실패는 null/상태값으로 명시하고 ISR에서는 대기하지 않는다. 공유 free list는 플랫폼에 맞게 직렬화한다.
4. handle에 풀 식별·index·generation을 두거나 소유권 타입을 사용한다. 같은 주소가 재사용되어도 오래된 handle을 거절해야 한다.

## 적용 예시

통신 데이터가 풀을 모두 점유하면 복구 명령조차 할당 실패할 수 있다. 예를 들어 일반 28개+제어 4개처럼 예산을 분리하되 실제 최대 수요로 검증한다.

아래 코드를 `fixed_pool.mjs`로 저장하고 `node fixed_pool.mjs`로 실행한다. 외부 패키지가 필요 없는 Node.js 22 이상용 단일 프로세스 모델이다. 성공하면 PASS를 출력한다. 실제 펌웨어 코드가 아니며 ISR·SMP·DMA·네트워크·실기 동작은 포함하지 않는다.

```javascript
import assert from 'node:assert/strict';

// Identity tokens model ownership, not native address safety or an ISR allocator.
class FixedPool {
    #free; #active = new Map();
    // Only descriptors are modeled; payload memory is platform-specific.
    constructor(count) {
        if (!Number.isInteger(count) || count < 1 || count > 4096) throw new RangeError('count');
        this.#free = Array.from({ length: count }, (_, index) => index);
    }
    // Each lease receives a new identity, including reuse of the same slot.
    acquire() {
        if (!this.#free.length) return null;
        const index = this.#free.pop();
        const token = Object.freeze({ index });
        this.#active.set(token, index);
        return token;
    }
    // Reject foreign, stale and duplicated leases before mutating the free list.
    release(token) {
        if (!this.#active.has(token)) throw new Error('invalid lease');
        const index = this.#active.get(token);
        this.#active.delete(token);
        this.#free.push(index);
    }
}
assert.throws(() => new FixedPool(0), RangeError);
const pool = new FixedPool(2);
const a = pool.acquire(), b = pool.acquire();
assert.equal(pool.acquire(), null);
pool.release(a);
assert.throws(() => pool.release(a), /invalid lease/);
const reused = pool.acquire();
assert.equal(reused.index, a.index);
assert.notEqual(reused, a);
assert.throws(() => pool.release({ index: reused.index }), /invalid lease/);
const foreign = new FixedPool(1).acquire();
assert.throws(() => pool.release(foreign), /invalid lease/);
pool.release(reused); pool.release(b);
assert(pool.acquire()); assert(pool.acquire()); assert.equal(pool.acquire(), null);
console.log('PASS: pool exhaustion, reuse and invalid return');
```

## 실패·동시성·종료 조건

아래 PC 모델은 객체 token으로 이중 반환을 거절한다. 실제 C 포인터의 ABA·use-after-free·ISR 지연을 검증한 것은 아니다. 종료 시 진행 중 임대를 기다리고 남은 소유자를 보고한다.

## 검증 기준

N개 성공 후 N+1 실패, 반환 후 재사용, 중복·타 풀·위조 handle 반환 거절을 검사한다. 장비에서는 할당 최장시간·pool high-water와 반환 누락을 측정한다.

## 관련 설계와 대안

- [제로카피 · 복사 대신 버퍼 수명 전달](/guides/zero_copy)
- [유한 큐 · 생산자–소비자의 속도 조정](/guides/bounded_queue)
- [소유권·RAII · 자원 반환을 수명에 묶기](/guides/ownership_raii)

## 근거와 한계

- [Zephyr Memory Slabs](https://docs.zephyrproject.org/latest/kernel/memory_management/slabs.html) — 고정 블록·정렬·대기 계약; latest 변동 문서.

출처 확인일: 2026-09-20. 위 자료는 개념·API 계약의 근거다. 적용 판단·수치·절차·예제는 독자 작성 편집 제안이며 외부 코드·그림의 복제나 제조사 권고 설정값이 아니다. 변동 문서는 적용 시 대상 판본을 다시 확인한다.

검증 상태: not_tested (실제 대상 환경). PC 모델의 assertion은 저장소 테스트에서 실행하지만 MCU 빌드·실기·운영 부하·안전/보안 인증은 별도 검증이 필요하다.
