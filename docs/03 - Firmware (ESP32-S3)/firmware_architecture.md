# ⚡ ESP32-S3 Firmware Architecture

> **Source File:** [firmware/kabutech_prototype/kabutech_prototype.ino](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/firmware/kabutech_prototype/kabutech_prototype.ino)  
> **Core:** ESP32 Arduino Core 2.x / 3.x (Board: ESP32S3 Dev Module)  
> **Target Silicon:** ESP32-S3 Dual-Core Xtensa LX7 @ 240 MHz (16MB Flash, 8MB PSRAM)  
> **Partition Scheme:** `"Huge APP (3MB No OTA / 1MB SPIFFS)"`

---

## 🔄 Execution Architecture & Timing

The firmware runs a non-blocking asynchronous architecture driven by `millis()` software timers and a single unified TLS session on **Core 0**, eliminating dual-SSL heap exhaustion and use-after-free stream crashes:

```
┌─────────────────────────────────────────────────────────────┐
│                 Main Loop Execution Cadence                 │
├─────────────────────────────────────────────────────────────┤
│ Every 1,000 ms:  Sample Sensors (SHT31-D, BH1750, SCD41)   │
│                  Update Local Serial Monitor Telemetry      │
│ Every 2,000 ms:  Push Real-Time Telemetry to Firebase RTDB │
│                  Evaluate Autonomous Regulation Algorithms  │
│ Every 15,000 ms: Send "Online" Heartbeat & Ping Gateway     │
│ Every 30,000 ms: Feed 20-Sample Ring Buffer & Run TinyML    │
│ Every 1 Hour:    Push Hourly Sensor History Record          │
│                  Auto-Prune Records > 30 Days Old           │
│ Continuous:      LovyanGFX TFT Render & Watchdog Check      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Debounced Sensor State Machine (`sensor_state.h`)

To prevent electrical noise, relay switching electromagnetic interference (EMI), or cable contact bounce from causing false sensor alarms, the firmware routes all raw readings through a debouncing state machine:

### States (`SensorStatus`)
* `S_INIT (0)`: Boot grace period (first 15 seconds after power-on). Ignores transient sensor power-up settling.
* `S_OK (1)`: Valid, confirmed reading actively produced by hardware.
* `S_FAULT (2)`: Confirmed fault latched only after consecutive failed reads.

### Fault Classification (`FaultReason`)
* `R_NONE (0)`: Sensor operating nominally.
* `R_NOT_PRESENT (1)`: Device did not acknowledge (NACK) on I2C bus (unplugged or broken wire).
* `R_READ_FAIL (2)`: CRC checksum mismatch or partial frame transmission error.
* `R_OUT_OF_RANGE (3)`: Measurement exceeded physical environmental operating boundaries.
* `R_STALLED (4)`: Sensor stopped generating fresh sample conversions.
* `R_BUS (5)`: I2C hardware bus lockup.

```
Raw Read ──► [Fail Streak Counter >= 2] ──► Latch S_FAULT & Flag Root Cause
         ──► [Success Streak >= 2]     ──► Restore S_OK & Clear Fault Flags
```

---

## 🎛️ Climate Auto-Regulation Algorithms (`AUTO` Mode)

When operating in **`AUTO`** mode, the microcontroller autonomously balances humidity, temperature, and carbon dioxide without requiring cloud connectivity:

### 1. Relative Humidity Regulation (Ultrasonic Misters)
* **Biological Target**: 85% – 95% RH.
* **Turn ON**: `humidity < 85.0%`
* **Turn OFF**: `humidity >= 92.0%`
* **Smart Mister Sensor Pause**: When misters spray, micro-droplets temporarily coat the sensor probe face. The firmware pauses sensor fault escalation for **15–45 seconds** to allow mist dispersal.

### 2. Carbon Dioxide Purge (Exhaust Fan)
* **Target Threshold**: < 1,000 ppm.
* **Purge Activation**: `co2 >= 1,000 ppm` → Turn `PIN_FAN_EXHAUST` ON.
* **Deactivation**: `co2 <= 850 ppm` (150 ppm hysteresis band) → Turn `PIN_FAN_EXHAUST` OFF.

### 3. Temperature Differential Regulation (Intake + Exhaust Fans)
* **Upper Limit**: > 25.0°C.
* When temperature rises alongside excessive humidity, the exhaust fan pulses briefly to evacuate warm air while maintaining adequate moisture levels.

---

## 🔮 Pre-Emptive Edge AI Forecaster (`edge_forecast.h`)

* **Rolling Buffer**: 20 samples recorded every 30 seconds (sliding 10-minute historical window).
* **Predictive Horizon**: Generates predictions for $t + 10\text{ minutes}$ for Temperature, Humidity, CO₂, and Light.
* **Early Action**: If the forecast indicates an impending threshold breach, actuation starts *before* mushrooms experience physiological stress.

---

## 📶 Network Resilience & Watchdog System

1. **Single Unified TLS Session**: A single `FirebaseData` instance avoids running two concurrent TLS handshakes, saving >35KB of heap memory.
2. **Fast WAN Fallback (`checkWanInternetFast()`)**: If cloud pushes fail or latency exceeds `MAX_FAST_CLOUD_RTT_MS` (3,000 ms) for 2 consecutive cycles, the system enters **Offline Failsafe Mode**:
   - Reverts mode to local `AUTO`.
   - Continues local climate regulation without blocking.
   - Arms backoff timer before attempting cloud reconnection.
3. **Long Cable (10m Aviation Cable) I2C Bus Tuning**:
   - Clock frequency reduced to **50 kHz** to accommodate line capacitance (~1,200 pF).
   - Low-latency 100ms hardware timeout prevents I2C bus lockups.

---
*Return to [[tft_display_ui|TFT Display UI]] | [[prototype_guide|Prototype Guide]] | [[current_project_state|Current Project State]] | [[index|Dashboard]]*
