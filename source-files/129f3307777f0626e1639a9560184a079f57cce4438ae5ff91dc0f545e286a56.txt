[USBOTG-4289] The USB-OTG Download Function Is Unavailable
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. only:: esp32s3

   .. tags::

      v0.0, v0.1, v0.2

Description
^^^^^^^^^^^

For {IDF_TARGET_NAME} series chips manufactured before the Date Code 2219 and series of modules and development boards with the PW Number before PW-2022-06-XXXX, the EFUSE_DIS_USB_OTG_DOWNLOAD_MODE (BLK0 B19[7]) bit of eFuse is set by default and cannot be modified. Therefore, the USB-OTG Download function is unavailable for these products.

.. note::

  For detailed information about the Date Code and the PW Number, please refer to :doc:`/01-chip-identification/index`.

Workarounds
^^^^^^^^^^^

{IDF_TARGET_NAME} also supports downloading firmware through USB-Serial-JTAG. Please refer to `USB Serial/JTAG Controller Console <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32s3/api-guides/usb-serial-jtag-console.html>`__.

Solution
^^^^^^^^

This issue has been fixed in some batches of chip revision :bdg-success:`v0.2`.

For {IDF_TARGET_NAME} series chips manufactured on and after the Date Code 2219 and {IDF_TARGET_NAME} series modules and development boards with the PW Number of and after PW-2022-06-XXXX, the bit (BLK0 B19[7]) will not be programmed by default and thus is open for users to program. This will enable the USB-OTG Download function.

For more details and recommendations for users, please refer to `Security Advisory for USB_OTG & USB_Serial_JTAG Download Functions of ESP32-S3 Series Products <https://www.espressif.com/sites/default/files/advisory_downloads/AR2022-004%20Security%20Advisory%20for%20USB_OTG%20%26%20USB_Serial_JTAG%20Download%20Functions%20of%20ESP32-S3%20Series%20Products%20EN.pdf>`__.
