# Kabutech Hiyas — Firmware & Hardware Documentation

This directory contains the embedded firmware and hardware specifications for the **Kabutech Hiyas** mushroom grow house automation system.

---

## 📑 Documentation Index

* 🚀 **[IMPLEMENTATION PLAN (Full Production Roadmap)](../IMPLEMENTATION_PLAN.md)** — The complete engineering design for the plug-and-play production controller, enclosure, BOM, and firmware architecture.
* 🛠️ **[BREADBOARD PROTOTYPE GUIDE](PROTOTYPE_GUIDE.md)** — Quick start, pinouts, and calibration steps for the current breadboard prototype running `kabutech_prototype.ino`.

---

## 📸 System Visual Concept

### 1. Grow House Installation
![Kabutech Hiyas Grow House Installation](assets/growhouse_device_overview.jpg)
*Figure 1: Wall-mounted IP65 controller box, overhead misting line, and canopy sensor probe suspended directly at mushroom bag height.*

### 2. Controller Box Close-Up
![Kabutech Hiyas Controller Box](assets/controller_box_closeup.jpg)
*Figure 2: Sealed controller with OLED status display, status LEDs, rotary Auto/Manual mode switch, push-fit water fitting, and keyed GX16 aviation ports.*

### 3. Canopy Sensor Probe (Exploded View)
![Sensor Probe Exploded Diagram](assets/sensor_probe_exploded.jpg)
*Figure 3: Technical exploded view of the waterproof canopy sensor probe assembly.*

---

## ⚡ Architecture Summary

### 1. Remote Monitoring (Anywhere in the World)
```
[ESP32 Controller] ──(WiFi)──► [Firebase RTDB] ◄──(Mobile 4G/5G)── [Mobile App]
```
The ESP32 and phone sync via Google Firebase in real-time (~200–500ms). They do **not** need to share the same local WiFi network.

### 2. Weatherproof Separation
* **Controller Unit**: Wall-mounted IP65 sealed enclosure located in a dry zone (near the entrance door). Zero exposed sensor openings.
* **Sensor Probe**: Suspended from the ceiling on an armored 4-core I2C cable directly into the mushroom fruiting canopy. Shielded with angled louvers and a 20µm PTFE hydrophobic membrane to block mist droplets while permitting gas and humidity diffusion.

### 3. Connector Pinouts (GX16 Aviation Ports)
| Port | Connector | Function | Wiring |
|---|---|---|---|
| **[POWER]** | Cable Gland | 220V AC Mains | Live, Neutral, Earth |
| **[WATER]** | Quick-Connect | Water Line (¾") | Internal 12V Solenoid Valve |
| **[FAN 1]** | GX16 4-Pin | Exhaust Fan | Relay 1 (NO/COM) + 12V/220V |
| **[FAN 2]** | GX16 4-Pin | Circulation Fan | Relay 4 (NO/COM) + 12V/220V |
| **[MISTER]**| GX16 4-Pin | High-Pressure Mist | Relay 2 (NO/COM) + 12V/220V |
| **[LIGHT]** | GX16 4-Pin | Fruiting Light | Relay 3 (NO/COM) + 12V/220V |
| **[PROBE]** | GX16 4-Pin | Shared I2C Bus | Pin 1: 3.3V, Pin 2: GND, Pin 3: SDA, Pin 4: SCL |

---

## 📂 File Directory

* [`kabutech_prototype.ino`](kabutech_prototype.ino) — Current ESP32-S3 Arduino sketch reading sensors and reporting to Firebase.
* [`PROTOTYPE_GUIDE.md`](PROTOTYPE_GUIDE.md) — Step-by-step wiring and Arduino IDE instructions for the breadboard.
* [`../IMPLEMENTATION_PLAN.md`](../IMPLEMENTATION_PLAN.md) — Master production roadmap and engineering plan.
* [`assets/`](assets/) — Hardware render diagrams and technical illustrations.
