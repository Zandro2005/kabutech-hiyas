# 🛰️ Hanging Environmental Sensor Probe

> **Application:** Canopy-level microclimate sensing in ultra-high humidity (>90% RH) environments  
> **Form Factor:** Multi-Plate Solar Radiation Shield with internal suspended sensing core  
> **Sensors Integrated:** Sensirion SCD41 (NDIR CO₂), Sensirion SHT31-D (Temp/RH), Rohm BH1750 (Lux)

---

## 📸 Technical Visuals

![[sensor_probe_hanging.jpg]]
*Figure 1: Mini multi-plate radiation shield suspended directly at mushroom canopy height, naturally shedding overhead mist while facilitating 360° air and CO₂ exchange.*

![[sensor_probe_exploded.jpg]]
*Figure 2: Exploded assembly diagram showing top IP68 cable gland, multi-tier downward-slanted louvers, internal sensor strip, and PTFE membrane barrier.*

---

## 🛠️ Engineering Rationale

Placing standard sensors inside an ultra-high humidity mushroom chamber presents severe operational challenges:
1. **Direct Water Impingement**: Misting nozzles produce fine aerosols (20–50 µm) that coat optical sensor paths (e.g. photoacoustic apertures) in water droplets, causing false saturation or sensor failure.
2. **Thermal Radiative Bias**: Heat from grow lights can warm the sensor package, yielding false high temperature and false low relative humidity calculations.
3. **Stagnant Deadzones**: Placing sensors inside closed tubes or DIY PVC pipes creates microclimate pockets that lag real room condition changes by 5–15 minutes.

### The Solution: Multi-Plate Radiation Shield
By adopting a tiered meteorological radiation shield:
- **Mist Droplet Shedding**: The downward-angled louvers intercept falling water droplets and guide them off the outer perimeter.
- **360° Open Gaseous Convection**: Ambient air and CO₂ diffuse naturally through the open louver slots with zero airflow resistance.
- **PTFE Hydrophobic Barrier**: A breathable 20 µm ePTFE membrane disc covers the Sensirion SCD41 aperture, blocking liquid droplets (IP67) while remaining 100% transparent to gaseous CO₂ molecules.

---

## 🔨 Step-by-Step Build Guide

1. **Procure Housing**: Obtain a Mini Multi-Plate Radiation Shield (~₱250 on Shopee/Lazada) with 6 to 8 stacked white louvers and an internal chamber diameter of ~35–45 mm.
2. **Solder the Sensor Spine**:
   - Cut a narrow strip of double-sided perfboard (~2.5 cm × 6 cm).
   - Mount the **SCD41** (top), **SHT31-D** (middle), and downward-facing **BH1750** (bottom).
   - Daisy-chain their 3.3V power rails (`VIN` and `GND`) and I2C signal lines (`SDA` and `SCL`).
3. **Umbilical Cable & Strain Relief**:
   - Feed the 4-core shielded umbilical cable through the top IP68 cable gland.
   - Solder the 4 cores (`3.3V`, `GND`, `GPIO 4 SDA`, `GPIO 5 SCL`) directly to the board header.
   - Clamp a UV-resistant nylon zip tie around the cable jacket directly beneath the gland inside the chamber. This acts as a mechanical stop, preventing physical pull forces from straining solder connections.
4. **Hydrophobic Shielding**:
   - Affix an adhesive-backed 20 µm PTFE membrane disc directly over the SCD41 chamber inlet.
5. **Aviation Connector Termination**:
   - Terminate the upper end of the cable with a GX16 4-pin female plug to lock securely onto the main controller box port `[PROBE]`.

---

## 🎓 Thesis Defense Defense Script & Justification

> [!TIP]
> **Suggested Defense Presentation Script:**
> *"We integrated our environmental sensing array into an industrial-standard multi-plate radiation shield. The tiered hydrophobic louver geometry prevents liquid droplet fouling on the Sensirion SCD41 photoacoustic aperture and eliminates radiant thermal bias on the SHT31, while maintaining uninhibited 360-degree gaseous diffusion and sub-second response times for autonomous climate regulation."*

---
*Return to [[schematics_and_pinouts|Schematics]] | [[controller_enclosure|Controller Enclosure]] | [[index|Dashboard]]*
