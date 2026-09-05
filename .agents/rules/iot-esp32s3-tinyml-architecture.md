# Complete Implementation Plan: ESP32-S3 IoT & Edge Impulse TinyML

> [!NOTE]
> All architectural rules, pin mappings, data contracts, and code patterns are permanently saved in [.agents/rules/iot-esp32s3-tinyml-architecture.md](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/.agents/rules/iot-esp32s3-tinyml-architecture.md). Any AI agent working on this repo will automatically follow them.

---

## System Overview

```mermaid
graph TB
    subgraph "Mushroom Fruiting Chamber"
        S1["DHT22<br/>Temp + Humidity<br/>GPIO 4"]
        S2["BH1750<br/>Light Sensor<br/>I2C: GPIO 8/9"]
        S3["MH-Z19B<br/>CO₂ Sensor<br/>UART: GPIO 17/18"]
        ESP["ESP32-S3 DevKitC-1<br/>Dual-Core 240MHz<br/>+ Edge Impulse Model"]
        RLY["4-Ch Opto-Isolated Relay<br/>JD-VCC Separated"]
        FAN["Exhaust Fans 220V"]
        MIST["Misting Pump 220V"]
        LITE["Grow Lights 12V"]
        AUX["Aux / CO₂ Solenoid"]

        S1 --> ESP
        S2 --> ESP
        S3 --> ESP
        ESP -->|"GPIO 10"| RLY
        ESP -->|"GPIO 11"| RLY
        ESP -->|"GPIO 12"| RLY
        ESP -->|"GPIO 13"| RLY
        RLY --> FAN
        RLY --> MIST
        RLY --> LITE
        RLY --> AUX
    end

    subgraph "ESP32-S3 Internals"
        C1["Core 1 (Priority 2)<br/>Sensors + Edge Impulse + Relays"]
        C0["Core 0 (Priority 1)<br/>WiFi + Firebase RTDB"]
        MX["FreeRTOS Mutex<br/>SystemState"]
        C1 <==> MX <==> C0
    end

    subgraph "Cloud"
        RTDB[("Firebase RTDB<br/>kabutech-hiyas")]
    end

    subgraph "Mobile App"
        APP["KabutechNative (Expo)<br/>React Native + twrnc"]
    end

    C0 <==>|"WiFi / HTTPS"| RTDB
    RTDB <==>|"onValue() listeners"| APP
```

---

## Phase 1: Edge Impulse Data Generation & Model Training

### 1.1 File: `tinyml/generate_edge_impulse_csv.py`

#### [NEW] [tinyml/generate_edge_impulse_csv.py](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/tinyml/generate_edge_impulse_csv.py)

```python
#!/usr/bin/env python3
"""
KabuTech Hiyas — Edge Impulse Training Data Generator
Generates CSV files formatted for Edge Impulse Studio time-series upload.

Usage:
  pip install numpy pandas
  python generate_edge_impulse_csv.py

Output:
  - normal_conditions.csv         (10,000 samples of healthy mushroom climate)
  - fan_failure_anomaly.csv       (500 samples of rising CO₂ + rising temp)
  - mister_failure_anomaly.csv    (500 samples of plunging humidity)
  - thermal_runaway_anomaly.csv   (500 samples of rapid temp spike)
"""

import numpy as np
import pandas as pd
import os

np.random.seed(42)
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
INTERVAL_MS = 2000  # 2-second intervals matching ESP32 polling rate


def generate_normal_data(n_samples=10000):
    """Generate realistic mushroom house normal conditions.
    
    Oyster Mushroom (Pleurotus ostreatus) optimal ranges:
      Temperature: 22-28 °C
      Humidity:    75-92 %
      CO₂:        400-800 ppm
      Light:      400-850 lux
    """
    t = np.arange(n_samples)
    
    # Temperature: slow sinusoidal drift (day/night) + noise
    temp_base = 25.0 + 2.5 * np.sin(2 * np.pi * t / 1800)  # ~1hr cycle
    temp_noise = np.random.normal(0, 0.3, n_samples)
    temperature = np.clip(temp_base + temp_noise, 20.0, 30.0)
    
    # Humidity: inversely correlated with temperature + independent noise
    hum_base = 85.0 - (temperature - 25.0) * 1.5
    hum_noise = np.random.normal(0, 1.2, n_samples)
    humidity = np.clip(hum_base + hum_noise, 70.0, 95.0)
    
    # CO₂: slow drift with ventilation cycles
    co2_base = 600 + 100 * np.sin(2 * np.pi * t / 2400)
    co2_noise = np.random.normal(0, 15, n_samples)
    co2 = np.clip(co2_base + co2_noise, 350, 850).astype(int)
    
    # Light: day/night cycle
    light_base = 500 + 150 * np.sin(2 * np.pi * t / 3600)
    light_noise = np.random.normal(0, 10, n_samples)
    light = np.clip(light_base + light_noise, 200, 850).astype(int)
    
    timestamps = np.arange(n_samples) * INTERVAL_MS
    
    df = pd.DataFrame({
        'timestamp': timestamps,
        'temperature': np.round(temperature, 1),
        'humidity': np.round(humidity, 1),
        'co2': co2,
        'light': light
    })
    return df


def generate_fan_failure(n_samples=500):
    """Simulate exhaust fan failure: CO₂ rises, temperature rises gradually."""
    t = np.arange(n_samples)
    
    # Temperature climbs from 26 to 36 over the window
    temperature = 26.0 + (t / n_samples) * 10.0 + np.random.normal(0, 0.4, n_samples)
    temperature = np.clip(temperature, 24.0, 40.0)
    
    # CO₂ climbs from 700 to 1800
    co2 = 700 + (t / n_samples) * 1100 + np.random.normal(0, 25, n_samples)
    co2 = np.clip(co2, 600, 2000).astype(int)
    
    # Humidity drops slightly as temp rises
    humidity = 82.0 - (t / n_samples) * 15.0 + np.random.normal(0, 1.5, n_samples)
    humidity = np.clip(humidity, 50.0, 90.0)
    
    # Light stays relatively normal
    light = 500 + np.random.normal(0, 20, n_samples)
    light = np.clip(light, 300, 700).astype(int)
    
    timestamps = np.arange(n_samples) * INTERVAL_MS
    
    return pd.DataFrame({
        'timestamp': timestamps,
        'temperature': np.round(temperature, 1),
        'humidity': np.round(humidity, 1),
        'co2': co2,
        'light': light
    })


def generate_mister_failure(n_samples=500):
    """Simulate misting system failure: humidity plunges rapidly."""
    t = np.arange(n_samples)
    
    # Humidity drops from 85 to 35
    humidity = 85.0 - (t / n_samples) * 50.0 + np.random.normal(0, 1.0, n_samples)
    humidity = np.clip(humidity, 20.0, 90.0)
    
    # Temperature rises slightly without evaporative cooling
    temperature = 25.0 + (t / n_samples) * 5.0 + np.random.normal(0, 0.3, n_samples)
    temperature = np.clip(temperature, 22.0, 34.0)
    
    # CO₂ relatively normal
    co2 = 600 + np.random.normal(0, 30, n_samples)
    co2 = np.clip(co2, 400, 900).astype(int)
    
    # Light normal
    light = 500 + np.random.normal(0, 15, n_samples)
    light = np.clip(light, 300, 700).astype(int)
    
    timestamps = np.arange(n_samples) * INTERVAL_MS
    
    return pd.DataFrame({
        'timestamp': timestamps,
        'temperature': np.round(temperature, 1),
        'humidity': np.round(humidity, 1),
        'co2': co2,
        'light': light
    })


def generate_thermal_runaway(n_samples=500):
    """Simulate heating element stuck ON or fire risk: rapid temperature spike."""
    t = np.arange(n_samples)
    
    # Temperature spikes from 26 to 42+ rapidly
    temperature = 26.0 + (t / n_samples) ** 0.7 * 18.0 + np.random.normal(0, 0.5, n_samples)
    temperature = np.clip(temperature, 24.0, 45.0)
    
    # Humidity crashes
    humidity = 80.0 - (t / n_samples) * 40.0 + np.random.normal(0, 2.0, n_samples)
    humidity = np.clip(humidity, 15.0, 85.0)
    
    # CO₂ spikes
    co2 = 600 + (t / n_samples) * 800 + np.random.normal(0, 30, n_samples)
    co2 = np.clip(co2, 400, 2000).astype(int)
    
    # Light might flicker or stay normal
    light = 500 + np.random.normal(0, 30, n_samples)
    light = np.clip(light, 200, 800).astype(int)
    
    timestamps = np.arange(n_samples) * INTERVAL_MS
    
    return pd.DataFrame({
        'timestamp': timestamps,
        'temperature': np.round(temperature, 1),
        'humidity': np.round(humidity, 1),
        'co2': co2,
        'light': light
    })


if __name__ == '__main__':
    print("Generating Edge Impulse training data...")
    
    df_normal = generate_normal_data(10000)
    df_normal.to_csv(os.path.join(OUTPUT_DIR, 'normal_conditions.csv'), index=False)
    print(f"  ✅ normal_conditions.csv — {len(df_normal)} samples")
    
    df_fan = generate_fan_failure(500)
    df_fan.to_csv(os.path.join(OUTPUT_DIR, 'fan_failure_anomaly.csv'), index=False)
    print(f"  ✅ fan_failure_anomaly.csv — {len(df_fan)} samples")
    
    df_mister = generate_mister_failure(500)
    df_mister.to_csv(os.path.join(OUTPUT_DIR, 'mister_failure_anomaly.csv'), index=False)
    print(f"  ✅ mister_failure_anomaly.csv — {len(df_mister)} samples")
    
    df_thermal = generate_thermal_runaway(500)
    df_thermal.to_csv(os.path.join(OUTPUT_DIR, 'thermal_runaway_anomaly.csv'), index=False)
    print(f"  ✅ thermal_runaway_anomaly.csv — {len(df_thermal)} samples")
    
    print(f"\nDone! Upload these CSVs to Edge Impulse Studio → Data Acquisition → CSV Upload")
    print(f"Label normal_conditions.csv as 'normal' and the anomaly files as 'anomaly'")
```

#### [NEW] [tinyml/requirements.txt](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/tinyml/requirements.txt)
```
numpy>=1.24.0
pandas>=2.0.0
```

---

### 1.2 Edge Impulse Studio Walkthrough

#### [NEW] [Tutorials/EDGE_IMPULSE_WALKTHROUGH.md](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/Tutorials/EDGE_IMPULSE_WALKTHROUGH.md)

**Step-by-step instructions to create in this file:**

1. **Create Account**: Go to [edgeimpulse.com](https://edgeimpulse.com) → Sign Up (free).
2. **Create Project**: Click "Create new project" → Name it `kabutech-mushroom-anomaly`.
3. **Upload Data**:
   - Go to **Data Acquisition** tab.
   - Click **Upload data** → **CSV (Wizard)**.
   - Upload `normal_conditions.csv` → Label: `normal` → Category: Training (80%) / Test (20%).
   - Upload each anomaly CSV → Label: `anomaly` → Category: Training (80%) / Test (20%).
4. **Design Impulse**:
   - Go to **Impulse Design** → **Create Impulse**.
   - **Add Input Block**: Time Series Data.
     - Window size: `10000` ms.
     - Window increase: `2000` ms.
     - Frequency: `0.5` Hz.
   - **Add Processing Block**: `Flatten` (extracts mean, std, min, max, kurtosis, skewness per axis).
   - **Add Learning Block**: `Anomaly Detection (K-Means)`.
   - Click **Save Impulse**.
5. **Generate Features**:
   - Click **Flatten** in left sidebar → **Generate features**.
   - Wait for the feature explorer to render. Normal and anomaly clusters should be visibly separated.
6. **Train Anomaly Detection**:
   - Click **Anomaly Detection** in left sidebar.
   - Number of clusters: leave as default (32) or set to 16.
   - Click **Start Training**.
   - Verify: Normal samples should have low anomaly scores, anomaly samples should have high scores.
7. **Test Model**:
   - Go to **Model Testing** → **Classify All**.
   - Accuracy should be >90% separation between normal and anomaly.
8. **Deploy as Arduino Library**:
   - Go to **Deployment**.
   - Search and select **Arduino Library**.
   - Under Optimizations: select **Quantized (int8)**.
   - Click **Build** → Downloads `kabutech-mushroom-anomaly_inferencing.zip`.
9. **Install in Arduino IDE**:
   - Open Arduino IDE.
   - **Sketch → Include Library → Add .ZIP Library...**
   - Select the downloaded `.zip` file.

---

## Phase 2: Hardware Wiring

### Complete Wiring Diagram

```
                    ┌─────────────────────────────────────────┐
                    │            ESP32-S3 DevKitC-1           │
                    │                                         │
  ┌── DHT22 ───────┤ GPIO 4 (DATA)                     3V3  ├───┬── DHT22 VCC
  │  (10kΩ to 3V3) │                                         │   ├── BH1750 VCC
  │                 │                                         │   └── 10kΩ pull-up
  │  BH1750 SDA ───┤ GPIO 8                                  │
  │  BH1750 SCL ───┤ GPIO 9                                  │
  │                 │                                         │
  │  MH-Z19B TX ───┤ GPIO 17 (RX1)                           │
  │  MH-Z19B RX ───┤ GPIO 18 (TX1)                           │
  │                 │                                         │
  │  Relay IN1  ───┤ GPIO 10  ─── Exhaust Fans               │
  │  Relay IN2  ───┤ GPIO 11  ─── Misting Pump               │
  │  Relay IN3  ───┤ GPIO 12  ─── Grow Lights                │
  │  Relay IN4  ───┤ GPIO 13  ─── Aux / CO₂                  │
  │                 │                                         │
  │  5V Adapter ───┤ 5V / VBUS                          GND  ├─── All GNDs
  │                 └─────────────────────────────────────────┘
  │
  │  ┌───────────────────── RELAY BOARD ─────────────────────┐
  │  │                                                        │
  │  │  VCC  ← ESP32 3V3 (optocoupler LEDs only)             │
  │  │  GND  ← ESP32 GND                                     │
  │  │  IN1  ← ESP32 GPIO 10                                 │
  │  │  IN2  ← ESP32 GPIO 11                                 │
  │  │  IN3  ← ESP32 GPIO 12                                 │
  │  │  IN4  ← ESP32 GPIO 13                                 │
  │  │                                                        │
  │  │  ⚠️ REMOVE jumper between VCC and JD-VCC!             │
  │  │                                                        │
  │  │  JD-VCC ← External 5V 2A Power Supply (+)             │
  │  │  GND    ← External 5V 2A Power Supply (-)             │
  │  └────────────────────────────────────────────────────────┘
  │
  │  MH-Z19B Power: Vin → ESP32 5V (VBUS)  ← Needs 5V!
  │  BH1750 ADDR pin → GND (sets address to 0x23)
  └────────────────────────────────────────────────────────────
```

---

## Phase 3: ESP32-S3 Firmware

### 3.1 File: `firmware/esp32_s3_firmware/config.h`

#### [NEW] [firmware/esp32_s3_firmware/config.h](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/firmware/esp32_s3_firmware/config.h)

```cpp
#ifndef CONFIG_H
#define CONFIG_H

// ═══════════════════════════════════════════════
// WiFi Credentials (CHANGE THESE)
// ═══════════════════════════════════════════════
#define WIFI_SSID       "YOUR_WIFI_SSID"
#define WIFI_PASSWORD   "YOUR_WIFI_PASSWORD"

// ═══════════════════════════════════════════════
// Firebase Configuration (from KabutechNative .env)
// ═══════════════════════════════════════════════
#define FIREBASE_API_KEY      "AIzaSyA3rB7rKIrfdJzCnFdnGvk25n0rd_hHI7M"
#define FIREBASE_DATABASE_URL "https://kabutech-hiyas-default-rtdb.asia-southeast1.firebasedatabase.app"
#define FIREBASE_PROJECT_ID   "kabutech-hiyas"

// ═══════════════════════════════════════════════
// ESP32-S3 GPIO Pin Assignments
// DO NOT CHANGE — These match the wiring diagram
// and the .agents/rules pinout table exactly.
// ═══════════════════════════════════════════════
#define PIN_DHT_DATA    4
#define PIN_I2C_SDA     8
#define PIN_I2C_SCL     9
#define PIN_CO2_RX      17   // ESP32 RX ← MH-Z19B TX
#define PIN_CO2_TX      18   // ESP32 TX → MH-Z19B RX

#define RELAY_FAN       10
#define RELAY_MISTER    11
#define RELAY_LIGHT     12
#define RELAY_CO2       13

// ═══════════════════════════════════════════════
// Timing Intervals (milliseconds)
// ═══════════════════════════════════════════════
#define SENSOR_POLL_INTERVAL_MS       2000
#define FIREBASE_PUSH_INTERVAL_MS     2000
#define TINYML_INFERENCE_INTERVAL_MS  30000
#define HISTORY_PUSH_INTERVAL_MS      3600000
#define MHZ19B_WARMUP_MS              180000

// ═══════════════════════════════════════════════
// Default Failsafe Setpoints
// ═══════════════════════════════════════════════
#define DEFAULT_TARGET_TEMP      26.0
#define DEFAULT_TARGET_HUM       85.0
#define DEFAULT_TARGET_CO2       800
#define DEFAULT_TARGET_LIGHT     500

// ═══════════════════════════════════════════════
// Relay Chatter Prevention (Hysteresis)
// ═══════════════════════════════════════════════
#define HYSTERESIS_TEMP          1.0   // °C
#define HYSTERESIS_HUM           3.0   // %
#define HYSTERESIS_CO2           50    // ppm

// ═══════════════════════════════════════════════
// Edge Impulse Normalization
// ═══════════════════════════════════════════════
#define NORM_TEMP_MAX   50.0
#define NORM_HUM_MAX    100.0
#define NORM_CO2_MAX    2000.0
#define NORM_LIGHT_MAX  1000.0

// ═══════════════════════════════════════════════
// Edge Impulse Anomaly Threshold
// ═══════════════════════════════════════════════
#define ANOMALY_THRESHOLD  0.5

#endif // CONFIG_H
```

---

### 3.2 File: `firmware/esp32_s3_firmware/esp32_s3_firmware.ino`

#### [NEW] [firmware/esp32_s3_firmware/esp32_s3_firmware.ino](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/firmware/esp32_s3_firmware/esp32_s3_firmware.ino)

```cpp
/**
 * KabuTech Hiyas — ESP32-S3 Dual-Core IoT Firmware
 * 
 * Core 0: WiFi management, Firebase RTDB streaming & push
 * Core 1: Sensor polling, Edge Impulse TinyML inference, relay actuation
 * 
 * Required Libraries (install via Library Manager):
 *   - DHT sensor library (Adafruit)
 *   - Adafruit Unified Sensor
 *   - BH1750 (Christopher Laws)
 *   - Firebase ESP Client (Mobizt)
 *   - ArduinoJson (Benoit Blanchon) v6.x
 * 
 * Required Library (install via Add .ZIP):
 *   - kabutech_inferencing.zip (exported from Edge Impulse)
 * 
 * Board Settings:
 *   Board: ESP32S3 Dev Module
 *   USB CDC On Boot: Enabled
 *   CPU Frequency: 240MHz (WiFi)
 *   Flash Mode: QIO 80MHz
 *   PSRAM: OPI PSRAM (if available)
 *   Partition Scheme: Default 4MB with spiffs
 */

#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>
#include <DHT.h>
#include <Wire.h>
#include <BH1750.h>
#include "config.h"

// ─── Uncomment this line AFTER you install the Edge Impulse library ───
// #include <kabutech-mushroom-anomaly_inferencing.h>

// ═══════════════════════════════════════════════
// Sensor Objects
// ═══════════════════════════════════════════════
DHT dht(PIN_DHT_DATA, DHT22);
BH1750 lightMeter;
HardwareSerial co2Serial(1);  // Hardware UART1 on ESP32-S3

// ═══════════════════════════════════════════════
// Firebase Objects
// ═══════════════════════════════════════════════
FirebaseData fbdoStream;   // For receiving commands from mobile app
FirebaseData fbdoWriter;   // For pushing sensor data
FirebaseAuth fbAuth;
FirebaseConfig fbConfig;

// ═══════════════════════════════════════════════
// Thread-Safe Shared State (Mutex Protected)
// ═══════════════════════════════════════════════
struct SystemState {
  // Sensor readings (written by Core 1)
  float temperature = 25.0;
  float humidity = 80.0;
  float light = 400.0;
  int   co2 = 500;
  
  // TinyML results (written by Core 1)
  bool  anomalyDetected = false;
  float anomalyScore = 0.0;
  int   lastInferenceMs = 0;
  String anomalyStatus = "normal";
  
  // Relay states (written by both cores)
  bool fanState = false;
  bool misterState = false;
  bool lightState = false;
  bool co2DeviceState = false;
  
  // Control mode & setpoints (written by Core 0 from Firebase)
  String mode = "auto";
  float targetTemp = DEFAULT_TARGET_TEMP;
  float targetHum = DEFAULT_TARGET_HUM;
  int   targetCo2 = DEFAULT_TARGET_CO2;
  int   targetLight = DEFAULT_TARGET_LIGHT;
  
  // Connection status
  bool wifiConnected = false;
  bool firebaseReady = false;
  bool co2Warmed = false;      // MH-Z19B needs 3 min warm-up
};

SystemState state;
SemaphoreHandle_t stateMutex;

// ═══════════════════════════════════════════════
// Edge Impulse Feature Buffer
// ═══════════════════════════════════════════════
// Uncomment these when Edge Impulse library is installed:
// static float ei_features[EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE];
// static int ei_feature_ix = 0;
// 
// int raw_feature_get_data(size_t offset, size_t length, float *out_ptr) {
//     memcpy(out_ptr, ei_features + offset, length * sizeof(float));
//     return 0;
// }

// ═══════════════════════════════════════════════
// MH-Z19B CO₂ UART Read Function
// ═══════════════════════════════════════════════
int readCO2() {
  byte cmd[9] = {0xFF, 0x01, 0x86, 0x00, 0x00, 0x00, 0x00, 0x00, 0x79};
  byte response[9];
  
  // Flush any stale data
  while (co2Serial.available()) co2Serial.read();
  
  co2Serial.write(cmd, 9);
  delay(100);  // Brief wait for response (OK inside task since we use vTaskDelayUntil)
  
  if (co2Serial.available() >= 9) {
    co2Serial.readBytes(response, 9);
    
    // Verify checksum
    byte checksum = 0;
    for (int i = 1; i < 8; i++) checksum += response[i];
    checksum = 0xFF - checksum + 1;
    
    if (response[0] == 0xFF && response[1] == 0x86 && response[8] == checksum) {
      int ppm = (response[2] << 8) | response[3];
      return ppm;
    }
  }
  return -1;  // Invalid reading
}

// ═══════════════════════════════════════════════
// CORE 1 TASK: Sensors, Edge Impulse & Relay Control
// ═══════════════════════════════════════════════
void TaskSensorsAndControl(void *pvParameters) {
  TickType_t xLastWakeTime = xTaskGetTickCount();
  unsigned long bootTime = millis();
  int inferenceCounter = 0;
  
  // Store last valid readings for NaN protection
  float lastValidTemp = 25.0;
  float lastValidHum = 80.0;
  
  for (;;) {
    // ── 1. Read DHT22 (Temperature & Humidity) ──
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    
    if (!isnan(t)) lastValidTemp = t; else t = lastValidTemp;
    if (!isnan(h)) lastValidHum = h; else h = lastValidHum;
    
    // ── 2. Read BH1750 (Light Level) ──
    float lx = lightMeter.readLightLevel();
    if (lx < 0) lx = 0;  // Error returns -1 or -2
    
    // ── 3. Read MH-Z19B (CO₂) — skip during warm-up ──
    int co2Ppm = -1;
    bool warmed = (millis() - bootTime) > MHZ19B_WARMUP_MS;
    if (warmed) {
      co2Ppm = readCO2();
    }
    
    // ── 4. Acquire mutex & update shared state ──
    if (xSemaphoreTake(stateMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
      state.temperature = t;
      state.humidity = h;
      state.light = lx;
      state.co2Warmed = warmed;
      if (co2Ppm > 0) state.co2 = co2Ppm;
      
      // ── 5. Edge Impulse Feature Buffer ──
      // Uncomment when Edge Impulse library is installed:
      // if (ei_feature_ix + 4 <= EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE) {
      //     ei_features[ei_feature_ix++] = t / NORM_TEMP_MAX;
      //     ei_features[ei_feature_ix++] = h / NORM_HUM_MAX;
      //     ei_features[ei_feature_ix++] = (float)state.co2 / NORM_CO2_MAX;
      //     ei_features[ei_feature_ix++] = lx / NORM_LIGHT_MAX;
      // }
      
      // ── 6. Run Edge Impulse Inference every 30 seconds ──
      inferenceCounter++;
      if (inferenceCounter >= (TINYML_INFERENCE_INTERVAL_MS / SENSOR_POLL_INTERVAL_MS)) {
        inferenceCounter = 0;
        
        // Uncomment when Edge Impulse library is installed:
        // if (ei_feature_ix >= EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE) {
        //     signal_t signal;
        //     signal.total_length = EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE;
        //     signal.get_data = &raw_feature_get_data;
        //     ei_impulse_result_t result = { 0 };
        //     unsigned long t0 = millis();
        //     EI_IMPULSE_ERROR err = run_classifier(&signal, &result, false);
        //     unsigned long elapsed = millis() - t0;
        //     if (err == EI_IMPULSE_OK) {
        //         state.anomalyScore = result.anomaly;
        //         state.anomalyDetected = (result.anomaly >= ANOMALY_THRESHOLD);
        //         state.lastInferenceMs = (int)elapsed;
        //         if (result.anomaly >= ANOMALY_THRESHOLD) {
        //             state.anomalyStatus = "critical";
        //         } else if (result.anomaly >= 0.3) {
        //             state.anomalyStatus = "warning";
        //         } else {
        //             state.anomalyStatus = "normal";
        //         }
        //         Serial.printf("[TinyML] Anomaly=%.3f  Status=%s  Time=%dms\n",
        //             state.anomalyScore, state.anomalyStatus.c_str(), state.lastInferenceMs);
        //     }
        //     ei_feature_ix = 0;  // Reset buffer
        // }
        
        // Placeholder: log sensor values until Edge Impulse is ready
        Serial.printf("[Sensors] Temp=%.1f°C  Hum=%.1f%%  CO2=%dppm  Light=%.0flux\n",
            state.temperature, state.humidity, state.co2, state.light);
      }
      
      // ── 7. Autonomous Relay Control (Auto Mode) ──
      if (state.mode == "auto") {
        // Fan logic with hysteresis
        if (state.temperature > state.targetTemp || state.co2 > state.targetCo2) {
          state.fanState = true;
        } else if (state.temperature <= (state.targetTemp - HYSTERESIS_TEMP) &&
                   state.co2 <= (state.targetCo2 - HYSTERESIS_CO2)) {
          state.fanState = false;
        }
        
        // Mister logic with hysteresis
        if (state.humidity < state.targetHum) {
          state.misterState = true;
        } else if (state.humidity >= (state.targetHum + HYSTERESIS_HUM)) {
          state.misterState = false;
        }
      }
      // In "manual" or "scheduled" mode, relay states are set by Firebase stream
      
      // ── 8. Drive Physical Relays (Active-LOW) ──
      digitalWrite(RELAY_FAN,    state.fanState    ? LOW : HIGH);
      digitalWrite(RELAY_MISTER, state.misterState ? LOW : HIGH);
      digitalWrite(RELAY_LIGHT,  state.lightState  ? LOW : HIGH);
      digitalWrite(RELAY_CO2,    state.co2DeviceState ? LOW : HIGH);
      
      xSemaphoreGive(stateMutex);
    }
    
    // ── Run exactly every 2 seconds ──
    vTaskDelayUntil(&xLastWakeTime, pdMS_TO_TICKS(SENSOR_POLL_INTERVAL_MS));
  }
}

// ═══════════════════════════════════════════════
// Firebase Stream Callback (Receives commands from Mobile App)
// ═══════════════════════════════════════════════
void streamCallback(FirebaseStream data) {
  String path = data.dataPath();
  
  if (xSemaphoreTake(stateMutex, pdMS_TO_TICKS(200)) == pdTRUE) {
    // Device toggle commands from ControlsScreen.tsx
    if (path == "/devices/fans") {
      state.fanState = data.boolData();
      Serial.printf("[Firebase] Fan → %s\n", state.fanState ? "ON" : "OFF");
    }
    else if (path == "/devices/misters") {
      state.misterState = data.boolData();
      Serial.printf("[Firebase] Mister → %s\n", state.misterState ? "ON" : "OFF");
    }
    else if (path == "/devices/lights") {
      state.lightState = data.boolData();
      Serial.printf("[Firebase] Light → %s\n", state.lightState ? "ON" : "OFF");
    }
    else if (path == "/devices/co2") {
      state.co2DeviceState = data.boolData();
      Serial.printf("[Firebase] CO₂ Device → %s\n", state.co2DeviceState ? "ON" : "OFF");
    }
    // Mode changes from ControlsScreen.tsx
    else if (path == "/mode") {
      state.mode = data.stringData();
      Serial.printf("[Firebase] Mode → %s\n", state.mode.c_str());
    }
    // Setpoint changes from ControlsScreen.tsx circular slider
    else if (path == "/temperature") {
      state.targetTemp = data.floatData();
      Serial.printf("[Firebase] Target Temp → %.1f°C\n", state.targetTemp);
    }
    else if (path == "/humidity") {
      state.targetHum = data.floatData();
      Serial.printf("[Firebase] Target Hum → %.1f%%\n", state.targetHum);
    }
    else if (path == "/co2" && data.dataType() == "int") {
      state.targetCo2 = data.intData();
      Serial.printf("[Firebase] Target CO₂ → %d ppm\n", state.targetCo2);
    }
    else if (path == "/light" && data.dataType() == "int") {
      state.targetLight = data.intData();
      Serial.printf("[Firebase] Target Light → %d lux\n", state.targetLight);
    }
    // Full initial data load (when stream first connects)
    else if (path == "/") {
      FirebaseJson *json = data.jsonObjectPtr();
      FirebaseJsonData jsonData;
      
      if (json->get(jsonData, "mode") && jsonData.typeNum == FirebaseJson::JSON_STRING)
        state.mode = jsonData.stringValue;
      if (json->get(jsonData, "temperature") && jsonData.typeNum == FirebaseJson::JSON_FLOAT)
        state.targetTemp = jsonData.floatValue;
      if (json->get(jsonData, "humidity") && jsonData.typeNum == FirebaseJson::JSON_FLOAT)
        state.targetHum = jsonData.floatValue;
      if (json->get(jsonData, "co2") && jsonData.typeNum == FirebaseJson::JSON_INT)
        state.targetCo2 = jsonData.intValue;
      if (json->get(jsonData, "light") && jsonData.typeNum == FirebaseJson::JSON_INT)
        state.targetLight = jsonData.intValue;
      if (json->get(jsonData, "devices/fans") && jsonData.typeNum == FirebaseJson::JSON_BOOL)
        state.fanState = jsonData.boolValue;
      if (json->get(jsonData, "devices/misters") && jsonData.typeNum == FirebaseJson::JSON_BOOL)
        state.misterState = jsonData.boolValue;
      if (json->get(jsonData, "devices/lights") && jsonData.typeNum == FirebaseJson::JSON_BOOL)
        state.lightState = jsonData.boolValue;
      if (json->get(jsonData, "devices/co2") && jsonData.typeNum == FirebaseJson::JSON_BOOL)
        state.co2DeviceState = jsonData.boolValue;
      
      Serial.printf("[Firebase] Full sync: mode=%s  targetTemp=%.1f  targetHum=%.1f\n",
          state.mode.c_str(), state.targetTemp, state.targetHum);
    }
    
    xSemaphoreGive(stateMutex);
  }
}

void streamTimeoutCallback(bool timeout) {
  if (timeout) {
    Serial.println("[Firebase] Stream timeout — reconnecting...");
  }
}

// ═══════════════════════════════════════════════
// CORE 0 TASK: WiFi & Firebase Networking
// ═══════════════════════════════════════════════
void TaskFirebase(void *pvParameters) {
  // ── 1. Connect WiFi ──
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("[WiFi] Connecting");
  
  int wifiAttempts = 0;
  while (WiFi.status() != WL_CONNECTED && wifiAttempts < 40) {
    vTaskDelay(pdMS_TO_TICKS(500));
    Serial.print(".");
    wifiAttempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] Connected! IP: %s  RSSI: %d dBm\n",
        WiFi.localIP().toString().c_str(), WiFi.RSSI());
    if (xSemaphoreTake(stateMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
      state.wifiConnected = true;
      xSemaphoreGive(stateMutex);
    }
  } else {
    Serial.println("\n[WiFi] FAILED — running in offline failsafe mode");
  }
  
  // ── 2. Initialize Firebase ──
  fbConfig.api_key = FIREBASE_API_KEY;
  fbConfig.database_url = FIREBASE_DATABASE_URL;
  fbConfig.token_status_callback = tokenStatusCallback;  // from TokenHelper.h
  
  // Anonymous authentication (satisfies "auth != null" database rule)
  Firebase.signUp(&fbConfig, &fbAuth, "", "");
  Firebase.begin(&fbConfig, &fbAuth);
  Firebase.reconnectWiFi(true);
  
  // ── 3. Setup stream listener for mobile app commands ──
  Firebase.RTDB.setStreamCallback(&fbdoStream, streamCallback, streamTimeoutCallback);
  
  if (!Firebase.RTDB.beginStream(&fbdoStream, "/kabutech/settings/setpoints")) {
    Serial.printf("[Firebase] Stream begin FAILED: %s\n", fbdoStream.errorReason().c_str());
  } else {
    Serial.println("[Firebase] Stream connected to /kabutech/settings/setpoints");
    if (xSemaphoreTake(stateMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
      state.firebaseReady = true;
      xSemaphoreGive(stateMutex);
    }
  }
  
  // ── 4. Main push loop ──
  TickType_t lastPush = xTaskGetTickCount();
  TickType_t lastTinyMLPush = xTaskGetTickCount();
  
  for (;;) {
    // Auto-reconnect WiFi if disconnected
    if (WiFi.status() != WL_CONNECTED) {
      if (xSemaphoreTake(stateMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
        state.wifiConnected = false;
        xSemaphoreGive(stateMutex);
      }
      WiFi.disconnect();
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      vTaskDelay(pdMS_TO_TICKS(5000));
      continue;
    } else {
      if (xSemaphoreTake(stateMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
        state.wifiConnected = true;
        xSemaphoreGive(stateMutex);
      }
    }
    
    // ── Push live sensor data every 2 seconds ──
    if ((xTaskGetTickCount() - lastPush) >= pdMS_TO_TICKS(FIREBASE_PUSH_INTERVAL_MS)) {
      lastPush = xTaskGetTickCount();
      
      if (Firebase.ready()) {
        FirebaseJson liveJson;
        
        if (xSemaphoreTake(stateMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
          liveJson.set("temperature", state.temperature);
          liveJson.set("humidity", state.humidity);
          liveJson.set("co2", state.co2);
          liveJson.set("light", state.light);
          liveJson.set("esp32_status", "online");
          liveJson.set("timestamp/.sv", "timestamp");  // Server timestamp
          xSemaphoreGive(stateMutex);
        }
        
        if (!Firebase.RTDB.updateNode(&fbdoWriter, "/kabutech/sensors/live", &liveJson)) {
          Serial.printf("[Firebase] Live push FAILED: %s\n", fbdoWriter.errorReason().c_str());
        }
      }
    }
    
    // ── Push TinyML results every 30 seconds ──
    if ((xTaskGetTickCount() - lastTinyMLPush) >= pdMS_TO_TICKS(TINYML_INFERENCE_INTERVAL_MS)) {
      lastTinyMLPush = xTaskGetTickCount();
      
      if (Firebase.ready()) {
        FirebaseJson tinymlJson;
        
        if (xSemaphoreTake(stateMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
          tinymlJson.set("anomaly_detected", state.anomalyDetected);
          tinymlJson.set("anomaly_score", state.anomalyScore);
          tinymlJson.set("status", state.anomalyStatus);
          tinymlJson.set("last_inference_ms", state.lastInferenceMs);
          tinymlJson.set("timestamp/.sv", "timestamp");
          xSemaphoreGive(stateMutex);
        }
        
        if (!Firebase.RTDB.updateNode(&fbdoWriter, "/kabutech/sensors/tinyml", &tinymlJson)) {
          Serial.printf("[Firebase] TinyML push FAILED: %s\n", fbdoWriter.errorReason().c_str());
        }
      }
    }
    
    vTaskDelay(pdMS_TO_TICKS(50));
  }
}

// ═══════════════════════════════════════════════
// SETUP — Runs once on boot
// ═══════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  while (!Serial && millis() < 3000);  // Wait up to 3s for USB CDC
  
  Serial.println("╔══════════════════════════════════════╗");
  Serial.println("║   KabuTech Hiyas ESP32-S3 Firmware   ║");
  Serial.println("║   Edge Impulse + Firebase RTDB       ║");
  Serial.println("╚══════════════════════════════════════╝");
  
  // ── Initialize I2C for BH1750 ──
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  
  // ── Initialize Sensors ──
  dht.begin();
  if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE)) {
    Serial.println("[BH1750] Initialized OK (addr=0x23)");
  } else {
    Serial.println("[BH1750] INIT FAILED! Check I2C wiring.");
  }
  
  // ── Initialize MH-Z19B UART ──
  co2Serial.begin(9600, SERIAL_8N1, PIN_CO2_RX, PIN_CO2_TX);
  Serial.printf("[MH-Z19B] UART started (RX=%d, TX=%d). Warming up %d seconds...\n",
      PIN_CO2_RX, PIN_CO2_TX, MHZ19B_WARMUP_MS / 1000);
  
  // ── Initialize Relay GPIOs (Active-LOW: HIGH = OFF) ──
  pinMode(RELAY_FAN,    OUTPUT); digitalWrite(RELAY_FAN,    HIGH);
  pinMode(RELAY_MISTER, OUTPUT); digitalWrite(RELAY_MISTER, HIGH);
  pinMode(RELAY_LIGHT,  OUTPUT); digitalWrite(RELAY_LIGHT,  HIGH);
  pinMode(RELAY_CO2,    OUTPUT); digitalWrite(RELAY_CO2,    HIGH);
  Serial.println("[Relays] All OFF (GPIO 10-13 HIGH)");
  
  // ── Create Mutex ──
  stateMutex = xSemaphoreCreateMutex();
  
  // ── Pin Tasks to Specific Cores ──
  xTaskCreatePinnedToCore(
    TaskSensorsAndControl,  // Task function
    "SensorTask",           // Name
    8192,                   // Stack size (bytes)
    NULL,                   // Parameters
    2,                      // Priority (higher = more important)
    NULL,                   // Task handle
    1                       // Core 1
  );
  
  xTaskCreatePinnedToCore(
    TaskFirebase,           // Task function
    "FirebaseTask",         // Name
    16384,                  // Stack size (needs more for SSL/WiFi)
    NULL,                   // Parameters
    1,                      // Priority
    NULL,                   // Task handle
    0                       // Core 0
  );
  
  Serial.println("[Boot] FreeRTOS tasks started. Core 0=Firebase, Core 1=Sensors");
}

// ═══════════════════════════════════════════════
// LOOP — Empty (all work done by FreeRTOS tasks)
// ═══════════════════════════════════════════════
void loop() {
  vTaskDelay(pdMS_TO_TICKS(1000));
}
```

---

## Phase 4: Mobile App Modifications

### 4.1 Add TinyML Type Interface

#### [MODIFY] [KabutechNative/src/types/firebase.ts](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/KabutechNative/src/types/firebase.ts)
Add after `SensorData` interface (after line 7):
```typescript
export interface TinyMLData {
  anomaly_detected: boolean;
  anomaly_score: number;
  status: 'normal' | 'warning' | 'critical';
  anomaly_type?: string;
  last_inference_ms: number;
  timestamp?: number;
}
```

---

### 4.2 Add TinyML Context & Listener

#### [MODIFY] [KabutechNative/src/context/FirebaseDataContext.tsx](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/KabutechNative/src/context/FirebaseDataContext.tsx)

**Add to imports (line 5):** Add `TinyMLData` to the import list:
```typescript
import { SensorData, SettingsData, BatchData, AlertData, StaffTask, ActivityLogEntry, UserProfile, TinyMLData } from '../types/firebase';
```

**Add default after line 14:**
```typescript
const defaultTinyML: TinyMLData = {
  anomaly_detected: false,
  anomaly_score: 0,
  status: 'normal',
  last_inference_ms: 0,
};
```

**Add context export after line 34:**
```typescript
export const TinyMLContext = createContext<TinyMLData>(defaultTinyML);
```

**Add state inside FirebaseDataProvider (after line 44):**
```typescript
const [tinyml, setTinyml] = useState<TinyMLData>(defaultTinyML);
```

**Add listener inside useEffect (after the sensors listener, around line 67):**
```typescript
const tinymlRef = ref(db, 'kabutech/sensors/tinyml');
const unsubscribeTinyml = onValue(tinymlRef, (snapshot) => {
  const val = snapshot.val();
  if (val) setTinyml(val);
});
```

**Add to cleanup (after line 143):**
```typescript
unsubscribeTinyml();
```

**Add TinyMLContext.Provider inside JSX tree (wrap around SensorsContext.Provider children):**
```tsx
<SensorsContext.Provider value={sensors}>
  <TinyMLContext.Provider value={tinyml}>
    <SettingsContext.Provider value={settings}>
      ...existing children...
    </SettingsContext.Provider>
  </TinyMLContext.Provider>
</SensorsContext.Provider>
```

---

### 4.3 Add useTinyML Hook

#### [MODIFY] [KabutechNative/src/hooks/useFirebaseData.ts](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/KabutechNative/src/hooks/useFirebaseData.ts)

**Add `TinyMLContext` to the import (line 3):**
```typescript
import { 
  ConnectionContext, SensorsContext, SettingsContext, 
  BatchesContext, AlertsContext, ActivityLogsContext, 
  StaffTasksContext, AllUsersContext, TinyMLContext
} from '../context/FirebaseDataContext';
```

**Add hook after `useSensors` (after line 14):**
```typescript
export function useTinyML() {
  return useContext(TinyMLContext);
}
```

---

### 4.4 Add AI Anomaly Badge to HomeScreen

#### [MODIFY] [KabutechNative/src/screens/HomeScreen.tsx](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/KabutechNative/src/screens/HomeScreen.tsx)

**Add `useTinyML` to imports (line 10):**
```typescript
import { useSensors, useSettings, useFirebaseConnection, useAlerts, useTinyML, calculateEnvironmentScore } from '../hooks/useFirebaseData';
```

**Add hook call inside component (after line 31):**
```typescript
const tinyml = useTinyML();
```

**Add AI Status Card JSX after `EnvironmentMetricsGrid` (after line 117):**
```tsx
{/* Edge Impulse AI Anomaly Status */}
{tinyml.anomaly_detected ? (
  <TouchableOpacity
    onPress={() => navigation.navigate('Controls' as never)}
    style={tw`mx-4 mt-3 rounded-2xl overflow-hidden`}
  >
    <LinearGradient
      colors={isDarkMode ? ['#7f1d1d', '#991b1b'] : ['#fef2f2', '#fee2e2']}
      style={tw`p-4 flex-row items-center`}
    >
      <View style={tw`w-10 h-10 rounded-full bg-red-500/20 items-center justify-center mr-3`}>
        <MaterialCommunityIcons name="brain" size={22} color="#ef4444" />
      </View>
      <View style={tw`flex-1`}>
        <Text style={tw`text-red-${isDarkMode ? '400' : '700'} font-bold text-sm`}>
          ⚠️ AI Anomaly Detected
        </Text>
        <Text style={tw`text-red-${isDarkMode ? '300' : '600'} text-xs mt-0.5`}>
          Score: {tinyml.anomaly_score.toFixed(3)} — Tap to check devices
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={isDarkMode ? '#fca5a5' : '#dc2626'} />
    </LinearGradient>
  </TouchableOpacity>
) : (
  <View style={tw`mx-4 mt-3 rounded-2xl overflow-hidden`}>
    <LinearGradient
      colors={isDarkMode ? ['#052e16', '#14532d'] : ['#f0fdf4', '#dcfce7']}
      style={tw`p-3 flex-row items-center`}
    >
      <View style={tw`w-8 h-8 rounded-full bg-green-500/20 items-center justify-center mr-3`}>
        <MaterialCommunityIcons name="brain" size={18} color="#22c55e" />
      </View>
      <Text style={tw`text-green-${isDarkMode ? '400' : '700'} font-medium text-xs`}>
        Edge AI Active — Environment Normal
      </Text>
    </LinearGradient>
  </View>
)}
```

---

## Phase 5: Verification Checklist

- [ ] **5.1** Run `python tinyml/generate_edge_impulse_csv.py` → 4 CSV files generated.
- [ ] **5.2** Upload CSVs to Edge Impulse Studio → normal/anomaly clusters visibly separated in Feature Explorer.
- [ ] **5.3** Train Anomaly Detection model → accuracy >90%.
- [ ] **5.4** Export Arduino Library (int8 quantized) → `.zip` downloaded.
- [ ] **5.5** Install `.zip` in Arduino IDE → compiles without errors.
- [ ] **5.6** Flash `esp32_s3_firmware.ino` to ESP32-S3 → Serial Monitor shows sensor readings.
- [ ] **5.7** Tap "Fans" toggle in mobile app [ControlsScreen](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/KabutechNative/src/screens/ControlsScreen.tsx) → Relay clicks ON <500ms.
- [ ] **5.8** Breathe on DHT22 → [HomeScreen](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/KabutechNative/src/screens/HomeScreen.tsx) shows temp/humidity change within 2 seconds.
- [ ] **5.9** Simulate anomaly → AI Anomaly Badge appears on HomeScreen.
- [ ] **5.10** Disconnect WiFi → ESP32-S3 continues autonomous relay control.
