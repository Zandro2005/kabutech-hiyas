# 🚨 Edge AI Anomaly Detection & Failure Modes

> **Data Directory:** [tinyml/](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/tinyml)  
> **Pre-Recorded Signatures:** `fan_failure_anomaly.csv`, `mister_failure_anomaly.csv`, `thermal_runaway_anomaly.csv`

---

## ⚠️ Hardware Failure Signatures

Agricultural sensors exhibit distinct multi-variable correlation patterns when mechanical hardware components fail:

```
Fault Type          Sensor Signatures                                              Root Cause
─────────────────────────────────────────────────────────────────────────────────────────────────────────────
Fan Failure         CO2 rapidly climbing (>1,200 ppm) + Humidity stagnant         Exhaust fan motor stall,
                    or climbing + Temperature slowly drifting upwards             clogged intake louver

Mister Failure      Humidity dropping below 75% despite Relay ON +                Nozzle calcification, pump
                    Flow sensor = 0 L/min                                         airlock, empty water tank

Thermal Runaway     Temperature climbing above 27.5°C with no cooling             Heater relay stuck ON,
                    response despite full exhaust fan speed                       ambient heatwave outside
```

---

## 🔍 Synthetic vs Dynamic Transition Datasets

- **Static Fault CSVs (`*_anomaly.csv`)**:
  Pre-recorded static datasets where the failure state is already active. Excellent for evaluating classification algorithms.
- **Dynamic Transition Sequences (`forecast_sequences.csv`)**:
  Simulates the **onset** and gradual ramp-up of the failure over 30 to 60 minutes. This allows the forecaster to recognize early warning drift patterns before the safety limits are exceeded.

---

## 🛡️ Corrective Escalation Protocol

1. **Tier 1 (Soft Correction)**: If anomaly detected, pulse exhaust fans for 60 seconds and re-evaluate sensor drift.
2. **Tier 2 (Hardware Interlock)**: If misting pump runs for >3 minutes with no humidity rise, shut down the pump relay to prevent overheating the motor.
3. **Tier 3 (Push Alert)**: Broadcast high-priority alert to the mobile app (`AlertsScreen.tsx`) specifying the exact failed component.

---
*Return to [[microclimate_forecasting|Forecasting]] | [[edge_impulse_tutorial|Tutorial]] | [[index|Dashboard]]*
