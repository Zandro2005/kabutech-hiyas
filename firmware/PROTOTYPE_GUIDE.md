# Kabutech Hiyas — Current Prototype Guide (Breadboard)

> **Note:** This guide is for the initial sensor-only breadboard prototype currently running on `kabutech_prototype.ino`. For the plug-and-play production plan, see [IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md).

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
- `DHT sensor library` (by Adafruit)
- `Adafruit Unified Sensor` (by Adafruit)

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

## 2. Wiring Diagram (Breadboard Prototype)

| ESP32-S3 Pin | Sensor Pin | Connection Details |
|---|---|---|
| **GPIO 4** | DHT11 DATA | Connect with 10kΩ pull-up resistor to 3.3V |
| **3.3V** | DHT11 VCC | Power |
| **GND** | DHT11 GND | Ground |
| **GPIO 5** | LDR Junction | Voltage divider: LDR to 3.3V, 10kΩ to GND |
| **GPIO 6** | MQ-135 AO | Analog output |
| **5V / VIN** | MQ-135 VCC | Needs 5V for internal heater coil |
| **GND** | MQ-135 GND | Ground |
| **GPIO 7** | Water Level S | Analog signal |
| **GPIO 8** | Water Level + | Digital power (toggled to prevent electrolysis corrosion) |
| **GND** | Water Level - | Ground |
| **GPIO 9** | FANS LED | Connect LED anode (long leg) to GPIO 9. Connect cathode (short leg) to a 220Ω resistor, then to GND. |
| **GPIO 10**| VALVE (CO2) LED | Connect LED anode to GPIO 10. Connect cathode to a 220Ω resistor, then to GND. |
| **GPIO 11**| MISTERS LED | Connect LED anode to GPIO 11. Connect cathode to a 220Ω resistor, then to GND. |
| **GPIO 12**| LIGHTS LED | Connect LED anode to GPIO 12. Connect cathode to a 220Ω resistor, then to GND. |

---

## 3. Sensor Calibration

### Water Level Sensor
1. Hold sensor dry in air → note Serial Monitor raw reading → set as `WATER_DRY_VALUE` in code.
2. Submerge sensor to maximum mark in water → note raw reading → set as `WATER_WET_VALUE` in code.

### MQ-135 Gas Sensor
- **First-time use:** Requires a 24–48 hour continuous burn-in period.
- **Each boot:** Requires ~30 seconds preheat before readings stabilize.
- Calibrate baseline `R0` against a known reference meter if possible.

### LDR Light Sensor
- Configured for 0–1000 lux estimation.
- Adjust `map()` calibration range in `readLight()` if using different ambient lighting.

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
- **Monitoring**: Open the **Controls** or **Live Farm** screen in the app. You should see the Temperature, Humidity, Light, CO2, and Water Level updating in real-time.
- **Actuators**: Tap the **FANS**, **MISTERS**, **LIGHTS**, or **VALVE** buttons in the app. The corresponding LED on your breadboard should instantly turn ON or OFF!
