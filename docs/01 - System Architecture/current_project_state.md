# 📊 Current Overall State of Kabutech Hiyas Project

> **Project Name:** Kabutech Hiyas — Intelligent Cultivation Chamber for *Pleurotus ostreatus* (Oyster Mushroom)  
> **Repository:** `kabutech-hiyas-main`  
> **Last Comprehensive Audit:** October 2026  
> **Ecosystem Status:** **Active Prototyping & Operational Validation**

---

## 🧭 Executive State Summary

The **Kabutech Hiyas** ecosystem is currently in an advanced working state spanning four synchronized subsystems:
1. **Embedded Firmware (ESP32-S3)**: Fully functional, running high-precision digital sensing (SHT31-D, BH1750, SCD41 True NDIR), on-device TinyML predictive forecasting (+10 min pre-emptive actuation), LovyanGFX color TFT dashboard (ILI9341), single-session TLS cloud sync, and an autonomous offline hysteresis climate regulator.
2. **Mobile Application (KabutechNative)**: Complete React Native 0.76+ / Expo SDK 52 app with full offline-first resilience, dual Role-Based Access Control (Admin/Owner vs. Farm Staff), 20+ specialized screens, 12 interactive modal dialogs, audio/haptic feedback, push alerts, and harvest tracking.
3. **Edge AI / TinyML Subsystem**: Quantized INT8 regression forecaster integrated directly into C++ firmware (`edge_forecast.h`), accompanied by synthetic dataset generators and failure anomaly models (`tinyml/`).
4. **Hardware & Industrial Schematics**: Complete electrical schematics (SVG/PDF), GX16 keyed aviation connector maps, IP65 dual-zone enclosure blueprints, and a ₱15,000 itemized Bill of Materials (BOM) with Shopee/Lazada sourcing.

---

## 🗺️ Subsystem State Matrix

| Subsystem | Primary Tech Stack | Location | Status | Key Highlights |
| :--- | :--- | :--- | :---: | :--- |
| **Firmware** | C++ / Arduino / FreeRTOS / LovyanGFX | [firmware/kabutech_prototype/](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/firmware/kabutech_prototype) | 🟢 **ACTIVE** | Core 0 unified TLS, debounced sensor state machine, 2s RTDB telemetry push, 4MHz SPI TFT, pre-emptive fan/mister control. |
| **Mobile App** | React Native 0.76 / Expo SDK 52 / TypeScript | [KabutechNative/](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/KabutechNative) | 🟢 **ACTIVE** | RBAC navigation, offline cache engine, batch/rack/bag tracking, daily harvest logging, task delegation, staff activity reports. |
| **Edge AI (TinyML)** | Python 3 / TensorFlow / TFLite Micro | [tinyml/](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/tinyml) | 🟢 **VALIDATED** | +10m climate drift model (>65% MAE improvement over baseline), CSV anomaly datasets, real-time ESP32 C++ inference. |
| **Cloud Backend** | Google Firebase RTDB & Auth | Cloud (`asia-southeast1`) | 🟢 **ACTIVE** | Real-time bi-directional telemetry `/kabutech/sensors/live`, setpoints, device schedules, user profiles, alert logs. |
| **Hardware Enclosure** | IP65 Sealed Box + Hanging Probe | [firmware/assets/](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/firmware/assets) | 🟡 **IN PROGRESS** | Pure schematics finalized, radiation shield probe prototyped, breadboard-to-enclosure wiring guide ready. |

---

## ⚡ Active Breadboard Prototype Pin Configuration

Currently running on the ESP32-S3 DevKit (`N16R8`):

### 1. Digital Sensor Bus (Shared I2C at 3.3V)
* **GPIO 4**: `SDA` (SHT31-D, BH1750, SCD41)
* **GPIO 5**: `SCL` (I2C Clock configured at 50 kHz for long cable noise margin)

### 2. Prototype Actuators (Active HIGH LEDs / Transistor Relays)
* **GPIO 9**: Air In (Intake Fan)
* **GPIO 11**: Mister / Ultrasonic Fogger + Solenoid Water Valve
* **GPIO 12**: Fruiting Grow Lights (White/Blue spectrum)
* **GPIO 13**: Air Out (Exhaust Fan / CO₂ Purge)

### 3. SPI Color TFT Display (3.2" ILI9341 240×320)
* **GPIO 10**: `CS` (Chip Select)
* **GPIO 15**: `DC` (Data / Command)
* **GPIO 6**: `RST` (Hardware Reset)
* **GPIO 17**: `SDI / MOSI` (SPI Data)
* **GPIO 18**: `SCK` (SPI Clock at 4 MHz)
* **GPIO 2**: `LED` (Backlight PWM / Power)

### 4. Active Sensor Offsets
* `TEMP_OFFSET`: `-10.0 °C` (Compensates for ESP32 and breadboard self-heating)
* `HUM_OFFSET`: `+15.0 % RH` (Calibration adjustment for ambient probe enclosure)

---

## 📱 Mobile App (KabutechNative) Feature Inventory

### Core Navigation Architecture
The app switches navigation dynamically based on authenticated user roles:
* **Admin / Farm Manager (`MainTabNavigator`)**:
  - `HomeScreen`: Chamber status hero score, live environmental dials ([RangeGauge](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/KabutechNative/src/components/RangeGauge.tsx)), water reservoir monitor, quick controls, and interactive welcome HUD.
  - `ControlsScreen`: Auto / Manual / Scheduled / Timed modes; individual actuator switches with safety interlocks.
  - `DeviceSchedulesScreen`: Configurable misting, ventilation, and lighting timer windows.
  - `AnalyticsScreen`: 24-hour, 7-day, and 30-day interactive telemetry charts with target zone overlays.
  - `AlertsScreen`: Severity-categorized alerts (Critical, Warning, Info) with step-by-step resolution playbooks.
  - `ManageCropScreen`: Batch lifecycle management, rack/shelf visualizer, and bag health tracking (`Active`, `Empty`, `Contaminated`).
  - `YieldScreen`: Flush recording, daily harvest logs, biological efficiency calculations, and CSV export.
  - `StaffApprovalsScreen`: One-click approval/rejection queue for new staff registrations.
  - `StaffReportsInboxScreen`: Review and annotate staff activity logs submitted from the grow house floor.
  - `AssignTaskScreen` & `StaffTaskHistoryScreen`: Dispatch sanitation, harvest, or inspection tasks with due dates.
  - `ProfileScreen`: Role credentials, account settings, sound/haptic toggles, and high-contrast dark theme.
* **Staff Member (`StaffTabNavigator`)**:
  - `StaffHomeScreen`: Simplified floor view displaying current chamber readiness and emergency alerts.
  - `MyTasksScreen`: Personal assigned task checklist with status updates and on-time completion tracking.
  - `ActivityLogScreen` & `MyActivityHistoryScreen`: Form to log daily actions (harvesting, watering, spore cleaning, maintenance).
  - `StaffCropScreen`: Floor crop overview with rapid contamination flagging.
  - `StaffYieldScreen`: Mobile harvest logger (`LogHarvestModal`) for recording bag yields immediately upon cutting.
  - `StaffProfileScreen`: Worker badge, contact info, and profile preferences.

### System Utilities & Services
* **Offline Engine**: Transparent fallback to `AsyncStorage` when internet drops; automatic reconnection queueing.
* **Audio & Haptics**: [SoundManager.ts](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/KabutechNative/src/utils/SoundManager.ts) and [haptics.ts](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/KabutechNative/src/utils/haptics.ts) for tactile and acoustic operational confirmation.
* **Notifications**: [PushNotifications.ts](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/KabutechNative/src/utils/PushNotifications.ts) sending critical chamber drift alerts to Android/iOS devices.

---

## 🧠 Edge AI Forecaster Status

* **Model File**: [edge_forecast.h](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/firmware/kabutech_prototype/edge_forecast.h)
* **Architecture**: Quantized Fully-Connected Neural Network (80 inputs → 64 hidden → 32 hidden → 4 outputs).
* **Input**: 20 historical time steps (10 minutes total @ 30s sample rate) for Temp, Hum, CO₂, Light.
* **Inference Frequency**: Every 30 seconds on ESP32-S3 Core 1.
* **Pre-emptive Rules**:
  - If forecasted temperature in 10 minutes exceeds upper boundary (>26.0°C), trigger exhaust ventilation early.
  - If forecasted CO₂ exceeds 1,000 ppm, initiate fresh air intake purge prior to canopy gas buildup.

---

## 🗄️ Database & Cloud Status

* **Provider**: Google Firebase Realtime Database (`kabutech-hiyas-default-rtdb.asia-southeast1.firebasedatabase.app`)
* **Telemtry Sync**: 2,000 ms cadence with network watchdog fail-fast timeout (3,000 ms).
* **History Retention**: Hourly aggregates logged under `/kabutech/sensors/history/{YYYY-MM-DD}/{HH}` with automatic 30-day retention cleanup running on the MCU.
* **Heartbeat**: 15-second online ping maintaining `/kabutech/sensors/live/esp32_status`.

---

## 📌 Next Action Items & Thesis Milestones

1. **Physical Enclosure Assembly**:
   - Transfer breadboard wiring to screw terminals inside the IP65 enclosure.
   - Solder GX16 aviation connector pigtails according to [[schematics_and_pinouts|Schematics & Pinouts]].
2. **Radiation Shield Probe Build**:
   - Mount SHT31, BH1750, and SCD41 on the central perfboard strip inside the mini multi-plate shield.
3. **Mushroom Flush Validation (Phase 5)**:
   - Deploy system inside actual Oyster Mushroom grow space (*P. ostreatus*).
   - Compare harvest yield and biological efficiency against non-automated control chambers.

---
*Return to [[index|Master Knowledge Vault]]*

