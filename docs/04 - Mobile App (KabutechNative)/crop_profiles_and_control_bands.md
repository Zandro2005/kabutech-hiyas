# 🌾 Crop Profiles & Control Bands Configuration

> **Source Files:** [KabutechNative/src/config/cropProfiles.ts](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/KabutechNative/src/config/cropProfiles.ts) & [controlBands.ts](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/KabutechNative/src/config/controlBands.ts)

---

## 🎛️ Control Bands Architecture

The automation engine evaluates environmental readings through four concentric bands:

```
[ CRITICAL LOW ]  <-- < 15.0°C
       ▲
[ WARNING LOW ]   <-- 15.0°C to 17.9°C
       ▲
┌────────────────────────────────────────────────────────┐
│               OPTIMAL BIOLOGICAL BAND                  │
│                    18.0°C to 25.0°C                    │
│   (Target: 23.5°C — Hysteresis Window: ±0.5°C)         │
└────────────────────────────────────────────────────────┘
       ▼
[ WARNING HIGH ]  <-- 25.1°C to 28.0°C
       ▼
[ CRITICAL HIGH ] <-- > 28.0°C
```

---

## 🍄 Complete Preset Specifications

```typescript
export const CROP_PROFILES = {
  oyster_mushroom: {
    id: "oyster_mushroom",
    name: "Oyster Mushroom (Pleurotus ostreatus)",
    scientificName: "Pleurotus ostreatus",
    description: "High-yield commercial variety requiring high humidity (>85%) and low CO2 (<1000 ppm).",
    temperature: { min: 18.0, max: 25.0, target: 23.5, unit: "°C" },
    humidity:    { min: 80.0, max: 95.0, target: 90.0, unit: "%" },
    co2:         { min: 400,  max: 1000, target: 800,  unit: "ppm" },
    light:       { min: 150,  max: 500,  target: 350,  unit: "lux" },
    photoperiodHours: 10,
    flushCycleDays: 7,
  },
  shiitake: {
    id: "shiitake",
    name: "Shiitake (Lentinula edodes)",
    scientificName: "Lentinula edodes",
    description: "Prefers cooler temperatures and slightly lower relative humidity for firm cap texture.",
    temperature: { min: 15.0, max: 21.0, target: 18.0, unit: "°C" },
    humidity:    { min: 80.0, max: 90.0, target: 85.0, unit: "%" },
    co2:         { min: 400,  max: 1000, target: 750,  unit: "ppm" },
    light:       { min: 500,  max: 1000, target: 700,  unit: "lux" },
    photoperiodHours: 8,
    flushCycleDays: 14,
  },
  lions_mane: {
    id: "lions_mane",
    name: "Lion's Mane (Hericium erinaceus)",
    scientificName: "Hericium erinaceus",
    description: "Extremely sensitive to CO2; high air exchange required to prevent icicle deformity.",
    temperature: { min: 18.0, max: 24.0, target: 21.0, unit: "°C" },
    humidity:    { min: 85.0, max: 95.0, target: 92.0, unit: "%" },
    co2:         { min: 400,  max: 800,  target: 600,  unit: "ppm" },
    light:       { min: 500,  max: 800,  target: 650,  unit: "lux" },
    photoperiodHours: 10,
    flushCycleDays: 10,
  }
};
```

---
*Return to [[screens_and_features|Screens & Features]] | [[biological_baselines|Biological Baselines]] | [[index|Dashboard]]*
