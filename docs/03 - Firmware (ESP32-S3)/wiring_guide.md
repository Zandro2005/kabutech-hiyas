# 🔌 Detailed Step-by-Step Wiring Guide

> **Scope:** Full connection guide from breadboard prototyping to terminal block distribution.  
> **Source:** [firmware/WIRING_DIAGRAM.md](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/firmware/WIRING_DIAGRAM.md)

---

## ⚡ Master Wiring Topology

```
[220V AC Mains] ──► [IEC C14 Inlet Socket (fused 2A)]
                         │
                         ├─► [Live & Neutral] ──► [Mean Well LRS-150-12 PSU]
                         │                             │
                         │                             ▼ 12V DC Bus (5A Fuse)
                         │                             ├─► [LM2596 Buck] ──► 5V Logic Bus
                         │                             │                         │
                         │                             │                         ├─► ESP32 VIN
                         │                             │                         └─► Relay JD-VCC
                         │                             │
                         │                             └─► [Relay Common Terminals]
                         │                                       │
                         │                                       ▼ Normally Open (NO)
                         │                                 [12V Fan 1 / Fan 2]
                         │                                 [12V Mist Pump]
                         │                                 [12V Solenoid Valve]
                         │                                 [12V Grow LED Strip]
                         │
                         └─► [Earth Ground Wire] ──► Chassis Ground & Aviation Shells
```

---

## 📋 Terminal Block Pin Assignments

| Block # | Signal Name | Source | Destination | Cable / Gauge |
| :--- | :--- | :--- | :--- | :--- |
| **TB-01** | `12V_RAW` | Mean Well PSU V+ | Fuse Holder In | 16 AWG Red |
| **TB-02** | `12V_FUSED`| Fuse Holder Out | Relay COM Bus & Buck In | 16 AWG Red |
| **TB-03** | `GND_PWR` | Mean Well PSU V- | Common DC Power Ground | 16 AWG Black |
| **TB-04** | `5V_LOGIC` | LM2596 Output (+) | ESP32-S3 `5V`, Relay `JD-VCC` | 20 AWG Yellow |
| **TB-05** | `GND_LOGIC`| LM2596 Output (-) | ESP32-S3 `GND`, Shifter `GND` | 20 AWG Black |
| **TB-06** | `RELAY_1` | Relay 1 NO | Port `[FAN 1]` Pin 2 | 18 AWG Blue |
| **TB-07** | `RELAY_2` | Relay 2 NO | Port `[FAN 2]` Pin 2 | 18 AWG Blue |
| **TB-08** | `RELAY_3` | Relay 3 NO | Port `[MIST]` Pin 2 | 18 AWG Blue |
| **TB-09** | `RELAY_4` | Relay 4 NO | Port `[LIGHT]` Pin 2 | 18 AWG Blue |
| **TB-10** | `RELAY_5` | Relay 5 NO | Port `[VALVE]` Pin 2 | 18 AWG Blue |

---

## ⚠️ Anti-Interference Wiring Rules

1. **Keep AC and DC Wires Separated**: Route 220V AC lines on the left side of the enclosure and low-voltage DC signals on the right. Never bundle AC mains wires with the I2C sensor umbilical cable.
2. **Shielded I2C Bus Grounding**: Connect the outer braided shield of the sensor probe cable to Earth Ground **only at the controller chassis end**. Leave the shield unconnected at the hanging sensor head to prevent ground loops.
3. **Twisted Pairs**: Twist the `SDA` with `GND` and `SCL` with `3.3V` when making long cable runs over 2 meters.

---
*Return to [[prototype_guide|Prototype Guide]] | [[schematics_and_pinouts|Schematics & Pinouts]] | [[index|Dashboard]]*
