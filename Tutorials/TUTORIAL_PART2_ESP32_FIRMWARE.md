# KabuTech IoT Tutorial — Part 2: ESP32 Hardware & Firmware

> Wire up sensors, install libraries, and flash the firmware that sends real data to Firebase.

---

## Step 7: Install Arduino IDE & Board Support

### 7.1: Download Arduino IDE
1. Go to [https://www.arduino.cc/en/software](https://www.arduino.cc/en/software)
2. Download and install Arduino IDE 2.x for your OS

### 7.2: Add ESP32 Board Support
1. Open Arduino IDE → **File → Preferences**
2. In "Additional Board Manager URLs", paste:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Click OK
4. Go to **Tools → Board → Boards Manager**
5. Search `esp32` → Install **"esp32 by Espressif Systems"** (latest version)
6. Go to **Tools → Board** → Select **"ESP32 Dev Module"**

### 7.3: Install Required Libraries

Go to **Sketch → Include Library → Manage Libraries** and install:

| Library | Author | Version |
|---|---|---|
| `DHT sensor library` | Adafruit | Latest |
| `Adafruit Unified Sensor` | Adafruit | Latest |
| `MH-Z19` | Jonathan Dempsey | Latest |
| `BH1750` | Christopher Laws | Latest |
| `Firebase ESP32 Client` | Mobizt | Latest |
| `ArduinoJson` | Benoit Blanchon | v6.x |

---

## Step 8: Wire the Hardware

### 8.1: Wiring Diagram

```
                    ┌─────────────────────┐
                    │    ESP32 DevKit V1   │
                    │                     │
    DHT22 ──────────┤ GPIO 4         3V3  ├──── DHT22 VCC, BH1750 VCC
    (DATA)          │                     │
                    │ GPIO 16 (RX2)       ├──── MH-Z19B TX
                    │ GPIO 17 (TX2)       ├──── MH-Z19B RX
                    │                     │
                    │ GPIO 21 (SDA)       ├──── BH1750 SDA
                    │ GPIO 22 (SCL)       ├──── BH1750 SCL
                    │                     │
                    │ GPIO 25             ├──── Relay IN1 (Fans)
                    │ GPIO 26             ├──── Relay IN2 (Misters)
                    │ GPIO 27             ├──── Relay IN3 (Lights)
                    │                     │
                    │ Vin (5V)            ├──── MH-Z19B VCC, Relay VCC
                    │ GND                 ├──── All GND connections
                    └─────────────────────┘
```

### 8.2: DHT22 Wiring Detail

```
DHT22 Sensor (3 wires used):
┌──────────┐
│  DHT22   │
│ ┌──┬──┬──┐
│ │1 │2 │3 │  (looking at front, left to right)
│ └──┴──┴──┘
│  V  D  G
└──────────┘
Pin 1 (VCC)  → ESP32 3V3
Pin 2 (DATA) → ESP32 GPIO 4  +  10kΩ resistor to 3V3
Pin 3 (GND)  → ESP32 GND
```

> ⚠️ **IMPORTANT:** Add a 10kΩ pull-up resistor between DATA and VCC. Without it, readings will be unreliable.

### 8.3: MH-Z19B Wiring Detail

```
MH-Z19B CO2 Sensor (UART mode):
Pin 1 (Vin) → ESP32 Vin (5V)    ← Needs 5V, won't work on 3.3V!
Pin 2 (GND) → ESP32 GND
Pin 3 (TX)  → ESP32 GPIO 16 (RX2)  ← Cross-connect: sensor TX → ESP RX
Pin 4 (RX)  → ESP32 GPIO 17 (TX2)  ← Cross-connect: sensor RX → ESP TX
```

### 8.4: BH1750 Wiring

```
BH1750 Light Sensor (I2C):
VCC  → ESP32 3V3
GND  → ESP32 GND
SDA  → ESP32 GPIO 21
SCL  → ESP32 GPIO 22
ADDR → ESP32 GND (sets I2C address to 0x23)
```

### 8.5: Relay Module Wiring

```
4-Channel Relay:
VCC → ESP32 Vin (5V)
GND → ESP32 GND
IN1 → ESP32 GPIO 25  (controls Fans)
IN2 → ESP32 GPIO 26  (controls Misters)
IN3 → ESP32 GPIO 27  (controls Lights)
IN4 → (unused, leave unconnected)

Each relay output connects to your actual 220V appliance through
the relay's NO (Normally Open) and COM terminals.
```

> ⚠️ **WARNING:** Relay outputs switch **mains voltage (220V)**. If you're not experienced with mains wiring, get help from an electrician. Never touch exposed 220V connections!

---

## Step 9: Create the ESP32 Firmware

### 9.1: Create New Arduino Sketch

In Arduino IDE: **File → New Sketch**. Save it as `kabutech_firmware`.

### 9.2: Create `config.h`

In the same sketch folder, create a new tab called `config.h`:

```cpp
// config.h — WiFi and Firebase credentials
// ═══════════════════════════════════════════

#ifndef CONFIG_H
#define CONFIG_H

// ── WiFi Settings ──
#define WIFI_SSID     "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// ── Firebase Settings ──
// Get these from Firebase Console → Project Settings
#define FIREBASE_HOST "YOUR_PROJECT-default-rtdb.asia-southeast1.firebasedatabase.app"
#define FIREBASE_API_KEY "YOUR_API_KEY_HERE"

// ── Sensor Pin Assignments ──
#define DHT_PIN       4
#define DHT_TYPE      DHT22
#define MHZ19_RX      16
#define MHZ19_TX      17
#define BH1750_SDA    21
#define BH1750_SCL    22

// ── Relay Pin Assignments ──
#define RELAY_FAN     25
#define RELAY_MISTER  26
#define RELAY_LIGHT   27

// ── Timing (milliseconds) ──
#define SENSOR_READ_INTERVAL   10000   // Read sensors every 10 seconds
#define HISTORY_PUSH_INTERVAL  300000  // Push history every 5 minutes
#define TINYML_INTERVAL        30000   // Run inference every 30 seconds

#endif
```

### 9.3: Main Firmware Code

Replace the contents of `kabutech_firmware.ino` with:

```cpp
// kabutech_firmware.ino — KabuTech Hiyas ESP32 IoT Firmware
// ═══════════════════════════════════════════════════════════

#include <WiFi.h>
#include <FirebaseESP32.h>
#include <DHT.h>
#include <MHZ19.h>
#include <BH1750.h>
#include <Wire.h>
#include <time.h>
#include "config.h"

// ── Firebase Objects ──
FirebaseData fbData;
FirebaseConfig fbConfig;
FirebaseAuth fbAuthObj;

// ── Sensor Objects ──
DHT dht(DHT_PIN, DHT_TYPE);
MHZ19 mhz19;
HardwareSerial mhzSerial(2);  // UART2 for MH-Z19B
BH1750 lightMeter;

// ── State Variables ──
float temperature = 0;
float humidity = 0;
int co2 = 0;
float lightLevel = 0;

// ── Timing ──
unsigned long lastSensorRead = 0;
unsigned long lastHistoryPush = 0;
unsigned long lastTinyMLRun = 0;

// ── Relay States ──
bool fanState = false;
bool misterState = false;
bool lightState = false;

// ══════════════════════════════════════════════
// SETUP
// ══════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  Serial.println("\n🌱 KabuTech Hiyas ESP32 Starting...");

  // ── Initialize Relay Pins ──
  pinMode(RELAY_FAN, OUTPUT);
  pinMode(RELAY_MISTER, OUTPUT);
  pinMode(RELAY_LIGHT, OUTPUT);
  digitalWrite(RELAY_FAN, HIGH);    // HIGH = OFF for active-low relays
  digitalWrite(RELAY_MISTER, HIGH);
  digitalWrite(RELAY_LIGHT, HIGH);

  // ── Initialize Sensors ──
  dht.begin();
  Serial.println("✅ DHT22 initialized");

  mhzSerial.begin(9600, SERIAL_8N1, MHZ19_RX, MHZ19_TX);
  mhz19.begin(mhzSerial);
  mhz19.autoCalibration(false);  // Disable in enclosed mushroom house
  Serial.println("✅ MH-Z19B initialized");

  Wire.begin(BH1750_SDA, BH1750_SCL);
  lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);
  Serial.println("✅ BH1750 initialized");

  // ── Connect WiFi ──
  connectWiFi();

  // ── Initialize Firebase ──
  fbConfig.host = FIREBASE_HOST;
  fbConfig.api_key = FIREBASE_API_KEY;

  // Anonymous auth (simplest for ESP32)
  fbAuthObj.user.email = "";
  fbAuthObj.user.password = "";

  Firebase.begin(&fbConfig, &fbAuthObj);
  Firebase.reconnectWiFi(true);

  // Set ESP32 status to online
  Firebase.setString(fbData, "/kabutech/sensors/live/esp32_status", "online");
  Firebase.setInt(fbData, "/kabutech/sensors/live/wifi_rssi", WiFi.RSSI());

  Serial.println("✅ Firebase connected!");
  Serial.println("═══════════════════════════════════════");
}

// ══════════════════════════════════════════════
// MAIN LOOP
// ══════════════════════════════════════════════
void loop() {
  unsigned long now = millis();

  // ── Read Sensors (every 10 seconds) ──
  if (now - lastSensorRead >= SENSOR_READ_INTERVAL) {
    lastSensorRead = now;
    readSensors();
    pushToFirebase();
  }

  // ── Push History (every 5 minutes) ──
  if (now - lastHistoryPush >= HISTORY_PUSH_INTERVAL) {
    lastHistoryPush = now;
    pushHistory();
  }

  // ── Listen for Control Commands ──
  listenForControls();

  // ── WiFi Reconnection ──
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi lost, reconnecting...");
    connectWiFi();
  }

  delay(100);  // Small delay to prevent watchdog reset
}

// ══════════════════════════════════════════════
// FUNCTIONS
// ══════════════════════════════════════════════

void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi connected! IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n❌ WiFi failed. Will retry...");
  }
}

void readSensors() {
  // ── Temperature & Humidity (DHT22) ──
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t)) temperature = t;
  if (!isnan(h)) humidity = h;

  // ── CO2 (MH-Z19B) ──
  int c = mhz19.getCO2();
  if (c > 0) co2 = c;

  // ── Light (BH1750) — returns lux, convert to µmol ──
  float lux = lightMeter.readLightLevel();
  if (lux >= 0) lightLevel = lux * 0.0185;  // Approximate lux→µmol/m²/s

  Serial.printf("📊 Temp: %.1f°C | Humidity: %.0f%% | CO2: %d ppm | Light: %.0f µmol\n",
                temperature, humidity, co2, lightLevel);
}

void pushToFirebase() {
  if (WiFi.status() != WL_CONNECTED) return;

  Firebase.setFloat(fbData, "/kabutech/sensors/live/temperature", temperature);
  Firebase.setFloat(fbData, "/kabutech/sensors/live/humidity", humidity);
  Firebase.setInt(fbData, "/kabutech/sensors/live/co2", co2);
  Firebase.setFloat(fbData, "/kabutech/sensors/live/light", lightLevel);
  Firebase.setInt(fbData, "/kabutech/sensors/live/timestamp", (int)(millis() / 1000));
  Firebase.setString(fbData, "/kabutech/sensors/live/esp32_status", "online");
  Firebase.setInt(fbData, "/kabutech/sensors/live/wifi_rssi", WiFi.RSSI());

  Serial.println("📤 Data pushed to Firebase");
}

void pushHistory() {
  if (WiFi.status() != WL_CONNECTED) return;

  // Get current date for path
  String path = "/kabutech/history/readings";

  FirebaseJson json;
  json.set("temp", temperature);
  json.set("hum", humidity);
  json.set("co2", co2);
  json.set("light", lightLevel);
  json.set("ts/.sv", "timestamp");  // Server timestamp

  Firebase.pushJSON(fbData, path, json);
  Serial.println("📦 History snapshot saved");
}

void listenForControls() {
  // ── Read fan command ──
  if (Firebase.getBool(fbData, "/kabutech/controls/fans/state")) {
    bool newFan = fbData.boolData();
    if (newFan != fanState) {
      fanState = newFan;
      digitalWrite(RELAY_FAN, fanState ? LOW : HIGH);  // Active-low relay
      Serial.printf("🔄 Fan: %s\n", fanState ? "ON" : "OFF");
    }
  }

  // ── Read mister command ──
  if (Firebase.getBool(fbData, "/kabutech/controls/misters/state")) {
    bool newMister = fbData.boolData();
    if (newMister != misterState) {
      misterState = newMister;
      digitalWrite(RELAY_MISTER, misterState ? LOW : HIGH);
      Serial.printf("🔄 Mister: %s\n", misterState ? "ON" : "OFF");
    }
  }

  // ── Read light command ──
  if (Firebase.getBool(fbData, "/kabutech/controls/lights/state")) {
    bool newLight = fbData.boolData();
    if (newLight != lightState) {
      lightState = newLight;
      digitalWrite(RELAY_LIGHT, lightState ? LOW : HIGH);
      Serial.printf("🔄 Light: %s\n", lightState ? "ON" : "OFF");
    }
  }
}
```

---

## Step 10: Upload Firmware to ESP32

1. Connect ESP32 to computer via USB cable
2. In Arduino IDE: **Tools → Board → ESP32 Dev Module**
3. **Tools → Port** → Select the COM port that appeared (e.g., COM3 or /dev/ttyUSB0)
4. **Tools → Upload Speed** → `115200`
5. Click the **Upload** button (→ arrow)
6. When it says "Connecting...", **hold the BOOT button** on ESP32 for 2 seconds
7. Wait for upload to complete
8. Open **Tools → Serial Monitor** → Set baud to `115200`
9. You should see:

```
🌱 KabuTech Hiyas ESP32 Starting...
✅ DHT22 initialized
✅ MH-Z19B initialized
✅ BH1750 initialized
Connecting to WiFi.....
✅ WiFi connected! IP: 192.168.1.105
✅ Firebase connected!
═══════════════════════════════════════
📊 Temp: 26.3°C | Humidity: 72% | CO2: 485 ppm | Light: 312 µmol
📤 Data pushed to Firebase
```

---

## Step 11: Verify Data in Firebase Console

1. Go to Firebase Console → Realtime Database
2. Navigate to `kabutech → sensors → live`
3. You should see the values updating every 10 seconds!
4. Open your KabuTech web app — the dashboard should now show **real sensor data**

---

## ✅ Part 2 Complete!

At this point:
- ✅ ESP32 reads real temperature, humidity, CO₂, and light
- ✅ Data pushes to Firebase every 10 seconds
- ✅ Web app receives live data via Firebase listener
- ✅ Relay controls work from the web app
- ✅ History data is saved every 5 minutes

**Next:** Part 3 covers TinyML integration.
