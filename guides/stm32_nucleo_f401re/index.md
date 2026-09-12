# NUCLEO-F401RE: Cube GPIO 예제를 읽는 기준

문서 0.2.0 · 검토일 2026-09-11 · 펌웨어 검증: `not_tested` (SDK 설치·빌드·업로드 미수행)

## 적용 대상과 판본

STM32F401RE / NUCLEO-F401RE, STM32CubeF4 v1.28.1의 GPIO_IOToggle 예제를 기준으로 한다. Cube commit은 `83778d5c95cb01695c7facbf095db3ab445532ea`, 그 판본의 HAL 드라이버 commit은 `c2e1406d7ea4b73aa42b98ddeb75a8670b1a5a16`이다. 다른 STM32 계열의 클럭·핀 설정으로 일반화하지 않는다.

[공식 예제 readme](https://raw.githubusercontent.com/STMicroelectronics/STM32CubeF4/83778d5c95cb01695c7facbf095db3ab445532ea/Projects/STM32F401RE-Nucleo/Examples/GPIO/GPIO_IOToggle/readme.txt)는 설명에 RevC, 시험 환경에 RevB를 각각 적고 있다. 따라서 특정 PCB 리비전에서 우리가 시험했다고 표시하지 않는다. 실물 보드와 실리콘 리비전은 미확인이다.

## 예제 구조

[공식 main.c](https://raw.githubusercontent.com/STMicroelectronics/STM32CubeF4/83778d5c95cb01695c7facbf095db3ab445532ea/Projects/STM32F401RE-Nucleo/Examples/GPIO/GPIO_IOToggle/Src/main.c)의 `main`, `SystemClock_Config`를 읽는 순서는 다음과 같다.

1. HAL과 시스템 클럭을 초기화한다. 선택 예제의 설정은 HCLK 84 MHz다. 이것은 모든 보드의 기본 클럭이나 설계 허용치에 대한 선언이 아니다.
2. GPIOA 주변장치 클럭을 활성화한다.
3. PA5를 출력으로 초기화한다.
4. 반복문에서 `HAL_GPIO_TogglePin(GPIOA, GPIO_PIN_5)` 후 `HAL_Delay(100)`을 수행한다.

예상 현상은 예제가 연결 대상으로 설명한 LED2의 약 100ms 간격 상태 전환이다. 여기에는 실제 측정 결과가 없다. HAL의 함수 선언은 [GPIO 헤더](https://raw.githubusercontent.com/STMicroelectronics/stm32f4xx-hal-driver/c2e1406d7ea4b73aa42b98ddeb75a8670b1a5a16/Inc/stm32f4xx_hal_gpio.h), 동작은 [GPIO 드라이버](https://raw.githubusercontent.com/STMicroelectronics/stm32f4xx-hal-driver/c2e1406d7ea4b73aa42b98ddeb75a8670b1a5a16/Src/stm32f4xx_hal_gpio.c)의 해당 함수에서 확인한다.

## 재현에 필요한 프로젝트

SDK 전체를 별도로 준비할 경우 같은 Cube 판본의 `Projects/STM32F401RE-Nucleo/Examples/GPIO/GPIO_IOToggle` 프로젝트를 사용한다. 이 아카이브의 단일 `main.c`만으로는 빌드할 수 없다. CMSIS·HAL·시작 코드·링커 설정·보드 지원 파일과 맞는 도구 체인이 필요하다. 공식 readme의 `Directory contents` 및 `How to use it`에 있는 프로젝트 구성을 확인한다. 도구 체인 버전은 이번에 시험하지 않았다.

단순 GPIO 확인을 위해 클럭 설정을 임의로 높이거나 다른 MCU의 startup/linker 파일을 복사하지 않는다. 원문 예제 전체를 한 판본으로 맞춘 뒤 검증 기록을 남긴다.

## 증상별 확인 순서

| 증상 | 먼저 확인할 항목 |
|---|---|
| 헤더·심볼 누락 | SDK와 서브모듈, 선택 프로젝트의 include/링커 설정 |
| LED가 바뀌지 않음 | 업로드 성공 여부, 실물 보드 리비전·회로, GPIOA 클럭과 PA5 설정 |
| 지연에서 멈춘 것처럼 보임 | SysTick 동작, 인터럽트 문맥 여부, 중단점 위치 |
| 디버거 연결 실패 | 보드 전원·USB·ST-LINK 연결; 컴파일 오류와 별도 진단 |

공식 readme는 ISR에서 `HAL_Delay`를 쓸 때 SysTick 선점 조건을 경고한다. 이 안내에서는 지연을 메인 루프에만 둔다. ISR 문제를 해결한다며 우선순위를 무작정 변경하지 말고, 작업을 태스크/메인 루프로 넘기는 구조를 먼저 검토한다.

## 공백과 권리

MCU 데이터시트·레퍼런스 매뉴얼·정오표·보드 회로는 이 취득 묶음에 없다. 전압 허용치·핀 대체 기능·DMA/RTOS 제약을 여기서 확정하지 않는다.

출처 제공자: STMicroelectronics. 참조한 예제와 HAL 원문은 각각 해당 저장소의 BSD-3-Clause 조건이며, 공개 묶음에 원문 라이선스·저작권 고지를 보존한다. 본문은 코드를 전재하지 않은 새 한국어 분석 안내다. 자체 설명의 일반 재사용 라이선스는 미정(`LicenseRef-Project-Reserved`); 열람 공개와 임의의 상업적 재배포 허락은 다르다. ST의 라이선스가 프로젝트 전체에 적용되거나 ST가 이 문서를 인증하는 것은 아니다.
