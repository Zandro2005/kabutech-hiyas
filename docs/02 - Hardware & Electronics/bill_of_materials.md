# 💰 Bill of Materials & Procurement Guide

> **Total Budget:** ₱15,000  
> **Estimated Real Build Cost:** ~₱11,500 – ₱13,500 with online vouchers  
> **Total Unique Components:** 55+ items across 8 functional categories

---

## 📊 Budget Overview by Category

| Category | Description | Subtotal Range (₱) |
| :--- | :--- | :--- |
| **A. Sensors & Probe Electronics** | Digital I2C sensors (SHT31, BH1750, SCD41 NDIR, level, flow) | ₱3,150 – ₱4,100 |
| **B. Hanging Sensor Probe Housing** | Multi-plate radiation shelter, PTFE disc, glands | ₱275 – ₱480 |
| **C. Controller Board & Electronics** | ESP32-S3 N16R8, 8-ch relay, level shifters, buck converters | ₱1,380 – ₱2,150 |
| **D. Power Supply & Distribution** | 12V 10A PSU, AC inlet, terminal blocks, fuses | ₱1,050 – ₱1,700 |
| **E. Connectors & Cabling** | GX16 aviation sets, shielded cables, silicone wire | ₱980 – ₱1,650 |
| **F. Actuators & Plumbing** | 120mm fans, 60W diaphragm pump, mist nozzles, solenoid | ₱2,130 – ₱4,050 |
| **G. Enclosure & Mounting** | IP65 waterproof enclosure, DIN rails, cable glands | ₱450 – ₱800 |
| **H. Consumables & Fasteners** | Heat shrink, standoff kit, thermal paste, zip ties | ₱380 – ₱650 |
| **TOTAL ESTIMATED COST** | Complete turnkey automation unit | **₱9,795 – ₱15,580** |

---

## 🛒 Detailed Item Procurement Matrix

### A. Sensors & Probe Electronics
1. **SHT31-D Temperature & Humidity Module**: ±2% RH, ±0.3°C accuracy, I2C. *(Qty: 1 | ₱120–₱180)*.
2. **BH1750 Ambient Light Sensor (GY-302)**: 1–65,535 lux calibrated illuminance, I2C. *(Qty: 1 | ₱80–₱150)*.
3. **SCD41 True NDIR CO₂ Sensor (Sensirion)**: Photoacoustic 400–5,000 ppm (±40 ppm). Critical sensor for fungal respiration tracking. *(Qty: 1 | ₱1,800–₱2,500)*.
4. **Capacitive Water Level Sensor (XKC-Y25-T12V)**: Non-contact digital sensor mounting through reservoir walls to prevent dry-running. *(Qty: 1 | ₱250–₱400)*.
5. **YF-S201 Hall Water Flow Meter**: 1–30 L/min pulse counter detecting pump airlocks or line clogs. *(Qty: 1 | ₱150–₱220)*.
6. **0.96" SSD1306 OLED Display (I2C)**: 128×64 resolution on controller box door. *(Qty: 1 | ₱100–₱150)*.
7. **Perfboard / Stripboard (Double-Sided 5×7cm)**: Solder platform inside the probe. *(Qty: 2 | ₱50–₱100)*.

### B. Hanging Sensor Probe Shelter
1. **Mini Multi-Plate Solar Radiation Shield**: Stacked downward-sloped ABS louvers protecting sensors from falling mist. *(Qty: 1 | ₱200–₱350)*.
2. **PTFE Hydrophobic Membrane Disc (13–25mm)**: IP67 waterproof barrier disc allowing CO₂ gas transmission while blocking water droplets. *(Qty: 1 | ₱30–₱60)*.
3. **UV-Resistant Nylon Cable Ties (100mm)**: Internal strain relief inside the probe head. *(Qty: 1 pack | ₱25–₱40)*.

### C. Controller & Core Logic
1. **ESP32-S3 DevKit N16R8**: 16MB Flash, 8MB PSRAM, dual-core 240 MHz, USB-C. *(Qty: 1 | ₱350–₱500)*.
2. **8-Channel Optocoupled Relay Module (5V)**: Galvanic isolation, 10A/250VAC contacts. *(Qty: 1 | ₱180–₱280)*.
3. **Logic Level Shifter (3.3V ↔ 5V Bi-directional, 4-Ch)**: Protects ESP32 GPIOs when driving 5V relay inputs. *(Qty: 1 | ₱30–₱50)*.
4. **LM2596 DC-DC Step-Down Buck Converter**: 12V DC input stepped down to regulated 5V DC for logic. *(Qty: 1 | ₱40–₱70)*.
5. **1N4007 Flyback Diodes**: Suppresses back-EMF spikes from inductive coils. *(Qty: 10 pcs | ₱15–₱30)*.
6. **Panel Indicators & Rotary Mode Switch**: 3-position Auto/Off/Manual switch, 5mm status LEDs, 220Ω resistors. *(Qty: 1 set | ₱75–₱120)*.

### D. Power Supply & Utility
1. **Mean Well LRS-150-12 (12V 10A 120W Switching PSU)**: Heavy-duty industrial power supply with overload protection. *(Qty: 1 | ₱450–₱850)*.
2. **IEC 320 C14 Power Inlet Socket**: Integrated fuse holder and 3-pin standard receptacle. *(Qty: 1 | ₱60–₱100)*.
3. **MOV Varistor (275V 10D)**: Surge suppression at AC mains entrance. *(Qty: 1 | ₱25–₱30)*.
4. **Wago 221 Lever-Nuts & Screw Terminal Strips**: Tool-free reusable power distribution. *(Qty: 2 packs | ₱160–₱280)*.

### E. Actuators & Plumbing
1. **120mm High-Static Pressure 12V Brushless Fans**: 2 units (Exhaust & Intake). *(Qty: 2 | ₱300–₱500)*.
2. **12V High-Pressure Diaphragm Water Pump (60–80W)**: Generates 0.6–0.8 MPa for fine fogging nozzles. *(Qty: 1 | ₱450–₱850)*.
3. **Misting Nozzles (0.2–0.3mm Brass with anti-drip)** + 1/4" PU Hose. *(Qty: 5 nozzles + 10m hose | ₱350–₱600)*.
4. **12V Normally Closed Brass / Nylon Solenoid Valve (1/2" or 3/8")**: Immediate drip-free water cutoff. *(Qty: 1 | ₱250–₱400)*.
5. **Full-Spectrum LED Grow Light Strip (12V Waterproof IP65)**: 6500K daylight for fruiting induction. *(Qty: 2m strip | ₱180–₱300)*.

---
*Return to [[schematics_and_pinouts|Schematics & Pinouts]] | [[sensor_probe_design|Probe Design]] | [[index|Dashboard]]*
