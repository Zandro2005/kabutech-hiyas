# 🖥️ TFT Display UI & Graphics Engine

> **Source Header:** [firmware/kabutech_prototype/tft_display.h](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/firmware/kabutech_prototype/tft_display.h)  
> **Driver:** LovyanGFX library  
> **Hardware:** 3.2" 240×320 SPI Color TFT (ILI9341 controller)  
> **Orientation:** Landscape Upright (Rotation 7)

---

## 📌 Hardware Pin Connections

To eliminate white-screen glitching and SPI ringing over 30cm ribbon wires, the SPI bus is tuned to **4 MHz**:

| TFT Pin | Function | ESP32-S3 Pin | Note |
| :--- | :--- | :--- | :--- |
| **`VCC`** | Power | `5V / VIN` | Direct to 5V rail |
| **`GND`** | Ground | `GND` | Common ground rail |
| **`CS`** | Chip Select | **GPIO 10** | Active LOW |
| **`RESET`** | Hardware Reset | **GPIO 6** | Controlled on boot |
| **`DC`** | Data / Command | **GPIO 15** | Command vs Data toggle |
| **`SDI / MOSI`**| SPI Data In | **GPIO 17** | Master Out Slave In |
| **`SCK`** | SPI Clock | **GPIO 18** | Master Clock (4 MHz) |
| **`LED`** | Backlight | **GPIO 7** | PWM / 3.3V power |

---

## 🎨 Screen Layout & Widgets

The 240×320 landscape screen is split into three main regions:

```
┌────────────────────────────────────────────────────────────┐
│ 🍄 KABUTECH HIYAS    [● ONLINE]  [WIFI: -54 dBm]  [12:30]  │  <-- Header Bar (30px)
├───────────────────────────────┬────────────────────────────┤
│   TEMPERATURE      HUMIDITY   │      ACTUATORS STATUS      │
│     23.8 °C         88.5 %    │  [FAN IN]   OFF            │  <-- Telemetry Grid
│   (Target: 24.0)  (Target: 90)│  [EXHAUST]  ON             │      & Live Relays
├───────────────────────────────┤  [MISTER]   ON             │
│       CO2            LIGHT    │  [LIGHTS]   ON (Auto)      │
│     780 ppm         420 lux   │                            │
├───────────────────────────────┴────────────────────────────┤
│ 🔮 AI Forecast (+10m): Temp 24.2°C | RH 91.0% | CO2 810ppm │  <-- Predictive Footer
└────────────────────────────────────────────────────────────┘
```

### 1. Header Bar
- **App Title & Mushroom Icon**
- **Connection Badge**: Green dot for Cloud Connected, Orange for Reconnecting, Grey for Offline.
- **Wi-Fi Signal Indicator**: Shows RSSI value in dBm.

### 2. Telemetry Cards (Dynamic Color Alerting)
- **Green**: Reading is within the safe biological fruiting band.
- **Amber / Yellow**: Reading in warning tier (e.g. humidity drifting below 80%).
- **Red**: Critical fault (e.g. CO₂ > 1,500 ppm or Temp > 28°C).

### 3. Predictive Edge AI Footer
- Shows on-device real-time predictions from `edge_forecast.h`, giving operators immediate visual confirmation of upcoming climate trends.

---
*Return to [[firmware_architecture|Firmware Architecture]] | [[prototype_guide|Prototype Guide]] | [[index|Dashboard]]*
