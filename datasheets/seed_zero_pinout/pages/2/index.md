# Arduino ZERO 핀아웃 · 원본 2/3쪽

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
RESET
TCC0/WO [1]
TCC0/WO [0]
TC4/WO [1] 
TC4/WO [0] 
TC6/WO [0] 
INT[2]
INT[8]
INT[9]
INT[4]
INT[5]
INT[2]
SC4 P0A
SC4 P1A
SC0 P0A
SC0 P1A
SC5 P0A
ADC[0]
ADC[1]
ADC[2]
ADC[3]
ADC[4]
ADC[5]
DAC0/AIN [0]
AIN[2] 
AIN[3] 
AIN[4] 
AIN[5] 
AIN[10]
PA02
PB08
PB09
PA04
PA05
PB02 A5
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
ATN
+3V3
+5V
GND
GND
VIN
~D12
~D11
~D10
 ~D9
 ~D8
 D7
~D6
~D5
~D4
~D3
 D2
D1/TX
D0/RX
D21/SCL
D20/SDA
AREF
GND
~D13
PA23 SCL TC4/WO [1] TCC0/WO[ 5] INT[7]
INT[6]
INT[3]
INT[1]
INT[3]
INT[0]
INT[2]
INT[7]
INT[6]
INT[11]
INT[10]
INT[14]
INT[9] 
NMI
INT[4]
INT[5]
TC4/WO [0] TCC0/WO[ 4]
TCC2/WO [1] TCC0/WO[ 7]
TC3/WO [1]  TCC0/WO[ 3]
TCC2/WO [0] TCC0/WO[ 6]
TC3/WO [0]  TCC0/WO[ 2]
TCC1/WO [1]
TCC1/WO [0]
TCC1/WO [1] TCC0/WO[ 1]
TCC1/WO [0] TCC0/WO[ 2]
TC3/WO [0]  TCC0/WO[ 4]
TCC0/WO [0] TCC1/WO[ 3]
TCC0/WO [0] TCC1/WO[ 2]
TC7/WO [0] TCC0/WO[ 6]
TC7/WO [1] TCC0/WO[ 7]
SDA
SCK
CIPO
COPI
SS
PA22
PA03 AREF/AIN [1]
PA17
SC3 P1/SC5 P1A
SC3 P0/SC5 P0A
SC1 P1/SC3 P1A
SC1 P3/SC3 P3A
SC1 P0/SC3 P0A
SC1 P2/SC3 P2A
SC0 P3A
SC0 P2A
SC0 P3/SC2 P3A
SC0 P2/SC2 P2A
SC2 P2/SC4 P2A
SC0 P1/SC2 P1A
SC0 P0/SC2 P0A
SC5 P2/SC3 P2A
SC5 P3/SC3 P3A
SCK
AIN[7] 
AIN[6] 
AIN[16]
AIN[17]
AIN[18]
AIN[19]
PA19 CIPO
PA16 COPI
PA18
PA07
PA06
I2S_SD0
I2S_FS [0] 
I2S_SCK [0]
I2S_MCK [0]
I2S_SD1   
PA21
PA20
PA15
PA08
PA09
PA14
PA10
PA11
SPI
LED_BUILTIN
TX LED
RX LED
Power
AT32UC3A4256HHB
PA17
PA27
PB03
STATUS LEDPX19
PX15
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
  "table_candidates": [],
  "chunks": [
    {
      "id": "seed_zero_pinout:131eed2243dd:p2:c1",
      "start": 0,
      "end": 2096,
      "text": "Analog\nCommunication\nTimer\nInterrupt\nSercom\nThis work is licensed under the Creative Commons \nAttribution-ShareAlike 4.0 International License. To view \na copy of this license, visit http://creativecommons.\norg/licenses/by-sa/4.0/ or send a letter to Creative \nCommons, PO Box 1866, Mountain View, CA 94042, USA.\nGround\nPower\nLED\nInternal Pin\nSWD Pin\nDigital Pin\nAnalog Pin\nOther Pin\nMicrocontroller’s Port\nDefault\nLast update: 17/12/2021\nRESET\nTCC0/WO [1]\nTCC0/WO [0]\nTC4/WO [1] \nTC4/WO [0] \nTC6/WO [0] \nINT[2]\nINT[8]\nINT[9]\nINT[4]\nINT[5]\nINT[2]\nSC4 P0A\nSC4 P1A\nSC0 P0A\nSC0 P1A\nSC5 P0A\nADC[0]\nADC[1]\nADC[2]\nADC[3]\nADC[4]\nADC[5]\nDAC0/AIN [0]\nAIN[2] \nAIN[3] \nAIN[4] \nAIN[5] \nAIN[10]\nPA02\nPB08\nPB09\nPA04\nPA05\nPB02 A5\nA2\nA1\nA0D14\nD15\nD16A2\nD17\nD18\nD19\nA0\nA1\nA3\nA4\nA5\nIOREF\nATN\n+3V3\n+5V\nGND\nGND\nVIN\n~D12\n~D11\n~D10\n ~D9\n ~D8\n D7\n~D6\n~D5\n~D4\n~D3\n D2\nD1/TX\nD0/RX\nD21/SCL\nD20/SDA\nAREF\nGND\n~D13\nPA23 SCL TC4/WO [1] TCC0/WO[ 5] INT[7]\nINT[6]\nINT[3]\nINT[1]\nINT[3]\nINT[0]\nINT[2]\nINT[7]\nINT[6]\nINT[11]\nINT[10]\nINT[14]\nINT[9] \nNMI\nINT[4]\nINT[5]\nTC4/WO [0] TCC0/WO[ 4]\nTCC2/WO [1] TCC0/WO[ 7]\nTC3/WO [1]  TCC0/WO[ 3]\nTCC2/WO [0] TCC0/WO[ 6]\nTC3/WO [0]  TCC0/WO[ 2]\nTCC1/WO [1]\nTCC1/WO [0]\nTCC1/WO [1] TCC0/WO[ 1]\nTCC1/WO [0] TCC0/WO[ 2]\nTC3/WO [0]  TCC0/WO[ 4]\nTCC0/WO [0] TCC1/WO[ 3]\nTCC0/WO [0] TCC1/WO[ 2]\nTC7/WO [0] TCC0/WO[ 6]\nTC7/WO [1] TCC0/WO[ 7]\nSDA\nSCK\nCIPO\nCOPI\nSS\nPA22\nPA03 AREF/AIN [1]\nPA17\nSC3 P1/SC5 P1A\nSC3 P0/SC5 P0A\nSC1 P1/SC3 P1A\nSC1 P3/SC3 P3A\nSC1 P0/SC3 P0A\nSC1 P2/SC3 P2A\nSC0 P3A\nSC0 P2A\nSC0 P3/SC2 P3A\nSC0 P2/SC2 P2A\nSC2 P2/SC4 P2A\nSC0 P1/SC2 P1A\nSC0 P0/SC2 P0A\nSC5 P2/SC3 P2A\nSC5 P3/SC3 P3A\nSCK\nAIN[7] \nAIN[6] \nAIN[16]\nAIN[17]\nAIN[18]\nAIN[19]\nPA19 CIPO\nPA16 COPI\nPA18\nPA07\nPA06\nI2S_SD0\nI2S_FS [0] \nI2S_SCK [0]\nI2S_MCK [0]\nI2S_SD1   \nPA21\nPA20\nPA15\nPA08\nPA09\nPA14\nPA10\nPA11\nSPI\nLED_BUILTIN\nTX LED\nRX LED\nPower\nAT32UC3A4256HHB\nPA17\nPA27\nPB03\nSTATUS LEDPX19\nPX15\nSTORE.ARDUINO.CC/ZERO\nMAXIMUM source \ncurrent is 46mA\nMAXIMUM sink current  \nis 65mA per pin group\nMAXIMUM current   \nper pin is 7mA\nVIN Input voltage to the board.\nNOTE: CIPO/COPI have previously \nbeen referred to as MISO/MOSI",
      "source_page": 2
    }
  ],
  "visuals": {
    "raster_regions": [],
    "vector_objects": 1656,
    "caption_candidates": [],
    "interpretation": "not_transcribed"
  },
  "warnings": [
    "table_cells_units_footnotes_require_review",
    "figures_and_formulas_not_semantically_transcribed"
  ]
}
```
