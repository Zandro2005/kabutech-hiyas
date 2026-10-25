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
 *  BOARD SETTING (Arduino IDE -> Tools):
 *    Board: ESP32S3 Dev Module
 *    USB CDC On Boot: Enabled
 *    Partition Scheme: "Huge APP (3MB No OTA/1MB SPIFFS)"
 *  */

#include <WiFi.h>
#include <Wire.h>

// ─── Optimize Flash Footprint ───
#define FIREBASE_ENABLE_RTDB // Only link Realtime Database engine
#include <Firebase_ESP_Client.h>
#include <Adafruit_SHT31.h>
#include <BH1750.h>
#include <SensirionI2cScd4x.h>
#include <time.h>

// ─── TFT SPI Display Driver (LovyanGFX ILI9341 240x320) ───
// 4 MHz SPI Clock: Eliminates ringing/crosstalk over 30cm extension wires (fixes white screen)
#define TFT_SPI_FREQ    4000000
// Orientation: 1 = Landscape Upright (Header at TOP, Left-to-Right normal text)
#define TFT_ROTATION    7
#include "tft_display.h"

// ─── Edge AI Forecaster (Edge Impulse) — see edge_forecast.h & tinyml/EDGE_IMPULSE_TUTORIAL.md ───
#define ENABLE_EDGE_AI  1       // 1 = active on-device TinyML forecasting
#define CSV_LOG_MODE    0       // 1 = print CSV lines for tinyml/record_real_data.py
#include "edge_forecast.h"

// ─── Addons for Firebase token management ───
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>

// ═══════════════════════════════════════════════
//  USER CONFIG — CHANGE THESE VALUES
// ═══════════════════════════════════════════════

// WiFi Credentials
#define WIFI_SSID       "Zandrix"
#define WIFI_PASSWORD   "0907133ado"

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

// 3.2" SPI TFT Display (ILI9341 240x320)
// VCC -> 5VIN, GND -> GND, SDO -> GPIO 16 (Optional)
#define TFT_CS_PIN      10      // GPIO 10: TFT Chip Select
#define TFT_DC_PIN      15      // GPIO 15: TFT Data / Command
#define TFT_RST_PIN     6       // GPIO 6:  TFT Hardware Reset
#define TFT_MOSI_PIN    17      // GPIO 17: TFT SDI (MOSI)
#define TFT_SCK_PIN     18      // GPIO 18: TFT SCK (Clock)
#define TFT_LED_PIN     2       // GPIO 2:  TFT Backlight (or direct to 3.3V)

// ═══════════════════════════════════════════════
//  SENSOR CALIBRATION OFFSETS
//  Compensates for ESP32 / breadboard self-heating
// ═══════════════════════════════════════════════

#define TEMP_OFFSET     -8.0    // Adjust temperature in °C (e.g. -3.0 lowers reading by 3°C)
#define HUM_OFFSET       +15.0    // Adjust humidity in % RH (e.g. +2.0 or 0.0)

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

// ─── Long Cable (10m Aviation Cable) I2C Bus Configuration ───
// 10-meter cables introduce ~1200pF-1500pF line capacitance.
// 25 kHz (40µs period) gives the slow RC rising edge plenty of time to reach 3.3V logic HIGH.
#define I2C_LONG_CABLE_CLOCK  50000  // 50 kHz: Fast, responsive, with 2x rise-time margin for cables
#define I2C_WIRE_TIMEOUT_MS   100    // 100ms: Low latency timeout to prevent loop freezing
#define SENSOR_HOLD_TIME_MS   10000  // 10s: Seamlessly bridges across relay switching spikes and actuator noise

// Last valid reading buffers (keeps readings stable across momentary cable noise)
float lastValidTemp  = -999.0;
float lastValidHum   = -999.0;
int   lastValidLight = -999;
int   lastValidCO2   = -999;

// Dual-redundancy: SCD41 also reads integrated temperature & humidity
float scdBackupTemp  = -999.0;
float scdBackupHum   = -999.0;

unsigned long lastSHTSuccessTime   = 0;
unsigned long lastLightSuccessTime = 0;
unsigned long lastCO2SuccessTime   = 0;
unsigned long lastScdBackupTime    = 0;

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
void recoverI2CBus();
bool initFirebaseCloud();
bool resyncCloudSetpoints(bool forceRestartStream = false);
bool checkWanInternetFast();
void cloudTask(void *pvParameters);

FirebaseData fbdo;
FirebaseData streamDO; // For listening to actuator changes
FirebaseAuth auth;
FirebaseConfig config;

unsigned long lastSerialPrint  = 0;
unsigned long lastFirebasePush = 0;
unsigned long lastHeartbeat    = 0;
unsigned long lastHourlyPush   = 0;
unsigned long bootTime         = 0;

// ─── Hotspot / WAN Latency, Liveness & Stability Qualification Thresholds ───
#define MAX_FAST_CLOUD_RTT_MS   2000    // Max RTT (2.0s) for a healthy cloud push/sync
#define CLOUD_STUCK_CALL_MS     3200    // Max in-flight block time (3.2s > 1.8s TLS handshake) before Core 1 forces LOCAL
#define CLOUD_SYNC_TIMEOUT_MS   6500    // Max time (6.5s) between verified cloud syncs before LOCAL failsafe
#define STABLE_RECOVERY_STREAK  3       // Require 3 consecutive fast cloud checks (~6s stable internet) to recover LOCAL -> ONLINE
#define FAIL_STREAK_TO_LOCAL    2       // 2 consecutive slow/failed cloud pushes (or 1 failure + dead WAN) -> LOCAL

volatile bool firebaseReady = false;
volatile bool firebaseInitialized = false;
volatile bool needsCloudResync = false;
volatile unsigned long firebaseBackoffUntil = 0;
volatile unsigned long lastStreamEventTime = 0;
volatile bool cloudOpInFlight = false;
volatile unsigned long cloudOpStartMs = 0;
volatile bool pendingAutoDeviceSync = false;
volatile int stableCloudStreak = 0;
volatile int consecutiveCloudFailures = 0;
TaskHandle_t cloudTaskHandle = NULL;

// Live cached telemetry values
float currentTemp  = -999.0;
float currentHum   = -999.0;
int   currentLight = -999;
int   currentCO2   = -999;

// Fault flags
bool shtFault   = true;
bool lightFault = true;
bool co2Fault   = true;

// Debouncing streaks (consecutive reads to latch/clear fault)
#define STREAK_TO_LATCH_FAULT 6      // 6 consecutive failed reads (6s) required to latch FAULT
#define STREAK_TO_CLEAR_FAULT 2      // 2 consecutive valid reads to clear FAULT

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

// ─── Actuator States (synced with Firebase, GPIO outputs, and TFT) ───
bool stateExhaust = false;
bool stateIntake  = false;
bool stateMister  = false;
bool stateLight   = false;
String stateMode  = "AUTO"; // Tracks AUTO vs TIMED vs MANUAL control
String lastConfiguredAppMode = "AUTO"; // Persists user's chosen mode across offline disconnects
volatile bool offlineFailsafeActive = false; // Tracks if we fell back to AI AUTO due to network loss
volatile unsigned long lastSuccessfulCloudSync = 0; // Tracks last verified 2-way cloud communication
volatile unsigned long lastWifiReconnectTime = 0;   // Tracker for Wi-Fi association timestamp

// ─── Actuator Anti-Chatter Dwell Timers & Streaks (Biological Range & Relay Protection) ───
#define ACTUATOR_MIN_ON_TIME_MS   6000    // Minimum ON dwell time: 6 seconds (prevents relay chatter)
#define ACTUATOR_MIN_OFF_TIME_MS  5000    // Minimum OFF dwell time: 5 seconds (prevents rapid re-triggering)
#define ACTUATOR_TRIGGER_STREAK   2       // Require 2 consecutive cycles to confirm state transition

unsigned long lastFanToggleTime    = 0;
int fanOnDemandStreak              = 0;
int fanOffDemandStreak             = 0;

unsigned long lastMisterToggleTime = 0;
int misterOnDemandStreak           = 0;
int misterOffDemandStreak          = 0;

// ─── Grow Light Hysteresis & Dwell Timers (Biological Range: 150 - 1000 lx) ───
#define LIGHT_ON_THRESHOLD      150     // Turn ON when ambient light drops below 150 lx (Low/Dark)
#define LIGHT_OFF_THRESHOLD     1000    // Turn OFF when light reaches >= 1000 lx (High/Too Bright)
#define LIGHT_MIN_ON_TIME_MS    6000    // Minimum ON dwell time: 6 seconds (prevents relay flicker)
#define LIGHT_MIN_OFF_TIME_MS   4000    // Minimum OFF dwell time: 4 seconds (prevents instant re-triggering)
#define LIGHT_TRIGGER_STREAK    2       // Require 2 consecutive seconds to confirm state transition

unsigned long lastLightToggleTime = 0;
int lightLowStreak  = 0;
int lightHighStreak = 0;

// Network & Cloud Status Globals
volatile bool isSysOnline          = false;
volatile bool slowInternetDetected = false;


// Normalizes Firebase mode string to canonical stateMode ("AUTO", "TIMED", "MANUAL")
String normalizeMode(String raw) {
  raw.trim();
  raw.toLowerCase();
  if (raw == "manual") {
    return "MANUAL";
  } else if (raw == "scheduled" || raw == "timed") {
    return "TIMED";
  } else {
    return "AUTO";
  }
}

// TFT Display refresh timer (non-blocking 500ms)
unsigned long lastDisplayRefresh = 0;
#define DISPLAY_REFRESH_INTERVAL 500

// ═══════════════════════════════════════════════
//  FIREBASE STREAM CALLBACKS (ACTUATOR CONTROL)
// ═══════════════════════════════════════════════

// Helper to set actuator state and update GPIO pin output
void applyActuator(const String& key, bool state) {
  if (key == "fans" || key == "exhaust" || key == "fanOut") {
    if (stateExhaust != state) {
      stateExhaust = state;
      digitalWrite(PIN_FAN_EXHAUST, state ? HIGH : LOW);
      lastDisplayRefresh = 0;
      Serial.printf("   🌀 [Actuator] Exhaust Fan (GPIO %d) -> %s\n", PIN_FAN_EXHAUST, state ? "ON" : "OFF");
    } else {
      digitalWrite(PIN_FAN_EXHAUST, state ? HIGH : LOW);
    }
  } else if (key == "fanIn" || key == "intake") {
    if (stateIntake != state) {
      stateIntake = state;
      digitalWrite(PIN_FAN_INTAKE, state ? HIGH : LOW);
      lastDisplayRefresh = 0;
      Serial.printf("   🌀 [Actuator] Intake Fan (GPIO %d) -> %s\n", PIN_FAN_INTAKE, state ? "ON" : "OFF");
    } else {
      digitalWrite(PIN_FAN_INTAKE, state ? HIGH : LOW);
    }
  } else if (key == "misters") {
    if (stateMister != state) {
      stateMister = state;
      digitalWrite(PIN_MISTER, state ? HIGH : LOW);
      lastDisplayRefresh = 0;
      Serial.printf("   💧 [Actuator] Misters (GPIO %d) -> %s\n", PIN_MISTER, state ? "ON" : "OFF");
    } else {
      digitalWrite(PIN_MISTER, state ? HIGH : LOW);
    }
  } else if (key == "lights") {
    if (stateLight != state) {
      stateLight = state;
      lastLightToggleTime = millis();
      lightLowStreak = 0;
      lightHighStreak = 0;
      digitalWrite(PIN_LIGHT, state ? HIGH : LOW);
      lastDisplayRefresh = 0;
      Serial.printf("   💡 [Actuator] Grow Light (GPIO %d) -> %s\n", PIN_LIGHT, state ? "ON" : "OFF");
    } else {
      digitalWrite(PIN_LIGHT, state ? HIGH : LOW);
    }
  }
}

void streamCallback(FirebaseStream data) {
  String path = data.dataPath();
  String type = data.dataType();
  unsigned long nowMs = millis();
  lastStreamEventTime = nowMs;

  // If currently in LOCAL failsafe (qualifying internet stability), cache mode changes
  // without prematurely exiting LOCAL until STABLE_RECOVERY_STREAK is verified!
  bool isQualifyingStability = (offlineFailsafeActive || slowInternetDetected) && (stableCloudStreak < STABLE_RECOVERY_STREAK);
  if (!isQualifyingStability) {
    lastSuccessfulCloudSync = nowMs;
    offlineFailsafeActive = false;
    needsCloudResync = false;
    slowInternetDetected = false;
    firebaseReady = true;
  }

  // 1. Full or partial JSON object payload (handles initial connect, mode sync pulses, and /devices updates)
  if (type == "json") {
    FirebaseJson *json = data.jsonObjectPtr();
    FirebaseJsonData result;
    if (json != nullptr) {
      if (json->get(result, "mode")) {
        String newMode = normalizeMode(result.to<String>());
        lastConfiguredAppMode = newMode;
        if (!isQualifyingStability) {
          if (newMode != stateMode) {
            stateMode = newMode;
            curTheme = getThemeForMode(stateMode);
            baseDrawn = false;
            lastDisplayRefresh = 0;
            Serial.printf("   ⚙️ [Control] Mode switched to: %s\n", stateMode.c_str());
          } else {
            Serial.printf("   ⚙️ [Control] Mode verified: %s\n", stateMode.c_str());
          }
        }
      }
      // Apply cloud actuator states in MANUAL and TIMED modes (in AUTO mode, local Edge AI regulation is authoritative)
      if (!isQualifyingStability && stateMode != "AUTO") {
        if (json->get(result, "devices/fans") || json->get(result, "fans")) applyActuator("fans", result.to<bool>());
        if (json->get(result, "devices/exhaust") || json->get(result, "exhaust")) applyActuator("exhaust", result.to<bool>());
        if (json->get(result, "devices/fanOut") || json->get(result, "fanOut")) applyActuator("fanOut", result.to<bool>());
        if (json->get(result, "devices/fanIn") || json->get(result, "fanIn")) applyActuator("fanIn", result.to<bool>());
        if (json->get(result, "devices/intake") || json->get(result, "intake")) applyActuator("intake", result.to<bool>());
        if (json->get(result, "devices/misters") || json->get(result, "misters")) applyActuator("misters", result.to<bool>());
        if (json->get(result, "devices/lights") || json->get(result, "lights")) applyActuator("lights", result.to<bool>());
      }
    }
    return;
  }

  // 2. Control Mode string change
  if (path.indexOf("mode") >= 0) {
    String newMode = normalizeMode(data.stringData());
    lastConfiguredAppMode = newMode;
    if (!isQualifyingStability) {
      if (newMode != stateMode) {
        stateMode = newMode;
        curTheme = getThemeForMode(stateMode);
        baseDrawn = false;
        lastDisplayRefresh = 0;
      }
      Serial.printf("   ⚙️ [Control] Mode changed to: %s\n", stateMode.c_str());
    }
    return;
  }

  // 3. Child property change (boolean / string / int) — apply in MANUAL and TIMED modes
  if (isQualifyingStability || stateMode == "AUTO") return;

  bool state = false;
  if (type == "boolean") state = data.boolData();
  else if (type == "string") state = (data.stringData() == "true" || data.stringData() == "1");
  else if (type == "int") state = (data.intData() > 0);

  if (path.indexOf("fanIn") >= 0 || path.indexOf("intake") >= 0) {
    applyActuator("fanIn", state);
  } else if (path.indexOf("fans") >= 0 || path.indexOf("exhaust") >= 0 || path.indexOf("fanOut") >= 0) {
    applyActuator("fans", state);
  } else if (path.indexOf("misters") >= 0) {
    applyActuator("misters", state);
  } else if (path.indexOf("lights") >= 0) {
    applyActuator("lights", state);
  }
}

void streamTimeoutCallback(bool timeout) {
  if (timeout) Serial.println("   [Stream] Firebase connection timeout, resuming...");
}

// ═══════════════════════════════════════════════
//  AUTOMATIC REGULATION ENGINE (Oyster Mushroom)
// ═══════════════════════════════════════════════

void runAutoRegulation() {
  if (stateMode != "AUTO") return;

  // Sensor validity checks
  bool isTempValid  = (!shtFault   && currentTemp > -50 && currentTemp != -999 && currentTemp != 0);
  bool isHumValid   = (!shtFault   && currentHum > 0    && currentHum != -999);
  bool isLightValid = (!lightFault && currentLight >= 0 && currentLight != -999);
  bool isCo2Valid   = (!co2Fault   && currentCO2 > 0    && currentCO2 != -999);

  bool nextExhaust = stateExhaust;
  bool nextIntake  = stateIntake;
  bool nextMister  = stateMister;
  bool nextLight   = stateLight;

  // Cold lockout: if temp < 16.0 °C, lock fans OFF to prevent chilling the mushroom mycelium
  bool isTempCold = (isTempValid && currentTemp < 16.0);

  // 1. High Temperature Cooling (Oyster Optimal: 18.0 - 25.0 °C)
  // Model Predictive Control (MPC): Prediction is aligned to actuators with robust hysteresis
  bool needFansForTemp = false;
  if (isTempValid) {
    if (aiReady) {
      if (stateExhaust) {
        // Maintain cooling until BOTH current and predicted temp return to safe optimal range
        needFansForTemp = (currentTemp > 24.5) || (predTemp10m > 24.5);
      } else {
        // Pre-emptive cooling triggers ONLY if chamber is warm (>= 24.0 °C) AND forecast predicts overshoot (>= 25.5 °C)
        // Or if current measured temperature exceeds 25.0 °C
        needFansForTemp = (currentTemp > 25.0) || (predTemp10m >= 25.5 && currentTemp >= 24.0);
      }
    } else {
      needFansForTemp = stateExhaust ? (currentTemp > 24.2) : (currentTemp > 25.0);
    }
  }

  // 2. CO2 Ventilation (Bellettini et al., 2019 / Oyster Optimal: < 1000 ppm, grace <= 1150 ppm)
  bool needFansForCo2 = false;
  if (isCo2Valid) {
    if (aiReady) {
      if (stateExhaust) {
        needFansForCo2 = (currentCO2 > 1000) || (predCO2_10m > 1050);
      } else {
        needFansForCo2 = (currentCO2 > 1150) || (predCO2_10m > 1200 && currentCO2 > 950);
      }
    } else {
      needFansForCo2 = stateExhaust ? (currentCO2 > 1000) : (currentCO2 > 1150);
    }
  }

  // 3. High Humidity Purge Exhaust (Islam et al., 2022 / Oyster Optimal: 80 - 95 % RH)
  bool needFansForHum = false;
  if (isHumValid) {
    if (aiReady) {
      if (stateExhaust) {
        needFansForHum = (currentHum > 96.0) || (predHum10m > 96.0);
      } else {
        needFansForHum = (currentHum >= 100.0) || (predHum10m >= 100.0 && currentHum >= 97.0);
      }
    } else {
      needFansForHum = stateExhaust ? (currentHum > 96.0) : (currentHum >= 100.0);
    }
  }

  // Combined Fan Actuation with Dwell Timing & Confirmation Streaks
  bool rawFanDemand = !isTempCold && (needFansForCo2 || needFansForHum || needFansForTemp);
  if (rawFanDemand) {
    fanOnDemandStreak++;
    fanOffDemandStreak = 0;
  } else {
    fanOffDemandStreak++;
    fanOnDemandStreak = 0;
  }

  unsigned long nowMs = millis();
  if (!stateExhaust) {
    if (fanOnDemandStreak >= ACTUATOR_TRIGGER_STREAK && (lastFanToggleTime == 0 || (nowMs - lastFanToggleTime >= ACTUATOR_MIN_OFF_TIME_MS))) {
      nextExhaust = true;
      nextIntake  = true;
    } else {
      nextExhaust = false;
      nextIntake  = false;
    }
  } else {
    // Fans are currently ON: enforce minimum continuous runtime
    if (fanOffDemandStreak >= ACTUATOR_TRIGGER_STREAK && (nowMs - lastFanToggleTime >= ACTUATOR_MIN_ON_TIME_MS)) {
      nextExhaust = false;
      nextIntake  = false;
    } else {
      nextExhaust = true; // Hold ON during minimum dwell period
      nextIntake  = true;
    }
  }

  // 4. Ultrasonic Misters (Islam et al., 2022 / Oyster Optimal: 80 - 95 % RH)
  bool needMister = false;
  if (isHumValid) {
    if (aiReady) {
      if (stateMister) {
        needMister = (currentHum < 80.0) || (predHum10m < 80.0);
      } else {
        needMister = (currentHum < 75.0) || (predHum10m < 74.0 && currentHum < 78.0);
      }
    } else {
      needMister = stateMister ? (currentHum < 85.0) : (currentHum < 75.0);
    }
  }

  // Combined Mister Actuation with Dwell Timing & Confirmation Streaks
  if (needMister) {
    misterOnDemandStreak++;
    misterOffDemandStreak = 0;
  } else {
    misterOffDemandStreak++;
    misterOnDemandStreak = 0;
  }

  if (!stateMister) {
    if (misterOnDemandStreak >= ACTUATOR_TRIGGER_STREAK && (lastMisterToggleTime == 0 || (nowMs - lastMisterToggleTime >= ACTUATOR_MIN_OFF_TIME_MS))) {
      nextMister = true;
    } else {
      nextMister = false;
    }
  } else {
    // Mister is currently ON: enforce minimum continuous mist runtime
    if (misterOffDemandStreak >= ACTUATOR_TRIGGER_STREAK && (nowMs - lastMisterToggleTime >= ACTUATOR_MIN_ON_TIME_MS)) {
      nextMister = false;
    } else {
      nextMister = true; // Hold ON during minimum dwell period
    }
  }

  // 5. Grow Lights Photoperiod / Illumination (Bellettini et al., 2019 / Oyster Optimal: 150 - 1000 lx)
  // Anti-chatter Biological Hysteresis:
  // - Turns ON when light < 150 lx (chamber is dark / below optimal fruiting threshold)
  // - MAINTAINS light ON throughout optimal range (150 - 1000 lx)
  // - Turns OFF only if light exceeds >= 1000 lx (intense ambient daylight)
  // - Edge AI integration: if predLight10m >= 1000 lx, turns off early (sunrise incoming)
  if (isLightValid) {
    bool aiSunHigh  = (aiReady && predLight10m >= 1000.0 && currentLight >= 800);
    bool aiDarkDrop = (aiReady && predLight10m < 150.0 && currentLight < 250);

    if (!stateLight) {
      if (currentLight < LIGHT_ON_THRESHOLD || aiDarkDrop) {
        lightLowStreak++;
        lightHighStreak = 0;
      } else {
        lightLowStreak = 0;
      }

      if (lightLowStreak >= LIGHT_TRIGGER_STREAK && (lastLightToggleTime == 0 || (nowMs - lastLightToggleTime >= LIGHT_MIN_OFF_TIME_MS))) {
        nextLight = true;
      }
    } else {
      // Light is currently ON
      if (currentLight >= LIGHT_OFF_THRESHOLD || aiSunHigh) {
        lightHighStreak++;
        lightLowStreak = 0;
      } else {
        lightHighStreak = 0;
      }

      if (lightHighStreak >= LIGHT_TRIGGER_STREAK && (nowMs - lastLightToggleTime >= LIGHT_MIN_ON_TIME_MS)) {
        nextLight = false;
      } else {
        nextLight = true; // Hold ON during minimum dwell period
      }
    }
  }

  // 6. Dynamic Edge AI Action Label
  if (aiReady) {
    if (isTempValid && currentTemp <= 25.0 && predTemp10m >= 25.5 && currentTemp >= 24.0) {
      aiAction = "preempt_exhaust_temp";
    } else if (isCo2Valid && currentCO2 <= 1150 && predCO2_10m > 1200 && currentCO2 > 950) {
      aiAction = "preempt_exhaust_co2";
    } else if (isHumValid && currentHum < 100.0 && predHum10m >= 100.0 && currentHum >= 97.0) {
      aiAction = "preempt_exhaust_hum";
    } else if (isHumValid && currentHum >= 75.0 && predHum10m < 74.0 && currentHum < 78.0) {
      aiAction = "preempt_mister";
    } else if (nextExhaust) {
      if (needFansForTemp)      aiAction = "cooling";
      else if (needFansForCo2)  aiAction = "purging_co2";
      else if (needFansForHum)  aiAction = "purging_hum";
      else                      aiAction = "ventilating";
    } else if (nextMister) {
      aiAction = "misting";
    } else {
      aiAction = "ai_optimal";
    }
  } else {
    aiAction = "warming_up";
  }

  // If any state adjusted, apply to pins and immediately push to Firebase!
  bool changed = (nextExhaust != stateExhaust ||
                  nextIntake  != stateIntake  ||
                  nextMister  != stateMister  ||
                  nextLight   != stateLight);

  if (changed) {
    if (nextExhaust != stateExhaust) {
      lastFanToggleTime = nowMs;
      fanOnDemandStreak = 0;
      fanOffDemandStreak = 0;
    }
    if (nextMister != stateMister) {
      lastMisterToggleTime = nowMs;
      misterOnDemandStreak = 0;
      misterOffDemandStreak = 0;
    }
    if (nextLight != stateLight) {
      lastLightToggleTime = nowMs;
      lightLowStreak = 0;
      lightHighStreak = 0;
    }

    stateExhaust = nextExhaust;
    stateIntake  = nextIntake;
    stateMister  = nextMister;
    stateLight   = nextLight;

    digitalWrite(PIN_FAN_EXHAUST, stateExhaust ? HIGH : LOW);
    digitalWrite(PIN_FAN_INTAKE,  stateIntake  ? HIGH : LOW);
    digitalWrite(PIN_MISTER,      stateMister  ? HIGH : LOW);
    digitalWrite(PIN_LIGHT,       stateLight   ? HIGH : LOW);

    Serial.printf("🤖 [Auto Regulation] Actuators adjusted: EXH=%s INT=%s MIST=%s LIGHT=%s | AI Action: %s\n",
                  stateExhaust ? "ON" : "OFF",
                  stateIntake  ? "ON" : "OFF",
                  stateMister  ? "ON" : "OFF",
                  stateLight   ? "ON" : "OFF",
                  aiAction);

    // Queue cloud device sync for Core 0 cloudTask (never block Core 1 loop!)
    if (isSysOnline) {
      pendingAutoDeviceSync = true;
    }
  }
}

// ═══════════════════════════════════════════════
//  FIREBASE CLOUD INITIALIZATION & RESYNC (CORE 0)
// ═══════════════════════════════════════════════

// Fast TCP SYN-ACK reachability check (zero DNS lookup overhead, 750ms max timeout)
// Detects immediately when a hotspot is connected to Wi-Fi (WL_CONNECTED) but has NO or VERY SLOW internet!
bool checkWanInternetFast() {
  if (WiFi.status() != WL_CONNECTED) return false;
  WiFiClient probe;
  unsigned long t0 = millis();
  cloudOpStartMs = t0;
  cloudOpInFlight = true;
  bool ok = probe.connect(IPAddress(8, 8, 8, 8), 53, 750);
  if (!ok && (millis() - t0 < 750)) {
    ok = probe.connect(IPAddress(1, 1, 1, 1), 53, 750);
  }
  unsigned long rtt = millis() - t0;
  probe.stop();
  cloudOpInFlight = false;
  if (!ok || rtt > 750) {
    Serial.printf("🌐 [WAN Probe] Hotspot has NO or VERY SLOW internet (RTT=%lu ms) -> Staying in LOCAL AI AUTO.\n", rtt);
    return false;
  }
  return true;
}

bool resyncCloudSetpoints(bool forceRestartStream);

bool initFirebaseCloud() {
  if (WiFi.status() != WL_CONNECTED) return false;

  // Verify hotspot actually has fast upstream WAN internet before attempting TLS handshake
  if (!checkWanInternetFast()) {
    slowInternetDetected = true;
    firebaseReady = false;
    isSysOnline = false;
    return false;
  }

  Serial.println("☁️ [Firebase] Initializing Cloud connection...");
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  config.token_status_callback = tokenStatusCallback;

  // ⚠️ Configure tight non-blocking socket/SSL timeouts BEFORE Firebase.signUp()!
  config.timeout.socketConnection = 1200;  // 1.2s max socket connect timeout
  config.timeout.sslHandshake     = 1800;  // 1.8s max SSL handshake timeout
  config.timeout.serverResponse   = 1200;  // 1.2s max server response timeout
  config.timeout.wifiReconnect    = 1500;

  // Sign up / log in anonymously (timed by Core 1 watchdog)
  unsigned long tSignStart = millis();
  cloudOpStartMs = tSignStart;
  cloudOpInFlight = true;
  bool signedUp = Firebase.signUp(&config, &auth, "", "");
  unsigned long signDuration = millis() - tSignStart;
  cloudOpInFlight = false;

  if (signedUp && signDuration <= 2500) {
    Serial.printf("✅ Firebase anonymous sign-in successful! (%lu ms)\n", signDuration);
    firebaseReady = true;
    firebaseInitialized = true;
  } else {
    Serial.printf("❌ Firebase sign-in failed or too slow (%lu ms): %s\n",
                  signDuration, config.signer.signupError.message.c_str());
    firebaseReady = false;
    slowInternetDetected = true;
    isSysOnline = false;
    return false;
  }

  Firebase.begin(&config, &auth);
  Firebase.reconnectNetwork(false); // Managed explicitly by Core 0 watchdog to prevent internal hangs

  fbdo.setBSSLBufferSize(4096, 1024);
  streamDO.setBSSLBufferSize(4096, 1024);
  Firebase.RTDB.setMaxRetry(&fbdo, 0);      // 0 retries: fail fast on slow/dead hotspots!
  Firebase.RTDB.setMaxErrorQueue(&fbdo, 0);

  // Fetch initial cloud mode and actuator settings and start stream if fast
  if (!offlineFailsafeActive && !slowInternetDetected) {
    stableCloudStreak = STABLE_RECOVERY_STREAK - 1; // Allow immediate online on clean boot
  }
  resyncCloudSetpoints(true);
  return firebaseReady && !slowInternetDetected;
}

bool resyncCloudSetpoints(bool forceRestartStream) {
  if (WiFi.status() != WL_CONNECTED) {
    stableCloudStreak = 0;
    return false;
  }
  if (!Firebase.ready()) return false;

  bool isRecovering = (slowInternetDetected || offlineFailsafeActive || needsCloudResync);

  // If recovering from LOCAL / slow internet failsafe, verify WAN reachability first in <750ms
  if (isRecovering) {
    if (!checkWanInternetFast()) {
      stableCloudStreak = 0;
      slowInternetDetected = true;
      isSysOnline = false;
      firebaseBackoffUntil = millis() + 2000;
      return false;
    }
  }

  unsigned long tSyncStart = millis();
  cloudOpStartMs = tSyncStart;
  cloudOpInFlight = true;
  bool gotJson = Firebase.RTDB.getJSON(&fbdo, "/kabutech/settings/setpoints");
  unsigned long syncDuration = millis() - tSyncStart;
  cloudOpInFlight = false;

  if (gotJson && syncDuration <= MAX_FAST_CLOUD_RTT_MS) {
    FirebaseJsonData d;
    FirebaseJson *json = fbdo.jsonObjectPtr();
    if (json != nullptr) {
      String fetchedMode = lastConfiguredAppMode;
      if (json->get(d, "mode")) {
        fetchedMode = normalizeMode(d.to<String>());
        lastConfiguredAppMode = fetchedMode;
      }

      // Open/restart stream only if not currently connected (avoids unnecessary TLS handshake stalls)
      if (!streamDO.httpConnected()) {
        cloudOpStartMs = millis();
        cloudOpInFlight = true;
        if (Firebase.RTDB.beginStream(&streamDO, "/kabutech/settings/setpoints")) {
          Firebase.RTDB.setStreamCallback(&streamDO, streamCallback, streamTimeoutCallback);
        }
        cloudOpInFlight = false;
      }

      // If recovering from LOCAL failsafe, require STABLE_RECOVERY_STREAK consecutive fast checks
      // before transitioning back to ONLINE so unstable internet never loops ONLINE <-> LOCAL!
      if (isRecovering) {
        stableCloudStreak++;
        if (stableCloudStreak < STABLE_RECOVERY_STREAK) {
          Serial.printf("⏳ [Stability Qualifier] Internet check %d/%d passed (%lu ms). Waiting for stable connection...\n",
                        stableCloudStreak, STABLE_RECOVERY_STREAK, syncDuration);
          firebaseBackoffUntil = millis() + 1800;
          return false; // Hold in LOCAL AI AUTO until all stability checks pass
        }
        Serial.printf("✅ [Stability Verified] Internet stable (%d/%d checks, %lu ms)! Transitioning LOCAL -> ONLINE (Mode: %s)\n",
                      stableCloudStreak, STABLE_RECOVERY_STREAK, syncDuration, fetchedMode.c_str());
      } else {
        stableCloudStreak = STABLE_RECOVERY_STREAK;
      }

      if (fetchedMode != stateMode) {
        stateMode = fetchedMode;
        curTheme = getThemeForMode(stateMode);
        baseDrawn = false;
        lastDisplayRefresh = 0;
        Serial.printf("✅ [Cloud Sync] Restored App Mode: %s (%lu ms)\n", stateMode.c_str(), syncDuration);
      }

      // In MANUAL and TIMED modes, synchronize hardware actuators with cloud setpoints
      if (stateMode != "AUTO") {
        if (json->get(d, "devices/fans") || json->get(d, "fans")) applyActuator("fans", d.to<bool>());
        if (json->get(d, "devices/fanOut") || json->get(d, "fanOut")) applyActuator("fanOut", d.to<bool>());
        if (json->get(d, "devices/fanIn") || json->get(d, "fanIn")) applyActuator("fanIn", d.to<bool>());
        if (json->get(d, "devices/misters") || json->get(d, "misters")) applyActuator("misters", d.to<bool>());
        if (json->get(d, "devices/lights") || json->get(d, "lights")) applyActuator("lights", d.to<bool>());
      }

      consecutiveCloudFailures = 0;
      lastSuccessfulCloudSync = millis();
      offlineFailsafeActive = false;
      needsCloudResync = false;
      slowInternetDetected = false;
      firebaseReady = true;
      return true;
    }
  }

  // Failed or too slow -> reset stability streak and stay in LOCAL AI AUTO
  stableCloudStreak = 0;
  consecutiveCloudFailures++;
  Serial.printf("⚠️ [Cloud Sync] Setpoints fetch %s (%lu ms > %d ms limit). Staying in LOCAL AI AUTO.\n",
                gotJson ? "TOO SLOW" : "FAILED", syncDuration, MAX_FAST_CLOUD_RTT_MS);
  slowInternetDetected = true;
  isSysOnline = false;
  firebaseReady = false;
  needsCloudResync = true;
  streamDO.clear();
  firebaseBackoffUntil = millis() + 2200;
  return false;
}

// ═══════════════════════════════════════════════
//  SETUP
// ═══════════════════════════════════════════════

void setup() {
  Serial.begin(115200);
  
  // ⚠️ Critical for ESP32-S3 Native USB CDC: wait up to 4s for PC Serial Monitor to attach DTR
  unsigned long startWait = millis();
  while (!Serial && (millis() - startWait < 4000)) {
    delay(10);
  }
  delay(500);

  Serial.println("\n\n==================================================");
  Serial.println("  ESP32-S3 USB CDC Serial Connected Successfully! ");
  Serial.println("==================================================");

  setCpuFrequencyMhz(160); // 160MHz: Fast cryptography, cool operation

  // ── Initialize 3.2" SPI TFT Display & Boot Splash ──
  initDisplay();

  Serial.println();
  Serial.println("╔══════════════════════════════════════════════════╗");
  Serial.println("║   KABUTECH HIYAS — Digital I2C Sensor Suite      ║");
  Serial.println("║   SHT3x (Temp/Hum) | BH1750 (Lux) | SCD41 (CO₂)  ║");
  Serial.println("╚══════════════════════════════════════════════════╝");
  Serial.println();

  // ── Configure Internal Pull-Ups for 10m Aviation Cable ──
  pinMode(I2C_SDA_PIN, INPUT_PULLUP);
  pinMode(I2C_SCL_PIN, INPUT_PULLUP);

  // ── Initialize I2C Bus on GPIO 4 (SDA) and GPIO 5 (SCL) at 50 kHz ──
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  Wire.setClock(I2C_LONG_CABLE_CLOCK); // 50 kHz (Fast, responsive, stable for cables)
  Wire.setTimeOut(I2C_WIRE_TIMEOUT_MS); // 100ms timeout
  delay(150);            // Allow sensor voltage rails to stabilize over cable

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
  updateBootStep("SHT3x Temp/Hum", sht31Ready);

  // 2. Initialize BH1750 Light Sensor
  if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE)) {
    Serial.println("✅ BH1750 Digital Light sensor initialized! (I2C: 0x23)");
    bh1750Ready = true;
  } else {
    Serial.println("❌ BH1750 light sensor NOT detected. Check wiring.");
  }
  updateBootStep("BH1750 Light", bh1750Ready);

  // 3. Initialize Sensirion SCD41 True NDIR CO₂
  scd4x.begin(Wire, 0x62);
  scd4x.wakeUp();
  delay(20);
  scd4x.stopPeriodicMeasurement(); // Clean previous state
  delay(500); // ⚠️ CRITICAL: Sensirion SCD41 requires 500ms to stop periodic measurement!
  scd4x.reinit();
  delay(20);
  uint16_t scdErr = scd4x.startPeriodicMeasurement(); // Starts 5-second sampling
  if (scdErr) {
    Serial.printf("❌ SCD41 CO₂ sensor error starting periodic measurement: %u (check wiring to GPIO 4/5)\n", scdErr);
  } else {
    Serial.println("✅ Sensirion SCD41 True NDIR CO₂ sensor initialized!");
    scd4xReady = true;
  }
  updateBootStep("SCD41 NDIR CO2", scd4xReady);

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

  // ── Connect to WiFi (Snappy 4.8s check, never hangs offline boot) ──
  Serial.print("📶 Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 12) {
    delay(400);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("✅ WiFi connected! IP: ");
    Serial.println(WiFi.localIP());
    WiFi.setSleep(false); // Maintain persistent TLS stream without dropping packets

    // Sync NTP Time (UTC+8 for Philippines: 8 * 3600 = 28800s offset)
    configTime(8 * 3600, 0, "time.google.com", "time.cloudflare.com", "pool.ntp.org");
    setenv("TZ", "PST-8", 1);
    tzset();

    if (checkWanInternetFast()) {
      Serial.print("⏰ Synchronizing Philippine Standard Time (PST)...");
      struct tm ntpInfo;
      int ntpAttempts = 0;
      while (!getLocalTime(&ntpInfo, 150) && ntpAttempts < 4) {
        Serial.print(".");
        delay(150);
        ntpAttempts++;
      }
      if (ntpInfo.tm_year > 120) {
        Serial.printf(" ✓ Synced: %02d:%02d PST\n", ntpInfo.tm_hour, ntpInfo.tm_min);
      } else {
        Serial.println(" (Syncing in background)");
      }
      updateBootStep("WiFi & WAN Online", true);

      // Initialize Firebase Cloud Connection
      initFirebaseCloud();
      updateBootStep("Firebase Cloud", firebaseReady && !slowInternetDetected);
    } else {
      Serial.println("⚠️ WiFi connected to Hotspot, but NO or VERY SLOW internet! Starting LOCAL AI AUTO.");
      updateBootStep("Hotspot: No WAN", false);
      updateBootStep("Local AI AUTO Active", true);
      stateMode = "AUTO";
      offlineFailsafeActive = true;
      slowInternetDetected = true;
      firebaseReady = false;
    }
  } else {
    Serial.println();
    Serial.println("❌ WiFi offline on boot. Starting Edge AI Autonomous Mode instantly!");
    updateBootStep("WiFi: Offline Mode", false);
    updateBootStep("Edge AI Autonomous", true);
    updateBootStep("Local AI AUTO Active", true);
    stateMode = "AUTO";
    offlineFailsafeActive = true;
    slowInternetDetected = true;
    firebaseReady = false;
  }

  // Check if first SCD41 sample is already ready (5s elapsed during sensor init)
  if (scd4xReady) {
    bool readyNow = false;
    if (scd4x.getDataReadyStatus(readyNow) == 0 && readyNow) {
      uint16_t c = 0; float t = 0, h = 0;
      if (scd4x.readMeasurement(c, t, h) == 0 && c > 0) {
        lastValidCO2 = c;
        lastCO2SuccessTime = millis();
        currentCO2 = c;
        co2Fault = false;
        Serial.printf("✅ [SCD41] Initial CO2 reading ready on boot: %d ppm\n", c);
      }
    }
  }

  // Short pause to show checklist before dashboard transition
  delay(600);
  curTheme = getThemeForMode(stateMode);
  drawStaticDashboard(stateMode);

  bootTime = millis();
  // Launch Dedicated Core 0 Cloud Task so Core 1 (Sensors, Edge AI, Relays, TFT Display) NEVER blocks!
  xTaskCreatePinnedToCore(
    cloudTask,
    "CloudTask",
    16384,
    NULL,
    1,
    &cloudTaskHandle,
    0
  );

  Serial.println();
  Serial.println("🚀 System fully initialized! Core 1: Local Sensors/TFT | Core 0: Cloud Watchdog...");
  Serial.println("────────────────────────────────────────────────────────");
}

// ═══════════════════════════════════════════════
//  HARDWARE I2C BUS RECOVERY (10m Aviation Cable & Relay Noise Immunity)
// ═══════════════════════════════════════════════

// Toggles SCL up to 16 times to release a slave holding SDA low, then sends a clean STOP
void recoverI2CBus() {
  static unsigned long lastRecovery = 0;
  unsigned long now = millis();
  if (lastRecovery > 0 && (now - lastRecovery < 1500)) {
    return; // Rate limit recovery to once every 1.5s
  }
  lastRecovery = now;

  Serial.println("⚡ [I2C Watchdog] Actuator spike/stuck bus detected. Recovering I2C bus...");
  Wire.end();

  pinMode(I2C_SDA_PIN, INPUT_PULLUP);
  pinMode(I2C_SCL_PIN, OUTPUT);
  digitalWrite(I2C_SCL_PIN, HIGH);
  delayMicroseconds(25);

  // If a sensor is mid-byte holding SDA low, clock out pulses until released
  for (int i = 0; i < 16; i++) {
    if (digitalRead(I2C_SDA_PIN) == HIGH) {
      break;
    }
    digitalWrite(I2C_SCL_PIN, LOW);
    delayMicroseconds(25);
    digitalWrite(I2C_SCL_PIN, HIGH);
    delayMicroseconds(25);
  }

  // Generate a standard I2C STOP condition:
  // 1. Set SCL LOW first
  digitalWrite(I2C_SCL_PIN, LOW);
  delayMicroseconds(25);
  // 2. Drive SDA LOW while SCL is LOW
  pinMode(I2C_SDA_PIN, OUTPUT);
  digitalWrite(I2C_SDA_PIN, LOW);
  delayMicroseconds(25);
  // 3. Release SCL HIGH
  digitalWrite(I2C_SCL_PIN, HIGH);
  delayMicroseconds(25);
  // 4. Drive SDA HIGH while SCL is HIGH -> True STOP condition!
  digitalWrite(I2C_SDA_PIN, HIGH);
  delayMicroseconds(25);

  // Re-enable internal pullups and restart Wire at long cable clock
  pinMode(I2C_SDA_PIN, INPUT_PULLUP);
  pinMode(I2C_SCL_PIN, INPUT_PULLUP);
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  Wire.setClock(I2C_LONG_CABLE_CLOCK);
  Wire.setTimeOut(I2C_WIRE_TIMEOUT_MS);
  delay(20);
  Serial.println("✅ [I2C Watchdog] Bus unjammed and Wire re-initialized successfully.");
}

// ═══════════════════════════════════════════════
//  SENSOR READING FUNCTIONS
// ═══════════════════════════════════════════════

// ── Read SHT3x: Temperature (°C) and Humidity (% RH) ──
SHTReading readSHT3x() {
  SHTReading r;
  if (!sht31Ready) {
    if (sht31.begin(0x44) || sht31.begin(0x45)) {
      sht31Ready = true;
      sht31.heater(false);
    }
  }

  float t = NAN;
  float h = NAN;
  bool success = false;

  if (sht31Ready) {
    if (sht31.readBoth(&t, &h)) {
      if (!isnan(t) && !isnan(h) && t >= -20.0 && t <= 80.0 && h >= 1.0 && h <= 100.0) {
        success = true;
      }
    }
  }

  static int shtRawMisses = 0;
  if (success) {
    shtRawMisses = 0;
    lastValidTemp = t + TEMP_OFFSET;
    lastValidHum  = constrain(h + HUM_OFFSET, 1.0, 100.0);
    lastSHTSuccessTime = millis();
    r.temperature = lastValidTemp;
    r.humidity    = lastValidHum;
    r.valid       = true;
    return r;
  }

  // If raw read failed, unstick the bus if repeated or if SDA is low
  shtRawMisses++;
  if (shtRawMisses >= 2 || digitalRead(I2C_SDA_PIN) == LOW) {
    recoverI2CBus();
    sht31Ready = false;
    bh1750Ready = false;
    shtRawMisses = 0;
  }

  // ── Dual-Redundancy Fallback: Sensirion SCD41 Integrated Temp/Hum ──
  // If SHT3x dropped packet over 10m, instantly use SCD41's internal CMOSens reading!
  if (scdBackupTemp > -50.0 && lastScdBackupTime > 0 && (millis() - lastScdBackupTime < 15000)) {
    r.temperature = scdBackupTemp + TEMP_OFFSET;
    r.humidity    = constrain(scdBackupHum + HUM_OFFSET, 1.0, 100.0);
    r.valid       = true;
    lastValidTemp = r.temperature;
    lastValidHum  = r.humidity;
    lastSHTSuccessTime = millis();
    return r;
  }

  // Hold previous reading for up to 10s (seamlessly bridges across relay switching noise/EMI)
  if (lastValidTemp > -50.0 && lastSHTSuccessTime > 0 && (millis() - lastSHTSuccessTime < SENSOR_HOLD_TIME_MS)) {
    r.temperature = lastValidTemp;
    r.humidity    = lastValidHum;
    r.valid       = true;
  } else {
    r.temperature = -999.0;
    r.humidity    = -999.0;
    r.valid       = false;
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
      if (lastValidLight >= 0 && lastLightSuccessTime > 0 && (millis() - lastLightSuccessTime < SENSOR_HOLD_TIME_MS)) {
        r.lux   = lastValidLight;
        r.valid = true;
        return r;
      }
      r.lux   = -999;
      r.valid = false;
      return r;
    }
  }

  float lux = lightMeter.readLightLevel();
  static int bh1750RawMisses = 0;
  if (!isnan(lux) && lux >= 0.0) {
    bh1750RawMisses = 0;
    lastValidLight = (int)constrain(lux, 0.0, 65535.0);
    lastLightSuccessTime = millis();
    r.lux   = lastValidLight;
    r.valid = true;
  } else {
    bh1750RawMisses++;
    if (bh1750RawMisses >= 2 || digitalRead(I2C_SDA_PIN) == LOW) {
      recoverI2CBus();
      sht31Ready = false;
      bh1750Ready = false;
      bh1750RawMisses = 0;
    }
    if (lastValidLight >= 0 && lastLightSuccessTime > 0 && (millis() - lastLightSuccessTime < SENSOR_HOLD_TIME_MS)) {
      r.lux   = lastValidLight;
      r.valid = true;
    } else {
      r.lux   = -999;
      r.valid = false;
    }
  }
  return r;
}

// ── Read SCD41: True NDIR CO₂ (ppm) ──
// Sensirion SCD41 produces an optical photoacoustic sample every 5.0 seconds.
#define SCD41_HOLD_TIME_MS      45000   // 45s: bridges across multiple measurement cycles
#define SCD41_RECOVERY_TIMEOUT  60000   // 60s: wait 12 missed cycles before restarting sensor
#define SCD41_RECOVERY_COOLDOWN 30000   // 30s: allow 6 full measurement cycles after restart

static unsigned long lastRecoveryAttempt = 0;

CO2Reading readSCD41() {
  CO2Reading r;
  unsigned long now = millis();

  // 1. Safe Auto-Recovery: Only restart if sensor is completely stalled for >60s with a 30s cooldown
  if (!scd4xReady || (lastCO2SuccessTime > 0 && (now - lastCO2SuccessTime > SCD41_RECOVERY_TIMEOUT))) {
    if (lastRecoveryAttempt == 0 || (now - lastRecoveryAttempt >= SCD41_RECOVERY_COOLDOWN)) {
      lastRecoveryAttempt = now;
      Serial.println("🔄 [SCD41] Sensor stalled >60s. Restarting periodic measurement...");
      scd4x.wakeUp();
      delay(20);
      scd4x.stopPeriodicMeasurement();
      delay(500); // 500ms required by Sensirion before restart
      scd4x.reinit();
      delay(20);
      if (scd4x.startPeriodicMeasurement() == 0) {
        scd4xReady = true;
        Serial.println("✅ [SCD41] Successfully restarted periodic measurement (30s cooldown engaged)!");
      } else {
        Serial.println("❌ [SCD41] Failed to restart periodic measurement. Retrying in 30s...");
      }
    }
  }

  // 2. Check if a new 5-second sample is available
  if (scd4xReady) {
    bool isDataReady = false;
    uint16_t error = scd4x.getDataReadyStatus(isDataReady);
    
    if (error == 0 && isDataReady) {
      uint16_t co2 = 0;
      float temp = 0.0f;
      float hum = 0.0f;
      error = scd4x.readMeasurement(co2, temp, hum);
      
      if (error == 0 && co2 > 0 && co2 <= 5000) {
        lastValidCO2 = (int)co2;
        lastCO2SuccessTime = now;
        if (!isnan(temp) && temp > -20.0 && temp < 80.0) {
          scdBackupTemp = temp;
        }
        if (!isnan(hum) && hum > 0.0 && hum <= 100.0) {
          scdBackupHum = hum;
        }
        lastScdBackupTime = now;
        r.ppm   = lastValidCO2;
        r.valid = true;
        return r;
      }
    }
    if (error != 0 || digitalRead(I2C_SDA_PIN) == LOW) {
      recoverI2CBus();
      sht31Ready = false;
      bh1750Ready = false;
    }
  }

  // 3. Keep latest reading active across 5-second sampling cycles (up to 45s)
  if (lastValidCO2 > 0 && lastCO2SuccessTime > 0 && (now - lastCO2SuccessTime < SCD41_HOLD_TIME_MS)) {
    r.ppm   = lastValidCO2;
    r.valid = true;
    return r;
  }

  // 4. Initial boot warmup grace period (SCD41 optical measurement requires 5-10s)
  if (now - bootTime < 15000) {
    r.ppm   = (lastValidCO2 > 0) ? lastValidCO2 : 500;
    r.valid = true; // Still warming up, do not flag fault
    return r;
  }

  r.ppm   = -999;
  r.valid = false;
  return r;
}

// ═══════════════════════════════════════════════
//  FIREBASE PUSH FUNCTION (RUNS ON CORE 0)
// ═══════════════════════════════════════════════

void pushToFirebase(float temp, float hum, int light, int co2,
                    bool shtErr, bool lightErr, bool co2Err) {
  if (!Firebase.ready()) {
    Serial.println("   ⏳ Firebase not ready yet...");
    return;
  }

  // If recovering from LOCAL failsafe or slow internet, verify fast WAN & restore App Mode first
  // before ever reporting esp32_status = "online" to Firebase!
  if (slowInternetDetected || offlineFailsafeActive || needsCloudResync) {
    if (!resyncCloudSetpoints(true)) {
      return;
    }
  }

  // Sync AUTO mode actuator states if queued by Core 1
  if (pendingAutoDeviceSync && stateMode == "AUTO") {
    pendingAutoDeviceSync = false;
    FirebaseJson devJson;
    devJson.set("fans",    stateExhaust);
    devJson.set("fanOut",  stateExhaust);
    devJson.set("fanIn",   stateIntake);
    devJson.set("misters", stateMister);
    devJson.set("lights",  stateLight);
    devJson.set("valve",   stateMister);
    devJson.set("co2",     false);
    cloudOpStartMs = millis();
    cloudOpInFlight = true;
    Firebase.RTDB.updateNode(&fbdo, "/kabutech/settings/setpoints/devices", &devJson);
    cloudOpInFlight = false;
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

  // Live hardware actuator states so the mobile app stays in 100% sync
  json.set("actuator_fans", stateExhaust);
  json.set("actuator_fanIn", stateIntake);
  json.set("actuator_misters", stateMister);
  json.set("actuator_lights", stateLight);
  json.set("mode", stateMode);

  // Edge AI +10 min forecast (Edge Impulse model on the ESP32)
  json.set("ai_ready", aiReady);
  json.set("ai_action", aiAction);
  json.set("ai_pred_temp_10m",  aiReady ? predTemp10m  : -999.0);
  json.set("ai_pred_hum_10m",   aiReady ? predHum10m   : -999.0);
  json.set("ai_pred_co2_10m",   aiReady ? predCO2_10m  : -999.0);
  json.set("ai_pred_light_10m", aiReady ? predLight10m : -999.0);

  FirebaseJson ts;
  ts.set(".sv", "timestamp");
  json.set("last_seen", ts);

  unsigned long tPushStart = millis();
  cloudOpStartMs = tPushStart;
  cloudOpInFlight = true;
  bool success = Firebase.RTDB.updateNode(&fbdo, "/kabutech/sensors/live", &json);
  unsigned long pushDuration = millis() - tPushStart;
  cloudOpInFlight = false;

  // Require BOTH success AND fast RTT (<= MAX_FAST_CLOUD_RTT_MS).
  if (success && pushDuration <= MAX_FAST_CLOUD_RTT_MS) {
    Serial.printf("   ☁️  Firebase synced ✓ (%lu ms)\n", pushDuration);
    consecutiveCloudFailures = 0;
    stableCloudStreak = STABLE_RECOVERY_STREAK;
    lastSuccessfulCloudSync = millis();
    slowInternetDetected = false;
    firebaseReady = true;
  } else {
    consecutiveCloudFailures++;
    // If 2 consecutive pushes fail/lag OR WAN probe fails right now -> switch to LOCAL AI AUTO immediately!
    if (consecutiveCloudFailures >= FAIL_STREAK_TO_LOCAL || !checkWanInternetFast()) {
      Serial.printf("   🚨 [Network Watchdog] Cloud push %s (%lu ms, streak %d). Switching to LOCAL AI AUTO!\n",
                    success ? "TOO SLOW" : "FAILED", pushDuration, consecutiveCloudFailures);
      stableCloudStreak = 0;
      isSysOnline = false;
      firebaseReady = false;
      slowInternetDetected = true;
      offlineFailsafeActive = true;
      needsCloudResync = true;
      streamDO.clear(); // Close stale stream socket immediately so it never blocks
      firebaseBackoffUntil = millis() + 2000;
    } else {
      Serial.printf("   ⚠️ [Network Jitter] Transient slow push (%lu ms). WAN still reachable, retrying next cycle...\n", pushDuration);
    }
  }
}

// ═══════════════════════════════════════════════
//  HEARTBEAT — Keep esp32_status "online"
// ═══════════════════════════════════════════════

void sendHeartbeat() {
  if (!isSysOnline || slowInternetDetected || !Firebase.ready()) return;

  FirebaseJson json;
  json.set("esp32_status", "online");
  FirebaseJson ts;
  ts.set(".sv", "timestamp");
  json.set("last_seen", ts);

  unsigned long tHbStart = millis();
  cloudOpStartMs = tHbStart;
  cloudOpInFlight = true;
  bool ok = Firebase.RTDB.updateNode(&fbdo, "/kabutech/sensors/live", &json);
  unsigned long hbDuration = millis() - tHbStart;
  cloudOpInFlight = false;

  if (ok && hbDuration <= MAX_FAST_CLOUD_RTT_MS) {
    Serial.println("   💓 Heartbeat sent");
    consecutiveCloudFailures = 0;
    lastSuccessfulCloudSync = millis();
    firebaseReady = true;
  } else {
    consecutiveCloudFailures++;
    if (consecutiveCloudFailures >= FAIL_STREAK_TO_LOCAL || !checkWanInternetFast()) {
      stableCloudStreak = 0;
      isSysOnline = false;
      firebaseReady = false;
      slowInternetDetected = true;
      offlineFailsafeActive = true;
      needsCloudResync = true;
      streamDO.clear();
      firebaseBackoffUntil = millis() + 2000;
    }
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

  cloudOpStartMs = millis();
  cloudOpInFlight = true;
  bool deleted = Firebase.RTDB.deleteNode(&fbdo, prunePath.c_str());
  cloudOpInFlight = false;

  if (deleted) {
    Serial.println("   ✅ 90-day retention prune check complete.");
  } else {
    Serial.printf("   ℹ️ Prune status: %s\n", fbdo.errorReason().c_str());
  }
}

void pushHourlyHistory() {
  if (!isSysOnline || slowInternetDetected || !Firebase.ready()) return;

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

  cloudOpStartMs = millis();
  cloudOpInFlight = true;
  bool ok = Firebase.RTDB.updateNode(&fbdo, historyPath.c_str(), &historyJson);
  cloudOpInFlight = false;

  if (ok) {
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
//  DEDICATED CORE 0 CLOUD & NETWORK TASK
//  Guarantees Core 1 (Sensors, Edge AI, TFT) NEVER hangs!
// ═══════════════════════════════════════════════

void cloudTask(void *pvParameters) {
  bool wasWifiConnected = (WiFi.status() == WL_CONNECTED);
  unsigned long lastWifiReconnectAttempt = 0;
  unsigned long lastNtpCheck = 0;
  unsigned long lastFirebaseInitRetry = 0;
  unsigned long lastStreamCheck = 0;

  for (;;) {
    unsigned long now = millis();
    bool isNetConnected = (WiFi.status() == WL_CONNECTED);

    // 1. Wi-Fi Link Reconnection Watchdog
    if (!isNetConnected) {
      if (wasWifiConnected) {
        wasWifiConnected = false;
        stableCloudStreak = 0;
        consecutiveCloudFailures = FAIL_STREAK_TO_LOCAL;
        isSysOnline = false;
        firebaseReady = false;
        slowInternetDetected = true;
        offlineFailsafeActive = true;
        needsCloudResync = true;
        streamDO.clear();
        Serial.println("📶 [Core 0] Wi-Fi disconnected -> Instant LOCAL AI AUTO.");
      }
      if (now - lastWifiReconnectAttempt >= 3500) {
        lastWifiReconnectAttempt = now;
        Serial.println("🔄 [Core 0] Attempting non-blocking Wi-Fi reconnect...");
        WiFi.reconnect();
      }
      vTaskDelay(pdMS_TO_TICKS(100));
      continue;
    }

    // 2. Wi-Fi Just Associated (Verify Hotspot Actually Has Stable WAN Internet!)
    if (isNetConnected && !wasWifiConnected) {
      wasWifiConnected = true;
      lastWifiReconnectTime = now;
      stableCloudStreak = 0; // Require full stability qualification streak after Wi-Fi reconnect
      WiFi.setSleep(false);
      Serial.println("🌐 [Core 0] Wi-Fi associated! Probing Hotspot WAN internet stability...");

      configTime(8 * 3600, 0, "time.google.com", "time.cloudflare.com", "pool.ntp.org");
      setenv("TZ", "PST-8", 1);
      tzset();

      if (checkWanInternetFast()) {
        if (!firebaseInitialized) {
          initFirebaseCloud();
        } else {
          resyncCloudSetpoints(false);
        }
      } else {
        // Hotspot is connected to Wi-Fi, but has NO internet or VERY SLOW internet!
        stableCloudStreak = 0;
        slowInternetDetected = true;
        offlineFailsafeActive = true;
        isSysOnline = false;
        firebaseReady = false;
        needsCloudResync = true;
        firebaseBackoffUntil = millis() + 2000;
      }
    }

    // 3. Background NTP Check every 20s
    if (now - lastNtpCheck >= 20000) {
      lastNtpCheck = now;
      if (isSysOnline && !slowInternetDetected) {
        struct tm chkTime;
        if (!getLocalTime(&chkTime, 20) || chkTime.tm_year <= 120) {
          configTime(8 * 3600, 0, "time.google.com", "time.cloudflare.com", "pool.ntp.org");
          setenv("TZ", "PST-8", 1);
          tzset();
        }
      }
    }

    // 4. Retry Firebase Init if not yet initialized
    if (!firebaseInitialized && (long)(now - firebaseBackoffUntil) >= 0 && (now - lastFirebaseInitRetry >= 4000)) {
      lastFirebaseInitRetry = now;
      initFirebaseCloud();
    }

    // 5. Periodic Stream Socket Health Check (only reconnects if stream socket is disconnected, never tears down a healthy stream)
    if (firebaseInitialized && !slowInternetDetected && !offlineFailsafeActive && (long)(now - firebaseBackoffUntil) >= 0 && (now - lastStreamCheck >= 5000)) {
      lastStreamCheck = now;
      if (!streamDO.httpConnected()) {
        resyncCloudSetpoints(false);
      }
    }

    // 6. Push Live Sensor & Actuator Telemetry every 2s (or run stability qualification if in LOCAL failsafe)
    if (firebaseInitialized && (long)(now - firebaseBackoffUntil) >= 0 && (now - lastFirebasePush >= FIREBASE_PUSH_INTERVAL)) {
      lastFirebasePush = now;
      pushToFirebase(currentTemp, currentHum, currentLight, currentCO2,
                     shtFault, lightFault, co2Fault);

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

    // 7. Hourly History Push
    if (isSysOnline && !slowInternetDetected) {
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
    }

    vTaskDelay(pdMS_TO_TICKS(40));
  }
}

// ═══════════════════════════════════════════════
//  MAIN LOOP (CORE 1 — 100% NON-BLOCKING LOCAL ENGINE)
// ═══════════════════════════════════════════════

void loop() {
  unsigned long now = millis();

  // ── Instant Network & Hotspot WAN Liveness + Stability Evaluation ──
  // 1. If Wi-Fi link drops -> Instant LOCAL AI AUTO (0ms)
  // 2. If any Core 0 cloud operation blocks in-flight > 3200ms -> Instant LOCAL AI AUTO
  // 3. If WAN probe or consecutive Firebase pushes fail -> Instant LOCAL AI AUTO
  // 4. Requires STABLE_RECOVERY_STREAK (3 consecutive fast syncs) before returning LOCAL -> ONLINE
  bool isNetConnected = (WiFi.status() == WL_CONNECTED);
  bool callStuck      = cloudOpInFlight && ((unsigned long)(now - cloudOpStartMs) > CLOUD_STUCK_CALL_MS);
  if (callStuck && !slowInternetDetected) {
    Serial.printf("🚨 [Core 1 Watchdog] Cloud call blocked > %d ms (Hotspot has no/slow internet)! Instant switch to LOCAL AI AUTO.\n", CLOUD_STUCK_CALL_MS);
    stableCloudStreak = 0;
    slowInternetDetected = true;
    offlineFailsafeActive = true;
    needsCloudResync = true;
  }
  bool isCloudSynced  = (lastSuccessfulCloudSync > 0) && ((unsigned long)(now - lastSuccessfulCloudSync) <= CLOUD_SYNC_TIMEOUT_MS);
  bool isStable       = (stableCloudStreak >= STABLE_RECOVERY_STREAK);
  isSysOnline = isNetConnected && firebaseReady && !slowInternetDetected && !callStuck && isCloudSynced && isStable;

  // ── Offline / Slow-Hotspot Failsafe Watchdog & Mode Recovery ──
  if (!isSysOnline) {
    if (!offlineFailsafeActive) {
      if (stateMode != "AUTO") {
        lastConfiguredAppMode = stateMode; // Retain user's setting so it is restored when fast internet returns
      }
      offlineFailsafeActive = true;
      needsCloudResync = true;
    }
    if (stateMode != "AUTO") {
      Serial.printf("⚠️ [Network Failsafe] Hotspot offline or slow internet! Overriding %s -> LOCAL AI AUTO.\n", stateMode.c_str());
      stateMode = "AUTO";
      curTheme = getThemeForMode(stateMode);
      baseDrawn = false;
      lastDisplayRefresh = 0;
    }
  } else if (offlineFailsafeActive) {
    // Fast cloud connectivity verified by Core 0! Restore user's mode immediately
    offlineFailsafeActive = false;
    if (lastConfiguredAppMode.length() > 0 && stateMode != lastConfiguredAppMode) {
      stateMode = lastConfiguredAppMode;
      curTheme = getThemeForMode(stateMode);
      baseDrawn = false;
      lastDisplayRefresh = 0;
    }
  }

  // ── Read sensors and print to Serial Monitor every 1s ──
  if (now - lastSerialPrint >= SERIAL_PRINT_INTERVAL) {
    lastSerialPrint = now;

    // Proactive bus health check: unstick bus immediately if actuator spike pulled SDA low
    if (digitalRead(I2C_SDA_PIN) == LOW) {
      Serial.println("⚡ [I2C Watchdog] Bus stuck LOW before cycle (actuator spike). Unjamming...");
      recoverI2CBus();
      sht31Ready = false;
      bh1750Ready = false;
    }

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

    // 2. Read BH1750 (5ms I2C bus settling delay)
    delay(5);
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

    // 3. Read SCD41 (5ms I2C bus settling delay)
    delay(5);
    CO2Reading co2Data = readSCD41();
    if (co2Data.valid) {
      co2FailStreak = 0;
      co2ValidStreak++;
      if (co2ValidStreak >= STREAK_TO_CLEAR_FAULT) {
        if (co2Data.ppm > 0) {
          co2Fault   = false;
          currentCO2 = co2Data.ppm;
        }
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

    Serial.printf("   🔥 ESP32 Chip Temp: %.1f °C | Cloud: %s | Mode: %s\n",
                  temperatureRead(), isSysOnline ? "ONLINE" : "LOCAL", stateMode.c_str());
    Serial.println("──────────────────────────────────────────────────────");

    // ── Edge AI: sample every 30 s into the ring buffer and forecast +10 min ──
    edgeForecastTick(now, currentTemp, currentHum, currentCO2, currentLight,
                     shtFault, co2Fault, lightFault);

    // ── Local Autonomous Environmental Regulation (AUTO Mode) ──
    runAutoRegulation();

    if (stateMode == "AUTO") {
      if (stateExhaust) {
        Serial.printf("   🌀 Exhaust Fans:  ON  [%s | T=%.1f°C (Pred:%.1f) | CO2=%d (Pred:%.0f) | H=%.1f%% (Pred:%.1f%%)]\n",
                      aiAction, currentTemp, aiReady ? predTemp10m : currentTemp,
                      currentCO2, aiReady ? predCO2_10m : (float)currentCO2,
                      currentHum, aiReady ? predHum10m : currentHum);
      } else {
        Serial.printf("   🌀 Exhaust Fans:  OFF [Aligned: Chamber & Forecast Safe (T=%.1f°C / Pred:%.1f°C)]\n",
                      currentTemp, aiReady ? predTemp10m : currentTemp);
      }
      if (stateMister) {
        Serial.printf("   💧 Ultrasonic:    ON  [%s | Hum=%.1f%% / Pred=%.1f%%]\n",
                      aiAction, currentHum, aiReady ? predHum10m : currentHum);
      }
      if (stateLight) {
        Serial.printf("   💡 Grow Light:    ON  [%d lx (Optimal 150-1000 lx)]\n", currentLight);
      }
    }
  }

  // ── Non-Blocking 3.2" TFT Dashboard Refresh (every 500ms) ──
  if (now - lastDisplayRefresh >= DISPLAY_REFRESH_INTERVAL) {
    lastDisplayRefresh = now;
    drawDashboard(currentTemp, currentHum, currentLight, currentCO2,
                  shtFault, lightFault, co2Fault,
                  stateExhaust, stateIntake, stateMister, stateLight,
                  stateMode, isSysOnline, isSysOnline && firebaseReady,
                  aiReady, aiAction);
  }

  // ── Live Serial Diagnostic Command: Type 't' to re-init, 'm' to flip rotation ──
  if (Serial.available()) {
    char ch = Serial.read();
    if (ch == 't' || ch == 'T' || ch == 'r' || ch == 'R') {
      Serial.println("\n🔄 [SERIAL TRIGGER] Re-initializing TFT Display & testing color wipe...");
      initDisplay();
    } else if (ch == 'm' || ch == 'M') {
      static uint8_t curRot = TFT_ROTATION;
      // Cycle landscape modes: 1 (Upright normal) -> 3 (180° inverted) -> 7 (Normal flipped) -> 5 (Mirrored)
      if (curRot == 1) curRot = 3;
      else if (curRot == 3) curRot = 7;
      else if (curRot == 7) curRot = 5;
      else curRot = 1;
      Serial.printf("\n🔄 [SERIAL TRIGGER] Setting TFT Rotation to %d...\n", curRot);
      tft.setRotation(curRot);
      baseDrawn = false;
      drawStaticDashboard(stateMode);
    }
  }

  delay(15);
}
