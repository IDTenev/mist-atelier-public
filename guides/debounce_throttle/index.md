# 디바운스·스로틀 · UI 호출 빈도 줄이기

검토: 2026-09-20 · 분류: 구현 패턴 / UI·비동기 요청 / 이벤트 빈도 조절 패턴

별칭: Debounce, Throttle, Leading/Trailing Edge, Max Wait

적용 분야: 검색 입력, 자동 저장, 스크롤, 화면 갱신

## 개념과 특징

디바운스는 조용해진 뒤 여러 호출을 하나로 모은다. 스로틀은 계속 입력되는 동안에도 실행 빈도를 제한한다. 어느 쪽도 서버의 권한 검사나 부하 보호를 대신하지 않는다.

## 구조와 동작

입력 → 마지막 인자 보관 → timer 재설정 또는 실행 창 검사 → leading/trailing 실행 → 정리

## 언제 쓰고 피할까

- 사용: 검색창처럼 최종 입력이 중요하면 debounce, 연속 스크롤처럼 주기적 진행 표시가 필요하면 throttle.
- 비추천: 모든 사건을 보존해야 하는 결제·명령·감사 로그, 지연을 허용하지 않는 안전 입력.

## 장점과 비용

- 장점: 불필요한 연산과 요청을 줄이고 화면 반응성을 개선할 수 있다.
- 단점·비용: 마지막 값 유실·오래된 closure·컴포넌트 해제 후 실행·중복 leading/trailing이 생길 수 있다. debounce만 쓰면 계속 입력할 때 영원히 실행되지 않을 수 있다.

## 설계·구현 가이드

1. leading/trailing, 마지막 인자 사용, 최대 대기시간, flush/cancel을 명시한다.
2. debounce는 기존 timer를 취소하고 마지막 입력 기준으로 다시 예약한다. throttle은 다음 허용 시점과 trailing 실행 유무를 구분한다.
3. 화면 해제 시 timer와 pending 작업을 취소하고 늦은 결과는 generation으로 차단한다.
4. 입력창 한글 IME composition 중간값 처리와 Enter 즉시 검색·접근성 피드백을 정의한다.

## 적용 예시

300 ms trailing debounce에서 입력 시각이 0,100,250 ms면 다른 입력이 없을 때 550 ms 이후 한 번 실행한다. 같은 300 ms leading throttle은 0 ms 실행 후 100·250 ms 호출을 억제한다. trailing 옵션이 있으면 마지막 값 처리가 달라진다.

이 절은 구현 결정을 설명하는 설계 사례다. 실행 프로그램이나 장비 설정 파일이 아니다.

## 실패·동시성·종료 조건

브라우저 timer는 정확한 deadline이 아니며 background 탭에서 늦어질 수 있다. 자동 저장의 마지막 입력을 화면 종료 때 조용히 버리지 말고 저장 상태와 실패를 사용자에게 알린다.

## 검증 기준

가짜 시계로 연속 입력·긴 지속 입력·정확한 경계·cancel·flush·화면 해제·IME를 시험한다. 호출 횟수와 마지막 인자가 계약과 일치해야 한다.

## 관련 설계와 대안

- [취소·세대 번호 · 늦은 응답이 현재 상태를 덮지 않게](/guides/cancellation_generation)
- [토큰 버킷 · 평균 유입률과 순간 burst 분리](/guides/token_bucket)
- [MVC·MVVM·단방향 상태: 화면과 업무 로직을 분리하기](/guides/ui_state_architecture)

## 근거와 한계

- [MDN Debounce](https://developer.mozilla.org/en-US/docs/Glossary/Debounce) — 호출 병합·leading/trailing; 변동 문서.
- [MDN Throttle](https://developer.mozilla.org/en-US/docs/Glossary/Throttle) — 연속 호출 빈도 제한; 변동 문서.

출처 확인일: 2026-09-20. 위 자료는 개념·API 계약의 근거다. 적용 판단·수치·절차·예제는 독자 작성 편집 제안이며 외부 코드·그림의 복제나 제조사 권고 설정값이 아니다. 변동 문서는 적용 시 대상 판본을 다시 확인한다.

검증 상태: not_tested (실제 대상 환경). 설계 절차용 가이드이며 실행 코드가 없고 MCU 빌드·실기·운영 부하·안전/보안 인증은 별도 검증이 필요하다.
