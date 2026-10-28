# 🔮 Edge Impulse BYOM Deployment Tutorial

> **Original Guide:** [tinyml/EDGE_IMPULSE_TUTORIAL.md](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/tinyml/EDGE_IMPULSE_TUTORIAL.md)  
> **Approach:** Bring Your Own Model (BYOM) via TensorFlow Lite INT8 Quantization

---

## 🚀 Why "Bring Your Own Model" (BYOM)?

Edge Impulse's built-in GUI regression block currently supports predicting only **one** scalar value per model. Because **Kabutech Hiyas** requires simultaneous 4-output regression (`Temp`, `Humidity`, `CO₂`, `Light`), we:
1. Train the multi-output model on the host PC using Keras.
2. Quantize it to fully INT8 using a representative calibration dataset.
3. Upload the `.tflite` model into Edge Impulse using BYOM.
4. Edge Impulse applies **EON Compiler** optimization to generate a memory-efficient C++ Arduino library ready for the ESP32-S3!

---

## 🛠️ Step-by-Step Procedure

### 1. Environment Setup
```powershell
python -m venv tinyml\.venv
tinyml\.venv\Scripts\python.exe -m pip install -r tinyml\requirements.txt
```

### 2. Generate Training Sequences
```powershell
python tinyml\generate_forecast_dataset.py
```
Generates 115,200 synthetic telemetry rows representing 80 separate 12-hour grow house cycles.

### 3. Record Real Hardware Sequences (Optional & Recommended)
1. In `kabutech_prototype.ino`, set `#define CSV_LOG_MODE 1`.
2. Upload sketch to ESP32-S3.
3. Close Serial Monitor and start recording script:
   ```powershell
   tinyml\.venv\Scripts\python.exe tinyml\record_real_data.py --port COM5 --hours 24
   ```
4. Output is saved to `tinyml/real_sequences.csv`.

### 4. Train & Quantize
```powershell
tinyml\.venv\Scripts\python.exe tinyml\train_forecaster.py
```
Outputs created in `tinyml/model/`:
- `forecaster_int8.tflite` (Model to upload to Edge Impulse)
- `representative.npy` (Calibration array for Edge Impulse)
- `firmware/kabutech_prototype/edge_forecast_norm.h` (C++ normalization constants)

### 5. Upload to Edge Impulse Studio
1. In Edge Impulse, create a project named **Kabutech-Hiyas-Forecaster**.
2. Go to **Dashboard → Bring your own model (BYOM)**.
3. Upload `tinyml/model/forecaster_int8.tflite` and `tinyml/model/representative.npy`.
4. Go to **Deployment → Arduino library**, enable **EON Compiler**, and click **Build**.
5. Extract the downloaded zip into your Arduino `libraries/` folder.

---
*Return to [[microclimate_forecasting|Forecasting]] | [[anomaly_detection|Anomaly Detection]] | [[index|Dashboard]]*
