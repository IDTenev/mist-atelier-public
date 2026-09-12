# ESP-VoCat Development Board

The examples in this repository are the **factory firmware** for **ESP-VoCat + ESP-Brookesia**, built on [ESP RainMaker](https://github.com/espressif/esp-agents-firmware) and the [ESP-Brookesia](https://github.com/espressif/esp-brookesia) human-machine interaction framework, with support for voice wake-up, AI conversation, and local tools.

## User Guide

* ESP-VoCat - [English](https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32s3/esp-vocat/index.html) / [中文](https://docs.espressif.com/projects/esp-dev-kits/zh_CN/latest/esp32s3/esp-vocat/index.html)

## Provisioning and Usage (Important)

The device must be provisioned via **ESP RainMaker Home** on first use. For detailed steps, see:

**[Setup Guide (Provisioning and Usage)](https://github.com/espressif/esp-agents-firmware/blob/main/examples/voice_chat/setup_guide.md)**

### Provisioning App

Install **ESP RainMaker Home** from the app stores:

* [App Store (iOS)](https://apps.apple.com/in/app/esp-rainmaker-home/id1563728960)
* [Google Play (Android)](https://play.google.com/store/apps/details?id=com.espressif.novahome)

### Quick Provisioning Steps

1. Power on the device; the screen will show a provisioning QR code (for devices without a display, see the QR code on the product packaging).
2. Open ESP RainMaker Home, tap the **"+"** icon on the top right → **"Scan QR Code"**, and scan the device QR code.
3. Select your Wi-Fi network and enter the password when prompted to complete provisioning.
4. After provisioning, say **"Hi, ESP"** to wake the device for voice conversation; you can also tap the screen to wake. Touch-to-interrupt and auto-sleep after ~15 seconds of inactivity are supported.

### Factory Reset / Changing the Agent

* **App interface**: When provisioning is complete and you are in the conversation interface, touch and hold to enter the app interface. In **Settings** you can perform a factory reset.
* **Change Agent**: Create and share an agent from [ESP Private Agents](https://agents.espressif.com), scan the share QR code with your phone, then select this device in ESP RainMaker Home to update the agent.

## Related Projects

| Project | Description |
|---------|-------------|
| [esp-agents-firmware](https://github.com/espressif/esp-agents-firmware) | ESP Private Agents device firmware and examples: RainMaker provisioning, voice chat, local tools, etc. |
| [esp-brookesia](https://github.com/espressif/esp-brookesia) | Human-machine interaction framework for AIoT: HMI, Agent, MCP protocol, and more. |

## Examples

The examples are developed under the ESP-IDF **release/v5.5** branch. You can flash them directly to the board or try more demos in the browser via [ESP-Launchpad](https://espressif.github.io/esp-launchpad/?flashConfigURL=https://dl.espressif.com/AE/esp-dev-kits/launchpad.toml).
