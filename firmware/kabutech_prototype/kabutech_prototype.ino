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
#include <time.h>

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
#define FIREBASE_PUSH_INTERVAL  5000   // Push to cloud every 5s (relieves radio duty cycle for 24/7 continuous operation)
#define HEARTBEAT_INTERVAL      30000  // Send "online" heartbeat every 30 seconds
#define MQ135_WARMUP_MS         10000  // MQ-135 warm-up time (10s)
#define HOURLY_PUSH_INTERVAL    3600000 // Hourly history push (1 hour = 3,600,000 ms)

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

// ── Hourly History Logging & 90-Day Pruning ──
unsigned long lastHourlyPush   = 0;
int lastLoggedHour             = -1;
int lastPrunedDay              = -1;
bool initialHistoryLogged      = false;
double hourlyTempSum           = 0.0;
double hourlyHumSum            = 0.0;
double hourlyLightSum          = 0.0;
double hourlyCO2Sum            = 0.0;
unsigned long hourlyDHTCount   = 0;
unsigned long hourlyLightCount = 0;
unsigned long hourlyCO2Count   = 0;

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

  // ── Thermal & Power Optimization for 24/7 Deployment ──
  // Downclock from 240MHz to 80MHz: Reduces CPU power dissipation by ~50%
  // while preserving full performance for SSL/TLS cryptography and ADC sampling.
  setCpuFrequencyMhz(80);

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
    // Enable WiFi modem sleep mode:
    // Powers down the 2.4GHz RF power amplifier between DTIM beacon intervals.
    // Drastically reduces operating temperature while keeping Firebase stream listener active.
    WiFi.setSleep(true);

    // Sync NTP Time (UTC+8 for Philippines: 8 * 3600 = 28800s offset, 0 daylight savings)
    configTime(8 * 3600, 0, "pool.ntp.org", "time.nist.gov");
    Serial.println("⏰ NTP time sync configured (UTC+8 Philippine Standard Time)");
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
  json.set("chip_temperature", temperatureRead());

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
//  HISTORICAL HOURLY DATA LOGGING & PRUNING
// ═══════════════════════════════════════════════

void pruneOldHistory() {
  time_t nowSec = time(NULL);
  if (nowSec < 1600000000) return; // NTP not synced yet

  // Calculate 90 days ago in seconds (90 days * 24 hrs * 3600 secs)
  time_t ninetyDaysAgo = nowSec - (90L * 24L * 3600L);
  struct tm oldTime;
  localtime_r(&ninetyDaysAgo, &oldTime);

  char oldDateStr[12];
  strftime(oldDateStr, sizeof(oldDateStr), "%Y-%m-%d", &oldTime);

  String prunePath = String("/kabutech/sensors/history/") + oldDateStr;
  Serial.printf("   🧹 Checking 90-day retention prune: Deleting %s\n", prunePath.c_str());

  if (Firebase.RTDB.deleteNode(&fbdo, prunePath.c_str())) {
    Serial.println("   ✅ 90-day retention prune check complete.");
  } else {
    Serial.printf("   ℹ️ Prune status: %s\n", fbdo.errorReason().c_str());
  }
}

void pushHourlyHistory() {
  if (!Firebase.ready()) return;

  struct tm timeinfo;
  char dateStr[12] = "unknown";
  char hourStr[4] = "00";
  bool timeValid = false;

  if (getLocalTime(&timeinfo, 100) && timeinfo.tm_year > 120) {
    strftime(dateStr, sizeof(dateStr), "%Y-%m-%d", &timeinfo);
    strftime(hourStr, sizeof(hourStr), "%H", &timeinfo);
    timeValid = true;
  }

  if (!timeValid) {
    Serial.println("   ⚠️ Cannot log hourly history: NTP time not synced yet");
    return;
  }

  // Calculate averages; fallback to current live readings if count is zero
  float avgTemp = hourlyDHTCount > 0 ? (float)(hourlyTempSum / hourlyDHTCount) : currentTemp;
  float avgHum  = hourlyDHTCount > 0 ? (float)(hourlyHumSum / hourlyDHTCount) : currentHum;
  int avgLight  = hourlyLightCount > 0 ? (int)(hourlyLightSum / hourlyLightCount) : currentLight;
  int avgCO2    = hourlyCO2Count > 0 ? (int)(hourlyCO2Sum / hourlyCO2Count) : currentCO2;

  // Round temp and hum to 1 decimal place
  if (avgTemp != -999.0f) avgTemp = roundf(avgTemp * 10.0f) / 10.0f;
  if (avgHum != -999.0f)  avgHum  = roundf(avgHum * 10.0f) / 10.0f;

  String historyPath = String("/kabutech/sensors/history/") + dateStr + "/" + hourStr;

  FirebaseJson historyJson;
  FirebaseJson ts;
  ts.set(".sv", "timestamp");
  historyJson.set("timestamp", ts);
  historyJson.set("temp", avgTemp);
  historyJson.set("hum", avgHum);
  historyJson.set("light", avgLight);
  historyJson.set("co2", avgCO2);

  Serial.printf("   📅 Logging hourly history to %s (Samples: DHT=%lu, LDR=%lu, CO2=%lu)...\n",
                historyPath.c_str(), hourlyDHTCount, hourlyLightCount, hourlyCO2Count);

  if (Firebase.RTDB.updateNode(&fbdo, historyPath.c_str(), &historyJson)) {
    Serial.println("   ✅ Hourly history logged successfully!");
  } else {
    Serial.printf("   ❌ Failed to log hourly history: %s\n", fbdo.errorReason().c_str());
  }

  // Reset accumulator
  hourlyTempSum = 0.0;
  hourlyHumSum = 0.0;
  hourlyLightSum = 0.0;
  hourlyCO2Sum = 0.0;
  hourlyDHTCount = 0;
  hourlyLightCount = 0;
  hourlyCO2Count = 0;

  // Prune history older than 90 days once daily
  if (timeValid && timeinfo.tm_mday != lastPrunedDay) {
    lastPrunedDay = timeinfo.tm_mday;
    pruneOldHistory();
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
    Serial.printf("   🔥 ESP32 Chip Temp: %.1f °C (On-die junction)\n", temperatureRead());
    Serial.printf("   ⚡ CPU Frequency:   %d MHz\n", getCpuFrequencyMhz());
    Serial.println("────────────────────────────────────────");
  }

  // ── Push to Cloud every 2.5 seconds (gives network room so LEDs react instantly) ──
  if (now - lastFirebasePush >= FIREBASE_PUSH_INTERVAL) {
    lastFirebasePush = now;
    if (WiFi.status() == WL_CONNECTED) {
      pushToFirebase(currentTemp, currentHum, currentLight, currentCO2, currentWater,
                     dhtFault, lightFault, co2Fault, waterFault);

      // Accumulate for hourly history averages if sensor is not faulted
      if (!dhtFault && currentTemp > 0 && currentHum > 0) {
        hourlyTempSum += currentTemp;
        hourlyHumSum += currentHum;
        hourlyDHTCount++;
      }
      if (!lightFault && currentLight >= 0) {
        hourlyLightSum += currentLight;
        hourlyLightCount++;
      }
      if (!co2Fault && currentCO2 > 0) {
        hourlyCO2Sum += currentCO2;
        hourlyCO2Count++;
      }
    }
  }

  // ── Initial History Push on Boot (after 30s warmup & NTP sync) ──
  if (!initialHistoryLogged && mq135WarmedUp && (now - bootTime >= 30000) && Firebase.ready()) {
    struct tm initTime;
    if (getLocalTime(&initTime, 50) && initTime.tm_year > 120) {
      initialHistoryLogged = true;
      lastLoggedHour = initTime.tm_hour;
      lastHourlyPush = now;
      pushHourlyHistory();
      Serial.println("   🚀 Initial boot history point saved to Firebase!");
    }
  }

  // ── Periodic Hourly History Push ──
  // Triggers either when clock hour rolls over (NTP synced) or every HOURLY_PUSH_INTERVAL
  struct tm loopTime;
  if (getLocalTime(&loopTime, 10) && loopTime.tm_year > 120) {
    if (lastLoggedHour == -1) {
      lastLoggedHour = loopTime.tm_hour;
      lastHourlyPush = now;
    } else if (loopTime.tm_hour != lastLoggedHour) {
      lastLoggedHour = loopTime.tm_hour;
      lastHourlyPush = now;
      pushHourlyHistory();
    }
  } else if (now - lastHourlyPush >= HOURLY_PUSH_INTERVAL && lastHourlyPush > 0) {
    lastHourlyPush = now;
    pushHourlyHistory();
  }

  // ── Heartbeat at interval ──
  if (now - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    lastHeartbeat = now;
    sendHeartbeat();
  }

  // Yield to FreeRTOS idle task so CPU cores can enter low-power wait state (waiti)
  delay(15);
}
