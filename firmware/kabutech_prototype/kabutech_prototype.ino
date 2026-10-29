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
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Wire.h>

// ─── Optimize Flash Footprint ───
#define FIREBASE_ENABLE_RTDB // Only link Realtime Database engine
#include <Firebase_ESP_Client.h>
#include <Adafruit_SHT31.h>
#include <BH1750.h>
#include <SensirionI2cScd4x.h>
#include <time.h>

// ─── Single Source of Truth: Sensor State & Debouncing ───
#include "sensor_state.h"

// ─── Edge AI Forecaster (Edge Impulse) — see edge_forecast.h & tinyml/EDGE_IMPULSE_TUTORIAL.md ───
#define ENABLE_EDGE_AI  1       // 1 = active on-device TinyML forecasting
#define CSV_LOG_MODE    0       // 1 = print CSV lines for tinyml/record_real_data.py
#include "edge_forecast.h"

// ─── TFT SPI Display Driver (LovyanGFX ILI9341 240x320) ───
// 4 MHz SPI Clock: Eliminates ringing/crosstalk over 30cm extension wires (fixes white screen)
#define TFT_SPI_FREQ    4000000
// Orientation: 1 = Landscape Upright (Header at TOP, Left-to-Right normal text)
#define TFT_ROTATION    7
#include "tft_display.h"

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

#define TEMP_OFFSET     -10.0    // Adjust temperature in °C (e.g. -3.0 lowers reading by 3°C)
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
#define SENSOR_HOLD_TIME_MS   15000  // 15s: Bridges relay EMI switching noise, cable noise & contact bounce
#define SCD41_HOLD_TIME_MS    45000  // 45s: Bridges across multiple 5s measurement cycles (up to 9 missed cycles)
#define SCD41_RECOVERY_TIMEOUT 30000 // 30s: Wait 6 missed cycles before restarting sensor
#define SCD41_RECOVERY_COOLDOWN 10000 // 10s: Allow 2 full measurement cycles after restart

// ─── TCA9548A I2C Multiplexer Configuration ───
// Eliminates 10-meter cable capacitance by isolating each sensor line onto its own branch.
// Address: 0x70 (A0, A1, A2 unconnected). Auto-detects whether TCA is plugged in or not.
#define USE_TCA9548A          1       // 1 = Auto-detect & switch TCA9548A channels; 0 = Direct bus only
#define TCA9548A_ADDR         0x70    // Default I2C address for TCA9548A
#define TCA_CH_SHT31          0       // Channel 0: SHT31 (Temp & Humidity)
#define TCA_CH_LIGHT          1       // Channel 1: BH1750 (Ambient Light)
#define TCA_CH_SCD41          2       // Channel 2: Sensirion SCD41 (True CO2)

void recoverI2CBus();

// Fast non-destructive probe to check if an I2C device acknowledges its address (~0.2ms)
// Sends only address byte and reads ACK without calling device commands or locking the bus.
inline bool i2cProbeAddress(uint8_t addr) {
  Wire.beginTransmission(addr);
  return (Wire.endTransmission() == 0);
}

// Debounced probe: a lone NACK caused by relay EMI / cable noise must NOT be read as "unplugged".
// Tries up to `tries` times (2 ms apart); returns true on the first ACK.
// A truly unplugged device NACKs every attempt, so the extra cost is only ~4 ms and only when absent.
bool i2cProbeRetry(uint8_t addr, uint8_t tries = 3) {
  for (uint8_t i = 0; i < tries; i++) {
    if (i2cProbeAddress(addr)) return true;
    if (i + 1 < tries) delay(2);
  }
  return false;
}

bool tcaPresent = false;
uint8_t currentTcaChannel = 255;

// Helper: Select TCA9548A Channel (0 to 7). Safely bypasses if TCA is not detected.
// The channel register is ALWAYS re-written (never cached): if the TCA9548A power-on-resets from a
// brown-out / relay spike, its channels silently close and every sensor would look unplugged at once.
bool tcaSelect(uint8_t channel) {
#if USE_TCA9548A
  if (!tcaPresent || channel > 7) return true;

  uint8_t err = 1;
  for (uint8_t attempt = 0; attempt < 2 && err != 0; attempt++) {
    Wire.beginTransmission(TCA9548A_ADDR);
    Wire.write(1 << channel);
    err = Wire.endTransmission();
  }
  if (err != 0) {
    currentTcaChannel = 255;
    return false;
  }
  currentTcaChannel = channel;
  delayMicroseconds(500); // Allow 10m branch line capacitance to settle
  return true;
#else
  return true;
#endif
}

// Periodically re-detects the TCA9548A so a multiplexer that was missing/reset/replugged is picked up
// again (and a removed one falls back to direct-bus mode) without needing a reboot.
void tcaMaintain() {
#if USE_TCA9548A
  static unsigned long lastCheck = 0;
  unsigned long now = millis();
  if (now - lastCheck < 5000) return;
  lastCheck = now;

  bool present = i2cProbeRetry(TCA9548A_ADDR, 3);
  if (present != tcaPresent) {
    tcaPresent = present;
    currentTcaChannel = 255;
    Serial.println(present ? "ℹ️ [TCA9548A] Multiplexer re-detected at 0x70 — channel isolation active."
                           : "⚠️ [TCA9548A] Multiplexer lost — falling back to direct shared I2C bus mode.");
  }
#endif
}

// Helper: Disconnect all TCA channels (isolates all remote branches from the main bus)
void tcaDisableAll() {
#if USE_TCA9548A
  if (!tcaPresent) return;
  Wire.beginTransmission(TCA9548A_ADDR);
  Wire.write(0x00);
  Wire.endTransmission();
  currentTcaChannel = 255;
#endif
}

// Last valid reading buffers (keeps readings stable across momentary cable noise)
float lastValidTemp  = -999.0;
float lastValidHum   = -999.0;
int   lastValidLight = -999;
int   lastValidCO2   = -999;

unsigned long lastSHTSuccessTime   = 0;
unsigned long lastLightSuccessTime = 0;
unsigned long lastCO2SuccessTime   = 0;

// ── Single Source of Truth: Sensor Snapshot & FreeRTOS SMP Spinlock ──
static portMUX_TYPE sensorStateMux = portMUX_INITIALIZER_UNLOCKED;
SensorSnapshot g_sensorSnapshot = {
  { S_INIT, R_NOT_PRESENT, -999.0f, 0, 0, 0 },
  { S_INIT, R_NOT_PRESENT, -999.0f, 0, 0, 0 },
  { S_INIT, R_NOT_PRESENT, -999.0f, 0, 0, 0 },
  { S_INIT, R_NOT_PRESENT, -999.0f, 0, 0, 0 },
  0
};

inline SensorSnapshot getSensorSnapshot() {
  SensorSnapshot snap;
  portENTER_CRITICAL(&sensorStateMux);
  snap = g_sensorSnapshot;
  portEXIT_CRITICAL(&sensorStateMux);
  return snap;
}

// ── Sensor Reading Structures ──
struct SHTReading {
  float temperature;
  float humidity;
  bool valid;
  FaultReason reason;
};

struct LightReading {
  int lux;
  bool valid;
  FaultReason reason;
};

struct CO2Reading {
  int ppm;
  bool valid;
  FaultReason reason;
};

SHTReading readSHT3x();
LightReading readBH1750();
CO2Reading readSCD41();
void recoverI2CBus();
bool initFirebaseCloud();
bool resyncCloudSetpoints(bool forceRestartStream = false);
bool checkWanInternetFast();
void cloudTask(void *pvParameters);

// ─── RTC Hardware Boot-Once Lock (Survives any soft reset / brownout; clears ONLY on initial power-on) ───
#define KABUTECH_BOOT_MAGIC 0x4B414255UL
RTC_DATA_ATTR uint32_t rtcBootMagic = 0;
bool isFirstPowerOnBoot = true;
bool ntpConfigured      = false;
bool firebaseBegun      = false;

// Single Unified TLS Session on Core 0 (Eliminates dual-SSL heap exhaustion & streamDO Use-After-Free crashes!)
FirebaseData fbdo;
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
volatile bool cloudOpInFlight = false;
volatile unsigned long cloudOpStartMs = 0;
volatile bool pendingAutoDeviceSync = false;
volatile int stableCloudStreak = 0;
volatile int consecutiveCloudFailures = 0;
TaskHandle_t cloudTaskHandle = NULL;

// Live cached telemetry values (shared across Core 0 cloud task and Core 1 local loop)
volatile float currentTemp  = -999.0;
volatile float currentHum   = -999.0;
volatile int   currentLight = -999;
volatile int   currentCO2   = -999;

// Fault flags (initialized false; in boot grace period, status is S_INIT rather than FAULT)
volatile bool shtFault   = false;
volatile bool lightFault = false;
volatile bool co2Fault   = false;

// Debouncing streaks (consecutive reads to latch/clear fault)
#define STREAK_TO_LATCH_FAULT 2      // 2 consecutive failed reads (2s) required to latch FAULT
#define STREAK_TO_CLEAR_FAULT 2      // 2 consecutive valid reads to clear FAULT

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
#define ACTUATOR_TRIGGER_STREAK   1       // Immediate responsive actuation on confirmed demand

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

// TFT Display refresh timer & Relay EMI Shielding (prevents white screen on Grow Light / Relay surge)
unsigned long lastDisplayRefresh = 0;
#define DISPLAY_REFRESH_INTERVAL 500
#define RELAY_EMI_QUIET_MS       120    // 120ms SPI lockout during relay contact arc & Grow Light inrush
volatile bool tftSpiBusy = false;       // Guard so Core 0 never switches a relay while Core 1 is mid-SPI write
volatile unsigned long lastActuatorSwitchTime = 0;
volatile bool tftNeedsPrimaryHeal   = false;
volatile bool tftNeedsSecondaryHeal = false;

// Deselects TFT SPI bus and locks out SPI writes before any relay/actuator switches
void shieldTftBeforeRelaySwitch() {
  unsigned long waitStart = millis();
  while (tftSpiBusy && (millis() - waitStart < 40)) {
    delay(1);
  }
  lastActuatorSwitchTime = millis();
  tftNeedsPrimaryHeal    = true;
  tftNeedsSecondaryHeal  = true;

  // Force CS (GPIO 10), RST (GPIO 6), and LED (GPIO 2) HIGH so ILI9341 ignores bus noise during relay arc
  digitalWrite(TFT_CS_PIN,  HIGH);
  digitalWrite(TFT_RST_PIN, HIGH);
  digitalWrite(TFT_LED_PIN, HIGH);
}

// ═══════════════════════════════════════════════
//  FIREBASE STREAM CALLBACKS (ACTUATOR CONTROL)
// ═══════════════════════════════════════════════

// Helper to set actuator state and update GPIO pin output
void applyActuator(const String& key, bool state) {
  if (key == "fans" || key == "exhaust" || key == "fanOut") {
    if (stateExhaust != state) {
      shieldTftBeforeRelaySwitch();
      stateExhaust = state;
      digitalWrite(PIN_FAN_EXHAUST, state ? HIGH : LOW);
      lastActuatorSwitchTime = millis();
      Serial.printf("   🌀 [Actuator] Exhaust Fan (GPIO %d) -> %s\n", PIN_FAN_EXHAUST, state ? "ON" : "OFF");
      delay(30);
    }
  } else if (key == "fanIn" || key == "intake") {
    if (stateIntake != state) {
      shieldTftBeforeRelaySwitch();
      stateIntake = state;
      digitalWrite(PIN_FAN_INTAKE, state ? HIGH : LOW);
      lastActuatorSwitchTime = millis();
      Serial.printf("   🌀 [Actuator] Intake Fan (GPIO %d) -> %s\n", PIN_FAN_INTAKE, state ? "ON" : "OFF");
      delay(30);
    }
  } else if (key == "misters") {
    if (stateMister != state) {
      shieldTftBeforeRelaySwitch();
      stateMister = state;
      digitalWrite(PIN_MISTER, state ? HIGH : LOW);
      lastActuatorSwitchTime = millis();
      Serial.printf("   💧 [Actuator] Misters (GPIO %d) -> %s\n", PIN_MISTER, state ? "ON" : "OFF");
      delay(30);
    }
  } else if (key == "lights") {
    if (stateLight != state) {
      shieldTftBeforeRelaySwitch();
      stateLight = state;
      lastLightToggleTime = millis();
      lightLowStreak = 0;
      lightHighStreak = 0;
      digitalWrite(PIN_LIGHT, state ? HIGH : LOW);
      lastActuatorSwitchTime = millis();
      Serial.printf("   💡 [Actuator] Grow Light (GPIO %d) -> %s\n", PIN_LIGHT, state ? "ON" : "OFF");
      delay(30);
    }
  }
}

// ─── 24/7 Hardware-to-Phone Expo Push Notification Cache (Fires even when mobile app is CLOSED) ───
#define MAX_PUSH_TOKENS 8
String registeredPushTokens[MAX_PUSH_TOKENS];
int pushTokenCount = 0;

void addOrUpdatePushToken(const String& tok) {
  if (!tok.startsWith("ExponentPushToken[")) return;
  for (int i = 0; i < pushTokenCount; i++) {
    if (registeredPushTokens[i] == tok) return;
  }
  if (pushTokenCount < MAX_PUSH_TOKENS) {
    registeredPushTokens[pushTokenCount++] = tok;
    Serial.printf("   📱 [Push Registry] Registered phone push token (%d total): %s\n", pushTokenCount, tok.c_str());
  } else {
    // Rotate oldest slot if full
    registeredPushTokens[0] = tok;
  }
}

void extractPushTokensFromJson(FirebaseJson *json) {
  if (json == nullptr) return;
  String raw;
  json->toString(raw, false);
  int pos = 0;
  while ((pos = raw.indexOf("ExponentPushToken[", pos)) >= 0) {
    int endBracket = raw.indexOf(']', pos);
    if (endBracket > pos && (endBracket - pos) < 80) {
      String tok = raw.substring(pos, endBracket + 1);
      addOrUpdatePushToken(tok);
      pos = endBracket + 1;
    } else {
      break;
    }
  }
}

// ═══════════════════════════════════════════════
//  AUTOMATIC REGULATION ENGINE (Oyster Mushroom)
// ═══════════════════════════════════════════════

void runAutoRegulation() {
  if (stateMode != "AUTO") return;

  unsigned long nowMs = millis();
  SensorSnapshot snap = getSensorSnapshot();
  bool isTempValid  = (snap.temp.status == S_OK || (snap.temp.status == S_INIT && snap.temp.value > -50.0f));
  bool isHumValid   = (snap.hum.status == S_OK || (snap.hum.status == S_INIT && snap.hum.value >= 0.0f));
  bool isLightValid = (snap.light.status == S_OK || (snap.light.status == S_INIT && snap.light.value >= 0.0f));
  bool isCo2Valid   = (snap.co2.status == S_OK || (snap.co2.status == S_INIT && snap.co2.value > 0.0f));

  float currentT = snap.temp.value;
  float currentH = snap.hum.value;
  int   currentL = (int)snap.light.value;
  int   currentC = (int)snap.co2.value;

  bool nextExhaust = stateExhaust;
  bool nextIntake  = stateIntake;
  bool nextMister  = stateMister;
  bool nextLight   = stateLight;

  // Cold lockout: if temp < 16.0 °C, lock fans OFF to prevent chilling the mushroom mycelium
  bool isTempCold = (isTempValid && currentT < 16.0);

  // 1. High Temperature Cooling (Oyster Optimal: 18.0 - 25.0 °C)
  // Model Predictive Control (MPC): Activates cooling if current OR predicted temp exceeds 25.0 °C
  bool needFansForTemp = false;
  if (isTempValid) {
    if (aiReady && aiChannelValid[0]) {
      if (stateExhaust) {
        // Maintain cooling until BOTH current and predicted temp return to safe optimal range
        needFansForTemp = (currentT > 24.2) || (predTemp10m > 24.5);
      } else {
        // Trigger fans immediately if CURRENT temp > 25.0 OR PREDICTED temp > 25.0!
        needFansForTemp = (currentT > 25.0) || (predTemp10m > 25.0);
      }
    } else {
      needFansForTemp = stateExhaust ? (currentT > 24.2) : (currentT > 25.0);
    }
  }

  // 2. CO2 Ventilation (Oyster Optimal: < 1000 ppm)
  bool needFansForCo2 = false;
  static unsigned long co2FaultStartMs = 0;

  if (isCo2Valid) {
    co2FaultStartMs = 0;
    if (aiReady && aiChannelValid[2]) {
      if (stateExhaust) {
        needFansForCo2 = (currentC > 950) || (predCO2_10m > 950);
      } else {
        needFansForCo2 = (currentC > 1000) || (predCO2_10m > 1000);
      }
    } else {
      needFansForCo2 = stateExhaust ? (currentC > 950) : (currentC > 1000);
    }
  } else if (snap.co2.status == S_FAULT) {
    // FAIL-SAFE PURGE (F3): Emergency ventilation ONLY if CO2 sensor is continuously faulted
    // for at least 20 minutes (prevents chamber suffocation in an unmonitored grow room).
    // NEVER activates immediately on sensor disconnect or during bench testing!
    if (co2FaultStartMs == 0) {
      co2FaultStartMs = nowMs;
    }
    if (nowMs - co2FaultStartMs >= 1200000UL) {
      unsigned long elapsedSinceCycle = (nowMs - co2FaultStartMs) % 1200000UL;
      if (elapsedSinceCycle < 120000UL) { // First 2 minutes of every 20-min cycle
        needFansForCo2 = true;
      }
    }
  } else {
    co2FaultStartMs = 0;
  }

  // 3. High Humidity Purge Exhaust (Oyster Optimal: 80 - 95 % RH)
  bool needFansForHum = false;
  if (isHumValid) {
    if (aiReady && aiChannelValid[1]) {
      if (stateExhaust) {
        needFansForHum = (currentH > 92.0) || (predHum10m > 93.0);
      } else {
        // Trigger exhaust fans if current humidity > 95.0% OR predicted > 95.0%!
        needFansForHum = (currentH > 95.0) || (predHum10m > 95.0);
      }
    } else {
      needFansForHum = stateExhaust ? (currentH > 92.0) : (currentH > 95.0);
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
    if (aiReady && aiChannelValid[1]) {
      if (stateMister) {
        // Maintain misting until humidity is safely inside optimal range (88%)
        needMister = (currentH < 88.0) || (predHum10m < 85.0);
      } else {
        // Trigger misting immediately if CURRENT humidity < 80% OR PREDICTED < 80%!
        needMister = (currentH < 80.0) || (predHum10m < 80.0);
      }
    } else {
      needMister = stateMister ? (currentH < 88.0) : (currentH < 80.0);
    }
  } else {
    // FAIL-SAFE: Never run ultrasonic mister blind when humidity is unverified (prevents flooding)
    needMister = false;
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
  if (isLightValid) {
    bool aiSunHigh  = (aiReady && aiChannelValid[3] && predLight10m >= 1000.0 && currentL >= 800);
    bool aiDarkDrop = (aiReady && aiChannelValid[3] && predLight10m < 150.0 && currentL < 250);

    if (!stateLight) {
      if (currentL < LIGHT_ON_THRESHOLD || aiDarkDrop) {
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
      if (currentL >= LIGHT_OFF_THRESHOLD || aiSunHigh) {
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
  } else if (snap.light.status == S_FAULT) {
    // FAIL-SAFE (F2): If light sensor faults, follow 12h photoperiod timer (06:00 to 18:00 ON) or OFF (never stuck ON indefinitely)
    struct tm timeinfo;
    if (getLocalTime(&timeinfo, 10) && timeinfo.tm_year > 120) {
      nextLight = (timeinfo.tm_hour >= 6 && timeinfo.tm_hour < 18);
    } else {
      nextLight = false;
    }
  }

  // 6. Dynamic Edge AI Action Label
  if (aiReady) {
    if (isTempValid && aiChannelValid[0] && currentT <= 25.0 && predTemp10m > 25.0) {
      aiAction = "preempt_exhaust_temp";
    } else if (isCo2Valid && aiChannelValid[2] && currentC <= 1000 && predCO2_10m > 1000) {
      aiAction = "preempt_exhaust_co2";
    } else if (isHumValid && aiChannelValid[1] && currentH <= 95.0 && predHum10m > 95.0) {
      aiAction = "preempt_exhaust_hum";
    } else if (isHumValid && aiChannelValid[1] && currentH >= 80.0 && predHum10m < 80.0) {
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
    shieldTftBeforeRelaySwitch();

    bool exhChanged   = (nextExhaust != stateExhaust);
    bool intChanged   = (nextIntake  != stateIntake);
    bool mistChanged  = (nextMister  != stateMister);
    bool lightChanged = (nextLight   != stateLight);

    if (exhChanged) {
      lastFanToggleTime = nowMs;
      fanOnDemandStreak = 0;
      fanOffDemandStreak = 0;
    }
    if (mistChanged) {
      lastMisterToggleTime = nowMs;
      misterOnDemandStreak = 0;
      misterOffDemandStreak = 0;
    }
    if (lightChanged) {
      lastLightToggleTime = nowMs;
      lightLowStreak = 0;
      lightHighStreak = 0;
    }

    stateExhaust = nextExhaust;
    stateIntake  = nextIntake;
    stateMister  = nextMister;
    stateLight   = nextLight;

    // Stagger simultaneous relay switches by 35ms so coil & load inrush currents never stack on the +5V/+12V rail
    if (exhChanged) {
      digitalWrite(PIN_FAN_EXHAUST, stateExhaust ? HIGH : LOW);
      delay(35);
    }
    if (intChanged) {
      digitalWrite(PIN_FAN_INTAKE, stateIntake ? HIGH : LOW);
      delay(35);
    }
    if (mistChanged) {
      digitalWrite(PIN_MISTER, stateMister ? HIGH : LOW);
      delay(35);
    }
    if (lightChanged) {
      digitalWrite(PIN_LIGHT, stateLight ? HIGH : LOW);
    }
    lastActuatorSwitchTime = millis();

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
  if (ESP.getFreeHeap() < 50000) {
    Serial.println("⚠️ [Firebase] Heap low (<50KB), deferring TLS connection...");
    firebaseBackoffUntil = millis() + 6000;
    return false;
  }

  // Verify hotspot actually has fast upstream WAN internet before attempting TLS handshake
  if (!checkWanInternetFast()) {
    slowInternetDetected = true;
    firebaseReady = false;
    isSysOnline = false;
    firebaseBackoffUntil = millis() + 5000;
    return false;
  }

  Serial.println("☁️ [Firebase] Initializing Cloud connection...");
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  config.token_status_callback = tokenStatusCallback;

  // Configure tight non-blocking socket/SSL timeouts
  config.timeout.socketConnection = 1200;  // 1.2s max socket connect timeout
  config.timeout.sslHandshake     = 1800;  // 1.8s max SSL handshake timeout
  config.timeout.serverResponse   = 1200;  // 1.2s max server response timeout
  config.timeout.wifiReconnect    = 1500;

  // Sign up / log in anonymously
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
    firebaseBackoffUntil = millis() + 8000; // Safe backoff: avoids BearSSL memory exhaustion
    return false;
  }

  if (!firebaseBegun) {
    Firebase.begin(&config, &auth);
    Firebase.reconnectNetwork(false); // Handled by Core 0 watchdog to prevent internal hangs
    fbdo.setBSSLBufferSize(4096, 1024);
    Firebase.RTDB.setMaxRetry(&fbdo, 0);      // 0 retries: fail fast on slow/dead hotspots!
    Firebase.RTDB.setMaxErrorQueue(&fbdo, 0);
    firebaseBegun = true;
  }

  // Fetch initial cloud mode and actuator settings if fast
  if (!offlineFailsafeActive && !slowInternetDetected) {
    stableCloudStreak = STABLE_RECOVERY_STREAK - 1; // Allow immediate online on clean boot
  }
  resyncCloudSetpoints(true);
  return firebaseReady && !slowInternetDetected;
}

bool resyncCloudSetpoints(bool forceRestartStream) {
  (void)forceRestartStream;
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
      extractPushTokensFromJson(json);
      String fetchedMode = lastConfiguredAppMode;
      if (json->get(d, "mode")) {
        fetchedMode = normalizeMode(d.to<String>());
        lastConfiguredAppMode = fetchedMode;
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
        if (json->get(d, "devices/exhaust") || json->get(d, "exhaust")) applyActuator("exhaust", d.to<bool>());
        if (json->get(d, "devices/fanOut") || json->get(d, "fanOut")) applyActuator("fanOut", d.to<bool>());
        if (json->get(d, "devices/fanIn") || json->get(d, "fanIn")) applyActuator("fanIn", d.to<bool>());
        if (json->get(d, "devices/intake") || json->get(d, "intake")) applyActuator("intake", d.to<bool>());
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
  if (stateMode != "AUTO") {
    stateMode = "AUTO";
    curTheme = getThemeForMode("AUTO");
    baseDrawn = false;
    lastDisplayRefresh = 0;
  }
  firebaseBackoffUntil = millis() + 2200;
  return false;
}

// ═══════════════════════════════════════════════
//  SETUP (DIRECT TO LIVE DASHBOARD — BOOT SCREEN PERMANENTLY REMOVED)
// ═══════════════════════════════════════════════

void setup() {
  Serial.begin(115200);

  // ── 1. Lock All Actuator Relays LOW Immediately (Zero coil current during 3.3V rail ramp-up) ──
  pinMode(PIN_FAN_EXHAUST, OUTPUT);
  pinMode(PIN_FAN_INTAKE, OUTPUT);
  pinMode(PIN_MISTER, OUTPUT);
  pinMode(PIN_LIGHT, OUTPUT);
  digitalWrite(PIN_FAN_EXHAUST, LOW);
  digitalWrite(PIN_FAN_INTAKE, LOW);
  digitalWrite(PIN_MISTER, LOW);
  digitalWrite(PIN_LIGHT, LOW);

  setCpuFrequencyMhz(160); // 160MHz: Fast cryptography, cool operation
  delay(400);              // Allow 3.3V power rail and capacitors to fully stabilize

  Serial.println("\n\n==================================================");
  Serial.println("  KABUTECH HIYAS ESP32-S3 System Booting...       ");
  Serial.println("==================================================");

  // ── 2. Initialize 3.2" SPI TFT Display FIRST (Guarantees screen is awake and active!) ──
  curTheme = getThemeForMode(stateMode);
  initDisplay();

  // ── 3. Configure Internal Pull-Ups for 10m Aviation Cable ──
  pinMode(I2C_SDA_PIN, INPUT_PULLUP);
  pinMode(I2C_SCL_PIN, INPUT_PULLUP);

  // ── 4. Initialize I2C Bus on GPIO 4 (SDA) and GPIO 5 (SCL) at 50 kHz ──
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  Wire.setClock(I2C_LONG_CABLE_CLOCK); // 50 kHz
  Wire.setTimeOut(I2C_WIRE_TIMEOUT_MS);
  delay(50);

#if USE_TCA9548A
  // Probe for TCA9548A Multiplexer at 0x70
  Wire.beginTransmission(TCA9548A_ADDR);
  if (Wire.endTransmission() == 0) {
    tcaPresent = true;
    Serial.println("✅ [TCA9548A] I2C Multiplexer detected at 0x70! Channel isolation active.");
    tcaDisableAll();
  } else {
    tcaPresent = false;
    Serial.println("ℹ️ [TCA9548A] Not detected at 0x70 — running in direct shared I2C bus mode.");
  }
#endif

  // Initialize SHT3x (Channel 0 on TCA)
  tcaSelect(TCA_CH_SHT31);
  if (sht31.begin(0x44) || sht31.begin(0x45)) {
    Serial.println("✅ SHT3x Temp & Humidity sensor initialized!");
    sht31Ready = true;
    sht31.heater(false);
  } else {
    Serial.println("❌ SHT3x sensor NOT detected.");
  }

  // Initialize BH1750 (Channel 1 on TCA)
  tcaSelect(TCA_CH_LIGHT);
  if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE)) {
    Serial.println("✅ BH1750 Digital Light sensor initialized!");
    bh1750Ready = true;
  } else {
    Serial.println("❌ BH1750 light sensor NOT detected.");
  }

  // Initialize Sensirion SCD41 True NDIR CO₂ (Channel 2 on TCA)
  tcaSelect(TCA_CH_SCD41);
  if (i2cProbeAddress(0x62)) {
    scd4x.begin(Wire, 0x62);
    scd4x.wakeUp();
    delay(20);
    scd4x.stopPeriodicMeasurement();
    delay(500); // Sensirion SCD41 settling
    scd4x.reinit();
    delay(20);
    // Sensirion ASC (Automatic Self-Calibration) must be DISABLED for mushroom cultivation!
    // In a fruiting room CO2 is always elevated (>800 ppm). ASC would mistakenly treat 800 ppm as 400 ppm fresh air and corrupt baseline calibration over long periods!
    scd4x.setAutomaticSelfCalibrationEnabled(0);
    delay(10);
    if (scd4x.startPeriodicMeasurement() == 0) {
      Serial.println("✅ Sensirion SCD41 True NDIR CO₂ sensor initialized (ASC disabled for mushroom room)!");
      scd4xReady = true;
    } else {
      Serial.println("❌ SCD41 CO₂ sensor error starting measurement.");
    }
  } else {
    Serial.println("ℹ️ Sensirion SCD41 CO₂ sensor NOT detected at boot.");
    scd4xReady = false;
#if USE_TCA9548A
    if (tcaPresent) tcaDisableAll();
#endif
  }

  // ── 5. Start Background Wi-Fi Auto-Reconnect (Core 0 handles link in background) ──
  Serial.print("📶 Starting background Wi-Fi connection: ");
  Serial.println(WIFI_SSID);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  // ── 6. Paint Live Dashboard with active theme ──
  baseDrawn = false;
  drawStaticDashboard(stateMode);

  bootTime = millis();

  // ── 7. Launch Dedicated Core 0 Cloud Task (20KB Stack, never blocks Core 1!) ──
  xTaskCreatePinnedToCore(
    cloudTask,
    "CloudTask",
    20480,
    NULL,
    1,
    &cloudTaskHandle,
    0
  );

  Serial.println("🚀 System fully online! Core 1: Live Dashboard | Core 0: Cloud Link...");
}

// ═══════════════════════════════════════════════
//  HARDWARE I2C BUS RECOVERY (10m Aviation Cable & Relay Noise Immunity)
// ═══════════════════════════════════════════════

// Toggles SCL up to 16 times to release a slave holding SDA low, then sends a clean STOP
void recoverI2CBus() {
  static unsigned long lastRecovery = 0;
  unsigned long now = millis();
  if (lastRecovery > 0 && (now - lastRecovery < 3000)) {
    return; // Rate limit recovery to once every 3s
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

#if USE_TCA9548A
  if (tcaPresent) {
    tcaDisableAll();
  }
#endif

  // Mark all devices unready so their drivers re-run .begin() cleanly on the re-opened bus
  sht31Ready  = false;
  bh1750Ready = false;
  scd4xReady  = false;

  Serial.println("✅ [I2C Watchdog] Bus unjammed and Wire re-initialized successfully.");
}

// ═══════════════════════════════════════════════
//  SENSOR READING FUNCTIONS (FULLY DECOUPLED & INDEPENDENT)
// ═══════════════════════════════════════════════

// ── Read SHT3x: Temperature (°C) and Humidity (% RH) ──
SHTReading readSHT3x() {
  SHTReading r;
  r.temperature = -999.0;
  r.humidity    = -999.0;
  r.valid       = false;
  r.reason      = R_NONE;
  unsigned long now = millis();

  if (!tcaSelect(TCA_CH_SHT31)) {
    r.reason = R_BUS;
    return r;
  }

  // Debounced hardware presence probe (3 tries, 2 ms apart): a lone relay-EMI NACK is not "unplugged"
  uint8_t shtAddr = 0x44;
  bool shtPresent = i2cProbeRetry(0x44);
  if (!shtPresent) {
    shtAddr = 0x45;
    shtPresent = i2cProbeRetry(0x45);
  }

  if (!shtPresent) {
    // SHT31 physically unplugged or disconnected: immediately signal unready and invalid
    sht31Ready = false;
#if USE_TCA9548A
    if (tcaPresent) tcaDisableAll();
#endif
    r.reason = R_NOT_PRESENT;
    return r;
  }

  static unsigned long lastShtReinit = 0;
  if (!sht31Ready && (now - lastShtReinit >= 1000)) {
    lastShtReinit = now;
    if (sht31.begin(shtAddr)) {
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
      } else {
        r.reason = R_OUT_OF_RANGE;
      }
    } else {
      r.reason = R_READ_FAIL;
    }
  } else {
    r.reason = R_READ_FAIL;
  }

  static int shtRawMisses = 0;
  if (success) {
    shtRawMisses = 0;
    lastValidTemp = t + TEMP_OFFSET;
    lastValidHum  = constrain(h + HUM_OFFSET, 1.0, 100.0);
    lastSHTSuccessTime = now;
    r.temperature = lastValidTemp;
    r.humidity    = lastValidHum;
    r.valid       = true;
    r.reason      = R_NONE;
    return r;
  }

  // Handle missed read on present sensor (e.g. momentary CRC glitch while sensor is still connected)
  shtRawMisses++;
  if (shtRawMisses >= 6) {
    sht31Ready = false;
    shtRawMisses = 0;
  }

  // Hold previous reading ONLY across momentary noise / relay switching spikes on a connected sensor
  if (lastValidTemp > -50.0 && lastSHTSuccessTime > 0 && (now - lastSHTSuccessTime < SENSOR_HOLD_TIME_MS)) {
    r.temperature = lastValidTemp;
    r.humidity    = lastValidHum;
    r.valid       = true;
    r.reason      = R_NONE;
    return r;
  }

  if (r.reason == R_NONE) r.reason = R_READ_FAIL;
  return r;
}

// ── Read BH1750: Ambient Light (lux) ──
LightReading readBH1750() {
  LightReading r;
  r.lux    = -999;
  r.valid  = false;
  r.reason = R_NONE;
  unsigned long now = millis();

  if (!tcaSelect(TCA_CH_LIGHT)) {
    r.reason = R_BUS;
    return r;
  }

  // Debounced hardware presence probe (3 tries, 2 ms apart): a lone relay-EMI NACK is not "unplugged"
  uint8_t bhAddr = 0x23;
  bool bhPresent = i2cProbeRetry(0x23);
  if (!bhPresent) {
    bhAddr = 0x5C;
    bhPresent = i2cProbeRetry(0x5C);
  }

  if (!bhPresent) {
    bh1750Ready = false;
#if USE_TCA9548A
    if (tcaPresent) tcaDisableAll();
#endif
    r.reason = R_NOT_PRESENT;
    return r;
  }

  static unsigned long lastBhReinit = 0;
  if (!bh1750Ready) {
    if (now - lastBhReinit >= 1000) {
      lastBhReinit = now;
      if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, bhAddr)) {
        bh1750Ready = true;
      }
    }
    if (!bh1750Ready) {
      r.reason = R_READ_FAIL;
      return r;
    }
  }

  float lux = lightMeter.readLightLevel();
  static int bh1750RawMisses = 0;
  if (!isnan(lux) && lux >= 0.0) {
    bh1750RawMisses = 0;
    lastValidLight = (int)constrain(lux, 0.0, 65535.0);
    lastLightSuccessTime = now;
    r.lux    = lastValidLight;
    r.valid  = true;
    r.reason = R_NONE;
  } else {
    bh1750RawMisses++;
    if (bh1750RawMisses >= 6) {
      bh1750Ready = false;
      bh1750RawMisses = 0;
    }
    if (lastValidLight >= 0 && lastLightSuccessTime > 0 && (now - lastLightSuccessTime < SENSOR_HOLD_TIME_MS)) {
      r.lux    = lastValidLight;
      r.valid  = true;
      r.reason = R_NONE;
    } else {
      r.reason = R_READ_FAIL;
    }
  }
  return r;
}

// ── Read SCD41: True NDIR CO₂ (ppm) ──
// Sensirion SCD41 produces an optical photoacoustic sample every 5.0 seconds.

static unsigned long lastRecoveryAttempt = 0;

CO2Reading readSCD41() {
  CO2Reading r;
  r.ppm    = -999;
  r.valid  = false;
  r.reason = R_NONE;
  unsigned long now = millis();
  if (!tcaSelect(TCA_CH_SCD41)) {
    r.reason = R_BUS;
    return r;
  }

  // Debounced hardware presence probe (3 tries, 2 ms apart): a lone relay-EMI NACK is not "unplugged"
  bool scdPresent = i2cProbeRetry(0x62);
  static uint8_t  recStep   = 0;   // Non-blocking recovery state machine (0 = idle)
  static unsigned long recNextAt = 0;
  if (!scdPresent) {
    // Sensor is physically unplugged or disconnected: exit immediately without blocking or resetting bus!
    scd4xReady = false;
    recStep = 0;
#if USE_TCA9548A
    if (tcaPresent) tcaDisableAll();
#endif
    r.reason = R_NOT_PRESENT;
    return r;
  }

  // 1. Safe Auto-Recovery: Restart sensor ONLY if physically present and stalled >30s or uninitialized.
  //    Runs as a state machine advanced one step per read cycle, so the main loop is never stalled
  //    by the external settling delays (wake 20ms, stop 500ms, reinit 20ms, ASC 10ms).
  bool isStalled = (lastCO2SuccessTime > 0 && (now - lastCO2SuccessTime > SCD41_RECOVERY_TIMEOUT)) ||
                   (lastCO2SuccessTime == 0 && !scd4xReady && (now - bootTime > 15000));
  if (recStep == 0 && (!scd4xReady || isStalled) &&
      (lastRecoveryAttempt == 0 || (now - lastRecoveryAttempt >= SCD41_RECOVERY_COOLDOWN))) {
    lastRecoveryAttempt = now;
    recStep   = 1;
    recNextAt = now;
    Serial.println("🔄 [SCD41] Sensor present but unready/stalled. Restarting periodic measurement...");
  }
  if (recStep != 0 && (long)(now - recNextAt) >= 0) {
    switch (recStep) {
      case 1: scd4x.wakeUp();                              recNextAt = now + 20;  recStep = 2; break;
      case 2: scd4xReady = false; scd4x.stopPeriodicMeasurement(); recNextAt = now + 500; recStep = 3; break;
      case 3: scd4x.reinit();                              recNextAt = now + 20;  recStep = 4; break;
      case 4: scd4x.setAutomaticSelfCalibrationEnabled(0); recNextAt = now + 10;  recStep = 5; break; // ASC stays disabled in grow room
      case 5:
        if (scd4x.startPeriodicMeasurement() == 0) {
          scd4xReady = true;
          if (lastCO2SuccessTime > 0) {
            lastCO2SuccessTime = now;
          }
          Serial.println("✅ [SCD41] Successfully restarted periodic measurement (ASC disabled)!");
        } else {
          Serial.println("❌ [SCD41] Failed to restart periodic measurement. Retrying in 10s...");
        }
        recStep = 0;
        break;
    }
  }

  // 2. Check if a new 5-second sample is available (skipped while a recovery is in progress)
  if (scd4xReady && recStep == 0) {
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
        r.ppm    = lastValidCO2;
        r.valid  = true;
        r.reason = R_NONE;
        return r;
      }
    }
  }

  // 3. Keep latest reading active across 5-second sampling cycles (up to 45s)
  if (lastValidCO2 > 0 && lastCO2SuccessTime > 0 && (now - lastCO2SuccessTime < SCD41_HOLD_TIME_MS)) {
    r.ppm    = lastValidCO2;
    r.valid  = true;
    r.reason = R_NONE;
    return r;
  }

  // 4. Initial boot warmup grace period (SCD41 optical measurement requires 10-15s, only if present)
  if (now - bootTime < 15000 && scdPresent) {
    r.ppm    = (lastValidCO2 > 0) ? lastValidCO2 : 500;
    r.valid  = false; // Warming up; enters S_INIT rather than S_FAULT
    r.reason = R_NONE;
    return r;
  }

  r.ppm    = -999;
  r.valid  = false;
  r.reason = isStalled ? R_STALLED : R_READ_FAIL;
  return r;
}

// ═══════════════════════════════════════════════
//  FIREBASE PUSH FUNCTION (RUNS ON CORE 0)
// ═══════════════════════════════════════════════

void pushToFirebase(const SensorSnapshot& snap) {
  if (!Firebase.ready()) {
    Serial.println("   ⏳ Firebase not ready yet...");
    return;
  }

  // Sync cloud setpoints (mode, manual/timed devices, pushTokens) & qualify internet stability
  // over the single shared fbdo keep-alive TLS socket before reporting esp32_status = "online"
  if (!resyncCloudSetpoints(false)) {
    return;
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

  float sendTemp = (snap.temp.status == S_OK)  ? snap.temp.value  : -999.0f;
  float sendHum  = (snap.hum.status == S_OK)   ? snap.hum.value   : -999.0f;
  int   sendLight = (snap.light.status == S_OK) ? (int)snap.light.value : -999;
  int   sendCO2   = (snap.co2.status == S_OK)   ? (int)snap.co2.value   : -999;

  bool tempErr  = (snap.temp.status == S_FAULT);
  bool humErr   = (snap.hum.status == S_FAULT);
  bool lightErr = (snap.light.status == S_FAULT);
  bool co2Err   = (snap.co2.status == S_FAULT);
  bool shtErr   = tempErr || humErr;

  FirebaseJson json;
  json.set("temperature", sendTemp);
  json.set("humidity", sendHum);
  json.set("light", sendLight);
  json.set("co2", sendCO2);
  json.set("esp32_status", "online");
  json.set("chip_temperature", temperatureRead());

  // Error flags (dht_error maintained for mobile app backward-compatibility)
  json.set("dht_error", shtErr);
  json.set("temp_error", tempErr);
  json.set("hum_error", humErr);
  json.set("light_error", lightErr);
  json.set("co2_error", co2Err);

  // Modern structured status & fault reason for the mobile app
  json.set("status_temp", (int)snap.temp.status);
  json.set("status_hum", (int)snap.hum.status);
  json.set("status_light", (int)snap.light.status);
  json.set("status_co2", (int)snap.co2.status);
  json.set("reason_temp", (int)snap.temp.reason);
  json.set("reason_hum", (int)snap.hum.reason);
  json.set("reason_light", (int)snap.light.reason);
  json.set("reason_co2", (int)snap.co2.reason);

  // Live hardware actuator states so the mobile app stays in 100% sync
  json.set("actuator_fans", stateExhaust);
  json.set("actuator_fanIn", stateIntake);
  json.set("actuator_misters", stateMister);
  json.set("actuator_lights", stateLight);
  json.set("mode", stateMode);

  // Edge AI +10 min forecast (Edge Impulse model on the ESP32)
  json.set("ai_ready", aiReady);
  json.set("ai_action", aiAction);
  json.set("ai_pred_temp_10m",  (aiReady && aiChannelValid[0]) ? predTemp10m  : -999.0);
  json.set("ai_pred_hum_10m",   (aiReady && aiChannelValid[1]) ? predHum10m   : -999.0);
  json.set("ai_pred_co2_10m",   (aiReady && aiChannelValid[2]) ? predCO2_10m  : -999.0);
  json.set("ai_pred_light_10m", (aiReady && aiChannelValid[3]) ? predLight10m : -999.0);

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
      if (stateMode != "AUTO") {
        stateMode = "AUTO";
        curTheme = getThemeForMode("AUTO");
        baseDrawn = false;
        lastDisplayRefresh = 0;
      }
      firebaseBackoffUntil = millis() + 2000;
    } else {
      Serial.printf("   ⚠️ [Network Jitter] Transient slow push (%lu ms). WAN still reachable, retrying next cycle...\n", pushDuration);
    }
  }
}

// Backward-compatible overload accepting individual scalar values and boolean error flags
inline void pushToFirebase(float temp, float hum, int light, int co2,
                           bool shtErr, bool lightErr, bool co2Err) {
  SensorSnapshot snap;
  snap.temp.status  = shtErr ? S_FAULT : S_OK;
  snap.temp.reason  = shtErr ? R_NOT_PRESENT : R_NONE;
  snap.temp.value   = temp;
  snap.hum.status   = shtErr ? S_FAULT : S_OK;
  snap.hum.reason   = shtErr ? R_NOT_PRESENT : R_NONE;
  snap.hum.value    = hum;
  snap.light.status = lightErr ? S_FAULT : S_OK;
  snap.light.reason = lightErr ? R_NOT_PRESENT : R_NONE;
  snap.light.value  = (float)light;
  snap.co2.status   = co2Err ? S_FAULT : S_OK;
  snap.co2.reason   = co2Err ? R_NOT_PRESENT : R_NONE;
  snap.co2.value    = (float)co2;
  snap.seq          = 0;
  pushToFirebase(snap);
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
      if (stateMode != "AUTO") {
        stateMode = "AUTO";
        curTheme = getThemeForMode("AUTO");
        baseDrawn = false;
        lastDisplayRefresh = 0;
      }
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

  FirebaseJson historyJson;
  FirebaseJson ts;
  ts.set(".sv", "timestamp");
  historyJson.set("timestamp", ts);

  if (hourlySHTCount > 0) {
    float avgTemp = (float)(hourlyTempSum / hourlySHTCount);
    float avgHum  = (float)(hourlyHumSum / hourlySHTCount);
    historyJson.set("temp", avgTemp);
    historyJson.set("hum", avgHum);
  }
  if (hourlyLightCount > 0) {
    int avgLight = (int)(hourlyLightSum / hourlyLightCount);
    historyJson.set("light", avgLight);
  }
  if (hourlyCO2Count > 0) {
    int avgCO2 = (int)(hourlyCO2Sum / hourlyCO2Count);
    historyJson.set("co2", avgCO2);
  }

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
//  24/7 HARDWARE-TO-PHONE EXPO PUSH NOTIFICATION ENGINE (CORE 0)
//  Fires instant high-priority FCM push notifications for EVERY alert
//  even when the KabuTech mobile app is completely CLOSED or swiped away!
// ═══════════════════════════════════════════════

bool espNotified_TempHigh   = false;
bool espNotified_TempLow    = false;
bool espNotified_HumHigh    = false;
bool espNotified_HumLow     = false;
bool espNotified_Co2High    = false;
bool espNotified_LightHigh  = false;
bool espNotified_LightLow   = false;
// Per-sensor fault notification latches (0 = Temp/Hum, 1 = Light, 2 = CO2) + re-notify cooldown
bool espNotified_SensorFault[3]        = { false, false, false };
unsigned long espLastSensorFaultPush[3] = { 0, 0, 0 };
#define SENSOR_FAULT_RENOTIFY_MS 600000UL  // 10 min: a flapping cable can notify at most once per window

void sendExpoPushFromEsp32(const char* alertId, const char* title, const char* body) {
  if (pushTokenCount <= 0 || !isSysOnline || slowInternetDetected || WiFi.status() != WL_CONNECTED) return;
  if (ESP.getFreeHeap() < 55000) return; // Guard against TLS heap exhaustion

  WiFiClientSecure client;
  client.setInsecure(); // Fast TLS handshake to exp.host without CA bundle overhead
  client.setTimeout(4000);

  HTTPClient https;
  https.setConnectTimeout(3000);
  https.setTimeout(4000);

  if (https.begin(client, "https://exp.host/--/api/v2/push/send")) {
    https.addHeader("Accept", "application/json");
    https.addHeader("Content-Type", "application/json");

    String payload = "[";
    for (int i = 0; i < pushTokenCount; i++) {
      if (i > 0) payload += ",";
      payload += "{\"to\":\"" + registeredPushTokens[i] + "\",";
      payload += "\"sound\":\"default\",";
      payload += "\"priority\":\"high\",";
      payload += "\"channelId\":\"kabutech-alerts\",";
      payload += "\"title\":\"" + String(title) + "\",";
      payload += "\"body\":\"" + String(body) + "\",";
      payload += "\"_displayInForeground\":true,";
      payload += "\"data\":{\"alertId\":\"" + String(alertId) + "\",\"source\":\"esp32\"}}";
    }
    payload += "]";

    int httpCode = https.POST(payload);
    Serial.printf("   🔔 [24/7 Cloud Push] Dispatched '%s' (%s) to %d phone(s) -> HTTP %d\n",
                  title, body, pushTokenCount, httpCode);
    https.end();
  }
}

void evaluateAndDispatchEsp32PushAlerts(const SensorSnapshot& snap) {
  // Wait 10s after boot for initial sensor warmup & first Push Token sync
  if (millis() < 10000 || pushTokenCount <= 0 || !isSysOnline || slowInternetDetected) return;

  char bodyBuf[64];

  // 1. Temperature Alerts (Optimal: 18 - 25 °C)
  if (snap.temp.status == S_OK) {
    float temp = snap.temp.value;
    if (temp > 25.0) {
      if (!espNotified_TempHigh) {
        espNotified_TempHigh = true;
        bool isCrit = (temp > 27.0);
        snprintf(bodyBuf, sizeof(bodyBuf), "%.1f°C (Target: 18 - 25 °C)", temp);
        sendExpoPushFromEsp32(
          isCrit ? "temp-critical-high" : "temp-high",
          isCrit ? "Critically High Temp" : "Temperature Above Crop Range",
          bodyBuf
        );
      }
    } else {
      espNotified_TempHigh = false; // Re-arm immediately when normal
    }

    if (temp < 18.0) {
      if (!espNotified_TempLow) {
        espNotified_TempLow = true;
        bool isCrit = (temp < 16.0);
        snprintf(bodyBuf, sizeof(bodyBuf), "%.1f°C (Target: 18 - 25 °C)", temp);
        sendExpoPushFromEsp32(
          isCrit ? "temp-critical-low" : "temp-low",
          isCrit ? "Critically Low Temp" : "Temperature Below Crop Range",
          bodyBuf
        );
      }
    } else {
      espNotified_TempLow = false; // Re-arm immediately when normal
    }
  }

  // 2. Humidity Alerts (Optimal: 80 - 95 %)
  if (snap.hum.status == S_OK) {
    float hum = snap.hum.value;
    if (hum > 95.0) {
      if (!espNotified_HumHigh) {
        espNotified_HumHigh = true;
        bool isCrit = (hum >= 100.0);
        snprintf(bodyBuf, sizeof(bodyBuf), "%d%% (Target: 80 - 95 %%)", (int)round(hum));
        sendExpoPushFromEsp32(
          isCrit ? "hum-critical-high" : "hum-high",
          isCrit ? "Excessive Humidity Alert" : "Humidity Above Crop Range",
          bodyBuf
        );
      }
    } else {
      espNotified_HumHigh = false;
    }

    if (hum < 80.0) {
      if (!espNotified_HumLow) {
        espNotified_HumLow = true;
        bool isCrit = (hum < 75.0);
        snprintf(bodyBuf, sizeof(bodyBuf), "%d%% (Target: 80 - 95 %%)", (int)round(hum));
        sendExpoPushFromEsp32(
          isCrit ? "hum-critical-low" : "hum-low",
          isCrit ? "Critically Low Humidity" : "Humidity Below Crop Range",
          bodyBuf
        );
      }
    } else {
      espNotified_HumLow = false;
    }
  }

  // 3. CO2 Alerts (Optimal: < 1000 ppm)
  if (snap.co2.status == S_OK) {
    int co2 = (int)snap.co2.value;
    if (co2 > 1000) {
      if (!espNotified_Co2High) {
        espNotified_Co2High = true;
        bool isCrit = (co2 > 1150);
        snprintf(bodyBuf, sizeof(bodyBuf), "%d ppm (Target: < 1000 ppm)", co2);
        sendExpoPushFromEsp32(
          isCrit ? "co2-critical" : "co2-elevated",
          isCrit ? "Critically High CO2" : "CO2 Above Crop Range",
          bodyBuf
        );
      }
    } else {
      espNotified_Co2High = false;
    }
  }

  // 4. Light Alerts (Optimal: 150 - 1000 lx)
  if (snap.light.status == S_OK) {
    int light = (int)snap.light.value;
    if (light > 1000) {
      if (!espNotified_LightHigh) {
        espNotified_LightHigh = true;
        snprintf(bodyBuf, sizeof(bodyBuf), "%d lx (Target: 150 - 1000 lx)", light);
        sendExpoPushFromEsp32("light-high", "Light Above Crop Range", bodyBuf);
      }
    } else {
      espNotified_LightHigh = false;
    }

    if (light < 150) {
      if (!espNotified_LightLow) {
        espNotified_LightLow = true;
        snprintf(bodyBuf, sizeof(bodyBuf), "%d lx (Target: 150 - 1000 lx)", light);
        sendExpoPushFromEsp32("light-low", "Light Below Crop Range", bodyBuf);
      }
    } else {
      espNotified_LightLow = false;
    }
  }

  // 5. Sensor Hardware Fault Alert (after 15s boot grace) — evaluated PER SENSOR so a later fault on a
  //    second sensor is never masked by an earlier one, and a recovered sensor re-arms independently.
  if (millis() > 15000) {
    const bool faults[3]      = { (snap.temp.status == S_FAULT || snap.hum.status == S_FAULT),
                                  (snap.light.status == S_FAULT),
                                  (snap.co2.status == S_FAULT) };
    const char* sensorName[3] = { "Temp/Hum", "Light", "CO2" };
    for (int i = 0; i < 3; i++) {
      if (faults[i]) {
        bool cooledDown = (espLastSensorFaultPush[i] == 0) ||
                          (millis() - espLastSensorFaultPush[i] >= SENSOR_FAULT_RENOTIFY_MS);
        if (!espNotified_SensorFault[i] && cooledDown) {
          espNotified_SensorFault[i] = true;
          espLastSensorFaultPush[i]  = millis();
          snprintf(bodyBuf, sizeof(bodyBuf), "%s sensor not responding (Target: Nominal)", sensorName[i]);
          sendExpoPushFromEsp32("sensor-disconnected", "Sensor Fault", bodyBuf);
        }
      } else {
        if (espNotified_SensorFault[i]) {
          snprintf(bodyBuf, sizeof(bodyBuf), "%s sensor restored (Readings Nominal)", sensorName[i]);
          sendExpoPushFromEsp32("sensor-restored", "Sensor Restored", bodyBuf);
        }
        espNotified_SensorFault[i] = false; // sensor recovered -> re-arm (cooldown still applies)
      }
    }
  }
}

inline void evaluateAndDispatchEsp32PushAlerts() {
  evaluateAndDispatchEsp32PushAlerts(getSensorSnapshot());
}

// ═══════════════════════════════════════════════
//  DEDICATED CORE 0 CLOUD & NETWORK TASK
//  Guarantees Core 1 (Sensors, Edge AI, TFT) NEVER hangs!
// ═══════════════════════════════════════════════

void cloudTask(void *pvParameters) {
  bool wasWifiConnected = (WiFi.status() == WL_CONNECTED);
  unsigned long lastWifiReconnectAttempt = 0;
  unsigned long lastFirebaseInitRetry = 0;

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
        if (stateMode != "AUTO") {
          stateMode = "AUTO";
          curTheme = getThemeForMode("AUTO");
          baseDrawn = false;
          lastDisplayRefresh = 0;
        }
        Serial.println("📶 [Core 0] Wi-Fi disconnected -> Operating locally in AI AUTO.");
      }
      // Actively probe & re-scan Wi-Fi every 4s so re-opened mobile hotspots associate immediately!
      if (now - lastWifiReconnectAttempt >= 4000) {
        lastWifiReconnectAttempt = now;
        Serial.println("🔄 [Core 0] Hotspot re-opened or disconnected: Scanning & connecting to Wi-Fi...");
        WiFi.disconnect();
        WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      }

      vTaskDelay(pdMS_TO_TICKS(200));
      continue;
    }

    // 2. Wi-Fi Just Associated (Verify Hotspot Actually Has Stable WAN Internet!)
    if (isNetConnected && !wasWifiConnected) {
      wasWifiConnected = true;
      lastWifiReconnectTime = now;
      stableCloudStreak = 0; // Require full stability qualification streak after Wi-Fi reconnect
      WiFi.setSleep(false);
      Serial.println("🌐 [Core 0] Wi-Fi associated! Probing Hotspot WAN internet stability...");

      // Configure LwIP SNTP daemon ONCE (calling configTime repeatedly crashes ESP32 LwIP SNTP!)
      if (!ntpConfigured) {
        configTime(8 * 3600, 0, "time.google.com", "time.cloudflare.com", "pool.ntp.org");
        setenv("TZ", "PST-8", 1);
        tzset();
        ntpConfigured = true;
      }

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
        if (stateMode != "AUTO") {
          stateMode = "AUTO";
          curTheme = getThemeForMode("AUTO");
          baseDrawn = false;
          lastDisplayRefresh = 0;
        }
        firebaseBackoffUntil = millis() + 2000;
      }
    }

    // 3. Retry Firebase Init if not yet initialized
    if (!firebaseInitialized && (long)(now - firebaseBackoffUntil) >= 0 && (now - lastFirebaseInitRetry >= 4000)) {
      lastFirebaseInitRetry = now;
      initFirebaseCloud();
    }

    // 4. Push Live Sensor & Actuator Telemetry every 2s (and qualify internet stability via single fbdo session)
    if (firebaseInitialized && (long)(now - firebaseBackoffUntil) >= 0 && (now - lastFirebasePush >= FIREBASE_PUSH_INTERVAL)) {
      lastFirebasePush = now;
      SensorSnapshot snap = getSensorSnapshot();
      pushToFirebase(snap);

      // Dispatch 24/7 high-priority remote push notifications for every active alert (fires even when app is closed)
      evaluateAndDispatchEsp32PushAlerts(snap);

      if (snap.temp.status == S_OK && snap.hum.status == S_OK) {
        hourlyTempSum += snap.temp.value;
        hourlyHumSum  += snap.hum.value;
        hourlySHTCount++;
      }
      if (snap.light.status == S_OK) {
        hourlyLightSum += snap.light.value;
        hourlyLightCount++;
      }
      if (snap.co2.status == S_OK) {
        hourlyCO2Sum += snap.co2.value;
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
    } else {
      // Offline: Prevent accumulators from growing indefinitely over long multi-day offline periods
      if (now - lastHourlyPush >= HOURLY_PUSH_INTERVAL && lastHourlyPush > 0) {
        lastHourlyPush = now;
        hourlyTempSum = 0.0;
        hourlyHumSum  = 0.0;
        hourlyLightSum = 0.0;
        hourlyCO2Sum  = 0.0;
        hourlySHTCount = 0;
        hourlyLightCount = 0;
        hourlyCO2Count = 0;
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

  // ── Network Liveness & Online/Local Indicator ──
  if (!isSysOnline) {
    if (stateMode != "AUTO") {
      stateMode = "AUTO";
      curTheme = getThemeForMode("AUTO");
      baseDrawn = false;
      lastDisplayRefresh = 0;
      Serial.println("⚡ [LOCAL Failsafe] Offline/Local detected: Instant switch to AI AUTO mode & Forest Green theme!");
    }
    if (!offlineFailsafeActive) {
      offlineFailsafeActive = true;
      needsCloudResync = true;
    }
  } else if (offlineFailsafeActive) {
    offlineFailsafeActive = false;
  }

  // ── Read sensors and print to Serial Monitor every 1s ──
  if (now - lastSerialPrint >= SERIAL_PRINT_INTERVAL) {
    lastSerialPrint = now;

    // Keep the TCA9548A multiplexer state honest (re-detect after a reset / replug)
    tcaMaintain();

    // Write ordering note (Core 0 reads these without a lock): on LATCH set the flag first, on CLEAR
    // publish the value first, so a push can never observe "no error" together with a -999 value.

    // 1. Read SHT3x
    SHTReading shtData = readSHT3x();

    // 2. Read BH1750 (5ms I2C bus settling delay)
    delay(5);
    LightReading lightData = readBH1750();

    // 3. Read SCD41 (5ms I2C bus settling delay)
    delay(5);
    CO2Reading co2Data = readSCD41();

    // ── Update Single-Source-of-Truth Sensor Snapshot under SMP spinlock ──
    portENTER_CRITICAL(&sensorStateMux);
    updateSensorChannel(g_sensorSnapshot.temp,  shtData.valid,   shtData.temperature, shtData.reason,   STREAK_TO_LATCH_FAULT, STREAK_TO_CLEAR_FAULT, now, 0, 15000);
    updateSensorChannel(g_sensorSnapshot.hum,   shtData.valid,   shtData.humidity,    shtData.reason,   STREAK_TO_LATCH_FAULT, STREAK_TO_CLEAR_FAULT, now, 0, 15000);
    updateSensorChannel(g_sensorSnapshot.light, lightData.valid, (float)lightData.lux,lightData.reason, STREAK_TO_LATCH_FAULT, STREAK_TO_CLEAR_FAULT, now, 0, 15000);
    updateSensorChannel(g_sensorSnapshot.co2,   co2Data.valid,   (float)co2Data.ppm,  co2Data.reason,   STREAK_TO_LATCH_FAULT, STREAK_TO_CLEAR_FAULT, now, 0, 15000);
    g_sensorSnapshot.seq++;

    // Mirror to legacy globals for backward compatibility and logging
    currentTemp  = (g_sensorSnapshot.temp.status == S_OK)  ? g_sensorSnapshot.temp.value  : -999.0f;
    currentHum   = (g_sensorSnapshot.hum.status == S_OK)   ? g_sensorSnapshot.hum.value   : -999.0f;
    currentLight = (g_sensorSnapshot.light.status == S_OK) ? (int)g_sensorSnapshot.light.value : -999;
    currentCO2   = (g_sensorSnapshot.co2.status == S_OK)   ? (int)g_sensorSnapshot.co2.value   : -999;
    shtFault     = (g_sensorSnapshot.temp.status == S_FAULT || g_sensorSnapshot.hum.status == S_FAULT);
    lightFault   = (g_sensorSnapshot.light.status == S_FAULT);
    co2Fault     = (g_sensorSnapshot.co2.status == S_FAULT);
    portEXIT_CRITICAL(&sensorStateMux);

    // Proactive bus health check: Recover I2C ONLY if ALL sensors fail concurrently for 6 consecutive cycles
    // (Protects working sensors so one missing sensor never triggers false bus recovery or disrupts others)
    static int allSensorsFailStreak = 0;
    if (!shtData.valid && !lightData.valid && !co2Data.valid) {
      allSensorsFailStreak++;
      if (allSensorsFailStreak >= 6) {
        Serial.println("⚡ [I2C Watchdog] All sensors unresponsive for 6s (bus lockup). Recovering I2C bus...");
        recoverI2CBus();
        allSensorsFailStreak = 0;
      }
    } else {
      allSensorsFailStreak = 0;
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

  // ── Relay EMI Quiet Window & Self-Healing 3.2" TFT Dashboard Refresh ──
  unsigned long sinceRelaySwitch = (lastActuatorSwitchTime > 0) ? (now - lastActuatorSwitchTime) : 999999UL;
  if (sinceRelaySwitch < RELAY_EMI_QUIET_MS) {
    // Hold TFT SPI bus deselected (CS HIGH, RST HIGH, LED HIGH) while relay contacts bounce & Grow Light inrush settles
    digitalWrite(TFT_CS_PIN,  HIGH);
    digitalWrite(TFT_RST_PIN, HIGH);
    digitalWrite(TFT_LED_PIN, HIGH);
  } else {
    // 1. Primary post-actuation heal at +120ms: restores ILI9341 registers & repaints full screen after relay surge
    if (tftNeedsPrimaryHeal && sinceRelaySwitch >= RELAY_EMI_QUIET_MS) {
      tftNeedsPrimaryHeal = false;
      tftSpiBusy = true;
      healTftDisplay(stateMode);
      drawDashboard(getSensorSnapshot(),
                    stateExhaust, stateIntake, stateMister, stateLight,
                    stateMode, isSysOnline, isSysOnline && firebaseReady,
                    aiReady, aiAction);
      tftSpiBusy = false;
      lastDisplayRefresh = millis();
    }
    // 2. Secondary follow-up heal at +600ms: catches delayed LED driver / power supply turn-on transients
    else if (tftNeedsSecondaryHeal && sinceRelaySwitch >= 600) {
      tftNeedsSecondaryHeal = false;
      tftSpiBusy = true;
      healTftDisplay(stateMode);
      drawDashboard(getSensorSnapshot(),
                    stateExhaust, stateIntake, stateMister, stateLight,
                    stateMode, isSysOnline, isSysOnline && firebaseReady,
                    aiReady, aiAction);
      tftSpiBusy = false;
      lastDisplayRefresh = millis();
    }
    // 3. Normal 500ms non-blocking dashboard refresh
    else if (now - lastDisplayRefresh >= DISPLAY_REFRESH_INTERVAL) {
      lastDisplayRefresh = now;
      tftSpiBusy = true;
      drawDashboard(getSensorSnapshot(),
                    stateExhaust, stateIntake, stateMister, stateLight,
                    stateMode, isSysOnline, isSysOnline && firebaseReady,
                    aiReady, aiAction);
      tftSpiBusy = false;
    }
  }

  delay(15);
}
