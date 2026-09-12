- EFUSE_BLK0_RDATA5[25:24]
- EFUSE_BLK0_RDATA5[20]
- EFUSE_BLK0_RDATA3[15]
- APB_CTRL_DATE[31]

.. flat-table:: Chip Revision Identification by eFuse Bits
   :header-rows: 2
   :widths: 2 5 1 1 1 1 1

   * - :rspan:`1`
     - :rspan:`1` eFuse Bit
     - :cspan:`4` Chip Revision
   * - v0.0
     - v1.0
     - v1.1
     - v3.0
     - v3.1
   * - :rspan:`2` Major Number
     - APB_CTRL_DATE[31]
     - 0
     - 0
     - 0
     - 1
     - 1
   * - EFUSE_BLK0_RDATA5[20]
     - 0
     - 0
     - 0
     - 1
     - 1
   * - EFUSE_BLK0_RDATA3[15]
     - 0
     - 1
     - 1
     - 1
     - 1
   * - :rspan:`1` Minor Number
     - EFUSE_BLK0_RDATA5[25]
     - 0
     - 0
     - 0
     - 0
     - 0
   * - EFUSE_BLK0_RDATA5[24]
     - 0
     - 0
     - 1
     - 0
     - 1
