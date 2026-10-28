# 🌐 Kabutech Hiyas — System Architecture

The **Kabutech Hiyas** is an industrial-grade, plug-and-play automated cultivation chamber designed for edible and medicinal fungi (primarily Oyster Mushroom / *Pleurotus ostreatus*).

---

## 🏛️ End-to-End System Diagram

```
                 ┌────────────────────────────────────────────────────────┐
                 │                Mushroom Grow Chamber                   │
                 │                                                        │
                 │     Overhead Misting Line & Exhaust / Intake Fans      │
                 │                          ▲                             │
                 │                          │ Actuator lines (GX16)       │
                 │                          │                             │
                 │            ┌─────────────┴────────────┐                │
                 │            │  IP65 Controller Box     │                │
                 │            │  ESP32-S3 Dual-Core MCU  │                │
                 │            └─────────────┬────────────┘                │
                 │                          │ Armored I2C Bus             │
                 │                          ▼                             │
                 │           [[sensor_probe_design|Suspended Radiation]]   │
                 │           [[sensor_probe_design|Shield Sensor Probe]]  │
                 │             (SHT31 + SCD41 + BH1750)                   │
                 └──────────────────────────┬─────────────────────────────┘
                                            │ Wi-Fi (2.4 GHz)
                                            ▼
                             ┌─────────────────────────────┐
                             │    Google Firebase RTDB     │
                             │  /kabutech/sensors/live     │
                             │  /kabutech/settings/...     │
                             └──────────────┬──────────────┘
                                            │ 4G / 5G / Wi-Fi
                                            ▼
                             ┌─────────────────────────────┐
                             │ KabutechNative (Mobile App) │
                             │  - Offline-First Engine     │
                             │  - Live Telemetry & Control │
                             │  - Staff Task Dispatch      │
                             └─────────────────────────────┘
```

---

## ⚡ Core Principles

### 1. Global Cloud Sync with Local Autonomy
- **Global Remote Access**: The ESP32 controller and the mobile device communicate through **Google Firebase Realtime Database**. They do not need to share the same local Wi-Fi network; growers can monitor conditions and receive alerts from anywhere in the world.
- **Fail-Safe Local Control**: Even if internet connectivity drops entirely, the ESP32 continues autonomous environmental regulation via on-board hysteresis and PID algorithms. Cultivation never depends on a cloud connection for survival.

### 2. Dual-Zone Physical Architecture
- **Dry Zone (Controller Enclosure)**: An IP65-sealed polycarbonate box mounted outside the wet growing space or near the entrance door. Contains power supplies, relays, circuit protection, status display, and the ESP32.
- **Wet Zone (Suspended Weather Probe)**: A specialized multi-plate radiation shield hanging directly at canopy level, shielding high-precision sensors from falling mist droplets while preserving 360° gaseous diffusion.

---

## 📸 Visual Overview

![[growhouse_device_overview.jpg]]
*Figure 1: Wall-mounted IP65 controller box, overhead misting line, and canopy sensor probe suspended directly at mushroom bag height.*

![[controller_box_closeup.jpg]]
*Figure 2: Sealed controller with OLED status display, status LEDs, rotary Auto/Manual mode switch, push-fit water fitting, and keyed GX16 aviation ports.*

---

## 🔗 Deep-Dive Modules
- **Database Schema**: [[firebase_schema|Firebase Realtime Database Schema]]
- **Biological Foundations**: [[biological_baselines|Biological Baselines & Parameter Thresholds]]
- **Controller Hardware**: [[controller_enclosure|Controller Enclosure & Power Distribution]]
- **Firmware Engine**: [[firmware_architecture|ESP32 Firmware Architecture]]
- **Mobile Client**: [[app_architecture|React Native Mobile App Architecture]]
- **Predictive Edge AI**: [[microclimate_forecasting|TinyML 10-Minute Forecaster]]

---
*Return to [[index|Dashboard]]*
