# 취소·세대 번호 · 늦은 응답이 현재 상태를 덮지 않게

검토: 2026-09-20 · 분류: 구현 패턴 / UI·비동기 요청 / 비동기 수명·상태 보호 패턴

별칭: Cancellation, AbortController, Generation Token, Latest Wins

적용 분야: 검색 UI, 화면 전환, 연결 재설정, 비동기 계산

## 개념과 특징

취소는 작업 중단을 요청하고 세대 번호는 결과를 아직 적용해도 되는지 판별한다. AbortController는 연결된 비동기 동작을 중단할 수 있지만 이미 원격에서 실행된 부작용을 되돌리는 transaction은 아니다.

## 구조와 동작

새 요청 → 세대 증가·이전 취소 → 비동기 처리 → 완료 시 현재 세대/화면 생존 확인 → 반영 또는 폐기

## 언제 쓰고 피할까

- 사용: 새 검색·장치 연결·화면 전환이 이전 결과를 무효화하고 최신 요청만 UI에 적용해야 할 때.
- 비추천: 모든 결과를 순서대로 처리해야 하는 업무, 이미 실행된 변경을 단순 취소 신호로 롤백하려는 경우.

## 장점과 비용

- 장점: 느린 이전 응답의 화면 덮어쓰기를 막고 불필요한 작업을 줄일 수 있다.
- 단점·비용: 취소 미지원 작업은 계속 비용을 쓴다. 결과·오류·finally의 loading 상태까지 같은 세대 검사가 필요하다.

## 설계·구현 가이드

1. 독립 UI 영역마다 generation을 소유하고 새 요청 시작/화면 종료 때 증가시킨다.
2. 이전 controller를 abort하고 새 controller를 만든다. 이미 abort된 signal을 재사용하지 않는다.
3. 성공·오류·로딩 해제 직전에 token을 비교한다. 디코딩 등 중간 await 이후에도 오래된 상태인지 확인한다.
4. 서버 변경 작업에는 결과 조회·멱등 ID·보상 절차를 별도로 설계한다. 취소와 실패를 사용자 표시에서 구분한다.

## 적용 예시

검색 A가 늦고 나중에 시작한 B가 먼저 끝나면 B만 보여준다. A의 finally가 loading=false를 만들거나 A의 오류가 B 화면에 표시되지 않도록 동일 세대 검사를 적용한다.

아래 코드를 `cancellation_generation.mjs`로 저장하고 `node cancellation_generation.mjs`로 실행한다. 외부 패키지가 필요 없는 Node.js 22 이상용 단일 프로세스 모델이다. 성공하면 PASS를 출력한다. 실제 펌웨어 코드가 아니며 ISR·SMP·DMA·네트워크·실기 동작은 포함하지 않는다.

```javascript
import assert from 'node:assert/strict';

// A controllable completion source avoids network and timing flakiness.
function deferred() {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}
let generation = 0;
const state = { value: null, error: null, loading: false };
// Every state mutation after await is guarded, including error and finally.
async function request(promise) {
    const token = ++generation;
    state.error = null; state.loading = true;
    try {
        const value = await promise;
        if (token === generation) state.value = value;
    } catch (error) {
        if (token === generation) state.error = error.message;
    } finally {
        if (token === generation) state.loading = false;
    }
}
// Unmount/cancel invalidates all previously issued results.
function invalidate() { generation++; state.loading = false; }
const a = deferred(), b = deferred();
const first = request(a.promise), second = request(b.promise);
a.reject(new Error('obsolete'));
await first;
assert.equal(state.loading, true);
assert.equal(state.error, null);
b.resolve('B'); await second;
assert.equal(state.value, 'B');
const c = deferred(), d = deferred();
const third = request(c.promise), fourth = request(d.promise);
d.resolve('D'); await fourth;
c.resolve('C'); await third;
assert.equal(state.value, 'D');
const late = deferred(), pending = request(late.promise);
invalidate(); late.resolve('unmounted'); await pending;
assert.equal(state.value, 'D');
assert.equal(state.loading, false);
console.log('PASS: stale success, stale failure, loading and unmount');
```

## 실패·동시성·종료 조건

아래 PC 모델은 실제 네트워크 없이 역순 완료와 오래된 오류를 검증한다. 정수 세대의 수명·wrap은 플랫폼에서 검토한다. 화면 해제 시 timer·listener·작업 임대도 정리한다.

## 검증 기준

A→B 시작 후 B→A 완료, 오래된 오류, cancel 직후 완료, 화면 해제, 느린 decode, 진행 중 상태를 검사한다. 현재 세대 외 결과와 오류는 UI 상태를 바꾸면 안 된다.

## 관련 설계와 대안

- [MVC·MVVM·단방향 상태: 화면과 업무 로직을 분리하기](/guides/ui_state_architecture)
- [디바운스·스로틀 · UI 호출 빈도 줄이기](/guides/debounce_throttle)
- [재시도·멱등성 · 응답 유실과 중복 실행 분리](/guides/retry_idempotency)

## 근거와 한계

- [MDN AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) — fetch·body·stream 취소; 세대 조합은 편집 설계.

출처 확인일: 2026-09-20. 위 자료는 개념·API 계약의 근거다. 적용 판단·수치·절차·예제는 독자 작성 편집 제안이며 외부 코드·그림의 복제나 제조사 권고 설정값이 아니다. 변동 문서는 적용 시 대상 판본을 다시 확인한다.

검증 상태: not_tested (실제 대상 환경). PC 모델의 assertion은 저장소 테스트에서 실행하지만 MCU 빌드·실기·운영 부하·안전/보안 인증은 별도 검증이 필요하다.
