# 📐 Hardware Schematics & Pinout Specifications

> **System:** ESP32-S3 Automation Hub with Isolated Relay Drivers & I2C Sensor Bus  
> **Schematic Diagram:** `docs/attachments/kabutech_hiyas_schematic.png`

---

## 📸 Master Schematic Overview

![[kabutech_hiyas_schematic.png]]
*Figure: Complete electrical schematic including AC inlet, 12V 10A PSU, LM2596 buck converter, ESP32-S3 DevKit, optocoupled relays, flyback protection, and aviation connectors.*

---

## 🔌 Connector Pinouts (GX16 Aviation Ports)

The enclosure utilizes keyed GX16 aviation screw-lock circular connectors to prevent miswiring:

| Port | Connector Type | Function | Terminal Wiring Details |
| :--- | :--- | :--- | :--- |
| **`[POWER]`** | IP68 Cable Gland | 220V AC Grid Mains | Pin 1: Live (L), Pin 2: Neutral (N), Pin 3: Earth Ground (E) |
| **`[WATER]`** | Push-Fit 3/8" Quick-Connect | Pressurized Water Supply | Direct to internal 12V DC Normally-Closed Solenoid Valve |
| **`[PROBE]`** | GX16 4-Pin Female | Hanging Sensor Probe | Pin 1: **3.3V DC**, Pin 2: **GND**, Pin 3: **SDA (GPIO 4)**, Pin 4: **SCL (GPIO 5)** |
| **`[FAN 1]`** | GX16 4-Pin Male | 120mm Exhaust Fan | Pin 1: 12V (+), Pin 2: Relay 1 NO, Pin 3: GND, Pin 4: Earth |
| **`[FAN 2]`** | GX16 4-Pin Male | 120mm Intake Fan | Pin 1: 12V (+), Pin 2: Relay 4 NO, Pin 3: GND, Pin 4: Earth |
| **`[MIST]`**  | GX16 4-Pin Male | High-Pressure Mist Pump | Pin 1: 12V (+), Pin 2: Relay 2 NO, Pin 3: GND, Pin 4: Earth |
| **`[LIGHT]`** | GX16 4-Pin Male | Grow Light LED Array | Pin 1: 12V (+), Pin 2: Relay 3 NO, Pin 3: GND, Pin 4: Earth |

---

## 📌 Microcontroller Pin Allocation (ESP32-S3)

### Digital I2C Sensor Bus
- **GPIO 4**: `SDA` (Shared by SHT31-D, BH1750, SCD41, and SSD1306 OLED)
- **GPIO 5**: `SCL` (Shared I2C Clock, 100 kHz standard mode)

### Actuator Relay Outputs (Active LOW / Optocoupled)
- **GPIO 9**: `RELAY 1` — Exhaust Fan (Air evacuation)
- **GPIO 10**: `RELAY 2` — Intake Fan (Fresh oxygen)
- **GPIO 11**: `RELAY 3` — Ultrasonic Mister / High-Pressure Pump
- **GPIO 12**: `RELAY 4` — LED Fruiting Light Strip
- **GPIO 13**: `RELAY 5` — Solenoid Water Valve

### Auxiliary Sensors & User Interface
- **GPIO 14**: Water Level Sensor (XKC-Y25 capacitive digital input)
- **GPIO 15**: Water Flow Sensor (YF-S201 Hall interrupt counter)
- **GPIO 16**: Auto / Manual Panel Rotary Switch
- **GPIO 17**: Enclosure Reset / Wi-Fi Pairing Button
- **GPIO 18**: Status LED — Wi-Fi Blue
- **GPIO 19**: Status LED — Alarm Red

---

## ⚡ Electrical Protection & Noise Immunity

1. **Galvanic Optocoupler Isolation**: The 8-channel relay board is isolated with optocouplers (`JD-VCC` powered from a dedicated regulator) so high-current relay switching spikes never back-feed into the ESP32.
2. **Flyback Diodes (1N4007)**: Placed across all inductive DC loads (solenoid coil and motor lines) to safely clamp high-voltage back-EMF spikes when relays open.
3. **MOV Surge Suppressor (275V)**: Positioned right at the AC mains inlet to absorb voltage fluctuations from utility grid brownouts.
4. **Fast-Blow Inline Fuses**:
   - 2A fuse on AC Mains line.
   - 5A blade fuse on 12V DC power bus.

---
*Return to [[controller_enclosure|Controller Enclosure]] | [[bill_of_materials|Bill of Materials]] | [[index|Dashboard]]*
