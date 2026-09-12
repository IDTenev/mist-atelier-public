[ANALOG-160] Chip Will Be Damaged When BIAS_SLEEP = 0 and PD_CUR = 1
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. only:: esp32s3

   .. tags::

      v0.0, v0.1, v0.2

Description
^^^^^^^^^^^

If the analog power is configured as BIAS_SLEEP = 0 and PD_CUR = 1, the chip will be permanently damaged. This issue might be triggered when ULP and/or touch sensor is used during Light-sleep or Deep-sleep.

Workarounds
^^^^^^^^^^^

Users are suggested to disable such analog power configuration in sleep mode through software.

This issue has been bypassed by disabling the above configuration in ESP-IDF v4.4.2+, v5.0 and above.

Solution
^^^^^^^^

:bdg-warning:`No fix` scheduled.
