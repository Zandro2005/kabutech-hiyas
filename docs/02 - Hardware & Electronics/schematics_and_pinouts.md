# 📐 Hardware Schematics & Pinout Specifications

> **System:** ESP32-S3 Automation Hub with Isolated Relays, I2C Sensor Bus & SPI Display  
> **Schematic Diagram:** `docs/attachments/kabutech_hiyas_schematic.png`

---

## 📸 Master Schematic Overview

![[kabutech_hiyas_schematic.png]]
*Figure: Complete electrical schematic including AC inlet, 12V 10A PSU, LM2596 buck converter, ESP32-S3 DevKit, optocoupled relays, flyback protection, and aviation connectors.*

---

## 📌 Pin Allocations: Active Prototype vs. Production Enclosure

To support smooth transition from breadboard validation to final enclosure fabrication, pin assignments are cross-referenced below:

### 1. Active Breadboard Prototype Pinout (Current Firmware)

| Subsystem | Signal Name | ESP32-S3 Pin | Physical Connection |
| :--- | :--- | :--- | :--- |
| **I2C Bus** | `SDA` | **GPIO 4** | SHT31-D, BH1750, SCD41 (Shared Data) |
| **I2C Bus** | `SCL` | **GPIO 5** | SHT31-D, BH1750, SCD41 (Shared Clock) |
| **Actuators** | Fan Intake | **GPIO 9** | Air In LED / Relay Driver 1 |
| **Actuators** | Mister / Fogger | **GPIO 11** | Mister LED / Relay Driver 2 (Valve runs in parallel) |
| **Actuators** | Grow Lights | **GPIO 12** | Grow Light LED / Relay Driver 3 |
| **Actuators** | Fan Exhaust | **GPIO 13** | Air Out LED / Relay Driver 4 |
| **TFT SPI** | `TFT_CS` | **GPIO 10** | 3.2" ILI9341 Chip Select |
| **TFT SPI** | `TFT_DC` | **GPIO 15** | 3.2" ILI9341 Data / Command |
| **TFT SPI** | `TFT_RST` | **GPIO 6** | 3.2" ILI9341 Hardware Reset |
| **TFT SPI** | `TFT_MOSI` | **GPIO 17** | 3.2" ILI9341 SDI / MOSI Data |
| **TFT SPI** | `TFT_SCK` | **GPIO 18** | 3.2" ILI9341 SPI Clock |
| **TFT SPI** | `TFT_LED` | **GPIO 2** | Backlight Control |

---

### 2. Final Industrial Enclosure Ports (GX16 Aviation Connectors)

Keyed circular connectors prevent accidental reverse-polarity or misconnection during farm cleaning:

| Port Label | Connector Type | Attached Device | Terminal Wiring Details |
| :--- | :--- | :--- | :--- |
| **`[POWER]`** | IP68 Cable Gland | 220V AC Grid Mains | Pin 1: Live (L), Pin 2: Neutral (N), Pin 3: Earth Ground (E) |
| **`[WATER]`** | Push-Fit 3/8" Quick-Connect | High-Pressure Mist Line | Connects to internal 12V Normally-Closed Solenoid Valve |
| **`[PROBE]`** | GX16 4-Pin Female | Hanging Sensor Probe | Pin 1: **3.3V DC**, Pin 2: **GND**, Pin 3: **SDA (GPIO 4)**, Pin 4: **SCL (GPIO 5)** |
| **`[FAN 1]`** | GX16 4-Pin Male | 120mm Exhaust Fan | Pin 1: 12V (+), Pin 2: Relay NO, Pin 3: GND, Pin 4: Earth |
| **`[FAN 2]`** | GX16 4-Pin Male | 120mm Intake Fan | Pin 1: 12V (+), Pin 2: Relay NO, Pin 3: GND, Pin 4: Earth |
| **`[MIST]`**  | GX16 4-Pin Male | High-Pressure Mist Pump | Pin 1: 12V (+), Pin 2: Relay NO, Pin 3: GND, Pin 4: Earth |
| **`[LIGHT]`** | GX16 4-Pin Male | Fruiting LED Array | Pin 1: 12V (+), Pin 2: Relay NO, Pin 3: GND, Pin 4: Earth |

---

## ⚡ Electrical Protection & Noise Immunity

1. **Galvanic Optocoupler Isolation**: The 8-channel relay board is isolated with optocouplers (`JD-VCC` powered from a dedicated regulator) so high-current relay switching spikes never back-feed into the ESP32.
2. **Flyback Diodes (1N4007)**: Placed across all inductive DC loads (solenoid coil and motor lines) to safely clamp high-voltage back-EMF spikes when relays open.
3. **MOV Surge Suppressor (275V)**: Positioned right at the AC mains inlet to absorb voltage fluctuations from utility grid brownouts.
4. **Fast-Blow Inline Fuses**:
   - 2A fuse on AC Mains line.
   - 5A blade fuse on 12V DC power bus.

---
*Return to [[controller_enclosure|Controller Enclosure]] | [[bill_of_materials|Bill of Materials]] | [[current_project_state|Current Project State]] | [[index|Dashboard]]*
