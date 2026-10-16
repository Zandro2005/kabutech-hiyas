# Kabutech Hiyas — Current Prototype Guide (Breadboard)

> **Note:** This guide is for the sensor breadboard prototype running on `kabutech_prototype.ino` using digital I2C sensors (SHT3x, BH1750, SCD41) and simulated actuator LEDs. For the plug-and-play production plan, see [IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md).

---

## 1. Quick Start

### 1. Install Arduino IDE
Download from [arduino.cc](https://www.arduino.cc/en/software)

### 2. Add ESP32-S3 Board Package
- Go to **File → Preferences**
- Add this URL to "Additional Board Manager URLs":
  ```
  https://espressif.github.io/arduino-esp32/package_esp32_index.json
  ```
- Go to **Tools → Board → Boards Manager**
- Search **"esp32"** and install **"esp32 by Espressif Systems"**

### 3. Install Required Libraries
Go to **Sketch → Include Library → Manage Libraries** and install:
- `Firebase ESP Client` (by mobizt)
- `Adafruit SHT31 Library` (by Adafruit)
- `BH1750` (by Christopher Laws)
- `Sensirion I2C SCD4x` (by Sensirion)

### 4. Enable Anonymous Auth in Firebase
- Go to [Firebase Console](https://console.firebase.google.com/)
- Select project **kabutech-hiyas**
- Go to **Authentication → Sign-in method**
- Enable **Anonymous** sign-in

### 5. Configure WiFi & Firebase
Open `kabutech_prototype.ino` and update your WiFi credentials:
```cpp
#define WIFI_SSID       "YOUR_WIFI_SSID"
#define WIFI_PASSWORD   "YOUR_WIFI_PASSWORD"
```

### 6. Upload
- Connect ESP32-S3 via USB-C
- Select Board: **ESP32S3 Dev Module**
- Select correct COM port
- Click **Upload**
- Open **Serial Monitor** at **115200 baud**

---

## 2. Wiring Diagram (Digital I2C Prototype)

### Shared I2C Sensor Bus (GPIO 4 = SDA, GPIO 5 = SCL)
All 3 digital sensors connect in parallel to the same 3.3V power rails and I2C lines:

| Sensor Module | Sensor Pin | ESP32-S3 Connection |
|---|---|---|
| **SHT3x (Temp & Humidity)** | `VIN` | **3.3V** (Red Breadboard Rail) |
| | `GND` | **GND** (Blue Breadboard Rail) |
| | `SDA` | **GPIO 4** (Shared I2C Data) |
| | `SCL` | **GPIO 5** (Shared I2C Clock) |
| **BH1750 (Digital Lux)** | `VCC` | **3.3V** (Red Breadboard Rail) |
| | `GND` | **GND** (Blue Breadboard Rail) |
| | `SDA` | **GPIO 4** (Shared I2C Data) |
| | `SCL` | **GPIO 5** (Shared I2C Clock) |
| **SCD41 (True NDIR CO₂)** | `VIN` / `VDD` | **3.3V** (Red Breadboard Rail) |
| | `GND` | **GND** (Blue Breadboard Rail) |
| | `SDA` | **GPIO 4** (Shared I2C Data) |
| | `SCL` | **GPIO 5** (Shared I2C Clock) |

### Water Level Sensor
| ESP32-S3 Pin | Sensor Pin | Connection Details |
|---|---|---|
| **GPIO 7** | Signal (S) | Analog/Digital liquid level signal |
| **GPIO 8** | Power (+) | Digital power toggle (prevents electrode electrolysis) |
| **GND** | Ground (-) | System Ground |

### Actuator Simulation LEDs (Retained Unchanged)
| ESP32-S3 Pin | Actuator Function | Wiring |
|---|---|---|
| **GPIO 9** | FAN IN (Air Intake Fan) | Anode (long pin) to GPIO 9 → 220Ω resistor → GND |
| **GPIO 10**| VALVE (Solenoid Water Valve) | Anode (long pin) to GPIO 10 → 220Ω resistor → GND |
| **GPIO 11**| MISTERS (Misting Pump / Fogger) | Anode (long pin) to GPIO 11 → 220Ω resistor → GND |
| **GPIO 12**| LIGHTS (Grow LED Strip) | Anode (long pin) to GPIO 12 → 220Ω resistor → GND |
| **GPIO 13**| FAN OUT (Exhaust Fan) | Anode (long pin) to GPIO 13 → 220Ω resistor → GND |

---

## 3. Sensor Calibration & Operation

### SCD41 (True NDIR CO₂)
- Takes 5 seconds per measurement cycle (continuous periodic mode).
- Factory calibrated by Sensirion. For field check: outdoor clean fresh air reads ~400–430 ppm.

### SHT3x (Temperature & Humidity)
- Factory calibrated (±0.3°C, ±2% RH). No manual potentiometer or calibration curve needed.

### BH1750 (Digital Lux Meter)
- Calibrated directly in standard SI Lux (1–65,535 lux). No analog mapping needed.

---

## 4. Running the Mobile App

Once the ESP32 is powered on and successfully pushing data to Firebase, you can monitor and control the prototype using your React Native (Expo) app!

### 1. Start the App
Open a terminal in the `KabutechNative` directory and run:
```bash
npm install
npx expo start
```

### 2. Test the Integration
- **Monitoring**: Open the **Controls** or **Live Farm** screen in the app. You should see the Temperature, Humidity, Light, CO2, and Water Level updating in real-time with high-precision digital readings.
- **Actuators**: Tap the **FANS**, **MISTERS**, **LIGHTS**, or **VALVE** buttons in the app. The corresponding LED on your breadboard will instantly turn ON or OFF!
