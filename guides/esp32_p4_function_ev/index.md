# ESP32-P4 Function EV v1.4: 첫 실행과 핀·RTOS 경계

문서 0.2.0 · 검토일 2026-09-11 · 펌웨어 검증: `not_tested` (SDK 설치·빌드·플래시·실기 미수행)

## 대상

ESP32-P4-Function-EV-Board 하드웨어 v1.4와 ESP-IDF v5.5.1을 기준으로 한다. SDK commit은 `fcae32885b0296b32044cb99ecbdc50d98dddb83`, 빌드 타깃은 `esp32p4`다. 최신 버전 추천이 아닌 수집 기준선이다. 실리콘 리비전·실제 도구 체인은 미확인이고, P4X/v3.x 변형은 범위 밖이다.

[v1.4 보드 안내](https://raw.githubusercontent.com/espressif/esp-dev-kits/2d88ba80221375b1340f5e73c7053736515a8fa0/docs/en/esp32-p4-function-ev-board/user_guide_v1.4.rst)의 시작 주석은 보드 v1.4와 칩 리비전을 구분한다. 같은 문서의 구성 설명에서 Wi-Fi/Bluetooth 모듈은 ESP32-C6-MINI-1이다. 보드가 무선을 제공한다는 사실을 P4 자체의 내장 무선 기능으로 옮겨 적지 않는다.

## 첫 예제 경로

별도로 준비한 정확한 ESP-IDF v5.5.1 환경에서 `examples/get-started/hello_world` 프로젝트의 작업 사본을 사용한다. [해당 판본 README](https://raw.githubusercontent.com/espressif/esp-idf/fcae32885b0296b32044cb99ecbdc50d98dddb83/examples/get-started/hello_world/README.md)의 지원 타깃 표에는 ESP32-P4가 있다. 원문 README만 확보했으며 프로젝트의 C 소스나 SDK 전체를 이 공개 묶음에 넣지 않았다.

ESP-IDF 환경이 활성화된 터미널에서 그 작업 사본 디렉터리로 이동한 후:

```powershell
idf.py --version
idf.py set-target esp32p4
idf.py build
```

`set-target`은 해당 프로젝트의 빌드 설정을 변경하므로 기존 제품 프로젝트에서 실행하지 않는다. 버전이 다르면 먼저 선택한 SDK 환경을 확인한다. 빌드 성공과 플래시 성공, 실제 실행은 별도로 기록한다. 이 명령은 안내이며 이번 작업에서는 실행하지 않았다.

장비의 기존 펌웨어를 덮어쓸 수 있는 플래시는 별도 하드웨어 작업이다. 수행하기 전 칩 리비전·전원·실제 포트·기존 펌웨어 보존 필요를 확인하고 공식 절차를 따른다. 정상 실행의 확인 기준은 `Hello world!`와 칩 정보 출력이며, 이 기록에는 실측 로그가 없다.

## 연결 실패를 좁히기

보드 안내의 `Hardware Setup`은 플래시/디버깅에 USB-to-UART 포트를 권한다. 충전 전용 케이블이나 전원 입력 포트와 혼동하지 않는다. [Flashing Troubleshooting](https://raw.githubusercontent.com/espressif/esp-idf/fcae32885b0296b32044cb99ecbdc50d98dddb83/docs/en/get-started/flashing-troubleshooting.rst)의 P4 치환값은 부트 스트랩 `GPIO35`다. 다른 ESP32 예제의 GPIO0을 무조건 적용하지 않는다.

포트가 없으면 USB 연결·케이블·드라이버를 먼저 확인한다. 포트는 있는데 연결이 실패하면 점유 프로그램, 자동 리셋, BOOT/RESET 순서를 보드 안내와 대조한다. 전송 도중 실패하는 경우에만 baud rate·전원·신호 안정성의 영향을 분리해서 조사한다. 실패 로그 없이 플래시 지우기부터 하지 않는다.

## GPIO와 FreeRTOS 주의점

[P4 GPIO 설명](https://raw.githubusercontent.com/espressif/esp-idf/fcae32885b0296b32044cb99ecbdc50d98dddb83/docs/en/api-reference/peripherals/gpio/esp32p4.inc)은 GPIO34~38을 스트랩 핀으로, GPIO24/25를 기본 USB-JTAG 핀으로 구분한다. 보드 안내의 J1 표는 GPIO0/1/45를 조건부 연결로 표시한다. 칩의 GPIO 목록을 보드의 즉시 사용 가능한 핀 목록으로 해석하지 않는다. 저항 이동 같은 하드웨어 개조는 이 안내에서 수행하지 않는다.

[IDF FreeRTOS 문서](https://raw.githubusercontent.com/espressif/esp-idf/fcae32885b0296b32044cb99ecbdc50d98dddb83/docs/en/api-reference/system/freertos_idf.rst)의 `Task Creation`, `Scheduler Suspension`, `Critical Sections`를 함께 확인한다. 이 판본의 태스크 스택 크기 인자는 바이트 단위이며 일반 FreeRTOS 예제의 워드 단위를 그대로 적용하지 않는다. SMP에서는 한 코어의 스케줄러/인터럽트 중지만으로 다른 코어의 공유 데이터 접근을 막지 못한다. 임계구역에 블로킹·yield 호출을 넣지 않는다. 구체적인 락·큐·스택 크기는 실제 작업과 설정을 측정한 뒤 결정한다.

## 공백과 이용 조건

P4 데이터시트·TRM·정오표·회로 PDF와 무선 보조 칩 펌웨어 조합은 이 묶음에 미확보다. 카메라/LCD/DMA 성능이나 특정 실리콘 리비전 호환을 검증했다고 표시하지 않는다.

출처: Espressif Systems 및 기여자. 보드 문서를 한국어로 재구성하고 SDK 판본별 주의사항과 검증 경계를 추가한 파생 안내다. 본문은 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)이며 상업적 재사용에도 출처·변경 고지·동일조건을 적용한다. 함께 참고한 ESP-IDF 문서 원문은 Apache-2.0이고 관련 고지를 보존한다. 개별 SDK 예제의 라이선스까지 일괄 Apache-2.0으로 간주하지 않는다. Espressif의 인증·보증을 뜻하지 않는다.
