# Kabutech Hiyas — Hardware Labels Specification

> **System**: ESP32-S3 Automated Mushroom & Crop Cultivation Environment  
> **Direct Word (.docx) File**: [`KABUTECH_HIYAS_LABELS_SPECIFICATION.docx`](../KABUTECH_HIYAS_LABELS_SPECIFICATION.docx) | [`assets/KABUTECH_HIYAS_LABELS_SPECIFICATION.docx`](assets/KABUTECH_HIYAS_LABELS_SPECIFICATION.docx)

---

## 1. Main Box — Controls & Power

| Label | Physical Target | Hardware Function | Demo Purpose | Tape / Color Spec |
| :--- | :--- | :--- | :--- | :--- |
| **`POWER`** | AC Master Rocker Switch (`SW1`) | Main electrical power toggle | Instant identification of master switch | White on Red (12mm) |
| **`MAINS`** | AC Inlet Bezel / Grid Feed | 220VAC incoming electrical utility | Identifies live utility feed source | Yellow on Black (9mm) |
| **`ON`** | Switch Upper Rocker Position | Circuit closed / energized state | Confirms energized switch position | White on Green (9mm) |
| **`OFF`** | Switch Lower Rocker Position | Circuit open / de-energized state | Confirms safe shutoff position | White on Red (9mm) |
| **`VALVE`** | Solenoid Valve Output Port / Switch | 12V NC Solenoid Water Valve line | Identifies water shut-off control | White on Blue (12mm) |
| **`PSU`** | 12V 5A Primary Power Supply | AC-to-DC 60W master switching PSU | Identifies primary 12V power supply | Black on Silver (12mm) |
| **`BUCK`** | LM2596 DC-DC Step-Down Board | 12V to 5V 3A logic voltage converter | Identifies 5V logic supply regulator | Black on White (9mm) |

---

## 2. Output Devices, Ports & Weather Probe

| Label | Physical Target | Hardware Function | Demo Purpose | Tape / Color Spec |
| :--- | :--- | :--- | :--- | :--- |
| **`PROBE`** | Port J1 & Umbilical Sensor Head | Chamber environmental sensor probe | Connects suspended multi-sensor head | White on Blue (12mm) |
| **`LIGHT`** | Sensor Probe Face & Port J5 | Ambient Lux Sensor (BH1750) & Grow LED | Photoperiod monitoring & grow lighting | Black on Yellow (12mm) |
| **`CO2`** | Sensor Probe Face | True NDIR Carbon Dioxide Sensor (SCD41) | Chamber respiration / ventilation level | Black on Yellow (9mm) |
| **`T/H`** | Sensor Probe Face | Temperature & Humidity Sensor (SHT31) | Core mushroom fruiting environment | White on Green (9mm) |
| **`INTAKE`** | Port J3 & 120mm Intake Fan | Fresh air intake blower fan | Draws in fresh atmospheric oxygen | White on Black (12mm) |
| **`EXHAUST`**| Port J2 & 120mm Exhaust Fan | Air extractor fan | Expels stale air & CO2 build-up | White on Black (12mm) |
| **`MIST`** | Port J4 & 60W Misting Pump | High-pressure fogging pump & nozzles | Generates high humidity (>85% RH) | White on Blue (12mm) |

---

## 3. Weather Probe Print Specification

On the suspended multi-sensor probe body inside the mushroom chamber, print or stick the following labels directly adjacent to each sensor aperture:

| Label | Probe Location | Sensor Specification | Demo Purpose | Tape / Color Spec |
| :--- | :--- | :--- | :--- | :--- |
| **`LIGHT`** | BH1750 Optical Window | Ambient illuminance detection (150–1000 lx) | Indicates photoperiod light sensor | Black on Yellow (9mm) |
| **`CO2`** | SCD41 Optical NDIR Chamber | True CO2 gas concentration (<1000 ppm) | Indicates air exchange CO2 sensor | Black on Yellow (9mm) |
| **`T/H`** | SHT31-D Sintered Filter Cap | Temperature & Relative Humidity | Indicates primary climate sensor | White on Green (9mm) |

---

## 4. Ready-to-Print Sticker Checklist

| Single-Word Label | Tape Width | Color Spec | Application Target |
| :--- | :--- | :--- | :--- |
| **`POWER`** | 12mm Tape | White on Red | Main AC Rocker Switch |
| **`MAINS`** | 9mm Tape | Yellow on Black | 220VAC Grid Inlet |
| **`ON`** | 9mm Tape | White on Green | Switch Energized Position |
| **`OFF`** | 9mm Tape | White on Red | Switch De-energized Position |
| **`VALVE`** | 12mm Tape | White on Blue | Solenoid Valve Output Port |
| **`PSU`** | 12mm Tape | Black on Silver | 12V 5A Master Power Supply |
| **`BUCK`** | 9mm Tape | Black on White | LM2596 DC-DC Converter |
| **`PROBE`** | 12mm Tape | White on Blue | Port J1 & Umbilical Probe Head |
| **`LIGHT`** | 9mm / 12mm Tape | Black on Yellow | Probe Optical Sensor & Grow LED Strip |
| **`CO2`** | 9mm Tape | Black on Yellow | Probe NDIR Sensor Aperture |
| **`T/H`** | 9mm Tape | White on Green | Probe Temp/Humidity Sensor Cap |
| **`INTAKE`** | 12mm Tape | White on Black | Port J3 & Intake Fan |
| **`EXHAUST`**| 12mm Tape | White on Black | Port J2 & Exhaust Fan |
| **`MIST`** | 12mm Tape | White on Blue | Port J4 & Misting Pump |
