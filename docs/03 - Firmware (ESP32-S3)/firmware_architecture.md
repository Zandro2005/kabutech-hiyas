# ⚡ ESP32-S3 Firmware Architecture

> **Source File:** [firmware/kabutech_prototype/kabutech_prototype.ino](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/firmware/kabutech_prototype/kabutech_prototype.ino)  
> **Core:** ESP32 Arduino Core 2.x / 3.x (Board: ESP32S3 Dev Module)  
> **Partition Scheme:** "Huge APP (3MB No OTA / 1MB SPIFFS)"

---

## 🔄 Main Execution Loop & Timing

The firmware operates non-blocking state loops driven by `millis()` timers:

```
┌─────────────────────────────────────────────────────────────┐
│                       void loop()                           │
├─────────────────────────────────────────────────────────────┤
│ 1. Every 1,000 ms:   Sample Sensors (SHT31, BH1750, SCD41)  │
│ 2. Every 2,000 ms:   Evaluate Auto-Regulation & Actuators  │
│ 3. Every 5,000 ms:   Push Telemetry to Firebase RTDB        │
│ 4. Every 1,000 ms:   Update TFT Display Screens             │
│ 5. Every 30,000 ms:  Feed Ring Buffer & Run TinyML Predict  │
│ 6. Continuous:       Firebase Token / WiFi Keep-Alive       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎛️ Climate Auto-Regulation Algorithms

When operating in **`AUTO`** mode, the ESP32 balances humidity, temperature, and carbon dioxide without requiring cloud interaction:

### 1. Relative Humidity Regulation (Ultrasonic Misters)
- **Target Band**: 80% – 95% RH.
- **Trigger**: If `humidity < 85%`, turn `PIN_MISTER` ON.
- **Cut-Off**: When `humidity >= 92%`, turn `PIN_MISTER` OFF.
- **Smart Mister Sensor Pause**: When misters fire, droplet spray temporarily saturates the sensor probe face. The firmware pauses sensor alert escalation for 45 seconds to let the mist distribute evenly.

### 2. Carbon Dioxide Purge (Exhaust Fan)
- **Target Threshold**: < 1,000 ppm.
- **Purge Activation**: If `co2 >= 1,000 ppm`, turn `PIN_FAN_EXHAUST` ON.
- **Deactivation**: Once `co2 <= 850 ppm` (150 ppm hysteresis band), turn `PIN_FAN_EXHAUST` OFF.

### 3. Temperature Differential Regulation (Intake + Exhaust)
- **Upper Limit**: > 25.0°C.
- If high temperature coincides with high humidity, exhaust fan pulses for cooling without dropping humidity below 80%.

---

## 🔮 Edge AI Integration (`edge_forecast.h`)

- **Sampling**: A 20-sample rolling ring buffer captures sensor metrics every 30 seconds (10 minutes of history).
- **Inference**: Every 30 seconds, the on-device TinyML model generates a **+10 minute forecast** for Temperature, Humidity, CO₂, and Light.
- **Pre-emptive Actuation**: If the +10 min forecast predicts a breach of dangerous thresholds (e.g. Temp will exceed 26.5°C or CO₂ will spike past 1,200 ppm), the firmware triggers ventilation **before** the chamber reaches the danger zone.

---

## 🛡️ Fail-Safe Watchdogs

1. **I2C Bus Recovery**: If an I2C sensor fails to acknowledge (NACK), the ESP32 performs a software bus reset (toggling SCL 9 times) to unstick the line.
2. **Network Dropout Immunity**: If Wi-Fi drops, the ESP32 caches live metrics and keeps local climate control active. When reconnected, it pushes the latest states.

---
*Return to [[tft_display_ui|TFT Display UI]] | [[prototype_guide|Prototype Guide]] | [[index|Dashboard]]*
