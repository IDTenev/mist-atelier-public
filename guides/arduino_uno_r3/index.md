# Arduino UNO R3: 보드 핀과 GPIO 첫 확인

문서 0.2.0 · 검토일 2026-09-11 · 펌웨어 검증: `not_tested` (컴파일·업로드·실기 미수행)

## 적용 대상

Arduino UNO R3 A000066, ATmega328P, Arduino AVR Boards 1.8.6을 기준으로 한다. 코어 commit은 `42fa4a1ea1b1b11d1cc0a60298e529d37f9d14bd`, 보드 식별자는 `arduino:avr:uno`다. UNO R4·UNO WiFi 및 다른 AVR 보드에 그대로 적용하지 않는다. 실물의 칩 리비전과 도구 체인 버전은 미확인이다.

## 핀 번호를 읽는 기준

Arduino 숫자 핀 13, MCU 포트 PB5, 보드 LED는 같은 연결을 가리키지만 이름의 계층이 다르다. [UNO Full Pinout](https://raw.githubusercontent.com/arduino/docs-content/20d1c1c179703cc10ece612f3e4be223fcd02590/content/hardware/02.uno/boards/uno-rev3/downloads/A000066-full-pinout.pdf)의 1쪽(2022-10-06 판본)과 [코어 standard 핀 정의](https://raw.githubusercontent.com/arduino/ArduinoCore-avr/42fa4a1ea1b1b11d1cc0a60298e529d37f9d14bd/variants/standard/pins_arduino.h)의 `LED_BUILTIN`, `PIN_SPI_SCK`를 대조했다.

| 용도 | Arduino 핀 | MCU 포트 | 주의 |
|---|---|---|---|
| 내장 LED / SPI 클럭 | D13 | PB5 | SPI와 LED를 독립 핀처럼 동시에 제어하지 않음 |
| I2C SDA | A4 / D18 / SDA | PC4 | 헤더 이름이 달라도 별도 버스가 아님 |
| I2C SCL | A5 / D19 / SCL | PC5 | 같은 연결의 다른 표기 |

이 표는 핀 연결 설명이며 허용 전압·전류 설계표가 아니다. MCU 데이터시트와 보드 회로의 동작 조건을 확인하기 전 외부 전압이나 부하를 연결하지 않는다.

## 내장 LED 최소 예제

빈 Arduino 스케치 전체를 아래로 작성한다. 외부 배선 없이 내장 LED만 확인하는 예제다. [GPIO 구현](https://raw.githubusercontent.com/arduino/ArduinoCore-avr/42fa4a1ea1b1b11d1cc0a60298e529d37f9d14bd/cores/arduino/wiring_digital.c)의 `pinMode`, `digitalWrite`와 위 핀 정의를 근거로 새로 작성했다. 코어 소스의 복제본이 아니다.

```cpp
#include <Arduino.h>

static const unsigned long BLINK_INTERVAL_MS = 500;

// Configure only the onboard LED; no external load is required.
void setup()
{
    pinMode(LED_BUILTIN, OUTPUT);
}

// A blocking delay is intentional for this standalone smoke test only.
void loop()
{
    digitalWrite(LED_BUILTIN, HIGH);
    delay(BLINK_INTERVAL_MS);
    digitalWrite(LED_BUILTIN, LOW);
    delay(BLINK_INTERVAL_MS);
}
```

예상 결과는 약 0.5초 켜짐/0.5초 꺼짐이다. 이 결과를 실제로 관찰한 것은 아니다. 주기 제어·통신을 함께 하는 제품 코드나 ISR에 이 지연 구조를 그대로 옮기지 않는다.

## 동작하지 않을 때

1. IDE에서 UNO와 AVR Boards 1.8.6이 선택되어 있는지, 컴파일 오류인지 업로드 오류인지 먼저 구분한다.
2. 업로드 오류라면 USB 데이터 케이블, 실제 포트, 다른 프로그램의 포트 점유를 확인한다. 실패 로그를 보존한다.
3. 업로드 성공인데 LED가 다르면 D13을 사용하는 외부 회로·SPI 코드를 제거한 최소 예제로 좁힌다. 전원을 끄고 외부 배선을 분리한다.
4. 전기적 이상·발열이 있으면 전원을 끄고 회로 검토를 먼저 한다. 반복 업로드는 전원 문제의 해결책이 아니다.

## 자료 공백과 이용 조건

이 묶음에는 ATmega328P 원제조사 데이터시트·정오표·부트로더 복구 절차가 없다. [Arduino 보드 설명](https://raw.githubusercontent.com/arduino/docs-content/20d1c1c179703cc10ece612f3e4be223fcd02590/content/hardware/02.uno/boards/uno-rev3/datasheet/datasheet.md)의 칩 최대 속도와 보드 동작 속도는 구분해야 하며, 해당 원문의 미완성 전력 수치를 채택하지 않았다.

원저작자: Arduino 및 문서 기여자. 본문은 해당 자료를 한국어로 재구성하고 범위·예제·문제 해결 설명을 추가한 파생 안내다. 본문과 새 예제는 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 조건으로 제공한다. 상업적 재사용도 출처·라이선스·변경 고지와 동일조건 등 해당 조건을 지켜야 한다. 참조한 코어 파일은 별도의 LGPL-2.1-or-later이며, 본문 라이선스로 코어의 조건을 바꾸지 않는다. 상표 소유자의 인증을 의미하지 않는다.
