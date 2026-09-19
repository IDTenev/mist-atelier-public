# LRU 캐시 · 최근 사용과 데이터 유효성은 별개

검토: 2026-09-20 · 분류: 구현 패턴 / 저장·캐시 / 캐시 교체 정책

별칭: Least Recently Used, LRU, TTL, Cache Invalidation

적용 분야: 서버 조회, 파일 메타데이터, 장치 상태 화면

## 개념과 특징

용량이 차면 가장 오래 사용하지 않은 항목을 내보낸다. LRU는 무엇을 버릴지 결정하고 TTL/버전/무효화는 언제 값이 틀리는지 결정한다. 둘은 서로 대체하지 않는다.

## 구조와 동작

키 조회 → hit면 최근 위치로 이동 / miss면 원본 조회 → 삽입 → 용량 초과 시 오래된 항목 제거

## 언제 쓰고 피할까

- 사용: 동일 키의 재사용 지역성이 있고 원본에서 다시 얻을 수 있는 값일 때.
- 비추천: 권한 판단·재고 확정처럼 오래된 값이 위험한 경로에 무효화 계약 없이 적용하는 경우. 한 번씩만 읽는 scan workload도 LRU를 오염시킬 수 있다.

## 장점과 비용

- 장점: 반복 조회 비용을 줄이고 유한 용량으로 구성하기 쉽다. 해시+이중 연결 리스트는 평균 O(1) 접근·교체를 설계할 수 있다.
- 단점·비용: hit마다 순서 변경과 락이 필요할 수 있다. 항목 수만 제한하면 큰 값 하나가 메모리 예산을 넘는다. Redis의 LRU는 정확한 전체 순서가 아닌 표본 기반 근사다.

## 설계·구현 가이드

1. 키에 tenant·권한 범위·표현 버전을 포함한다. 사용자별 결과를 전역 키로 섞지 않는다.
2. 최대 항목 수와 바이트 한도를 함께 정하고 oversized 값은 캐시하지 않는다.
3. TTL·원본 변경 시 무효화·negative caching 기간을 정한다. 오류를 성공 데이터처럼 오래 보관하지 않는다.
4. 동일 miss 폭주에는 요청 합치기를 조합하고 갱신 중 오래된 값 제공 여부를 명시한다.

## 적용 예시

용량 2에 A, B를 넣고 A를 읽은 뒤 C를 넣으면 B가 제거된다. 그러나 A의 원본이 수정되었는지는 LRU 순서만으로 알 수 없다. 아래 모델은 교체 순서만 다루며 TTL·바이트 예산은 실제 구현에 추가한다.

아래 코드를 `lru_cache.mjs`로 저장하고 `node lru_cache.mjs`로 실행한다. 외부 패키지가 필요 없는 Node.js 22 이상용 단일 프로세스 모델이다. 성공하면 PASS를 출력한다. 실제 펌웨어 코드가 아니며 ISR·SMP·DMA·네트워크·실기 동작은 포함하지 않는다.

```javascript
import assert from 'node:assert/strict';

// This model limits entry count only; production needs a payload-byte policy too.
class LruCache {
    #limit; #items = new Map();
    // Keep the educational model's allocation finite.
    constructor(limit) {
        if (!Number.isInteger(limit) || limit < 1 || limit > 4096) throw new RangeError('limit');
        this.#limit = limit;
    }
    // Hit promotion uses insertion order, without treating undefined as a miss.
    get(key) {
        if (!this.#items.has(key)) return { found: false };
        const value = this.#items.get(key);
        this.#items.delete(key); this.#items.set(key, value);
        return { found: true, value };
    }
    // Overwrite promotes an existing key without evicting an unrelated entry.
    put(key, value) {
        this.#items.delete(key); this.#items.set(key, value);
        if (this.#items.size > this.#limit) this.#items.delete(this.#items.keys().next().value);
    }
}
assert.throws(() => new LruCache(0), RangeError);
const cache = new LruCache(2);
cache.put('a', 1); cache.put('b', 2);
assert.equal(cache.get('a').value, 1);
cache.put('c', 3);
assert.deepEqual(cache.get('b'), { found: false });
cache.put('a', 4);
assert.equal(cache.get('c').value, 3);
assert.equal(cache.get('a').value, 4);
cache.put('u', undefined);
assert.deepEqual(cache.get('u'), { found: true, value: undefined });
assert.deepEqual(cache.get('missing'), { found: false });
console.log('PASS: LRU promotion, eviction, overwrite and miss');
```

## 실패·동시성·종료 조건

cache stampede, tenant 간 정보 혼합, 만료 이후 사용, 메모리 과점유가 주요 실패다. shutdown 때 dirty write-back 데이터가 있다면 이는 단순 재생성 가능한 캐시와 다른 저장 계약이다.

## 검증 기준

hit 갱신·덮어쓰기·최대+1 교체·miss 구분을 검사한다. 운영에서는 hit ratio뿐 아니라 stale 비율·바이트·동시 miss·원본 장애를 측정한다.

## 관련 설계와 대안

- [요청 합치기 · 같은 계산은 진행 중 한 번만](/guides/request_coalescing)
- [WAL · 데이터보다 먼저 남기는 복구 기록](/guides/wal)
- [MVC·MVVM·단방향 상태: 화면과 업무 로직을 분리하기](/guides/ui_state_architecture)

## 근거와 한계

- [Redis Key eviction](https://redis.io/docs/latest/develop/reference/eviction/) — LRU/LFU·근사 LRU·메모리 정책; 변동 문서.

출처 확인일: 2026-09-20. 위 자료는 개념·API 계약의 근거다. 적용 판단·수치·절차·예제는 독자 작성 편집 제안이며 외부 코드·그림의 복제나 제조사 권고 설정값이 아니다. 변동 문서는 적용 시 대상 판본을 다시 확인한다.

검증 상태: not_tested (실제 대상 환경). PC 모델의 assertion은 저장소 테스트에서 실행하지만 MCU 빌드·실기·운영 부하·안전/보안 인증은 별도 검증이 필요하다.
