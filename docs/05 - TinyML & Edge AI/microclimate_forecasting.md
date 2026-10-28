# 🔮 Microclimate Predictive Forecaster

> **Target Platform:** ESP32-S3 (On-Device Inference via Edge Impulse / TFLite Micro)  
> **Source Scripts:** [tinyml/train_forecaster.py](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/tinyml/train_forecaster.py) & [tinyml/generate_forecast_dataset.py](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/tinyml/generate_forecast_dataset.py)  
> **Firmware Header:** [firmware/kabutech_prototype/edge_forecast.h](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/firmware/kabutech_prototype/edge_forecast.h)

---

## 🎯 The Core Concept

Traditional greenhouse controllers operate purely **reactively**:
- *Temperature passes 26.0°C → Turn fan ON.* By the time fans evacuate the heat, the mushroom caps have already been exposed to thermal stress for 10 minutes.

**Kabutech Hiyas operates PRE-EMPTIVELY**:
- The model continuously monitors the rate of thermal and humidity drift over the past 10 minutes.
- If it forecasts that temperature **will cross 26.5°C ten minutes from now**, the controller activates the exhaust fan **now**, blunting the spike before it ever hits the crop.

```
Past 10 Minutes (20 samples @ 30s)          Future 10 Minutes
[════════════════════════════════] ──► AI ──► [---------------->]
                                              Predicted +10m:
                                              Temp:   +1.4 °C  (Spike predicted!)
                                              RH:     -6.2 %
                                              CO2:    +180 ppm
                                                     │
                                                     ▼
                                      Pre-emptive Action Triggered:
                                      Exhaust Fan ON immediately!
```

---

## 🧮 Model Input & Output Architecture

- **Inputs (80 values)**: 20 time steps × 4 sensor streams (`Temperature`, `Humidity`, `CO₂`, `Light`).
- **Feature Engineering**:
  - Steps 0 to 18: `(x[i] - x[latest]) / rel_std[s]` → Represents the dynamic slope/trend.
  - Step 19: `(x[latest] - mean[s]) / std[s]` → Represents the current absolute baseline level.
- **Outputs (4 values)**: Normalized deltas for each metric at $t + 10\text{ minutes}$.
- **Reconstruction in C++**:
  $$\text{Predicted Value} = x_{\text{latest}} + (\Delta_{\text{pred}} \times \sigma_{\Delta})$$

---

## 📊 Training Pipeline & Accuracy Targets

Run training from repository root:
```powershell
python tinyml\generate_forecast_dataset.py
tinyml\.venv\Scripts\python.exe tinyml\train_forecaster.py
```

### Evaluation Targets (@ +10 min horizon):
| Metric | AI Model MAE | Baseline (No-Change) MAE | Improvement |
| :--- | :--- | :--- | :--- |
| **Temperature** | **≤ 0.35 °C** | 1.15 °C | **> 65% better** |
| **Humidity** | **≤ 1.8 % RH** | 5.4 % RH | **> 60% better** |
| **CO₂** | **≤ 45 ppm** | 140 ppm | **> 65% better** |
| **Early Warning** | Caught > 85% of upcoming heat/CO₂ spikes with > 90% precision |

---
*Return to [[edge_impulse_tutorial|Edge Impulse Tutorial]] | [[anomaly_detection|Anomaly Detection]] | [[index|Dashboard]]*
