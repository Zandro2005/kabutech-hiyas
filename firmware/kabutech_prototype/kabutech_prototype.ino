/*
 * ============================================================
 *  KABUTECH HIYAS — ESP32-S3 High-Precision Sensor Firmware
 *  Sensors: SHT3x (Temp/Hum), BH1750 (Lux), SCD41 (True NDIR CO2)
 *  Actuators: 4-Channel LED Simulation (Intake, Exhaust, Mister, Light)
 *  Communication: I2C Digital Bus (GPIO 4: SDA, GPIO 5: SCL)
 *  Cloud: Firebase Realtime Database
 * ============================================================
 *
 *  I2C SENSOR WIRING (All 3 sensors share the 3.3V power and I2C lines):
 *    ESP32-S3 3.3V  ──► Breadboard (+) Red Rail ──► SHT3x VIN  + BH1750 VCC  + SCD41 VIN
 *    ESP32-S3 GND   ──► Breadboard (-) Blue Rail──► SHT3x GND  + BH1750 GND  + SCD41 GND
 *    ESP32-S3 GPIO 4──► I2C SDA Bus Row         ──► SHT3x SDA  + BH1750 SDA  + SCD41 SDA
 *    ESP32-S3 GPIO 5──► I2C SCL Bus Row         ──► SHT3x SCL  + BH1750 SCL  + SCD41 SCL
 *  SENSORS (Digital I2C Bus):
 *    SDA ──► GPIO 4
 *    SCL ──► GPIO 5
 *    (Water level sensor temporarily removed)
 *
 *  ACTUATOR LEDs / RELAYS:
 *    Air In (Intake Fan) LED ──► GPIO 9  (Anode -> 220Ω resistor -> GPIO 9, Cathode -> GND)
 *    Mister / Fogger LED     ──► GPIO 11 (Anode -> 220Ω resistor -> GPIO 11, Cathode -> GND)
 *    Grow Lights LED         ──► GPIO 12 (Anode -> 220Ω resistor -> GPIO 12, Cathode -> GND)
 *    Air Out (Exhaust Fan)LED──► GPIO 13 (Anode -> 220Ω resistor -> GPIO 13, Cathode -> GND)
 *    (Valve is connected directly with Misters on GPIO 11)
 *
 *  LIBRARIES NEEDED (Install via Arduino IDE Library Manager):
 *    1. "Firebase ESP Client" by mobizt
 *    2. "Adafruit SHT31 Library" by Adafruit
 *    3. "BH1750" by Christopher Laws
 *    4. "Sensirion I2C SCD4x" by Sensirion
 *
 *  BOARD SETTING:
 *    Board: ESP32S3 Dev Module
 *    USB CDC On Boot: Enabled
 *  */

#include <WiFi.h>
#include <Wire.h>
#include <Firebase_ESP_Client.h>
#include <Adafruit_SHT31.h>
#include <BH1750.h>
#include <SensirionI2cScd4x.h>
#include <time.h>

// ─── Addons for Firebase token management ───
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>

// ═══════════════════════════════════════════════
//  USER CONFIG — CHANGE THESE VALUES
// ═══════════════════════════════════════════════

// WiFi Credentials
#define WIFI_SSID       "Abad_Fam"
#define WIFI_PASSWORD   "Connecting123"

// Firebase Project Config
#define API_KEY         "AIzaSyA3rB7rKIrfdJzCnFdnGvk25n0rd_hHI7M"
#define DATABASE_URL    "https://kabutech-hiyas-default-rtdb.asia-southeast1.firebasedatabase.app"

// ═══════════════════════════════════════════════
//  PIN DEFINITIONS
// ═══════════════════════════════════════════════

// Shared I2C Bus for SHT3x, BH1750, SCD41
#define I2C_SDA_PIN     4       // GPIO 4: Shared I2C Data
#define I2C_SCL_PIN     5       // GPIO 5: Shared I2C Clock

// Actuator Prototype LEDs / Relays
#define PIN_FAN_INTAKE  9       // GPIO 9:  Air In / Intake Fan LED
#define PIN_MISTER      11      // GPIO 11: Mister / Fogger LED (Valve runs with misters)
#define PIN_LIGHT       12      // GPIO 12: Grow Lights LED
#define PIN_FAN_EXHAUST 13      // GPIO 13: Air Out / Exhaust Fan LED

// ═══════════════════════════════════════════════
//  SENSOR CALIBRATION OFFSETS
//  Compensates for ESP32 / breadboard self-heating
// ═══════════════════════════════════════════════

#define TEMP_OFFSET     -4.0    // Adjust temperature in °C (e.g. -3.0 lowers reading by 3°C)
#define HUM_OFFSET       +5.0    // Adjust humidity in % RH (e.g. +2.0 or 0.0)

// ═══════════════════════════════════════════════
//  TIMING CONFIG
// ═══════════════════════════════════════════════

#define SERIAL_PRINT_INTERVAL   1000    // Print to Serial Monitor every 1s (100% local, ZERO delay)
#define FIREBASE_PUSH_INTERVAL  2000    // Push to cloud every 2s (ultra-fast offline detection & live telemetry)
#define HEARTBEAT_INTERVAL      15000   // Send "online" heartbeat every 15 seconds
#define HOURLY_PUSH_INTERVAL    3600000 // Hourly history push (1 hour = 3,600,000 ms)

// ═══════════════════════════════════════════════
//  GLOBAL SENSOR OBJECTS
// ═══════════════════════════════════════════════

Adafruit_SHT31  sht31;
BH1750          lightMeter;
SensirionI2cScd4x scd4x;

bool sht31Ready  = false;
bool bh1750Ready = false;
bool scd4xReady  = false;

int lastValidCO2 = 420; // Default outdoor clean baseline until first SCD41 read
unsigned long lastCO2SuccessTime = 0; // Timestamp of last successful SCD41 reading

// ── Sensor Reading Structures ──
struct SHTReading {
  float temperature;
  float humidity;
  bool valid;
};

struct LightReading {
  int lux;
  bool valid;
};

struct CO2Reading {
  int ppm;
  bool valid;
};

SHTReading readSHT3x();
LightReading readBH1750();
CO2Reading readSCD41();

FirebaseData fbdo;
FirebaseData streamDO; // For listening to actuator changes
FirebaseAuth auth;
FirebaseConfig config;

unsigned long lastSerialPrint  = 0;
unsigned long lastFirebasePush = 0;
unsigned long lastHeartbeat    = 0;
unsigned long lastHourlyPush   = 0;
unsigned long bootTime         = 0;

bool firebaseReady = false;

// Live cached telemetry values
float currentTemp  = -999.0;
float currentHum   = -999.0;
int   currentLight = -999;
int   currentCO2   = -999;

// Fault flags
bool shtFault   = true;
bool lightFault = true;
bool co2Fault   = true;

// Debouncing streaks (2 consecutive reads to latch/clear fault)
#define STREAK_TO_LATCH_FAULT 2
#define STREAK_TO_CLEAR_FAULT 2

int shtFailStreak = 0,   shtValidStreak = 0;
int lightFailStreak = 0, lightValidStreak = 0;
int co2FailStreak = 0,   co2ValidStreak = 0;

// Hourly history accumulators
double hourlyTempSum   = 0.0;
double hourlyHumSum    = 0.0;
double hourlyLightSum  = 0.0;
double hourlyCO2Sum    = 0.0;
unsigned long hourlySHTCount   = 0;
unsigned long hourlyLightCount = 0;
unsigned long hourlyCO2Count   = 0;
int lastLoggedHour = -1;
int lastPrunedDay  = -1;
bool initialHistoryLogged = false;

// ═══════════════════════════════════════════════
//  FIREBASE STREAM CALLBACKS (ACTUATOR CONTROL)
// ═══════════════════════════════════════════════

void streamCallback(FirebaseStream data) {
  String path = data.dataPath();
  String type = data.dataType();

  // Handle entire JSON object load on first connection
  if (path == "/" && type == "json") {
    FirebaseJson *json = data.jsonObjectPtr();
    FirebaseJsonData result;
    if (json != nullptr) {
      if (json->get(result, "fans") || json->get(result, "exhaust") || json->get(result, "fanOut")) {
        bool st = result.to<bool>();
        digitalWrite(PIN_FAN_EXHAUST, st ? HIGH : LOW);
        Serial.printf("   🌀 [Actuator] Initial Exhaust Fan (GPIO %d): %s\n", PIN_FAN_EXHAUST, st ? "ON" : "OFF");
      }
      if (json->get(result, "fanIn") || json->get(result, "intake")) {
        bool st = result.to<bool>();
        digitalWrite(PIN_FAN_INTAKE, st ? HIGH : LOW);
        Serial.printf("   🌀 [Actuator] Initial Intake Fan (GPIO %d): %s\n", PIN_FAN_INTAKE, st ? "ON" : "OFF");
      }
      if (json->get(result, "misters")) {
        bool st = result.to<bool>();
        digitalWrite(PIN_MISTER, st ? HIGH : LOW);
        Serial.printf("   💧 [Actuator] Initial Mister (GPIO %d): %s\n", PIN_MISTER, st ? "ON" : "OFF");
      }
      if (json->get(result, "lights")) {
        bool st = result.to<bool>();
        digitalWrite(PIN_LIGHT, st ? HIGH : LOW);
        Serial.printf("   💡 [Actuator] Initial Lights (GPIO %d): %s\n", PIN_LIGHT, st ? "ON" : "OFF");
      }
      Serial.println("   [Actuator] Initial states loaded from Firebase.");
    }
    return;
  }

  // Parse state for child property change
  bool state = false;
  if (type == "boolean") {
    state = data.boolData();
  } else if (type == "string") {
    state = (data.stringData() == "true" || data.stringData() == "1");
  } else if (type == "int") {
    state = (data.intData() > 0);
  }

  // Fan Exhaust (air out)
  if (path == "/fans" || path == "/exhaust" || path == "/fanOut") {
    digitalWrite(PIN_FAN_EXHAUST, state ? HIGH : LOW);
    Serial.printf("   🌀 [Actuator] Exhaust Fan (GPIO %d) -> %s\n", PIN_FAN_EXHAUST, state ? "ON" : "OFF");
  }
  // Fan Intake (air in)
  else if (path == "/fanIn" || path == "/intake") {
    digitalWrite(PIN_FAN_INTAKE, state ? HIGH : LOW);
    Serial.printf("   🌀 [Actuator] Intake Fan (GPIO %d) -> %s\n", PIN_FAN_INTAKE, state ? "ON" : "OFF");
  }
  // Mister / Fogger (Valve operates simultaneously with misters)
  else if (path == "/misters") {
    digitalWrite(PIN_MISTER, state ? HIGH : LOW);
    Serial.printf("   💧 [Actuator] Misters (GPIO %d) -> %s\n", PIN_MISTER, state ? "ON" : "OFF");
  }
  // Grow Lights
  else if (path == "/lights") {
    digitalWrite(PIN_LIGHT, state ? HIGH : LOW);
    Serial.printf("   💡 [Actuator] Grow Light (GPIO %d) -> %s\n", PIN_LIGHT, state ? "ON" : "OFF");
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
#if defined(ARDUINO_USB_CDC_ON_BOOT) && (ARDUINO_USB_CDC_ON_BOOT != 0)
  Serial.setTxTimeoutMs(0); // Never block when disconnected from PC
#endif

  setCpuFrequencyMhz(160); // 160MHz: Fast cryptography, cool operation

  Serial.println();
  Serial.println("╔══════════════════════════════════════════════════╗");
  Serial.println("║   KABUTECH HIYAS — Digital I2C Sensor Suite      ║");
  Serial.println("║   SHT3x (Temp/Hum) | BH1750 (Lux) | SCD41 (CO₂)  ║");
  Serial.println("╚══════════════════════════════════════════════════╝");
  Serial.println();

  // ── Initialize I2C Bus on GPIO 4 (SDA) and GPIO 5 (SCL) ──
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  Wire.setClock(100000); // 100 kHz Standard Mode (rock-solid over breadboard/cables)
  Wire.setTimeOut(100);  // 100ms timeout for SCD41 clock-stretching support
  delay(100);            // Allow sensor voltage rails to stabilize

  // ── Live I2C Bus Scanner for Immediate Debugging ──
  Serial.println("🔍 Scanning I2C Bus on GPIO 4 (SDA) & GPIO 5 (SCL)...");
  int foundCount = 0;
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      foundCount++;
      Serial.printf("   📍 Found I2C device at 0x%02X", addr);
      if (addr == 0x44 || addr == 0x45) Serial.print(" → SHT3x (Temp/Hum)");
      else if (addr == 0x23 || addr == 0x5C) Serial.print(" → BH1750 (Lux)");
      else if (addr == 0x62) Serial.print(" → SCD41 (True NDIR CO₂)");
      Serial.println();
    }
  }
  if (foundCount == 0) {
    Serial.println("   ⚠️ No I2C devices found! Check 3.3V/VIN, GND, SDA (GPIO 4), and SCL (GPIO 5).");
  }

  // 1. Initialize SHT3x (Default address 0x44, fallback 0x45)
  if (sht31.begin(0x44)) {
    Serial.println("✅ SHT3x Temp & Humidity sensor initialized! (I2C: 0x44)");
    sht31Ready = true;
    sht31.heater(false); // Ensure internal defogging heater is OFF
  } else if (sht31.begin(0x45)) {
    Serial.println("✅ SHT3x Temp & Humidity sensor initialized! (I2C: 0x45)");
    sht31Ready = true;
    sht31.heater(false); // Ensure internal defogging heater is OFF
  } else {
    Serial.println("❌ SHT3x sensor NOT detected. Verify SDA=4, SCL=5, 3.3V, GND.");
  }

  // 2. Initialize BH1750 Light Sensor
  if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE)) {
    Serial.println("✅ BH1750 Digital Light sensor initialized! (I2C: 0x23)");
    bh1750Ready = true;
  } else {
    Serial.println("❌ BH1750 light sensor NOT detected. Check wiring.");
  }

  // 3. Initialize Sensirion SCD41 True NDIR CO₂
  scd4x.begin(Wire, 0x62);
  scd4x.stopPeriodicMeasurement(); // Clean previous state
  delay(500); // ⚠️ CRITICAL: Sensirion SCD41 requires 500ms to stop periodic measurement!
  uint16_t scdErr = scd4x.startPeriodicMeasurement(); // Starts 5-second sampling
  if (scdErr) {
    Serial.printf("❌ SCD41 CO₂ sensor error starting periodic measurement: %u (check wiring to GPIO 4/5)\n", scdErr);
  } else {
    Serial.println("✅ Sensirion SCD41 True NDIR CO₂ sensor initialized!");
    scd4xReady = true;
  }

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
    WiFi.setSleep(false); // Maintain persistent TLS stream without dropping packets

    // Sync NTP Time (UTC+8 for Philippines: 8 * 3600 = 28800s offset)
    configTime(8 * 3600, 0, "pool.ntp.org", "time.nist.gov");
    Serial.println("⏰ NTP time sync configured (UTC+8 Philippine Standard Time)");
  } else {
    Serial.println();
    Serial.println("❌ WiFi connection FAILED. Operating in local offline mode.");
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

  config.token_status_callback = tokenStatusCallback;
  Firebase.begin(&config, &auth);
  Firebase.reconnectNetwork(true);

  fbdo.setBSSLBufferSize(4096, 1024);
  streamDO.setBSSLBufferSize(4096, 1024);

  // Start stream for remote actuator controls from mobile app
  if (!Firebase.RTDB.beginStream(&streamDO, "/kabutech/settings/setpoints/devices")) {
    Serial.printf("❌ Stream begin error: %s\n", streamDO.errorReason().c_str());
  }
  Firebase.RTDB.setStreamCallback(&streamDO, streamCallback, streamTimeoutCallback);

  bootTime = millis();
  Serial.println();
  Serial.println("🚀 System fully initialized! Sampling sensors every 1s...");
  Serial.println("────────────────────────────────────────────────────────");
}

// ═══════════════════════════════════════════════
//  SENSOR READING FUNCTIONS
// ═══════════════════════════════════════════════

// ── Read SHT3x: Temperature (°C) and Humidity (% RH) ──
SHTReading readSHT3x() {
  SHTReading r;
  if (!sht31Ready) {
    // Attempt auto-recovery
    if (sht31.begin(0x44) || sht31.begin(0x45)) {
      sht31Ready = true;
    } else {
      r.temperature = -999.0;
      r.humidity    = -999.0;
      r.valid       = false;
      return r;
    }
  }

  float t = sht31.readTemperature();
  float h = sht31.readHumidity();

  // Validate plausible ranges
  if (isnan(t) || isnan(h) || t < -20.0 || t > 80.0 || h < 1.0 || h > 100.0) {
    r.temperature = -999.0;
    r.humidity    = -999.0;
    r.valid       = false;
  } else {
    // Apply calibration offset to compensate for ESP32/breadboard self-heating
    r.temperature = t + TEMP_OFFSET;
    r.humidity    = constrain(h + HUM_OFFSET, 1.0, 100.0);
    r.valid       = true;
  }
  return r;
}

// ── Read BH1750: Ambient Light (lux) ──
LightReading readBH1750() {
  LightReading r;
  if (!bh1750Ready) {
    if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE)) {
      bh1750Ready = true;
    } else {
      r.lux   = -999;
      r.valid = false;
      return r;
    }
  }

  float lux = lightMeter.readLightLevel();
  if (isnan(lux) || lux < 0.0) {
    r.lux   = -999;
    r.valid = false;
  } else {
    r.lux   = (int)constrain(lux, 0.0, 65535.0);
    r.valid = true;
  }
  return r;
}

// ── Read SCD41: True NDIR CO₂ (ppm) ──
CO2Reading readSCD41() {
  CO2Reading r;

  // 1. Auto-recovery: If not initialized or stalled >25s, automatically re-initialize
  if (!scd4xReady || (lastCO2SuccessTime > 0 && millis() - lastCO2SuccessTime > 25000)) {
    static unsigned long lastRecoveryAttempt = 0;
    if (millis() - lastRecoveryAttempt >= 5000) {
      lastRecoveryAttempt = millis();
      scd4x.stopPeriodicMeasurement();
      delay(500); // 500ms required by Sensirion before restart
      if (scd4x.startPeriodicMeasurement() == 0) {
        scd4xReady = true;
        Serial.println("🔄 [SCD41] Auto-recovered & restarted periodic measurement!");
      }
    }
  }

  if (!scd4xReady) {
    r.ppm   = -999;
    r.valid = false;
    return r;
  }

  // 2. Check if a new 5-second sample is available
  bool isDataReady = false;
  uint16_t error = scd4x.getDataReadyStatus(isDataReady);
  
  if (error == 0 && isDataReady) {
    uint16_t co2 = 0;
    float temp = 0.0f;
    float hum = 0.0f;
    error = scd4x.readMeasurement(co2, temp, hum);
    
    if (error == 0 && co2 > 0 && co2 <= 5000) {
      r.ppm = (int)co2;
      r.valid = true;
      lastValidCO2 = r.ppm;
      lastCO2SuccessTime = millis();
      return r;
    }
  }

  // 3. Keep latest reading active between 5-second sampling cycles (up to 25s watchdog)
  if (lastValidCO2 > 0 && (lastCO2SuccessTime == 0 || millis() - lastCO2SuccessTime < 25000)) {
    r.ppm   = lastValidCO2;
    r.valid = true;
  } else {
    r.ppm   = -999;
    r.valid = false;
  }
  return r;
}

// ═══════════════════════════════════════════════
//  FIREBASE PUSH FUNCTION
// ═══════════════════════════════════════════════

void pushToFirebase(float temp, float hum, int light, int co2,
                    bool shtErr, bool lightErr, bool co2Err) {
  if (!Firebase.ready()) {
    Serial.println("   ⏳ Firebase not ready yet...");
    return;
  }

  // Strictly push -999 whenever a sensor is faulted or unplugged
  float sendTemp = shtErr ? -999.0 : temp;
  float sendHum  = shtErr ? -999.0 : hum;
  int sendLight  = lightErr ? -999 : light;
  int sendCO2    = co2Err ? -999 : co2;

  FirebaseJson json;
  json.set("temperature", sendTemp);
  json.set("humidity", sendHum);
  json.set("light", sendLight);
  json.set("co2", sendCO2);
  json.set("esp32_status", "online");
  json.set("chip_temperature", temperatureRead());

  // Error flags (dht_error maintained for mobile app backward-compatibility)
  json.set("dht_error", shtErr);
  json.set("temp_error", shtErr);
  json.set("hum_error", shtErr);
  json.set("light_error", lightErr);
  json.set("co2_error", co2Err);

  FirebaseJson ts;
  ts.set(".sv", "timestamp");
  json.set("last_seen", ts);

  if (Firebase.RTDB.updateNode(&fbdo, "/kabutech/sensors/live", &json)) {
    Serial.println("   ☁️  Firebase synced ✓");
  } else {
    Serial.printf("   ❌ Firebase sync error: %s\n", fbdo.errorReason().c_str());
  }
}

// ═══════════════════════════════════════════════
//  HEARTBEAT — Keep esp32_status "online"
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
  if (nowSec < 1600000000) return;

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

  time_t nowSec = time(NULL);
  struct tm timeinfo;
  bool timeValid = (getLocalTime(&timeinfo, 100) && timeinfo.tm_year > 120);

  char dateStr[12];
  char hourStr[4];
  if (timeValid) {
    strftime(dateStr, sizeof(dateStr), "%Y-%m-%d", &timeinfo);
    strftime(hourStr, sizeof(hourStr), "%H", &timeinfo);
  } else {
    snprintf(dateStr, sizeof(dateStr), "offline");
    snprintf(hourStr, sizeof(hourStr), "%02lu", (millis() / 3600000) % 24);
  }

  String historyPath = String("/kabutech/sensors/history/") + dateStr + "/" + hourStr;

  float avgTemp  = (hourlySHTCount > 0)   ? (float)(hourlyTempSum / hourlySHTCount) : currentTemp;
  float avgHum   = (hourlySHTCount > 0)   ? (float)(hourlyHumSum / hourlySHTCount)   : currentHum;
  int   avgLight = (hourlyLightCount > 0) ? (int)(hourlyLightSum / hourlyLightCount) : currentLight;
  int   avgCO2   = (hourlyCO2Count > 0)   ? (int)(hourlyCO2Sum / hourlyCO2Count)     : currentCO2;

  FirebaseJson historyJson;
  FirebaseJson ts;
  ts.set(".sv", "timestamp");
  historyJson.set("timestamp", ts);
  historyJson.set("temp", avgTemp);
  historyJson.set("hum", avgHum);
  historyJson.set("light", avgLight);
  historyJson.set("co2", avgCO2);

  Serial.printf("   📅 Logging hourly history to %s...\n", historyPath.c_str());

  if (Firebase.RTDB.updateNode(&fbdo, historyPath.c_str(), &historyJson)) {
    Serial.println("   ✅ Hourly history logged successfully!");
  } else {
    Serial.printf("   ❌ Failed to log hourly history: %s\n", fbdo.errorReason().c_str());
  }

  // Reset hourly accumulators
  hourlyTempSum = 0.0;
  hourlyHumSum  = 0.0;
  hourlyLightSum = 0.0;
  hourlyCO2Sum  = 0.0;
  hourlySHTCount = 0;
  hourlyLightCount = 0;
  hourlyCO2Count = 0;

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

  // ── Read sensors and print to Serial Monitor every 1s ──
  if (now - lastSerialPrint >= SERIAL_PRINT_INTERVAL) {
    lastSerialPrint = now;

    // 1. Read SHT3x
    SHTReading shtData = readSHT3x();
    if (shtData.valid) {
      shtFailStreak = 0;
      shtValidStreak++;
      if (shtValidStreak >= STREAK_TO_CLEAR_FAULT) {
        shtFault    = false;
        currentTemp = shtData.temperature;
        currentHum  = shtData.humidity;
      }
    } else {
      shtValidStreak = 0;
      shtFailStreak++;
      if (shtFailStreak >= STREAK_TO_LATCH_FAULT) {
        shtFault    = true;
        currentTemp = -999.0;
        currentHum  = -999.0;
      }
    }

    // 2. Read BH1750
    LightReading lightData = readBH1750();
    if (lightData.valid) {
      lightFailStreak = 0;
      lightValidStreak++;
      if (lightValidStreak >= STREAK_TO_CLEAR_FAULT) {
        lightFault   = false;
        currentLight = lightData.lux;
      }
    } else {
      lightValidStreak = 0;
      lightFailStreak++;
      if (lightFailStreak >= STREAK_TO_LATCH_FAULT) {
        lightFault   = true;
        currentLight = -999;
      }
    }

    // 3. Read SCD41
    CO2Reading co2Data = readSCD41();
    if (co2Data.valid) {
      co2FailStreak = 0;
      co2ValidStreak++;
      if (co2ValidStreak >= STREAK_TO_CLEAR_FAULT) {
        co2Fault   = false;
        currentCO2 = co2Data.ppm;
      }
    } else {
      co2ValidStreak = 0;
      co2FailStreak++;
      if (co2FailStreak >= STREAK_TO_LATCH_FAULT) {
        co2Fault   = true;
        currentCO2 = -999;
      }
    }

    // ── Instant Local Serial Monitor Output ──
    Serial.println("📊 ── Live Sensor Readings (Digital I2C) ─────────────");
    if (shtFault) {
      Serial.println("   🌡️  Temperature:  [⚠️ UNPLUGGED / FAULT]");
      Serial.println("   💧 Humidity:     [⚠️ UNPLUGGED / FAULT]");
    } else {
      Serial.printf("   🌡️  Temperature:  %.2f °C\n", currentTemp);
      Serial.printf("   💧 Humidity:     %.2f %% RH\n", currentHum);
    }

    if (lightFault) {
      Serial.println("   ☀️  Light Level:  [⚠️ UNPLUGGED / FAULT]");
    } else {
      Serial.printf("   ☀️  Light Level:  %d lux (Digital 16-bit)\n", currentLight);
    }

    if (co2Fault) {
      Serial.println("   🌬️  CO₂ Level:    [⚠️ UNPLUGGED / FAULT]");
    } else {
      Serial.printf("   🌬️  CO₂ Level:    %d ppm (Sensirion NDIR)\n", currentCO2);
    }

    Serial.printf("   🔥 ESP32 Chip Temp: %.1f °C\n", temperatureRead());
    Serial.println("──────────────────────────────────────────────────────");
  }

  // ── Auto Wi-Fi Reconnection Watchdog ──
  static unsigned long lastWifiReconnectAttempt = 0;
  if (WiFi.status() != WL_CONNECTED) {
    if (now - lastWifiReconnectAttempt >= 10000) {
      lastWifiReconnectAttempt = now;
      Serial.println("🔄 Wi-Fi link lost, attempting reconnection...");
      WiFi.disconnect();
      WiFi.reconnect();
    }
  }

  // ── Push to Cloud every 2 seconds ──
  if (now - lastFirebasePush >= FIREBASE_PUSH_INTERVAL) {
    lastFirebasePush = now;
    if (WiFi.status() == WL_CONNECTED) {
      pushToFirebase(currentTemp, currentHum, currentLight, currentCO2,
                     shtFault, lightFault, co2Fault);

      // Accumulate for hourly history averages if sensor is not faulted
      if (!shtFault && currentTemp > 0 && currentHum > 0) {
        hourlyTempSum += currentTemp;
        hourlyHumSum  += currentHum;
        hourlySHTCount++;
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

  // ── Periodic Hourly History Push ──
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

  delay(15);
}
