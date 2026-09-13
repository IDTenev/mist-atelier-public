# Arduino UNO 핀아웃 · 원본 1/5쪽

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
Full Pinout - Page 1 of 5
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
 D12
~D11
~D10
 ~D9
  D8
 D7
~D6
~D5
 D4
~D3
 D2
D1/TX
D0/RX
RESETPC6
ADC[0]
ADC[1]
ADC[2]
ADC[3]
ADC[4]
ADC[5]
PC0
PC1
PC2
PC3
PC4
PC5
D19/SCL
D18/SDA
AREF
GND
 D13
PC5
PC4
PB5
PB4
PB3
PB2
PB1
PB0
PD7
PD6
PD5
PD4
PD3
PD2
PD1
PD0
SCL
SDA
SCK
CIPO
COPI
SS
A5
A2
A1
A0D14
D15
D16A2
D17
D18
D19
A0
A1
A3
A4
A5
IOREF
NC
+3V3
+5V
GND
GND
VIN
LED_BUILTIN
TX LED
RX LED
Power
PB5
PD5
PD4
Micro
Micro I2C
SPI
Analog
ATMEGA328P
```

## 표 후보·청크·미해석 상태

```json
{
  "offset_unit": "unicode_code_points",
  "section_path": [],
  "table_candidates": [
    {
      "id": "seed_uno_pinout:p1:grid1",
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
          "SKU code: A000066\nFull Pinout - Page 1 of 5\nLast update: 6 Oct, 2022"
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
      "id": "seed_uno_pinout:088b4d7d776a:p1:c1",
      "start": 0,
      "end": 1289,
      "text": "This work is licensed under \nthe Creative Commons \nAttribution-ShareAlike 4.0 \nInternational License. To view a \ncopy of this license, visit http://\ncreativecommons.org/licenses/\nby-sa/4.0/ or send a letter to \nCreative Commons, PO Box 1866, \nMountain View, CA 94042, USA.\nSKU code: A000066\nFull Pinout - Page 1 of 5\nLast update: 6 Oct, 2022\nVIN 6-20V input to the board\nCIPO/COPI have previously been \nreferred to as MISO/MOSI\nMAXIMUM current per  \nI/O pin is 20mA\nMAXIMUM current per  \n+3.3V pin is 50mA\nLegend:\n Power      Power Input\n            Power Output\n Ground\n GPIO Digital External\n Analog External\n Main Part\n Secondary Part\n Internal Component\n Other Pins (Reset, System \nControl, Debugging)\n I2C            Default\n SPI            Default\n UART/USART     Default\n Other SERIAL Communication\n Analog         Default\n PWM/Timer\n LED\n RGB LED\n Other\nTOP VIEW\n D12\n~D11\n~D10\n ~D9\n  D8\n D7\n~D6\n~D5\n D4\n~D3\n D2\nD1/TX\nD0/RX\nRESETPC6\nADC[0]\nADC[1]\nADC[2]\nADC[3]\nADC[4]\nADC[5]\nPC0\nPC1\nPC2\nPC3\nPC4\nPC5\nD19/SCL\nD18/SDA\nAREF\nGND\n D13\nPC5\nPC4\nPB5\nPB4\nPB3\nPB2\nPB1\nPB0\nPD7\nPD6\nPD5\nPD4\nPD3\nPD2\nPD1\nPD0\nSCL\nSDA\nSCK\nCIPO\nCOPI\nSS\nA5\nA2\nA1\nA0D14\nD15\nD16A2\nD17\nD18\nD19\nA0\nA1\nA3\nA4\nA5\nIOREF\nNC\n+3V3\n+5V\nGND\nGND\nVIN\nLED_BUILTIN\nTX LED\nRX LED\nPower\nPB5\nPD5\nPD4\nMicro\nMicro I2C\nSPI\nAnalog\nATMEGA328P",
      "source_page": 1
    }
  ],
  "visuals": {
    "raster_regions": [],
    "vector_objects": 1032,
    "caption_candidates": [],
    "interpretation": "not_transcribed"
  },
  "warnings": [
    "table_cells_units_footnotes_require_review",
    "figures_and_formulas_not_semantically_transcribed"
  ]
}
```
