# UART 데이터가 끊겨 들어올 때 처리하기

문서 0.1.0 · 검토 2026-09-19 · 기능 실전 가이드

## 언제 이 가이드를 쓰나

한 번의 수신에서 명령 하나가 다 오지 않거나 여러 명령이 붙어 들어오는 상황을 다룬다. UART에서 읽을 수 있는 바이트 수와 애플리케이션 메시지 길이는 별개다. 여기서는 직접 정의한 ASCII 명령 `PING`을 LF로 끝내는 작은 프로토콜을 사용한다.

대상은 Arduino UNO R3 / ATmega328P / Arduino AVR Boards 1.8.6 / `arduino:avr:uno`다. USB 시리얼 모니터를 사용하며 외부 UART 배선은 필요 없다. 다른 전압 장치를 임의로 연결하지 않는다. 바이너리·CRC·인증·고속 연속 스트림·안전 제어에는 이 예제를 그대로 사용하지 않는다.

## 무엇을 선택하나

이 예제의 추천은 코어가 수신한 바이트를 루프에서 제한된 개수만 읽고, 메시지 경계 처리는 별도 상태로 유지하는 방식이다. 애플리케이션에서 `Serial.available()`을 확인한다고 하드웨어 수신 전체가 인터럽트 없는 폴링이라는 뜻은 아니다. 코어 내부 수신 방식과 애플리케이션 처리 방식을 구분한다.

직접 ISR이나 DMA를 구성하는 대안은 대상 MCU·드라이버 지원, 지속 유입률, 지연 예산을 확인한 뒤 검토한다. UNO R3의 이 예제를 범용 DMA 예제로 해석하지 않는다. 전송량이 처리량보다 크면 버퍼만 키워서는 지속적인 손실을 해결할 수 없다.

## 책임과 동작 흐름

```text
코어 RX 버퍼 → loop에서 최대 16바이트 읽기 → 프레임 조립
  LF 도착: 완성된 명령만 비교 → PING이면 PONG 전송
  길이 초과/잘못된 문자/시간 초과: 다음 LF까지 폐기 → 새 프레임
```

`g_frame`은 루프의 파서만 수정한다. 처리 함수는 완성된 문자열을 호출 동안만 빌려 읽는다. 큐로 넘길 때 이 버퍼 포인터를 그대로 저장하면 다음 수신이 내용을 덮어쓸 수 있으므로 복사 또는 명시적인 버퍼 소유권 이전이 필요하다.

## 실행 예제

`uart_demo/uart_demo.ino`에 전체 코드를 저장한다. 사전 설치된 Arduino CLI/AVR 코어 환경에서 `arduino-cli compile --fqbn arduino:avr:uno uart_demo`로 빌드한다. 업로드 후 9600 baud, LF 또는 CRLF로 `PING`을 보낸다. 프로토콜은 LF로 구분하며 바로 앞의 CR 한 개만 허용한다.

```cpp
#include <Arduino.h>
#include <stdint.h>
#include <string.h>

static const uint8_t FRAME_CAPACITY = 32U;
static const uint8_t RX_BUDGET = 16U;
static const uint32_t FRAME_TIMEOUT_MS = 250UL;
static char g_frame[FRAME_CAPACITY];
static uint8_t g_length = 0U;
static bool g_discarding = false;
static bool g_seen_cr = false;
static uint32_t g_frame_started_ms = 0UL;

// 조립 버퍼를 보관하지 않고 완성된 명령을 즉시 소비한다.
static void command_process(const char *frame)
{
    if (strcmp(frame, "PING") == 0) {
        Serial.println(F("PONG"));
    } else {
        Serial.println(F("ERR command"));
    }
}

// 손상된 프레임의 뒷부분을 새 명령으로 실행하지 않도록 LF까지 버린다.
static void frame_discard(void)
{
    g_length = 0U;
    g_seen_cr = false;
    g_discarding = true;
}

// LF를 경계로 사용하고 CR은 CRLF의 일부일 때만 받아들인다.
static void frame_receive(char value, uint32_t now_ms)
{
    if (value == '\n') {
        if (!g_discarding && g_length > 0U) {
            g_frame[g_length] = '\0';
            command_process(g_frame);
        }
        g_length = 0U;
        g_seen_cr = false;
        g_discarding = false;
        return;
    }
    if (g_discarding) {
        return;
    }
    if (g_length == 0U && !g_seen_cr) {
        g_frame_started_ms = now_ms;
    }
    if (g_seen_cr) {
        frame_discard();
        return;
    }
    if (value == '\r') {
        g_seen_cr = true;
        return;
    }
    if (value < ' ' || value > '~' || g_length >= FRAME_CAPACITY - 1U) {
        frame_discard();
        return;
    }
    g_frame[g_length++] = value;
}

// USB 시리얼 실험만 시작하며 핀이나 외부 장치는 제어하지 않는다.
void setup(void)
{
    Serial.begin(9600);
}

// 유입이 계속돼도 다른 서비스가 실행될 수 있도록 읽기 횟수를 제한한다.
void loop(void)
{
    for (uint8_t count = 0U; count < RX_BUDGET; count++) {
        const uint32_t now_ms = (uint32_t)millis();
        if (!g_discarding && (g_length > 0U || g_seen_cr) &&
            (uint32_t)(now_ms - g_frame_started_ms) >= FRAME_TIMEOUT_MS) {
            frame_discard();
        }
        if (Serial.available() <= 0) {
            break;
        }
        const int received = Serial.read();
        if (received < 0) {
            break;
        }
        frame_receive((char)received, now_ms);
    }
}
```

32바이트는 널 종료를 포함해 명령 31문자까지 보관하는 예제 값이다. 250 ms는 첫 바이트를 애플리케이션이 읽은 뒤 LF를 처리하기까지의 제한이며 실제 전선의 첫 도착 시각이나 문자 간 timeout 측정이 아니다. ISR 타임스탬프가 없으므로 오래 버퍼에 쌓인 바이트의 도착 간격은 알 수 없다.

## 정상·오류 확인

| 입력/조건 | 예상 결과 |
|---|---|
| `PING` + LF 또는 CRLF | `PONG` 한 줄 |
| `PI` 뒤 짧게 기다려 `NG` + LF, 전체 처리 250 ms 미만 | `PONG` 한 줄 |
| `PING` + LF + `PING` + LF | `PONG` 두 줄 |
| 32문자 이상 뒤 LF | 실행 없이 폐기; 이후 정상 프레임 수신 가능 |
| `PI` 처리 후 250 ms 이상 경과, `NG` + LF | 손상 프레임 폐기; 다음 `PING`은 정상 |
| `PI` + CR + `NG` + LF | 잘못된 CR 위치이므로 폐기 |
| 빈 LF / 알 수 없는 완성 명령 | 빈 LF는 무시 / `ERR command` |

오류 프레임마다 출력하지 않으므로 로그 폭주를 줄인다. 다만 `Serial.println`은 TX 버퍼가 차면 대기할 수 있다. 이 샘플은 사람이 천천히 요청하는 진단용이며, 모든 경로가 비차단이거나 고속에서 무손실이라고 보장하지 않는다. 연속 운용은 TX 큐/흐름 제어, 코어 RX overflow 관찰 방법, timeout의 타임스탬프 위치를 별도 설계해야 한다.

## 검증 상태와 출처

이번 작업에서 API 선언과 설계 경계를 검토했지만 AVR 컴파일·업로드·실기 수신은 하지 않았다(`not_tested`). 위 표는 현장에서 수행해야 할 인수 기준이다. Arduino 빌드 환경이 없으면 보드 성공으로 표시하지 않는다.

원고와 샘플은 독자 작성이며 일반 재배포 라이선스는 별도 부여하지 않는다. 연결된 Arduino 코어 전문을 복사하지 않았으며 그 원문에는 원래 라이선스가 적용된다.

- [Arduino AVR 1.8.6 HardwareSerial 선언](https://github.com/arduino/ArduinoCore-avr/blob/1.8.6/cores/arduino/HardwareSerial.h): 읽기/쓰기 API 확인.
- [Arduino AVR 1.8.6 HardwareSerial 구현](https://github.com/arduino/ArduinoCore-avr/blob/1.8.6/cores/arduino/HardwareSerial.cpp): 송신 대기 경로 확인. 버퍼 크기나 동시성 특성을 다른 코어에 일반화하지 않는다.
