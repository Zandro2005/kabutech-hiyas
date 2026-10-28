# 🛠️ Breadboard Prototype Quickstart Guide

> **Target:** ESP32-S3 DevKit running `firmware/kabutech_prototype/kabutech_prototype.ino`  
> **Original Reference:** [firmware/PROTOTYPE_GUIDE.md](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/firmware/PROTOTYPE_GUIDE.md)

---

## ⚡ Arduino IDE Setup (Step-by-Step)

### 1. Board Package Configuration
1. Open **Arduino IDE 2.x**.
2. Go to **File → Preferences**.
3. Under **Additional Boards Manager URLs**, paste:
   ```
   https://espressif.github.io/arduino-esp32/package_esp32_index.json
   ```
4. Open **Tools → Board → Boards Manager**, search **esp32**, and install **esp32 by Espressif Systems**.

### 2. Required Libraries
Open **Sketch → Include Library → Manage Libraries** and install:
- **`Firebase ESP Client`** (by mobizt)
- **`Adafruit SHT31 Library`** (by Adafruit)
- **`BH1750`** (by Christopher Laws)
- **`Sensirion I2C SCD4x`** (by Sensirion)
- **`LovyanGFX`** (for the ST7789 / ILI9341 display)

### 3. Board Settings
Under the **Tools** menu, configure:
- **Board:** `ESP32S3 Dev Module`
- **USB CDC On Boot:** `Enabled` (allows Serial Monitor via native USB-C)
- **Flash Size:** `16MB (128Mb)`
- **Partition Scheme:** `Huge APP (3MB No OTA/1MB SPIFFS)`
- **Upload Speed:** `921600`

---

## 🔌 Breadboard Wiring Summary

```
ESP32-S3 3.3V  ──► Breadboard (+) Red Rail  ──► SHT31 VIN  + BH1750 VCC  + SCD41 VIN
ESP32-S3 GND   ──► Breadboard (-) Blue Rail ──► SHT31 GND  + BH1750 GND  + SCD41 GND
ESP32-S3 GPIO 4──► I2C SDA Bus Row          ──► SHT31 SDA  + BH1750 SDA  + SCD41 SDA
ESP32-S3 GPIO 5──► I2C SCL Bus Row          ──► SHT31 SCL  + BH1750 SCL  + SCD41 SCL
```

### Simulated Actuator LEDs
| Function | ESP32-S3 GPIO | Wiring |
| :--- | :--- | :--- |
| **Intake Fan** | **GPIO 9** | Anode → 220Ω Resistor → GPIO 9, Cathode → GND |
| **Mister / Valve** | **GPIO 11**| Anode → 220Ω Resistor → GPIO 11, Cathode → GND |
| **Grow Light** | **GPIO 12**| Anode → 220Ω Resistor → GPIO 12, Cathode → GND |
| **Exhaust Fan** | **GPIO 13**| Anode → 220Ω Resistor → GPIO 13, Cathode → GND |

---

## 🧪 Calibration Verification

1. **SCD41 (NDIR CO₂)**: Takes 5 seconds per measurement cycle. Outside clean air reads ~400–430 ppm. Inside an unventilated room with people, expect 700–1,100 ppm.
2. **SHT31-D (Temp & Humidity)**: High precision (±0.3°C, ±2% RH). Verify temperature against room thermometer; gently breathing near the sensor will spike RH toward 95%.
3. **BH1750 (Lux)**: Reads standard SI Lux (1–65,535 lux). Covering the sensor with your finger drops reading to 0 lux.

---
*Return to [[firmware_architecture|Firmware Architecture]] | [[wiring_guide|Wiring Guide]] | [[index|Dashboard]]*
