# 메인 루프로 충분한가, RTOS가 필요한가?

문서 0.1.0 · 검토 2026-09-19 · 아키텍처 가이드

## 언제 이 가이드를 쓰나

LED·센서·통신 기능을 하나씩 붙이다가 대기 코드 때문에 다른 처리가 늦어지는 상황을 다룬다. 첫 선택은 기능 개수가 아니라 각 작업의 최장 실행 시간, 허용 응답 지연, 메모리 예산이다. 아래 구조 추천은 Mist Atelier의 설계 제안이며 제조사의 성능 보증이 아니다.

적용 대상: 일반적인 MCU 제어 구조 비교. 실행 예제만 Arduino UNO R3 / ATmega328P / Arduino AVR Boards 1.8.6 / `arduino:avr:uno`에 한정한다. ESP-IDF 비교 근거는 5.5.1이다. 최신 버전 권장이 아니며 UNO R4·다른 Arduino 코어에 그대로 적용한다고 주장하지 않는다.

안전 제어, 인증 요구, 엄격한 최악 응답 시간 보장이 필요한 시스템은 이 입문 예제만으로 구조를 결정하지 않는다.

## 무엇을 선택하나

| 후보 | 선택을 검토할 조건 | 비용·피해야 할 조건 |
|---|---|---|
| 짧은 메인 루프 | 모든 작업을 짧게 나눌 수 있고 한 바퀴의 최장 시간이 응답 요구를 만족 | 한 함수의 긴 대기가 다른 작업을 지연시킴 |
| 메인 루프 + 상태 머신 | 요청·응답·재시도처럼 여러 번의 호출에 걸쳐 진행하는 절차 | 전이와 시간 제한을 정의하지 않으면 숨은 대기가 생김 |
| RTOS 태스크 + 상태 머신 | 독립적으로 기다려야 하는 작업, 우선순위별 응답, 프레임워크가 요구하는 태스크 구조 | 태스크별 스택, 동기화, 우선순위 역전·굶주림·교착 검토 필요 |

상태 머신은 RTOS의 반대말이 아니다. 루프 안에서도 태스크 안에서도 사용할 수 있다. RTOS를 넣어도 같은 버스의 물리 전송 시간이 줄거나 공유 상태가 자동 보호되지는 않는다.

예를 들어 요구 응답이 10 ms라면 각 함수의 평균이 아니라 인터럽트·라이브러리 대기·로그를 포함한 최장 실행 경로를 먼저 측정한다. 10 ms는 설명용 요구값이지 보편적인 설계 기준이 아니다. 장시간 작업을 분할할 수 없을 때 태스크 분리를 검토하되 우선순위만 올려 해결됐다고 판단하지 않는다.

## 책임과 동작 흐름

```text
setup: 출력 초기값 설정 → 핀 초기화 → 기준 시각 저장
loop: 현재 시각 읽기 → LED 서비스 한 단계 → 즉시 반환
      다음 loop에서도 같은 상태를 이어서 처리

확장 시:
Application: 시작·종료 및 의존성 조립
Service: 주기와 상태 전이
Driver/Port: 실제 핀·통신 접근
```

처음부터 세 파일로 나눌 필요는 없다. 아래는 작은 예제이므로 한 파일에 두고 LED 상태와 기준 시각의 수정자를 `led_process`로 한정했다. 보드 교체나 독립 테스트 요구가 생기면 실제 하드웨어 접근 경계를 분리한다.

## 실행 예제: 대기하지 않는 LED 서비스

빈 Arduino 스케치 `loop_demo/loop_demo.ino`에 아래 전체 코드를 넣는다. 외부 회로 없이 내장 LED만 사용한다. 설치된 Arduino CLI와 해당 코어가 있는 환경에서 `arduino-cli compile --fqbn arduino:avr:uno loop_demo`로 빌드한다. 업로드 포트는 실제 연결된 장치를 확인해 선택한다.

```cpp
#include <Arduino.h>
#include <stdint.h>

static const uint32_t LED_INTERVAL_MS = 500UL;
static uint32_t g_led_changed_ms = 0UL;
static bool g_led_on = false;

// 한 번에 한 전이만 수행해 지연 뒤 과도한 따라잡기 반복을 피한다.
static void led_process(uint32_t now_ms)
{
    if ((uint32_t)(now_ms - g_led_changed_ms) < LED_INTERVAL_MS) {
        return;
    }
    g_led_changed_ms = now_ms;
    g_led_on = !g_led_on;
    digitalWrite(LED_BUILTIN, g_led_on ? HIGH : LOW);
}

// 초기 출력과 시간 기준을 정한 뒤 반복 처리에 소유권을 넘긴다.
void setup(void)
{
    digitalWrite(LED_BUILTIN, LOW);
    pinMode(LED_BUILTIN, OUTPUT);
    g_led_changed_ms = (uint32_t)millis();
}

// 긴 delay 없이 다음 서비스가 실행될 기회를 유지한다.
void loop(void)
{
    led_process((uint32_t)millis());
}
```

정상 결과는 약 500 ms마다 LED 상태 전환이다. 코드 자체에 `delay`는 없지만 실행 지연이 0이라는 뜻은 아니다. unsigned 차이로 시계의 한 번의 순환을 처리하며, 경과 시간을 구별할 수 없을 만큼 오래 호출이 중단되는 조건은 지원하지 않는다. 마지막 실제 처리 시각을 저장하므로 엄격한 고정 위상 스케줄러가 아니고, 지연된 토글을 몰아서 재생하지 않는다.

## 실패와 RTOS 전환 시 확인

- LED가 멈추면 전원·업로드·보드 선택과 반복 경로의 블로킹을 나누어 확인한다. 하드웨어 문제가 구조 변경으로 해결된다고 가정하지 않는다.
- 새 센서 함수 추가 뒤 주기가 흔들리면 그 함수의 최장 실행 시간과 타임아웃부터 확인한다. 디버그 출력도 측정에 영향을 줄 수 있다.
- 태스크 분리 시 각 상태의 소유자, 메시지 복사/포인터 수명, 큐 포화 정책을 정한다. 초기화 실패 뒤 태스크를 시작하지 않는다.
- ESP-IDF 5.5.1의 태스크 생성 스택 크기는 바이트 단위다. 일반 FreeRTOS 예제의 값을 단위 확인 없이 옮기지 않는다. SMP에서는 스케줄러 중지만으로 다른 코어의 공유 접근을 막지 못한다.
- 코어 고정과 높은 우선순위는 기본 처방이 아니다. 프레임워크 태스크와의 관계·스택 여유·watchdog·응답 시간을 측정한 뒤 선택한다.

## 검증 상태와 출처

원고의 구조·API 근거를 검토했다. 위 스케치는 이번 작업에서 컴파일·업로드·실기 타이밍을 검증하지 않았다(`not_tested`). 실행 성공 기준은 컴파일, 내장 LED 확인, 다른 작업을 추가한 뒤 최장 지연 재측정으로 분리한다. RTOS 펌웨어 완성 예제는 포함하지 않는다.

이 원고와 예제는 새로 작성한 설계 해설이다. 외부 코드·문서 전문은 복사하지 않았다. 별도 일반 재배포 라이선스는 부여하지 않으며, 연결된 원문의 권리는 각 원저작자에게 있다. 공식 API 사실과 위의 구조 선택 제안은 구분한다.

- [Arduino AVR 1.8.6의 시간 구현](https://github.com/arduino/ArduinoCore-avr/blob/1.8.6/cores/arduino/wiring.c): `millis`와 `delay` 구현 근거.
- [ESP-IDF 5.5.1 ESP32-P4 FreeRTOS](https://docs.espressif.com/projects/esp-idf/en/v5.5.1/esp32p4/api-reference/system/freertos_idf.html): 태스크·스택 단위·SMP 동기화 확인 근거. 다른 SDK 판본에는 재확인 필요.
