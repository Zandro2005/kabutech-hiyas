# 🍄 Kabutech Hiyas — Master Knowledge Vault

Welcome to the complete knowledge base, technical documentation, and thesis repository for **Kabutech Hiyas** — the intelligent, automated cultivation chamber for *Pleurotus ostreatus* (Oyster Mushroom).

```
                     ┌───────────────────────────────────┐
                     │     🍄 KABUTECH HIYAS HUB         │
                     │          [[index]]                │
                     └─────────────────┬─────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
       ┌─────────────────────────┐           ┌─────────────────────────┐
       │   Current Project State │           │   System Architecture   │
       │ [[current_project_state]]│           │   [[system_overview]]   │
       └────────────┬────────────┘           └────────────┬────────────┘
                    │                                     │
         ┌──────────┴──────────┐               ┌──────────┴──────────┐
         ▼                     ▼               ▼                     ▼
┌─────────────────┐   ┌─────────────────┐ ┌─────────────────┐   ┌─────────────────┐
│ 02 Hardware     │   │ 03 Firmware     │ │ 04 Mobile App   │   │ 05 TinyML & AI  │
│ [[schematics_   │   │ [[firmware_     │ │ [[app_archi-    │   │ [[microclimate_ │
│   and_pinouts]] │   │   architecture]]│ │   tecture]]     │   │   forecasting]] │
│ [[bill_of_      │   │ [[tft_display_  │ │ [[screens_and_  │   │ [[edge_impulse_ │
│   materials]]   │   │   ui]]          │ │   features]]    │   │   tutorial]]    │
│ [[sensor_probe_ │   │ [[prototype_    │ │ [[offline_first_│   │ [[anomaly_      │
│   design]]      │   │   guide]]       │ │   design]]      │   │   detection]]   │
│ [[controller_   │   │ [[wiring_guide]]│ │ [[crop_profiles_│   └─────────────────┘
│   enclosure]]   │   └─────────────────┘ │   and_control_  │            │
└─────────────────┘                       │   bands]]       │            ▼
                                          └─────────────────┘   ┌─────────────────┐
                                                                │ 06 Planning     │
                                                                │ [[master_imple- │
                                                                │   mentation_    │
                                                                │   plan]]        │
                                                                │ [[academic_     │
                                                                │   references]]  │
                                                                └─────────────────┘
```

---

## ⚡ Quick Status Summary
* **Current Operational State**: 👉 **[[current_project_state|Read the Full System Audit & State Report]]**
* **Active Hardware**: ESP32-S3 DevKit (`N16R8`), SHT31-D, BH1750, Sensirion SCD41 True NDIR, 3.2" ILI9341 Color TFT (LovyanGFX).
* **Mobile Stack**: React Native 0.76+ Expo SDK 52 with Dual Role-Based Navigation (Admin vs Staff) and Offline-First SQLite/AsyncStorage engine.
* **On-Device Edge AI**: +10 min predictive climate forecaster running quantized INT8 inference every 30 seconds.

---

## 📸 System Visual Gallery

![[growhouse_device_overview.jpg]]
*Figure 1: Full grow house deployment with wall-mounted IP65 controller, overhead misting line, and suspended sensor probe.*

![[sensor_probe_hanging.jpg]]
*Figure 2: Suspended multi-plate radiation shield environmental sensor probe hanging among mushroom grow bags.*

---

## 📚 Vault Table of Contents

### 🌐 [[system_overview|01 — System Architecture & State]]
- **[[current_project_state|Current Overall Project State]]**: Comprehensive audit across firmware, mobile app, TinyML, and hardware pins.
- **[[system_overview|System Overview]]**: End-to-end cloud sync with local autonomy, dual-zone enclosure architecture.
- **[[firebase_schema|Firebase RTDB Schema]]**: Complete telemetry (`/sensors/live`), schedules (`/settings/schedules`), batches (`/batches`), and staff operations.
- **[[biological_baselines|Biological Baselines]]**: Empirical parameter thresholds for temperature, humidity, CO₂, and lighting based on *P. ostreatus* literature.

### 📐 [[schematics_and_pinouts|02 — Hardware & Electronics]]
- **[[schematics_and_pinouts|Schematics & Pinouts]]**: Active breadboard pinout vs production GX16 aviation connector assignments.
- **[[bill_of_materials|Bill of Materials & Shopping List]]**: 55+ items, ₱15,000 budget breakdown, Shopee/Lazada sourcing specs.
- **[[sensor_probe_design|Sensor Probe Design]]**: Multi-plate meteorological radiation shield, PTFE hydrophobic membrane disc, exploded views.
- **[[controller_enclosure|Controller Enclosure]]**: IP65 sealed box layout, power rails (220V AC, 12V 10A, 5V, 3.3V), and thermal dissipation.
- **[[hardware_label_specifications|Hardware Labels]]**: Panel stickers, color codes, probe face labels, and printing guide.

### ⚡ [[firmware_architecture|03 — Embedded Firmware (ESP32-S3)]]
- **[[firmware_architecture|Firmware Architecture]]**: Core 0 unified TLS, debounced sensor state engine, hysteresis climate regulation, smart mister pause.
- **[[tft_display_ui|TFT Display UI]]**: LovyanGFX ILI9341 240×320 SPI color screen layout, dynamic mode color themes, and status widgets.
- **[[prototype_guide|Breadboard Prototype Guide]]**: Quickstart instructions, Arduino IDE configuration, and sensor calibration offsets.
- **[[wiring_guide|Detailed Wiring Guide]]**: Step-by-step breadboard-to-terminal block wiring topologies and noise isolation.

### 📱 [[app_architecture|04 — Mobile Application (KabutechNative)]]
- **[[app_architecture|App Architecture]]**: React Native / Expo architecture, Context API, state providers, and custom hooks.
- **[[screens_and_features|Screens & Features]]**: Dual navigation (Admin vs Staff), 12 interactive dialog modals, shimmer skeleton loaders.
- **[[offline_first_design|Offline-First Engine]]**: AsyncStorage caching, offline banner, `AwwSnapOfflineView`, and queued parameter sync.
- **[[crop_profiles_and_control_bands|Crop Profiles & Control Bands]]**: Preset profiles for Oyster Mushroom, Shiitake, and Lion's Mane.

### 🧠 [[microclimate_forecasting|05 — TinyML & Edge AI]]
- **[[microclimate_forecasting|Microclimate Forecaster]]**: +10-minute on-device regression model predicting upcoming climate drift.
- **[[edge_impulse_tutorial|Edge Impulse BYOM Tutorial]]**: Host PC training, INT8 quantization, and C++ Arduino deployment.
- **[[anomaly_detection|Anomaly Detection]]**: Hardware failure signatures (fan failure, mister failure, thermal runaway).

### 🏆 [[master_implementation_plan|06 — Planning & Academic References]]
- **[[master_implementation_plan|Master Implementation Plan]]**: 5-phase evolution roadmap, deliverable verification status, and thesis defense pitch script.
- **[[academic_references|Academic References & APA Bibliography]]**: Formal peer-reviewed literature citations.

---

## 💡 Quick Tips for Obsidian Users
- **Open Graph View**: Press <kbd>Ctrl</kbd> + <kbd>G</kbd> to explore the interactive visual knowledge map connecting all notes.
- **Search Notes**: Press <kbd>Ctrl</kbd> + <kbd>O</kbd> to jump instantly to any topic or file.
- **Follow Links**: Click any `[[Wikilink]]` to navigate seamlessly across modules.
