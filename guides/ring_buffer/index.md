# 링버퍼 · 순서를 지키는 유한 순환 저장소

검토: 2026-09-20 · 분류: 구현 패턴 / 버퍼·데이터 이동 / 자료구조

별칭: Ring Buffer, Circular Buffer, SPSC

적용 분야: UART 수신, 오디오 샘플, 로그, 센서 스트림

## 개념과 특징

고정 배열을 순환하며 먼저 들어온 값을 먼저 꺼낸다. 빈 상태와 가득 찬 상태는 한 칸 비우기, 개수 저장, 세대가 있는 인덱스 중 한 방식으로 구별한다. 링버퍼라는 이름 자체가 동시성 안전이나 무손실을 보장하지 않는다.

## 구조와 동작

생산자 → 쓰기 위치의 슬롯 → 게시된 head → 소비자 → tail 반환 → 슬롯 재사용

## 언제 쓰고 피할까

- 사용: 입력 순서가 중요하고 짧은 소비 지연을 유한 RAM으로 흡수해야 할 때. UART ISR에서 바이트를 보관하고 태스크가 파싱하는 경우가 대표적이다.
- 비추천: 소비 속도가 지속적으로 더 느리거나 모든 기록을 영구 보관해야 할 때. 최신값 하나면 충분한 센서 화면에는 메일박스가 더 단순하다.

## 장점과 비용

- 장점: 할당을 반복하지 않고 슬롯 재사용이 쉽다. 고정 크기 항목의 삽입·제거는 O(1), 저장 공간은 O(N)이다.
- 단점·비용: 가득 찼을 때 거절·덮어쓰기·흐름 제어 중 하나를 선택해야 한다. 가변 프레임은 끝에서 두 조각으로 나뉘며, 복사 없는 접근의 연속 길이는 전체 여유 공간보다 작을 수 있다.

## 설계·구현 가이드

1. 입력 최대 속도 R, 소비가 멈출 최장 시간 T, 추가 burst B를 정하고 사용 가능 용량을 R×T+B 이상으로 잡는다. 지속 유입률이 처리율을 넘으면 용량 확대는 해결책이 아니다.
2. 바이트/메시지 단위와 full 정책을 문서화한다. 아래 예제는 전 슬롯 사용·개수 저장·새 입력 거절 방식이다.
3. 생산자/소비자 수와 ISR·태스크·코어를 적는다. SPSC 구현의 release/acquire와 원자적 인덱스 접근은 플랫폼에 맞춰 증명한다. volatile만으로 대체하지 않는다.
4. 복사 후 head를 게시하고 읽기 완료 후 tail을 반환한다. DMA 완료·캐시 유지 작업은 별도 계약이다. MPSC/MPMC가 필요하면 검증된 큐 또는 직렬화로 시작한다.

## 적용 예시

115200 bit/s, 8N1이면 약 11520 byte/s다. 소비 중단 20 ms와 추가 64-byte burst를 가정하면 ceil(230.4+64)=295 byte가 필요하다. 사용 가능 512 byte는 이 가정에는 여유가 있지만 무한 지연을 해결하지 않는다.

아래 코드를 `ring_buffer.mjs`로 저장하고 `node ring_buffer.mjs`로 실행한다. 외부 패키지가 필요 없는 Node.js 22 이상용 단일 프로세스 모델이다. 성공하면 PASS를 출력한다. 실제 펌웨어 코드가 아니며 ISR·SMP·DMA·네트워크·실기 동작은 포함하지 않는다.

```javascript
import assert from 'node:assert/strict';

// Single-thread model: full input is rejected, never silently overwritten.
class ByteRing {
    #data; #head = 0; #tail = 0; #count = 0;
    // Bound allocation for this executable example.
    constructor(capacity) {
        if (!Number.isInteger(capacity) || capacity < 1 || capacity > 65536) throw new RangeError('capacity');
        this.#data = new Uint8Array(capacity);
    }
    // Validate before changing either data or accounting.
    put(value) {
        if (!Number.isInteger(value) || value < 0 || value > 255) throw new RangeError('byte');
        if (this.#count === this.#data.length) return false;
        this.#data[this.#head] = value;
        this.#head = (this.#head + 1) % this.#data.length;
        this.#count++;
        return true;
    }
    // A separate found flag preserves zero as valid data.
    get() {
        if (this.#count === 0) return { found: false };
        const value = this.#data[this.#tail];
        this.#tail = (this.#tail + 1) % this.#data.length;
        this.#count--;
        return { found: true, value };
    }
}
assert.throws(() => new ByteRing(0), RangeError);
const ring = new ByteRing(3);
assert.deepEqual(ring.get(), { found: false });
for (const value of [0, 1, 2]) assert.equal(ring.put(value), true);
assert.equal(ring.put(3), false);
assert.deepEqual(ring.get(), { found: true, value: 0 });
assert.equal(ring.put(3), true);
for (const value of [1, 2, 3]) assert.deepEqual(ring.get(), { found: true, value });
for (let i = 0; i < 100; i++) { assert(ring.put(i)); assert.equal(ring.get().value, i); }
assert.throws(() => ring.put(256), RangeError);
assert.deepEqual(ring.get(), { found: false });
console.log('PASS: ring capacity, overflow, wrap and FIFO');
```

## 실패·동시성·종료 조건

ISR에서 공간을 기다리면 안 된다. overflow 계수·최대 점유율을 기록하고, 프레임 일부가 유실되면 파서 재동기화까지 처리한다. reset은 생산자·소비자·DMA를 멈추고 수행한다. 아래 count 공유 모델을 그대로 멀티스레드 C로 번역하면 안전하지 않다.

## 검증 기준

빈 버퍼, full 거절, 여러 번 wrap, 0 값 보존, 순서·유실 개수를 검사한다. 실제 이식에서는 최장 IRQ 차단·다중 코어 스트레스·캐시 활성 DMA 시험을 추가한다.

## 관련 설계와 대안

- [UART 데이터가 끊겨 들어올 때 처리하기](/guides/uart_receive_flow)
- [유한 큐 · 생산자–소비자의 속도 조정](/guides/bounded_queue)
- [제로카피 · 복사 대신 버퍼 수명 전달](/guides/zero_copy)

## 근거와 한계

- [Linux Circular Buffers](https://docs.kernel.org/core-api/circular-buffers.html) — SPSC와 메모리 순서; 변동 문서.
- [Zephyr 3.7.0 Ring Buffers](https://docs.zephyrproject.org/3.7.0/kernel/data_structures/ring_buffers.html) — 고정 3.7.0의 부분 복사·claim/finish 계약. 다른 판본 API와 혼용 금지.

출처 확인일: 2026-09-20. 위 자료는 개념·API 계약의 근거다. 적용 판단·수치·절차·예제는 독자 작성 편집 제안이며 외부 코드·그림의 복제나 제조사 권고 설정값이 아니다. 변동 문서는 적용 시 대상 판본을 다시 확인한다.

검증 상태: not_tested (실제 대상 환경). PC 모델의 assertion은 저장소 테스트에서 실행하지만 MCU 빌드·실기·운영 부하·안전/보안 인증은 별도 검증이 필요하다.
