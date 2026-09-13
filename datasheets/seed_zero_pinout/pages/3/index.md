# Arduino ZERO 핀아웃 · 원본 3/3쪽

원저작자: Arduino and documentation contributors
원출처: https://raw.githubusercontent.com/arduino/docs-content/20d1c1c179703cc10ece612f3e4be223fcd02590/content/hardware/12.hero/boards/zero/downloads/ABX00003-full-pinout.pdf
원본 SHA-256: 131eed2243dd2e039a25035cde0a070a3eaadd259d4c6d22d3d0822478023b31
가공: Mist Atelier / automatic_structuring_not_technical_validation
조건: CC-BY-SA-4.0

원본을 보존한 자동 재구성본입니다. 표·기호·그림의 기술 의미와 회로 안전성은 전수 검증하지 않았습니다.

## 페이지 근거 텍스트

```text
Analog
Communication
Timer
Interrupt
Sercom
This work is licensed under the Creative Commons 
Attribution-ShareAlike 4.0 International License. To view 
a copy of this license, visit http://creativecommons.
org/licenses/by-sa/4.0/ or send a letter to Creative 
Commons, PO Box 1866, Mountain View, CA 94042, USA.
Ground
Power
LED
Internal Pin
SWD Pin
Digital Pin
Analog Pin
Other Pin
Microcontroller’s Port
Default
Last update: 17/12/2021
ATSAMD21G18
AT32UC3A4256HHB
5 3 1
6 4 2
6-20 V
9 7 5 3 1
8 6 4 210
USB D-
+5V
USB D+
USB ID
GND
PA24
PA25
PA28
USB1
AT32UC3A4256HHB
JTAG
1TCK
2GND
3TDO
4+3V3
5TMS
6RESET
7
8
GND
9TDI
10
AT32UC3A4256HHB
SWD
USB D-
+5V
USB D+
USB ID
GND
DMHS
DPHS
USB2
SPI
PA12
PB11
PB10
1 CIPO
2 +5V
3 SCK
4 COPI
5 RESET
6 GND
TCC2/WO [0] TCC0/WO[ 6]
TC5/WO [1]  TC5/WO[ 1] 
TC5/WO [0]  TCC0/WO[ 4]
INT[12] SC2 P0/SC4 P0A
INT[11]
INT[10] SC4 P2A
1+3V3
2PA31
3GND
4PA30
5GND
6
7
8
RESET
9GND
10
TCC1/WO [1]INT[11]SC1 P3A
TCC1/WO [0]INT[10]SC1 P2A
9
7
5
3
1
8
6
4
2
10
TX TC7/WO [0]
TC7/WO [1]
TCC2/WO [1] TCC0/WO[ 7]
TC7/WO [1]  TCC0/WO[ 7]
TCC1/WO [0]
TCC1/WO [1]
TC4/WO [0] TCC0/WO[ 4]
TC4/WO [1] TCC0/WO[ 5]
TC3/WO [0]  TCC0/WO[ 2]
TCC2/WO [0] TCC0/WO[ 6]
TCC2/WO [1] TCC0/WO[ 7]
TC3/WO [0]  TCC0/WO[ 2]
TCC1/WO [0]
TCC1/WO [1]
INT[6] 
INT[7] 
INT[13]
INT[5] 
INT[6] 
INT[7] 
INT[6] 
INT[7] 
INT[2] 
INT[0] 
INT[1] 
INT[2] 
INT[10]
INT[11]
SC5 P2A
SC5 P3A
SC2 P1/SC4 P1A
SC5 P3/SC3 P3A
SC0 P2A
SC0 P3A
SC3 P0/SC5 P0A
SC3 P1/SC5 P1A
SC1 P2/SC3 P2A
SC1 P0/SC3 P0A
SC1 P1/SC3 P1A
SC1 P2/SC3 P2A
SC1 P2A
SC1 P3A
PB22
RXPB23
PA13
PA21
PA06 AIN[6]
I2S_SD0PA07 AIN[7]
PA22
PA23
RESET
PA18
COPIPA16
SCKPA17
PA18
PA30
PA31
PA02
PA04
PA08
PA09
PA10
PA11
PA12
PA26
PA29
PX27
PX28
PX29
PX30
PB07
PB09
STORE.ARDUINO.CC/ZERO
MAXIMUM source 
current is 46mA
MAXIMUM sink current  
is 65mA per pin group
MAXIMUM current   
per pin is 7mA
VIN Input voltage to the board.
NOTE: CIPO/COPI have previously 
been referred to as MISO/MOSI
```

## 표 후보·청크·미해석 상태

```json
{
  "offset_unit": "unicode_code_points",
  "section_path": [],
  "table_candidates": [
    {
      "id": "seed_zero_pinout:p3:grid1",
      "bbox": [
        696.626,
        503.215,
        1001.177,
        544.758
      ],
      "rows": [
        [
          "2",
          null,
          null,
          null,
          null
        ],
        [
          "3\n4",
          "SCK\nCOPI",
          "PB11\nPB10",
          "",
          "TC5/WO[1] TC5/WO[1]\nTC5/WO[0] TCC0/WO[4]"
        ]
      ],
      "status": "automatic_candidate",
      "header_status": "not_interpreted"
    }
  ],
  "chunks": [
    {
      "id": "seed_zero_pinout:131eed2243dd:p3:c1",
      "start": 0,
      "end": 1939,
      "text": "Analog\nCommunication\nTimer\nInterrupt\nSercom\nThis work is licensed under the Creative Commons \nAttribution-ShareAlike 4.0 International License. To view \na copy of this license, visit http://creativecommons.\norg/licenses/by-sa/4.0/ or send a letter to Creative \nCommons, PO Box 1866, Mountain View, CA 94042, USA.\nGround\nPower\nLED\nInternal Pin\nSWD Pin\nDigital Pin\nAnalog Pin\nOther Pin\nMicrocontroller’s Port\nDefault\nLast update: 17/12/2021\nATSAMD21G18\nAT32UC3A4256HHB\n5 3 1\n6 4 2\n6-20 V\n9 7 5 3 1\n8 6 4 210\nUSB D-\n+5V\nUSB D+\nUSB ID\nGND\nPA24\nPA25\nPA28\nUSB1\nAT32UC3A4256HHB\nJTAG\n1TCK\n2GND\n3TDO\n4+3V3\n5TMS\n6RESET\n7\n8\nGND\n9TDI\n10\nAT32UC3A4256HHB\nSWD\nUSB D-\n+5V\nUSB D+\nUSB ID\nGND\nDMHS\nDPHS\nUSB2\nSPI\nPA12\nPB11\nPB10\n1 CIPO\n2 +5V\n3 SCK\n4 COPI\n5 RESET\n6 GND\nTCC2/WO [0] TCC0/WO[ 6]\nTC5/WO [1]  TC5/WO[ 1] \nTC5/WO [0]  TCC0/WO[ 4]\nINT[12] SC2 P0/SC4 P0A\nINT[11]\nINT[10] SC4 P2A\n1+3V3\n2PA31\n3GND\n4PA30\n5GND\n6\n7\n8\nRESET\n9GND\n10\nTCC1/WO [1]INT[11]SC1 P3A\nTCC1/WO [0]INT[10]SC1 P2A\n9\n7\n5\n3\n1\n8\n6\n4\n2\n10\nTX TC7/WO [0]\nTC7/WO [1]\nTCC2/WO [1] TCC0/WO[ 7]\nTC7/WO [1]  TCC0/WO[ 7]\nTCC1/WO [0]\nTCC1/WO [1]\nTC4/WO [0] TCC0/WO[ 4]\nTC4/WO [1] TCC0/WO[ 5]\nTC3/WO [0]  TCC0/WO[ 2]\nTCC2/WO [0] TCC0/WO[ 6]\nTCC2/WO [1] TCC0/WO[ 7]\nTC3/WO [0]  TCC0/WO[ 2]\nTCC1/WO [0]\nTCC1/WO [1]\nINT[6] \nINT[7] \nINT[13]\nINT[5] \nINT[6] \nINT[7] \nINT[6] \nINT[7] \nINT[2] \nINT[0] \nINT[1] \nINT[2] \nINT[10]\nINT[11]\nSC5 P2A\nSC5 P3A\nSC2 P1/SC4 P1A\nSC5 P3/SC3 P3A\nSC0 P2A\nSC0 P3A\nSC3 P0/SC5 P0A\nSC3 P1/SC5 P1A\nSC1 P2/SC3 P2A\nSC1 P0/SC3 P0A\nSC1 P1/SC3 P1A\nSC1 P2/SC3 P2A\nSC1 P2A\nSC1 P3A\nPB22\nRXPB23\nPA13\nPA21\nPA06 AIN[6]\nI2S_SD0PA07 AIN[7]\nPA22\nPA23\nRESET\nPA18\nCOPIPA16\nSCKPA17\nPA18\nPA30\nPA31\nPA02\nPA04\nPA08\nPA09\nPA10\nPA11\nPA12\nPA26\nPA29\nPX27\nPX28\nPX29\nPX30\nPB07\nPB09\nSTORE.ARDUINO.CC/ZERO\nMAXIMUM source \ncurrent is 46mA\nMAXIMUM sink current  \nis 65mA per pin group\nMAXIMUM current   \nper pin is 7mA\nVIN Input voltage to the board.\nNOTE: CIPO/COPI have previously \nbeen referred to as MISO/MOSI",
      "source_page": 3
    }
  ],
  "visuals": {
    "raster_regions": [],
    "vector_objects": 1687,
    "caption_candidates": [],
    "interpretation": "not_transcribed"
  },
  "warnings": [
    "table_cells_units_footnotes_require_review",
    "figures_and_formulas_not_semantically_transcribed"
  ]
}
```
