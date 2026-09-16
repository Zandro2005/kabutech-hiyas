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
#define WIFI_SSID       "Abad_Fam"
#define WIFI_PASSWORD   "Connecting123"

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

#define SENSOR_INTERVAL     5000    // Read sensors every 5 seconds
#define HEARTBEAT_INTERVAL  30000   // Send "online" heartbeat every 30 seconds
#define MQ135_WARMUP_MS     30000   // MQ-135 warm-up time (30s for prototype, 3min ideally)

// ═══════════════════════════════════════════════
//  WATER LEVEL CALIBRATION
//  Dip sensor in water and note the ADC reading → WATER_WET_VALUE
//  Hold sensor in air and note the ADC reading   → WATER_DRY_VALUE
// ═══════════════════════════════════════════════

#define WATER_DRY_VALUE     0       // ADC reading when sensor is completely dry
#define WATER_WET_VALUE     2800    // ADC reading when sensor is fully submerged
                                    // ↑ Calibrate these with YOUR sensor!

// ═══════════════════════════════════════════════
//  GLOBAL OBJECTS
// ═══════════════════════════════════════════════

DHT dht(DHT_PIN, DHT_TYPE);

FirebaseData fbdo;
FirebaseData streamDO; // For listening to actuator changes
FirebaseAuth auth;
FirebaseConfig config;

unsigned long lastSensorRead  = 0;
unsigned long lastHeartbeat   = 0;
unsigned long bootTime        = 0;
bool firebaseReady            = false;
bool mq135WarmedUp            = false;

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
//  SENSOR READING FUNCTIONS
// ═══════════════════════════════════════════════

// ── Read DHT11: Temperature (°C) and Humidity (%) ──
struct DHTReading {
  float temperature;
  float humidity;
  bool valid;
};

// Manually declare prototype to fix Arduino IDE preprocessor bug
DHTReading readDHT();

DHTReading readDHT() {
  DHTReading r;
  r.humidity = dht.readHumidity();
  r.temperature = dht.readTemperature();  // Celsius

  if (isnan(r.humidity) || isnan(r.temperature)) {
    r.valid = false;
    Serial.println("   ⚠️  DHT11 read failed! Check wiring.");
  } else {
    r.valid = true;
  }
  return r;
}

// ── Read LDR: Light Level (estimated lux) ──
int readLight() {
  int raw = analogRead(LDR_PIN);
  // LDR in voltage divider: high ADC = bright, low ADC = dark
  // Map to approximate lux range (0–1000 for mushroom growing)
  int lux = map(raw, 0, 4095, 0, 1000);
  return constrain(lux, 0, 1000);
}

// ── Read MQ-135: CO₂ estimate (ppm) ──
int readCO2() {
  if (!mq135WarmedUp) {
    return 400;  // Return baseline until warmed up
  }
  int raw = analogRead(MQ135_PIN);
  // Rough linear mapping for prototype
  // Clean air ≈ 400ppm, high pollution ≈ 2000ppm
  // Calibrate by comparing with known CO₂ meter if available
  int ppm = map(raw, 0, 4095, 400, 2000);
  return constrain(ppm, 300, 3000);
}

// ── Read Water Level Sensor: Percentage (0–100%) ──
int readWaterLevel() {
  // Power ON the sensor briefly to prevent electrode corrosion
  digitalWrite(WATER_PWR_PIN, HIGH);
  delay(100);  // Let it stabilize

  int raw = analogRead(WATER_SIG_PIN);

  // Power OFF immediately
  digitalWrite(WATER_PWR_PIN, LOW);

  // Map raw ADC to percentage using calibration values
  int percent = map(raw, WATER_DRY_VALUE, WATER_WET_VALUE, 0, 100);
  return constrain(percent, 0, 100);
}

// ═══════════════════════════════════════════════
//  FIREBASE PUSH FUNCTION
// ═══════════════════════════════════════════════

void pushToFirebase(float temp, float hum, int light, int co2, int waterLevel) {
  if (!Firebase.ready()) {
    Serial.println("   ⏳ Firebase not ready yet...");
    return;
  }

  // Build a JSON object with all sensor values
  FirebaseJson json;
  json.set("temperature", temp);
  json.set("humidity", hum);
  json.set("light", light);
  json.set("co2", co2);
  json.set("waterLevel", waterLevel);
  json.set("esp32_status", "online");

  // Push all values at once (atomic update)
  if (Firebase.RTDB.updateNode(&fbdo, "/kabutech/sensors/live", &json)) {
    Serial.println("   ☁️  Firebase updated ✓");
  } else {
    Serial.print("   ❌ Firebase error: ");
    Serial.println(fbdo.errorReason().c_str());
  }
}

// ═══════════════════════════════════════════════
//  HEARTBEAT — keep esp32_status "online"
// ═══════════════════════════════════════════════

void sendHeartbeat() {
  if (!Firebase.ready()) return;

  if (Firebase.RTDB.setString(&fbdo, "/kabutech/sensors/live/esp32_status", "online")) {
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
    Serial.println("✅ MQ-135 warm-up complete! CO₂ readings are now active.");
    Serial.println("────────────────────────────────────────");
  }

  // ── Read sensors at interval ──
  if (now - lastSensorRead >= SENSOR_INTERVAL) {
    lastSensorRead = now;

    // Read all sensors
    DHTReading dhtData = readDHT();
    int light      = readLight();
    int co2        = readCO2();
    int waterLevel = readWaterLevel();

    float temp = dhtData.valid ? dhtData.temperature : -1;
    float hum  = dhtData.valid ? dhtData.humidity    : -1;

    // ── Print to Serial Monitor ──
    Serial.println("📊 ── Sensor Readings ──────────────────");
    
    if (dhtData.valid) {
      Serial.print("   🌡️  Temperature:  ");
      Serial.print(temp, 1);
      Serial.println(" °C");

      Serial.print("   💧 Humidity:      ");
      Serial.print(hum, 1);
      Serial.println(" %");
    } else {
      Serial.println("   🌡️  Temperature:  ERROR");
      Serial.println("   💧 Humidity:      ERROR");
    }

    Serial.print("   ☀️  Light Level:   ");
    Serial.print(light);
    Serial.println(" lux (est.)");

    Serial.print("   🌬️  CO₂ Level:     ");
    Serial.print(co2);
    Serial.print(" ppm");
    if (!mq135WarmedUp) Serial.print(" (warming up...)");
    Serial.println();

    Serial.print("   🫧 Water Level:   ");
    Serial.print(waterLevel);
    Serial.println(" %");

    Serial.println("────────────────────────────────────────");

    // ── Push to Firebase ──
    if (dhtData.valid && WiFi.status() == WL_CONNECTED) {
      pushToFirebase(temp, hum, light, co2, waterLevel);
    }
  }

  // ── Heartbeat at interval ──
  if (now - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    lastHeartbeat = now;
    sendHeartbeat();
  }

  // Small delay to prevent watchdog reset
  delay(10);
}
