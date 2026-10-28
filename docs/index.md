# 🍄 Kabutech Hiyas — Master Knowledge Vault

Welcome to the complete knowledge base, technical documentation, and thesis repository for **Kabutech Hiyas** — the intelligent, automated cultivation chamber for *Pleurotus ostreatus* (Oyster Mushroom).

```
                     ┌───────────────────────────────────┐
                     │     🍄 KABUTECH HIYAS HUB         │
                     │          [[index]]                │
                     └─────────────────┬─────────────────┘
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
┌───────────────────┐        ┌───────────────────┐        ┌───────────────────┐
│ 01 Architecture   │        │ 02 Hardware       │        │ 03 Firmware       │
│ [[system_overview]]│        │ [[schematics_and_ │        │ [[firmware_archi- │
│ [[firebase_schema]]│        │   pinouts]]       │        │   tecture]]       │
│ [[biological_     │        │ [[bill_of_        │        │ [[tft_display_ui]]│
│   baselines]]     │        │   materials]]     │        │ [[prototype_guide]│
└───────────────────┘        │ [[sensor_probe_   │        │ [[wiring_guide]]  │
                             │   design]]        │        └───────────────────┘
                             │ [[controller_     │
                             │   enclosure]]     │
                             │ [[hardware_label_ │
                             │   specifications]]│
                             └───────────────────┘
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
┌───────────────────┐        ┌───────────────────┐        ┌───────────────────┐
│ 04 Mobile App     │        │ 05 TinyML & AI    │        │ 06 Planning       │
│ [[app_architecture│        │ [[microclimate_   │        │ [[master_implemen-│
│ ]]                │        │   forecasting]]   │        │   tation_plan]]   │
│ [[offline_first_  │        │ [[edge_impulse_   │        │ [[academic_       │
│   design]]        │        │   tutorial]]      │        │   references]]    │
│ [[screens_and_    │        │ [[anomaly_        │        └───────────────────┘
│   features]]      │        │   detection]]     │
│ [[crop_profiles_  │        └───────────────────┘
│   and_control_    │
│   bands]]         │
└───────────────────┘
```

---

## 📸 System Visual Gallery

![[growhouse_device_overview.jpg]]
*Figure 1: Full grow house deployment with wall-mounted IP65 controller, overhead misting line, and suspended sensor probe.*

![[sensor_probe_hanging.jpg]]
*Figure 2: Suspended multi-plate radiation shield environmental sensor probe hanging among mushroom grow bags.*

---

## 📚 Vault Table of Contents

### 🌐 [[system_overview|01 — System Architecture]]
- **[[system_overview|System Overview]]**: End-to-end cloud sync with local autonomy, dual-zone enclosure architecture.
- **[[firebase_schema|Firebase RTDB Schema]]**: Live telemetry schema (`/sensors/live`), control settings (`/settings/setpoints`), and device metadata.
- **[[biological_baselines|Biological Baselines]]**: Empirical parameter thresholds for temperature, humidity, CO₂, and lighting based on *P. ostreatus* literature.

### 📐 [[schematics_and_pinouts|02 — Hardware & Electronics]]
- **[[schematics_and_pinouts|Schematics & Pinouts]]**: Complete circuit schematic, GX16 aviation port pinouts, and relay protection.
- **[[bill_of_materials|Bill of Materials & Shopping List]]**: 55+ items, ₱15,000 budget breakdown, Shopee/Lazada sourcing specs.
- **[[sensor_probe_design|Sensor Probe Design]]**: Multi-plate meteorological radiation shield, PTFE hydrophobic membrane disc, exploded views.
- **[[controller_enclosure|Controller Enclosure]]**: IP65 sealed box layout, power rails (220V AC, 12V 10A, 5V, 3.3V), and thermal dissipation.
- **[[hardware_label_specifications|Hardware Labels]]**: Panel stickers, color codes, probe face labels, and printing guide.

### ⚡ [[firmware_architecture|03 — Embedded Firmware (ESP32-S3)]]
- **[[firmware_architecture|Firmware Architecture]]**: Dual-core execution loop, hysteresis climate regulation, smart mister pause.
- **[[tft_display_ui|TFT Display UI]]**: LovyanGFX ILI9341 240×320 SPI color screen layout, telemetry cards, and status widgets.
- **[[prototype_guide|Breadboard Prototype Guide]]**: Quickstart instructions, Arduino IDE configuration, and sensor calibration.
- **[[wiring_guide|Detailed Wiring Guide]]**: Step-by-step breadboard-to-terminal block wiring topologies and noise isolation.

### 📱 [[app_architecture|04 — Mobile Application (KabutechNative)]]
- **[[app_architecture|App Architecture]]**: React Native / Expo architecture, Context API, state providers.
- **[[offline_first_design|Offline-First Engine]]**: AsyncStorage caching, offline banner, `AwwSnapOfflineView`, and queued parameter sync.
- **[[screens_and_features|Screens & Features]]**: Controls, Analytics, Crop Management, Yield Tracking, and Staff Operations.
- **[[crop_profiles_and_control_bands|Crop Profiles & Control Bands]]**: Preset profiles for Oyster Mushroom, Shiitake, and Lion's Mane.

### 🧠 [[microclimate_forecasting|05 — TinyML & Edge AI]]
- **[[microclimate_forecasting|Microclimate Forecaster]]**: +10-minute on-device regression model predicting upcoming climate drift.
- **[[edge_impulse_tutorial|Edge Impulse BYOM Tutorial]]**: Host PC training, INT8 quantization, and C++ Arduino deployment.
- **[[anomaly_detection|Anomaly Detection]]**: Hardware failure signatures (fan failure, mister failure, thermal runaway).

### 🏆 [[master_implementation_plan|06 — Planning & Academic References]]
- **[[master_implementation_plan|Master Implementation Plan]]**: 5-phase evolution roadmap and thesis defense pitch script.
- **[[academic_references|Academic References & APA Bibliography]]**: Formal peer-reviewed literature citations.

---

## 💡 Quick Tips for Obsidian Users
- **Open Graph View**: Press <kbd>Ctrl</kbd> + <kbd>G</kbd> to explore the interactive visual knowledge map connecting all notes.
- **Search Notes**: Press <kbd>Ctrl</kbd> + <kbd>O</kbd> to jump instantly to any topic or file.
- **Follow Links**: Click any `[[Wikilink]]` to navigate seamlessly across modules.
