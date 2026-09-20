/*
 * ============================================================
 *  KABUTECH HIYAS — ESP32-S3 Sensor Prototype Firmware
 *  Reads: DHT11, LDR, MQ-135, Water Level Sensor
 *  Pushes to: Firebase Realtime Database
 * ============================================================
 *
 *  WIRING:
 *    DHT11 DATA    → GPIO 4   (+ 10kΩ pull-up to 3.3V)
 *    DHT11 VCC     → 3.3V
 *    DHT11 GND     → GND
 *
 *    LDR           → GPIO 5   (voltage divider: LDR to 3.3V, 10kΩ to GND, junction → GPIO 5)
 *
 *    MQ-135 AO     → GPIO 6   (analog out)
 *    MQ-135 VCC    → 5V (VIN)
 *    MQ-135 GND    → GND
 *
 *    Water Level S → GPIO 7   (signal/analog)
 *    Water Level + → GPIO 8   (power pin — toggled to prevent corrosion)
 *    Water Level - → GND
 *
 *  LIBRARIES NEEDED (Install via Arduino Library Manager):
 *    1. Firebase ESP Client      (by mobizt)
 *    2. DHT sensor library       (by Adafruit)
 *    3. Adafruit Unified Sensor  (dependency)
 *
 *  BOARD:
 *    ESP32S3 Dev Module (esp32 board package by Espressif)
 *
 *  FIREBASE SETUP:
 *    1. Go to Firebase Console → Authentication → Sign-in method
 *    2. Enable "Anonymous" sign-in
 *    3. That's it — the ESP32 will authenticate anonymously
 */

#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <DHT.h>

// ─── Addons for Firebase token management ───
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>

// ═══════════════════════════════════════════════
//  USER CONFIG — CHANGE THESE VALUES
// ═══════════════════════════════════════════════

// WiFi Credentials
#define WIFI_SSID       "denden"
#define WIFI_PASSWORD   "jocsing121415"

// Firebase Project Config
#define API_KEY         "AIzaSyA3rB7rKIrfdJzCnFdnGvk25n0rd_hHI7M"
#define DATABASE_URL    "https://kabutech-hiyas-default-rtdb.asia-southeast1.firebasedatabase.app"

// ═══════════════════════════════════════════════
//  PIN DEFINITIONS
// ═══════════════════════════════════════════════

#define DHT_PIN         4       // DHT11 data pin
#define DHT_TYPE        DHT11   // Change to DHT22 for final

#define LDR_PIN         5       // LDR analog input (ADC)
#define MQ135_PIN       6       // MQ-135 analog output (ADC)
#define WATER_SIG_PIN   7       // Water level signal (ADC)
#define WATER_PWR_PIN   8       // Water level power (GPIO to prevent corrosion)

// Actuator LEDs
#define PIN_FAN_EXHAUST 9
#define PIN_FAN_INTAKE  10
#define PIN_MISTER      11
#define PIN_LIGHT       12

// ═══════════════════════════════════════════════
//  TIMING CONFIG
// ═══════════════════════════════════════════════

#define SERIAL_PRINT_INTERVAL   1000   // Print to Serial Monitor every 1s (100% local, ZERO delay)
#define FIREBASE_PUSH_INTERVAL  2500   // Push to cloud every 2.5s (fast updates without choking network)
#define HEARTBEAT_INTERVAL      30000  // Send "online" heartbeat every 30 seconds
#define MQ135_WARMUP_MS         10000  // MQ-135 warm-up time (10s)

// ═══════════════════════════════════════════════
//  WATER LEVEL CALIBRATION
//  Dip sensor in water and note the ADC reading → WATER_WET_VALUE
//  Hold sensor in air and note the ADC reading   → WATER_DRY_VALUE
// ═══════════════════════════════════════════════

#define WATER_DRY_VALUE     20      // Typical ADC reading when sensor is completely dry
#define WATER_WET_VALUE     1500    // Typical ADC reading when sensor is submerged in water

// ═══════════════════════════════════════════════
//  GLOBAL OBJECTS
// ═══════════════════════════════════════════════

DHT dht(DHT_PIN, DHT_TYPE);

FirebaseData fbdo;
FirebaseData streamDO; // For listening to actuator changes
FirebaseAuth auth;
FirebaseConfig config;

unsigned long lastSerialPrint  = 0;
unsigned long lastFirebasePush = 0;
unsigned long lastHeartbeat    = 0;
unsigned long bootTime         = 0;
bool firebaseReady             = false;
bool mq135WarmedUp             = false;

// Live readings & health flags (-999 indicates disconnected/error)
float currentTemp   = -999.0;
float currentHum    = -999.0;
int currentLight    = -999;
int currentCO2      = -999;
int currentWater    = -999;

bool dhtFault       = false;
bool lightFault     = false;
bool co2Fault       = false;
bool waterFault     = false;

// Hysteresis & Debouncing:
// Requires 2 consecutive valid reads to clear a fault,
// and 2 consecutive failed reads to latch a fault.
// This completely eliminates fluctuating "connected/not connected" false alarms from single dropped bits,
// while latching faults within 2 seconds when unplugged.
int dhtValidStreak   = 0;
int dhtFailStreak    = 0;
int lightValidStreak = 0;
int lightFailStreak  = 0;
int co2ValidStreak   = 0;
int co2FailStreak    = 0;
int waterValidStreak = 0;
int waterFailStreak  = 0;
const int STREAK_TO_CLEAR_FAULT = 2;
const int STREAK_TO_LATCH_FAULT = 2;

// ═══════════════════════════════════════════════
//  FIREBASE STREAM CALLBACKS
// ═══════════════════════════════════════════════

void streamCallback(FirebaseStream data) {
  String path = data.dataPath();
  
  if (data.dataType() == "boolean") {
    bool state = data.boolData();
    if (path == "/fans") digitalWrite(PIN_FAN_EXHAUST, state ? HIGH : LOW);
    else if (path == "/co2") digitalWrite(PIN_FAN_INTAKE, state ? HIGH : LOW);
    else if (path == "/misters") digitalWrite(PIN_MISTER, state ? HIGH : LOW);
    else if (path == "/lights") digitalWrite(PIN_LIGHT, state ? HIGH : LOW);
    
    Serial.printf("   [Actuator] %s set to %s\n", path.c_str(), state ? "ON" : "OFF");
  } 
  else if (data.dataType() == "json") {
    // When the whole devices object is updated
    FirebaseJson *json = data.jsonObjectPtr();
    FirebaseJsonData result;
    
    if (json->get(result, "fans")) digitalWrite(PIN_FAN_EXHAUST, result.to<bool>() ? HIGH : LOW);
    if (json->get(result, "co2")) digitalWrite(PIN_FAN_INTAKE, result.to<bool>() ? HIGH : LOW);
    if (json->get(result, "misters")) digitalWrite(PIN_MISTER, result.to<bool>() ? HIGH : LOW);
    if (json->get(result, "lights")) digitalWrite(PIN_LIGHT, result.to<bool>() ? HIGH : LOW);
    
    Serial.println("   [Actuator] Initial states loaded from Firebase.");
  }
}

void streamTimeoutCallback(bool timeout) {
  if (timeout) Serial.println("   [Stream] Firebase connection timeout, resuming...");
}

// ═══════════════════════════════════════════════
//  SETUP
// ═══════════════════════════════════════════════

void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("╔══════════════════════════════════════╗");
  Serial.println("║   KABUTECH HIYAS — Sensor Prototype  ║");
  Serial.println("╚══════════════════════════════════════╝");
  Serial.println();

  // ── Initialize sensor pins ──
  dht.begin();
  pinMode(LDR_PIN, INPUT_PULLDOWN);
  pinMode(MQ135_PIN, INPUT_PULLDOWN);
  pinMode(WATER_SIG_PIN, INPUT_PULLDOWN);
  pinMode(WATER_PWR_PIN, OUTPUT);
  digitalWrite(WATER_PWR_PIN, LOW);  // Keep water sensor powered off by default
  
  // ── Initialize Actuator LEDs ──
  pinMode(PIN_FAN_EXHAUST, OUTPUT);
  pinMode(PIN_FAN_INTAKE, OUTPUT);
  pinMode(PIN_MISTER, OUTPUT);
  pinMode(PIN_LIGHT, OUTPUT);
  
  // Start with LEDs off
  digitalWrite(PIN_FAN_EXHAUST, LOW);
  digitalWrite(PIN_FAN_INTAKE, LOW);
  digitalWrite(PIN_MISTER, LOW);
  digitalWrite(PIN_LIGHT, LOW);
  
  // ADC resolution (ESP32-S3 supports 12-bit)
  analogReadResolution(12);

  // ── Connect to WiFi ──
  Serial.print("📶 Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("✅ WiFi connected! IP: ");
    Serial.println(WiFi.localIP());
    // Disable WiFi sleep mode for near-instant (10-20ms) packet latency
    WiFi.setSleep(false);
  } else {
    Serial.println();
    Serial.println("❌ WiFi connection FAILED. Check SSID/password.");
    Serial.println("   Continuing in offline mode (Serial Monitor only)...");
  }

  // ── Configure Firebase ──
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  // Sign up / log in anonymously
  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println("✅ Firebase anonymous sign-in successful!");
    firebaseReady = true;
  } else {
    Serial.printf("❌ Firebase sign-in failed: %s\n", config.signer.signupError.message.c_str());
  }

  // Token status callback
  config.token_status_callback = tokenStatusCallback;  // from TokenHelper.h

  // Initialize Firebase
  Firebase.begin(&config, &auth);
  Firebase.reconnectNetwork(true);

  // Allow large payloads
  fbdo.setBSSLBufferSize(4096, 1024);
  streamDO.setBSSLBufferSize(4096, 1024);

  // Start stream for actuator settings
  if (!Firebase.RTDB.beginStream(&streamDO, "/kabutech/settings/setpoints/devices")) {
    Serial.printf("❌ Stream begin error: %s\n", streamDO.errorReason().c_str());
  }
  Firebase.RTDB.setStreamCallback(&streamDO, streamCallback, streamTimeoutCallback);

  // Register onDisconnect hook with Firebase server:
  // If the ESP32 is unplugged or Wi-Fi drops, Firebase automatically marks esp32_status as offline immediately
  if (Firebase.RTDB.onDisconnect(&fbdo, "/kabutech/sensors/live/esp32_status", "offline")) {
    Serial.println("✅ Firebase onDisconnect handler registered ✓");
  } else {
    Serial.printf("⚠️ onDisconnect registration warning: %s\n", fbdo.errorReason().c_str());
  }

  bootTime = millis();

  Serial.println();
  Serial.println("⏳ Warming up MQ-135 gas sensor...");
  Serial.print("   (Waiting ");
  Serial.print(MQ135_WARMUP_MS / 1000);
  Serial.println(" seconds)");
  Serial.println();
  Serial.println("🔄 Sensor readings will start shortly...");
  Serial.println("────────────────────────────────────────");
}

// ═══════════════════════════════════════════════
//  SENSOR READING FUNCTIONS (ACTIVE ANTI-FLOAT & DISCONNECT DETECTION)
// ═══════════════════════════════════════════════

// ── Active Dynamic Impedance Interrogation (Definitive Disconnect & Anti-Float Detection) ──
// Returns the valid ADC reading (0–4095) if a real sensor is connected, or -999 if unplugged/open.
// Uses active charge injection to test if a physical low-impedance sensor is connected.
// An unplugged/floating pin has zero restoring force: when driven LOW it stays near 0, and
// when driven HIGH it stays near 4095. The delta |sampleHigh - sampleLow| is massive (> 350 counts).
// A real sensor has low source impedance and instantly restores its voltage (< 250 counts delta).
int probeAnalogPin(int pin) {
  // Step 1: Force discharge pin to 0V (GND)
  pinMode(pin, OUTPUT);
  digitalWrite(pin, LOW);
  delayMicroseconds(100);

  // Step 2: Release to high-impedance INPUT
  pinMode(pin, INPUT);
  delay(3); // 3ms settle time: allows real sensor with 1k-50k ohm to recharge/drive the wire
  int sampleLow = analogRead(pin);

  // Step 3: Force charge pin to 3.3V (VCC)
  pinMode(pin, OUTPUT);
  digitalWrite(pin, HIGH);
  delayMicroseconds(100);

  // Step 4: Release to high-impedance INPUT
  pinMode(pin, INPUT);
  delay(3); // 3ms settle time: allows real sensor to pull back down to its actual voltage
  int sampleHigh = analogRead(pin);

  // Return pin to clean INPUT
  pinMode(pin, INPUT);

  // EVALUATION:
  // - Open / Unplugged Wire:
  //   Has no restoring impedance. After being forced LOW it stays near 0 (sampleLow < 350).
  //   After being forced HIGH it stays near 4095 (sampleHigh > 3500).
  //   The difference |sampleHigh - sampleLow| is HUGE (typically > 1500 counts).
  //
  // - Connected Sensor:
  //   The sensor drives the line continuously back to its analog voltage.
  //   Both sampleLow and sampleHigh settle to the same sensor voltage (|sampleHigh - sampleLow| < 250 counts).
  int diff = abs(sampleHigh - sampleLow);

  if (diff > 350 || (sampleHigh > 3800 && sampleLow < 300)) {
    // Definitive open circuit / unplugged wire!
    return -999;
  }

  // Real physical sensor connected: return average of settled samples
  return (sampleLow + sampleHigh) / 2;
}

// ── Read DHT11: Temperature (°C) and Humidity (%) ──
struct DHTReading {
  float temperature;
  float humidity;
  bool valid;
};

DHTReading readDHT();

DHTReading readDHT() {
  DHTReading r;
  pinMode(DHT_PIN, INPUT_PULLUP);
  r.humidity = dht.readHumidity(false);
  r.temperature = dht.readTemperature(false);  // Celsius

  // Plausibility check: In Philippine ambient / mushroom chamber, 
  // valid range is 12°C - 55°C and 15% - 99.5%. Floating / unplugged pins return NaN, 0, or corrupt numbers.
  if (isnan(r.humidity) || isnan(r.temperature) || 
      r.humidity < 15.0 || r.humidity > 99.5 || 
      r.temperature < 12.0 || r.temperature > 55.0) {
    r.valid = false;
    r.temperature = -999.0;
    r.humidity = -999.0;
  } else {
    r.valid = true;
  }
  return r;
}

// ── Read LDR: Light Level (estimated lux) ──
struct LightReading {
  int lux;
  bool valid;
};

LightReading readLight();

LightReading readLight() {
  LightReading r;
  int raw = probeAnalogPin(LDR_PIN);

  if (raw == -999 || raw < 100) {
    r.lux = -999;
    r.valid = false;
  } else {
    r.valid = true;
    int lux = map(raw, 150, 3200, 10, 1000);
    r.lux = constrain(lux, 10, 1000);
  }
  return r;
}

// ── Read MQ-135: CO₂ estimate (ppm) ──
struct CO2Reading {
  int ppm;
  bool valid;
};

CO2Reading readCO2();

CO2Reading readCO2() {
  CO2Reading r;
  int raw = probeAnalogPin(MQ135_PIN);

  if (raw == -999 || raw < 120) {
    r.ppm = -999;
    r.valid = false;
  } else {
    r.valid = true;
    int ppm = map(raw, 250, 2400, 350, 2200);
    r.ppm = constrain(ppm, 350, 3000);
  }
  return r;
}

// ── Read Water Level Sensor: Percentage (0–100%) ──
struct WaterReading {
  int percent;
  bool valid;
};

WaterReading readWaterLevel();

WaterReading readWaterLevel() {
  WaterReading r;
  // Power ON the sensor briefly to prevent electrode corrosion
  digitalWrite(WATER_PWR_PIN, HIGH);
  delay(15); // Allow water power trace to stabilize

  int raw = probeAnalogPin(WATER_SIG_PIN);

  // Power OFF immediately
  digitalWrite(WATER_PWR_PIN, LOW);

  if (raw == -999) {
    r.percent = -999;
    r.valid = false;
  } else if (raw < WATER_DRY_VALUE) {
    r.percent = 0; // Connected, but sensor is dry
    r.valid = true;
  } else {
    r.valid = true;
    int percent = map(raw, WATER_DRY_VALUE, WATER_WET_VALUE, 0, 100);
    r.percent = constrain(percent, 0, 100);
  }
  return r;
}

// ═══════════════════════════════════════════════
//  FIREBASE PUSH FUNCTION
// ═══════════════════════════════════════════════

void pushToFirebase(float temp, float hum, int light, int co2, int waterLevel,
                    bool dhtErr, bool lightErr, bool co2Err, bool waterErr) {
  if (!Firebase.ready()) {
    Serial.println("   ⏳ Firebase not ready yet...");
    return;
  }

  // Strictly push -999 whenever a sensor is faulted or unplugged
  float sendTemp = dhtErr ? -999.0 : temp;
  float sendHum  = dhtErr ? -999.0 : hum;
  int sendLight  = lightErr ? -999 : light;
  int sendCO2    = co2Err ? -999 : co2;
  int sendWater  = waterErr ? -999 : waterLevel;

  // Build a JSON object with all sensor values
  FirebaseJson json;
  json.set("temperature", sendTemp);
  json.set("humidity", sendHum);
  json.set("light", sendLight);
  json.set("co2", sendCO2);
  json.set("waterLevel", sendWater);
  json.set("esp32_status", "online");

  // Granular individual error flags
  json.set("dht_error", dhtErr);
  json.set("temp_error", dhtErr);
  json.set("hum_error", dhtErr);
  json.set("light_error", lightErr);
  json.set("co2_error", co2Err);
  json.set("water_error", waterErr);

  // Real-time server timestamp from Firebase
  FirebaseJson ts;
  ts.set(".sv", "timestamp");
  json.set("last_seen", ts);

  // Push all values at once (atomic update)
  if (Firebase.RTDB.updateNode(&fbdo, "/kabutech/sensors/live", &json)) {
    Serial.println("   ☁️  Firebase synced ✓");
  } else {
    Serial.print("   ❌ Firebase sync error: ");
    Serial.println(fbdo.errorReason().c_str());
  }
}

// ═══════════════════════════════════════════════
//  HEARTBEAT — keep esp32_status "online"
// ═══════════════════════════════════════════════

void sendHeartbeat() {
  if (!Firebase.ready()) return;

  FirebaseJson json;
  json.set("esp32_status", "online");
  FirebaseJson ts;
  ts.set(".sv", "timestamp");
  json.set("last_seen", ts);

  if (Firebase.RTDB.updateNode(&fbdo, "/kabutech/sensors/live", &json)) {
    Serial.println("   💓 Heartbeat sent");
  }
}

// ═══════════════════════════════════════════════
//  MAIN LOOP
// ═══════════════════════════════════════════════

void loop() {
  unsigned long now = millis();

  // ── Check MQ-135 warm-up status ──
  if (!mq135WarmedUp && (now - bootTime >= MQ135_WARMUP_MS)) {
    mq135WarmedUp = true;
    Serial.println("✅ MQ-135 warm-up complete! CO₂ readings active.");
  }

  // ── Read sensors and print to Serial Monitor every 1s (LOCAL, ZERO DELAY) ──
  if (now - lastSerialPrint >= SERIAL_PRINT_INTERVAL) {
    lastSerialPrint = now;

    // Read DHT11 with 2-strike Fault Debouncing
    DHTReading dhtData = readDHT();
    if (dhtData.valid) {
      dhtFailStreak = 0;
      dhtValidStreak++;
      if (dhtValidStreak >= STREAK_TO_CLEAR_FAULT) {
        dhtFault = false;
        currentTemp = dhtData.temperature;
        currentHum  = dhtData.humidity;
      }
    } else {
      dhtValidStreak = 0;
      dhtFailStreak++;
      if (dhtFailStreak >= STREAK_TO_LATCH_FAULT) {
        dhtFault = true;
        currentTemp = -999.0;
        currentHum  = -999.0;
      }
    }

    // Read LDR with 2-strike Fault Debouncing
    LightReading lightData = readLight();
    if (lightData.valid) {
      lightFailStreak = 0;
      lightValidStreak++;
      if (lightValidStreak >= STREAK_TO_CLEAR_FAULT) {
        lightFault = false;
        currentLight = lightData.lux;
      }
    } else {
      lightValidStreak = 0;
      lightFailStreak++;
      if (lightFailStreak >= STREAK_TO_LATCH_FAULT) {
        lightFault = true;
        currentLight = -999;
      }
    }

    // Read MQ-135 with 2-strike Fault Debouncing
    CO2Reading co2Data = readCO2();
    if (co2Data.valid) {
      co2FailStreak = 0;
      co2ValidStreak++;
      if (co2ValidStreak >= STREAK_TO_CLEAR_FAULT) {
        co2Fault = false;
        currentCO2 = co2Data.ppm;
      }
    } else {
      co2ValidStreak = 0;
      co2FailStreak++;
      if (co2FailStreak >= STREAK_TO_LATCH_FAULT) {
        co2Fault = true;
        currentCO2 = -999;
      }
    }

    // Read Water Level with 2-strike Fault Debouncing
    WaterReading waterData = readWaterLevel();
    if (waterData.valid) {
      waterFailStreak = 0;
      waterValidStreak++;
      if (waterValidStreak >= STREAK_TO_CLEAR_FAULT) {
        waterFault = false;
        currentWater = waterData.percent;
      }
    } else {
      waterValidStreak = 0;
      waterFailStreak++;
      if (waterFailStreak >= STREAK_TO_LATCH_FAULT) {
        waterFault = true;
        currentWater = -999;
      }
    }

    // ── Instant Local Serial Monitor Output ──
    Serial.println("📊 ── Live Sensor Readings ─────────────");
    if (dhtFault) {
      Serial.println("   🌡️  Temperature:  [⚠️ UNPLUGGED / DISCONNECTED]");
      Serial.println("   💧 Humidity:     [⚠️ UNPLUGGED / DISCONNECTED]");
    } else {
      Serial.printf("   🌡️  Temperature:  %.1f °C\n", currentTemp);
      Serial.printf("   💧 Humidity:     %.1f %%\n", currentHum);
    }

    if (lightFault) {
      Serial.println("   ☀️  Light Level:  [⚠️ UNPLUGGED / DISCONNECTED]");
    } else {
      Serial.printf("   ☀️  Light Level:  %d lux (est.)\n", currentLight);
    }

    if (co2Fault) {
      Serial.println("   🌬️  CO₂ Level:    [⚠️ UNPLUGGED / DISCONNECTED]");
    } else {
      Serial.printf("   🌬️  CO₂ Level:    %d ppm\n", currentCO2);
    }

    if (waterFault) {
      Serial.println("   🫧 Water Level:  [⚠️ UNPLUGGED / DISCONNECTED]");
    } else {
      Serial.printf("   🫧 Water Level:  %d %%\n", currentWater);
    }
    Serial.println("────────────────────────────────────────");
  }

  // ── Push to Cloud every 2.5 seconds (gives network room so LEDs react instantly) ──
  if (now - lastFirebasePush >= FIREBASE_PUSH_INTERVAL) {
    lastFirebasePush = now;
    if (WiFi.status() == WL_CONNECTED) {
      pushToFirebase(currentTemp, currentHum, currentLight, currentCO2, currentWater,
                     dhtFault, lightFault, co2Fault, waterFault);
    }
  }

  // ── Heartbeat at interval ──
  if (now - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    lastHeartbeat = now;
    sendHeartbeat();
  }

  // Small delay to allow ESP32 background network tasks & stream callbacks to execute immediately
  delay(10);
}
