# 🍄 Biological Baselines & Empirical Thresholds

> **Primary Specimen:** *Pleurotus ostreatus* (Grey Oyster Mushroom)  
> **Source Material:** [refs/REFERENCES.md](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/refs/REFERENCES.md) & [cropProfiles.ts](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/KabutechNative/src/config/cropProfiles.ts)

---

## 🔬 Biological Parameter Matrix (*Pleurotus ostreatus*)

The following empirical thresholds dictate all automated actuation bands, alert triggers, and UI status badges in **Kabutech Hiyas**:

| Environmental Metric | Optimal Fruiting Band | Safety Warning Tier | Critical Fault / Drift | Key Cited Literature | Physiological Impact / Mechanism |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Temperature (°C)** | **18°C – 25°C** | `< 18.0°C` or `> 25.0°C` | `< 15.0°C` or `> 28.0°C` | Islam et al. (2022); Hu et al. (2023); Girmay et al. (2016) | Thermal variations degrade lignocellulolytic enzymes, induce heat shock proteins, and decrease biological efficiency. |
| **Relative Humidity (%)** | **80% – 95%** | `< 80%` or `> 95%` | `< 70%` | Islam et al. (2022); Chong et al. (2023) | Low humidity desiccates delicate pinheads; saturated standing water (>95%) invites bacterial blotch (*Pseudomonas tolaasii*). |
| **Carbon Dioxide (CO₂)** | **≤ 1,000 ppm** | `1,001 – 1,500 ppm` | `> 1,500 ppm` (Severe at `> 2,000 ppm`) | Bellettini et al. (2019); Mohammed et al. (2018); Lin et al. (2022) | High CO₂ suppresses cap expansion, causes stipe elongation ("stemmy" unmarketable basidiocarps), and disrupts proteomic expression. |
| **Light Intensity (lux)** | **150 – 500 lx** *(Max 1,000 lx)* | `< 150 lx` or `> 1,000 lx` | `0 lx` (Total Darkness) | Bellettini et al. (2019); Arjona et al. (2009) | Total darkness inhibits pinhead initiation entirely; excessive direct light (>1,000 lx) causes pileus bleaching and surface dehydration. |

---

## 🍄 Comparative Crop Profiles Matrix

The system supports selectable biological profiles:

| Parameter | Oyster Mushroom (*P. ostreatus*) | Shiitake (*L. edodes*) | Lion's Mane (*H. erinaceus*) |
| :--- | :--- | :--- | :--- |
| **Temperature** | 18–25°C | 15–21°C | 18–24°C |
| **Relative Humidity** | 80–95% | 80–90% | 85–95% |
| **CO₂ Concentration** | ≤ 1,000 ppm | < 1,000 ppm | < 800 ppm |
| **Light Level** | 150–500 lux *(Max 1,000 lx)* | 500–1000 lux | 500–800 lux |
| **Photoperiod** | 10–12 h/day | 8–10 h/day | 8–12 h/day |
| **Air Exchange** | High | Medium | High |

---

## 🧬 Biological Mechanism Justifications

### 1. Desiccation vs Bacterial Blotch
- Pinhead formation requires moist air (>80% RH). If humidity dips below 70%, emerging pinheads abort and dry up within hours.
- If relative humidity remains at 100% without air circulation, condensation films settle onto the mushroom caps, creating a breeding ground for pathogenic *Pseudomonas tolaasii* (bacterial blotch). The system keeps humidity pulsed within 85–95%.

### 2. Carbon Dioxide Morphogenesis
- Fungi consume oxygen and expel CO₂ rapidly during fruiting. 
- In unventilated chambers (>1,500 ppm), fruiting bodies develop elongated, rubbery stems and tiny malformed caps (a survival mechanism where the mushroom attempts to reach higher, fresher air). Purging CO₂ below 1,000 ppm ensures broad, healthy caps.

---
*Return to [[system_overview|System Overview]] | [[academic_references|Academic References]] | [[index|Dashboard]]*
