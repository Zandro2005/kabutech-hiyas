# 🧰 Controller Enclosure & Power Distribution

> **Ingress Rating:** IP65 Industrial Polycarbonate Enclosure  
> **Location:** Dry Zone (outside growing room or entrance wall)  
> **Mains Power:** 220V AC 60Hz Input  
> **DC Power Bus:** 12V 10A (120W) Switching Supply + Regulated 5V / 3.3V Logic Rails

---

## 🗃️ Mechanical Enclosure Layout

```
┌──────────────────────────────────────────────────────────────┐
│                    KABUTECH HIYAS CONTROLLER                 │
│                                                              │
│  [ OLED Display ]     (Auto/Man Switch)     (O) PWR LED      │
│   128x64 SSD1306        3-Position           (O) WIFI LED    │
│                                              (O) ALARM LED   │
├──────────────────────────────────────────────────────────────┤
│  INTERNAL CHASSIS:                                           │
│                                                              │
│  ┌─────────────────┐       ┌──────────────────────────────┐  │
│  │  Mean Well      │       │  8-Channel Optocoupled       │  │
│  │  12V 10A PSU    │       │  Relay Module (JD-VCC 5V)    │  │
│  │  (LRS-150-12)   │       └──────────────────────────────┘  │
│  └─────────────────┘                                         │
│                                                              │
│  ┌─────────────────┐       ┌──────────────┐ ┌──────────────┐ │
│  │ LM2596 Buck     │       │ ESP32-S3     │ │ Logic Level  │ │
│  │ 12V -> 5V Logic │       │ DevKit N16R8 │ │ Shifter 4-Ch │ │
│  └─────────────────┘       └──────────────┘ └──────────────┘ │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ BOTTOM CONNECTOR PANEL:                                      │
│                                                              │
│ [POWER IN]  [WATER]   [FAN 1]  [FAN 2]  [MIST]  [LIGHT] [PROBE] │
│ C14 Fused   3/8" Push  GX16-4   GX16-4  GX16-4  GX16-4  GX16-4 │
└──────────────────────────────────────────────────────────────┘
```

---

## ⚡ Power Distribution Rails

1. **220V AC Mains Rail**:
   - IEC C14 inlet socket with integrated 2A fast-acting fuse.
   - 275V Metal Oxide Varistor (MOV) surge protector across Line and Neutral.
   - Master illuminated rocker switch (`SW1`).
2. **12V High-Current DC Rail**:
   - Primary output from Mean Well LRS-150-12 power supply.
   - Protected by inline 5A automotive blade fuse.
   - Feeds the 120mm exhaust fan, 120mm intake fan, 12V misting pump, 12V solenoid valve, and LED grow light strip via relay contacts.
3. **5V Regulated Logic Rail**:
   - Stepped down from 12V via an LM2596 switching buck converter.
   - Feeds the ESP32-S3 `5V/VIN` pin and the optocoupled relay coil circuit (`JD-VCC`).
4. **3.3V Low-Noise Sensor Rail**:
   - Provided by the on-board high-PSRR LDO on the ESP32-S3 DevKit.
   - Powers the SHT31-D, BH1750, SCD41, and SSD1306 OLED via shielded umbilical wiring.

---

## 🛡️ Safety & Reliability Precautions

- **Separate Coil & Logic Grounds**: Keep relay coil return currents isolated from sensitive sensor signal grounds.
- **Inductive Kickback Clamping**: Every solenoid coil and fan motor has a parallel 1N4007 reverse-biased diode.
- **Water Solenoid Fail-Safe**: Solenoid valve is Normally Closed (NC), ensuring that water automatically shuts off if mains power drops.

---
*Return to [[schematics_and_pinouts|Schematics]] | [[hardware_label_specifications|Hardware Labels]] | [[index|Dashboard]]*
