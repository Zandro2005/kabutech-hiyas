# ESP32-S3, Edge Impulse TinyML & IoT Hardware Architecture Rules

All AI agents working on firmware, hardware integration, or edge telemetry for the KabuTech project MUST strictly follow these rules:

---

## 1. ESP32-S3 Hardware & Pinout Rules

### 1.1 Restricted Pin Enforcement
- **NEVER** assign `GPIO 26` through `GPIO 32` to any sensor, relay, or peripheral.
- **Reason:** On ESP32-S3 modules with Octal SPI Flash/PSRAM (e.g., ESP32-S3-WROOM-1 N8R8 / N16R8), pins 26 to 32 are internally bonded to high-speed memory. Using them causes a catastrophic boot loop or memory corruption.
- **NEVER** assign `GPIO 19` or `GPIO 20` to sensors/relays if native USB OTG / CDC debugging is enabled.

### 1.2 Mandatory Pin Allocation Table
Any firmware written for the KabuTech ESP32-S3 must use these exact GPIO assignments:

| Peripheral | Signal | ESP32-S3 GPIO | Electrical Notes |
|---|---|---|---|
| **DHT22** (Temp/Humidity) | DATA | `GPIO 4` | Requires 10kΩ pull-up resistor to 3.3V |
| **BH1750** (Light Sensor) | I2C SDA | `GPIO 8` | 3.3V VCC, Hardware I2C Wire |
| **BH1750** (Light Sensor) | I2C SCL | `GPIO 9` | 3.3V VCC, Hardware I2C Wire |
| **MH-Z19B** (NDIR CO₂) | UART RX | `GPIO 17` | Connects to Sensor TX (9600 baud, 8N1) |
| **MH-Z19B** (NDIR CO₂) | UART TX | `GPIO 18` | Connects to Sensor RX |
| **Relay Channel 1** | Exhaust Fans | `GPIO 10` | Active-LOW optocoupled input |
| **Relay Channel 2** | Misting / Fogger | `GPIO 11` | Active-LOW optocoupled input |
| **Relay Channel 3** | Grow Lights | `GPIO 12` | Active-LOW optocoupled input |
| **Relay Channel 4** | Aux / CO₂ Injector| `GPIO 13` | Active-LOW optocoupled input |

### 1.3 Relay Electrical Isolation
- The 4-channel relay board **MUST** be optically isolated:
  1. The `VCC-JD-VCC` jumper on the relay board **must be removed**.
  2. ESP32 `3.3V` connects exclusively to Relay `VCC` (powering the optocoupler diodes).
  3. A separate external `5V DC` power supply connects to `JD-VCC` and `GND` (powering the mechanical relay coils).
- This prevents back-EMF and electrical noise from 220V AC fan/pump motors from resetting the ESP32-S3.

---

## 2. Firmware Concurrency & FreeRTOS Rules

- **NEVER** write blocking `delay()` calls inside the main Arduino `loop()`.
- The firmware MUST be split into two pinned FreeRTOS tasks:
  * **Core 1 Task (`TaskSensorsAndControl`)**: Priority 2.
    - Polls DHT22, BH1750, and MH-Z19B every 2,000 ms.
    - Feeds sensor features into the Edge Impulse model.
    - Executes local failsafe thermostat/hygrometer rules.
    - Controls physical relay GPIOs immediately without waiting for WiFi.
  * **Core 0 Task (`TaskFirebase`)**: Priority 1.
    - Manages WiFi auto-reconnect.
    - Streams live telemetry to Firebase Realtime Database every 2 seconds.
    - Listens to Realtime Database stream (`kabutech/settings/setpoints`) for real-time mobile app relay toggles.
- Shared data between Core 0 and Core 1 MUST be protected using a FreeRTOS `SemaphoreHandle_t` mutex.

### 2.1 Autonomous Offline Fallback Rule
- If WiFi disconnects or Firebase is unreachable, the ESP32-S3 **MUST NEVER** stop regulating the mushroom environment.
- Core 1 must continuously check the local setpoints (default: Fan ON if Temp > 26°C or CO₂ > 800 ppm; Mister ON if Humidity < 80%).

---

## 3. Firebase Realtime Database Data Contracts

AI agents modifying backend, firmware, or mobile code must conform strictly to these paths:

### 3.1 Telemetry Nodes (Written by ESP32, Read by Mobile App)
- `/kabutech/sensors/live`:
  ```json
  {
    "temperature": 24.5,
    "humidity": 82.0,
    "co2": 520,
    "light": 450,
    "esp32_status": "online",
    "timestamp": 1720648800000
  }
  ```
- `/kabutech/sensors/tinyml`:
  ```json
  {
    "anomaly_detected": false,
    "anomaly_score": 0.042,
    "status": "normal",
    "last_inference_ms": 12,
    "timestamp": 1720648800000
  }
  ```

### 3.2 Actuation & Settings Nodes (Written by Mobile App, Read by ESP32)
- `/kabutech/settings/setpoints`:
  ```json
  {
    "temperature": 26.0,
    "humidity": 85.0,
    "co2": 800,
    "light": 500,
    "mode": "auto",
    "devices": {
      "fans": false,
      "misters": false,
      "lights": false,
      "co2": false
    }
  }
  ```

---

## 4. Edge Impulse TinyML Rules

- The TinyML model MUST be trained via Edge Impulse and exported as an **Arduino Library (`.zip`)**.
- **Input Features (4-axis Time-Series)**:
  1. Temperature (°C)
  2. Relative Humidity (%)
  3. CO₂ Concentration (ppm)
  4. Ambient Light (lux)
- **Model Type**: Anomaly Detection (K-Means or GMM) with INT8 quantization.
- In C++ firmware, the model is invoked via `#include <your_project_inferencing.h>`:
  ```cpp
  signal_t signal;
  signal.total_length = EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE;
  signal.get_data = &raw_feature_get_data;
  ei_impulse_result_t result = { 0 };
  EI_IMPULSE_ERROR err = run_classifier(&signal, &result, false);
  ```
- If `result.anomaly >= 0.5` (or custom threshold), `anomaly_detected` MUST be set to `true` and transmitted to Firebase.

---

## 5. Mobile App (`KabutechNative`) Integration Rules

- Mobile app code MUST use the custom hook `useSensors()` for live readings and `useTinyML()` for anomaly alerts.
- Live updates MUST use non-blocking Firebase `onValue()` listeners managed in [FirebaseDataContext.tsx](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/KabutechNative/src/context/FirebaseDataContext.tsx).
- When `mode === 'auto'`, manual device toggle buttons in [ControlsScreen.tsx](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/KabutechNative/src/screens/ControlsScreen.tsx) MUST remain disabled/locked to prevent user actions from conflicting with the ESP32 autonomous controller.
