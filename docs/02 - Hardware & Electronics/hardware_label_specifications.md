# 🏷️ Hardware Label Specifications

> **System:** ESP32-S3 Automated Mushroom & Crop Cultivation Environment  
> **Original Spec:** [firmware/HARDWARE_LABELS.md](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/firmware/HARDWARE_LABELS.md) & [KABUTECH_HIYAS_LABELS_SPECIFICATION.docx](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/KABUTECH_HIYAS_LABELS_SPECIFICATION.docx)

---

## 🏷️ Ready-to-Print Sticker Checklist

Use industrial label tape (Brother P-Touch or Dymo) to label all switches, ports, and modules for the thesis presentation and field deployment:

| Single-Word Label | Tape Width | Color Spec | Application Target | Function / Meaning |
| :--- | :--- | :--- | :--- | :--- |
| **`POWER`** | 12mm Tape | White on Red | Main AC Rocker Switch (`SW1`) | Master electrical power toggle |
| **`MAINS`** | 9mm Tape | Yellow on Black | 220VAC Grid Inlet Bezel | Identifies incoming 220VAC electrical utility |
| **`ON`** | 9mm Tape | White on Green | Switch Upper Rocker Position | Circuit closed / energized position |
| **`OFF`** | 9mm Tape | White on Red | Switch Lower Rocker Position | Circuit open / de-energized safe shutoff |
| **`VALVE`** | 12mm Tape | White on Blue | Solenoid Valve Output Port | Water shut-off solenoid control line |
| **`PSU`** | 12mm Tape | Black on Silver | 12V 10A Master Power Supply | Primary 12V AC-to-DC switching converter |
| **`BUCK`** | 9mm Tape | Black on White | LM2596 DC-DC Converter | 12V to 5V logic voltage regulator |
| **`PROBE`** | 12mm Tape | White on Blue | Port J1 & Umbilical Probe Head | Connects suspended multi-sensor head |
| **`LIGHT`** | 9mm / 12mm Tape | Black on Yellow | Probe Window & Port J5 | Photoperiod monitoring & grow LED strip |
| **`CO2`** | 9mm Tape | Black on Yellow | Probe SCD41 NDIR Aperture | True CO₂ gas concentration aperture |
| **`T/H`** | 9mm Tape | White on Green | Probe SHT31-D Sintered Filter | Temperature & Relative Humidity sensor |
| **`INTAKE`** | 12mm Tape | White on Black | Port J3 & 120mm Intake Fan | Fresh atmospheric air intake blower |
| **`EXHAUST`**| 12mm Tape | White on Black | Port J2 & 120mm Exhaust Fan | Air extractor fan for purging CO₂ |
| **`MIST`** | 12mm Tape | White on Blue | Port J4 & 60W Misting Pump | High-pressure fogging pump & nozzles |

---

## 🔬 Weather Probe Face Label Placement

On the suspended multi-sensor probe body inside the mushroom chamber, affix labels directly adjacent to each sensor aperture:
1. **`LIGHT`**: Positioned by the clear optical opening of the BH1750.
2. **`CO2`**: Positioned by the circular breathable aperture of the Sensirion SCD41.
3. **`T/H`**: Positioned by the sintered membrane cap of the Sensirion SHT31-D.

---
*Return to [[controller_enclosure|Controller Enclosure]] | [[sensor_probe_design|Probe Design]] | [[index|Dashboard]]*
