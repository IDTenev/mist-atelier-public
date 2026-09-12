# Arduino Zero: LED 핀, 기본 SPI, EDBG 확인

문서 0.2.0 · 검토일 2026-09-11 · 펌웨어 검증: `not_tested` (컴파일·업로드·디버깅 실기 미수행)

## 적용 대상

Arduino Zero ABX00003 / ATSAMD21G18A, Arduino SAMD Boards 1.8.14, commit `993398cb7a23a4e0f821a73501ae98053773165b` 기준이다. 보드 식별자는 Programming Port용 `arduino:samd:arduino_zero_edbg`다. 실물 PCB·실리콘 리비전과 도구 체인은 미확인이다. AVR용 레지스터 코드와 다른 SAMD 보드의 variant를 적용하지 않는다.

## 핀아웃 그림과 코어 설정은 구분한다

[Zero Full Pinout](https://raw.githubusercontent.com/arduino/docs-content/20d1c1c179703cc10ece612f3e4be223fcd02590/content/hardware/12.hero/boards/zero/downloads/ABX00003-full-pinout.pdf) 1쪽(2021-12-17)에서 D13/PA17과 LED_BUILTIN 연결을 확인했다. 그러나 그림의 D11~D13 SPI 표시를 이 코어의 기본 `SPI` 객체 핀으로 바로 읽으면 안 된다.

| 항목 | SAMD Boards 1.8.14 기준 | 근거 |
|---|---|---|
| 내장 LED | Arduino 13 / PA17 | variant.h의 LED 정의, variant.cpp의 핀 13 |
| 기본 SPI MISO | Arduino 22 / PA12 | variant.h의 SPI 정의, variant.cpp의 22~24 |
| 기본 SPI MOSI | Arduino 23 / PB10 | 동일 |
| 기본 SPI SCK | Arduino 24 / PB11 | 동일 |

근거: [variant.h의 LEDs·SPI Interfaces](https://raw.githubusercontent.com/arduino/ArduinoCore-samd/993398cb7a23a4e0f821a73501ae98053773165b/variants/arduino_zero/variant.h), [variant.cpp의 g_APinDescription](https://raw.githubusercontent.com/arduino/ArduinoCore-samd/993398cb7a23a4e0f821a73501ae98053773165b/variants/arduino_zero/variant.cpp). 기본 SPI는 ICSP 헤더 쪽 매핑으로 확인해야 한다. 이는 그림 전체가 잘못되었다는 판정이 아니라, 하드웨어 대체 기능과 선택한 소프트웨어 기본 매핑을 분리한 것이다.

## 최소 LED 예제

빈 스케치 전체에 넣는 새 예제다. 외부 배선을 추가하지 않는다.

```cpp
#include <Arduino.h>

static const unsigned long BLINK_INTERVAL_MS = 500;

// Use the selected board variant instead of hard-coding a port register.
void setup()
{
    pinMode(LED_BUILTIN, OUTPUT);
}

// Blocking timing is limited to this isolated LED check.
void loop()
{
    digitalWrite(LED_BUILTIN, HIGH);
    delay(BLINK_INTERVAL_MS);
    digitalWrite(LED_BUILTIN, LOW);
    delay(BLINK_INTERVAL_MS);
}
```

예상 결과는 내장 LED가 약 0.5초 간격으로 상태를 바꾸는 것이다. 빌드·실기 성공을 확인한 예제가 아니다.

## 디버깅이 시작되지 않을 때

[Debugging with the Arduino Zero](https://raw.githubusercontent.com/arduino/docs-content/20d1c1c179703cc10ece612f3e4be223fcd02590/content/hardware/12.hero/boards/zero/tutorials/debugging-with-zero/debugging-with-zero.md)의 IDE 2 절차에 따라 Programming USB 포트, SAMD 보드 패키지, Atmel EDBG 디버거 선택을 확인한다. Native USB 포트와 혼동하지 않는다. `Optimize for Debugging` 설정과 중단점 위치를 확인하고, 시리얼 프로그램이 포트를 점유한 경우 종료 후 다시 시도한다. IDE의 정확한 설치 버전은 이번에 고정·시험하지 않았다.

SPI 무응답은 먼저 코어의 `SPI` 핀과 연결한 헤더를 대조한다. MCU가 제공하는 SERCOM 대체 기능이 자동으로 모든 헤더에서 활성화되는 것은 아니다. 외부 신호를 연결하기 전 보드 전압과 상대 장치의 신호 조건을 확인한다.

## 자료 공백과 이용 조건

SAMD21 원제조사 데이터시트·정오표·전체 SERCOM 설정·부트로더 복구는 미확보다. 전기적 최대치를 이 요약만 보고 적용하지 않는다.

원저작자: Arduino 및 문서 기여자, 디버깅 안내 저자 Karl Söderby. 한국어 재구성, 판본별 SPI 주의사항, 새 LED 예제와 검증 제한을 추가했다. 본문과 새 예제는 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)이며 상업적 이용 시에도 출처·변경 고지·동일조건을 지킨다. 참조한 코어 원문은 별도의 LGPL-2.1-or-later다. 원저작자의 제휴·인증을 의미하지 않는다.
