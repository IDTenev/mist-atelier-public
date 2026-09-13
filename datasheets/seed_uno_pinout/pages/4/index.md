# Arduino UNO 핀아웃 · 원본 4/5쪽

원저작자: Arduino and documentation contributors
원출처: https://raw.githubusercontent.com/arduino/docs-content/20d1c1c179703cc10ece612f3e4be223fcd02590/content/hardware/02.uno/boards/uno-rev3/downloads/A000066-full-pinout.pdf
원본 SHA-256: 088b4d7d776abf443cb050c31875221aa5fc7f0533470b33e035c249cf240007
가공: Mist Atelier / automatic_structuring_not_technical_validation
조건: CC-BY-SA-4.0

원본을 보존한 자동 재구성본입니다. 표·기호·그림의 기술 의미와 회로 안전성은 전수 검증하지 않았습니다.

## 페이지 근거 텍스트

```text
This work is licensed under 
the Creative Commons 
Attribution-ShareAlike 4.0 
International License. To view a 
copy of this license, visit http://
creativecommons.org/licenses/
by-sa/4.0/ or send a letter to 
Creative Commons, PO Box 1866, 
Mountain View, CA 94042, USA.
SKU code: A000066
Full Pinout - Page 4 of 5
Last update: 6 Oct, 2022
VIN 6-20V input to the board
CIPO/COPI have previously been 
referred to as MISO/MOSI
MAXIMUM current per  
I/O pin is 20mA
MAXIMUM current per  
+3.3V pin is 50mA
Legend:
 Power      Power Input
            Power Output
 Ground
 GPIO Digital External
 Analog External
 Main Part
 Secondary Part
 Internal Component
 Other Pins (Reset, System 
Control, Debugging)
 I2C            Default
 SPI            Default
 UART/USART     Default
 Other SERIAL Communication
 Analog         Default
 PWM/Timer
 LED
 RGB LED
 Other
TOP VIEW
5
3
1
6
4
2
ATMEGA16U2Micro
InterruptAnalogTimer
ATMEGA16U2
TCA0/WO0
TCA0/WO1
ICSP-1
ICSP-4
ICSP-3
RESET
TX LED
RX LED
PD0
PD1
ICSP-5
INT[24]
INT[25]
PB3
PB2
PB1
PD7
PD5
PD4
PD3
PD2
PC1
AIN[0]
AIN[1]
SCK
CIPO
UPDI
1 CIPO
2 +5V
3 SCK
4 COPI
5 RESET
6 GND
ICSP1
PB4
PB5
PB3
1 CIPO
2 +5V
3 SCK
4 COPI
5 RESET
6 GND
ICSP Micro SPI Interrupt
Timer
CIPO
SCK
COPI OC2A
PCINT[4]
PCINT[5]
PCINT[3]
5 3 1
6 4 2
ATMEGA16U2
UCAPGND
UVCCVBUS
D-USB D-
D+USB D+
UGNDGND
```

## 표 후보·청크·미해석 상태

```json
{
  "offset_unit": "unicode_code_points",
  "section_path": [],
  "table_candidates": [
    {
      "id": "seed_uno_pinout:p4:grid1",
      "bbox": [
        13.01,
        678.189,
        1177.541,
        829.38
      ],
      "rows": [
        [
          "Legend:\nPower Power Input GPIO Digital External I2C Default LED\nPower Output Analog External SPI Default RGB LED\nGround Main Part UART/USART Default Other\nSecondary Part Other SERIAL Communication\nInternal Component Analog Default\nOther Pins (Reset, System PWM/Timer\nControl, Debugging)",
          "MAXIMUM current per\nI/O pin is 20mA\nMAXIMUM current per\n+3.3V pin is 50mA\nVIN 6-20V input to the board\nCIPO/COPI have previously been\nreferred to as MISO/MOSI",
          ""
        ],
        [
          null,
          null,
          "SKU code: A000066\nFull Pinout - Page 4 of 5\nLast update: 6 Oct, 2022"
        ],
        [
          null,
          null,
          "This work is licensed under\nthe Creative Commons\nAttribution-ShareAlike 4.0\nInternational License. To view a\ncopy of this license, visit http://\ncreativecommons.org/licenses/\nby-sa/4.0/ or send a letter to\nCreative Commons, PO Box 1866,\nMountain View, CA 94042, USA."
        ]
      ],
      "status": "automatic_candidate",
      "header_status": "not_interpreted"
    }
  ],
  "chunks": [
    {
      "id": "seed_uno_pinout:088b4d7d776a:p4:c1",
      "start": 0,
      "end": 1325,
      "text": "This work is licensed under \nthe Creative Commons \nAttribution-ShareAlike 4.0 \nInternational License. To view a \ncopy of this license, visit http://\ncreativecommons.org/licenses/\nby-sa/4.0/ or send a letter to \nCreative Commons, PO Box 1866, \nMountain View, CA 94042, USA.\nSKU code: A000066\nFull Pinout - Page 4 of 5\nLast update: 6 Oct, 2022\nVIN 6-20V input to the board\nCIPO/COPI have previously been \nreferred to as MISO/MOSI\nMAXIMUM current per  \nI/O pin is 20mA\nMAXIMUM current per  \n+3.3V pin is 50mA\nLegend:\n Power      Power Input\n            Power Output\n Ground\n GPIO Digital External\n Analog External\n Main Part\n Secondary Part\n Internal Component\n Other Pins (Reset, System \nControl, Debugging)\n I2C            Default\n SPI            Default\n UART/USART     Default\n Other SERIAL Communication\n Analog         Default\n PWM/Timer\n LED\n RGB LED\n Other\nTOP VIEW\n5\n3\n1\n6\n4\n2\nATMEGA16U2Micro\nInterruptAnalogTimer\nATMEGA16U2\nTCA0/WO0\nTCA0/WO1\nICSP-1\nICSP-4\nICSP-3\nRESET\nTX LED\nRX LED\nPD0\nPD1\nICSP-5\nINT[24]\nINT[25]\nPB3\nPB2\nPB1\nPD7\nPD5\nPD4\nPD3\nPD2\nPC1\nAIN[0]\nAIN[1]\nSCK\nCIPO\nUPDI\n1 CIPO\n2 +5V\n3 SCK\n4 COPI\n5 RESET\n6 GND\nICSP1\nPB4\nPB5\nPB3\n1 CIPO\n2 +5V\n3 SCK\n4 COPI\n5 RESET\n6 GND\nICSP Micro SPI Interrupt\nTimer\nCIPO\nSCK\nCOPI OC2A\nPCINT[4]\nPCINT[5]\nPCINT[3]\n5 3 1\n6 4 2\nATMEGA16U2\nUCAPGND\nUVCCVBUS\nD-USB D-\nD+USB D+\nUGNDGND",
      "source_page": 4
    }
  ],
  "visuals": {
    "raster_regions": [],
    "vector_objects": 888,
    "caption_candidates": [],
    "interpretation": "not_transcribed"
  },
  "warnings": [
    "table_cells_units_footnotes_require_review",
    "figures_and_formulas_not_semantically_transcribed"
  ]
}
```
