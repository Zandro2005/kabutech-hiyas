# 🔮 KabuTech Hiyas — Edge AI Forecasting with Edge Impulse
### Step-by-step: from zero to a forecasting model running on the ESP32-S3

The ESP32 learns to **predict temperature, humidity, CO₂ and light 10 minutes ahead**, using the last 10 minutes of readings. If the forecast crosses a danger threshold, AUTO mode turns on the fans or mister **before** the live reading gets there.

```
 Sensors (every 1 s) ─► ring buffer (1 sample / 30 s, last 20) ─► Edge Impulse model ─► +10 min forecast
                                                                                         │
                           runAutoRegulation()  ◄── pre-emptive ON (same thresholds) ◄───┤
                           Firebase /kabutech/sensors/live  ◄── ai_pred_* fields ◄───────┘
```

> **Why 10 minutes and not 2 h / 6 h / 24 h?**
> The microcontroller holds only a few minutes of history in RAM. Short forecasts are what you need to stop a spike.
> The long-range charts belong in the app, which already has hourly history in Firebase.

> **Why train on the PC, then upload to Edge Impulse?**
> Edge Impulse's built-in regression block predicts **one** number per model; we need **four**.
> So you train one small 4-output model with the script below, then use Edge Impulse's **Bring Your Own Model (BYOM)**.
> Edge Impulse still quantizes, optimizes (EON), profiles it for the ESP32 and builds the Arduino library.

---

## 0. What you need

| Item | Check |
|---|---|
| ESP32-S3 prototype running `kabutech_prototype.ino` | ✅ already built |
| Python 3.10–3.13 | `python --version` |
| Arduino IDE 2.x with the ESP32 core | already used for this project |
| Free Edge Impulse account | https://studio.edgeimpulse.com/signup |

---

## 1. Set up the Python tools (one time)

From the repository root (`kabutech-hiyas-main`), in PowerShell:

```powershell
python -m venv tinyml\.venv
tinyml\.venv\Scripts\python.exe -m pip install -r tinyml\requirements.txt
```

---

## 2. Generate the synthetic training data

```powershell
python tinyml\generate_forecast_dataset.py
```

This creates `tinyml/forecast_sequences.csv`: 80 simulated 12-hour grow-house runs at 30 s steps (115,200 rows). It includes heat waves, fan failures, mister failures and CO₂ bursts. The simulated controller uses **the same thresholds as your firmware**, so the model also learns how the fans and mister pull values back.

> The old `normal_conditions.csv` / `*_anomaly.csv` files are for classification. They start already in a fault state, so they can't teach the model *how* a spike builds up. This script generates the transitions.

---

## 3. (Recommended) Record REAL data from your grow house

Synthetic data gets you started; real data makes the model accurate for *your* room.

1. In `kabutech_prototype.ino`, set:
   ```cpp
   #define CSV_LOG_MODE    1
   ```
2. Upload the sketch. Serial Monitor now shows a line like this every 30 s:
   `CSV:123456,23.41,86.20,712,402`
3. **Close the Serial Monitor**, then record. Find your COM port in Arduino IDE → Tools → Port:
   ```powershell
   tinyml\.venv\Scripts\python.exe tinyml\record_real_data.py --port COM5 --hours 24
   ```
4. Let it run for at least **24 h**; several days is better. Each run is appended to `tinyml/real_sequences.csv`.
5. Set `CSV_LOG_MODE` back to `0` when you're done.

---

## 4. Train the model

```powershell
tinyml\.venv\Scripts\python.exe tinyml\train_forecaster.py
```

If `tinyml/real_sequences.csv` exists, it's picked up automatically and counted 3× as much as synthetic data.

Read the report at the end:

```
=== Test error @ +10 min (lower is better) ===
sensor         model MAE   no-change MAE   improvement
temperature      0.xx °C        0.xx °C          xx %
humidity         x.xx %RH       x.xx %RH         xx %
...
Early warning (temp will cross 27 °C in 10 min while still below it now):
  caught xx% of upcoming spikes, precision xx%
```

* **model MAE** = average forecast error. Targets: temperature ≤ 0.5 °C, humidity ≤ 2 %RH, CO₂ ≤ 60 ppm.
* **no-change MAE** = the error from simply guessing "it will stay the same". The model **must beat this**.
* **caught xx %** = how many upcoming temperature spikes the AI flagged in advance.

Files created in `tinyml/model/`:

| File | Used for |
|---|---|
| `forecaster_float32.tflite` | ⬆️ upload to Edge Impulse |
| `representative.npy` | ⬆️ upload to Edge Impulse (int8 calibration) |
| `test_x.npy` | ⬆️ upload to Edge Impulse (sanity check) |
| `forecaster_int8.tflite` | backup, already quantized |
| `normalization.json` | scaling constants |

The script also **automatically writes** `firmware/kabutech_prototype/edge_forecast_norm.h`. That file holds the same scaling constants, so the ESP32 scales its inputs exactly the way the model was trained.

> ⚠️ Every time you retrain, re-upload the model **and** re-flash the firmware. The model and `edge_forecast_norm.h` must come from the same training run.

---

## 5. Create the Edge Impulse project

1. Go to https://studio.edgeimpulse.com → **Create new project**.
2. Name it exactly **`kabutech_forecast`**. The Arduino library will then be called `kabutech_forecast_inferencing.h`, which the firmware already expects.
3. Project type: **Personal** → **Create**.

---

## 6. Upload the model (BYOM)

1. On the project **Dashboard**, click **Upload your model**. You can also reach it from the left menu: **Impulse design** → **Upload your model**.
2. **Step 1 – Upload pretrained model**
   * Model file: `tinyml/model/forecaster_float32.tflite`
   * Representative features: `tinyml/model/representative.npy`
   * Target device for profiling: **Espressif ESP-EYE (ESP32 240MHz)**, the closest profile to the ESP32-S3.
   * Click **Upload your model**.
3. **Step 2 – Process model**
   * **Model input:** `Other (e.g. tabular, time-series)`. The input length should show **80**.
   * **Model output:** select **Classification** and enter these 4 labels, **in this exact order**:
     ```
     a_dtemp, b_dhum, c_dco2, d_dlight
     ```
     > **Why "Classification"?** Edge Impulse's *Regression* output type exposes only one value.
     > The model's last layer is linear (no softmax), so the four "class scores" are the raw forecast values.
     > They can be negative, which is fine. The `a_ b_ c_ d_` prefixes keep the order fixed even if Edge Impulse sorts labels alphabetically.
   * Click **Save model**.
4. **Step 3 – Check model behavior**
   * Upload `tinyml/model/test_x.npy`. You should see 4 numbers per row, roughly between −3 and +3.
   * Check **On-device performance**. The expected range for this 80→32→16→4 network:
     * RAM < 5 KB
     * Flash < 20 KB
     * Latency ~1 ms

---

## 7. Build the Arduino library

1. Left menu → **Deployment**.
2. Search for **Arduino library** and select it.
3. Optimizations:
   * **Quantized (int8)** — smallest and fastest. Compare its accuracy with float32 on this screen.
   * Enable **EON Compiler**.
4. Click **Build**. A file like `ei-kabutech_forecast-arduino-1.0.1.zip` downloads.

---

## 8. Install the library and enable Edge AI

1. Arduino IDE → **Sketch → Include Library → Add .ZIP Library…** → choose the downloaded zip.
2. Open `firmware/kabutech_prototype/kabutech_prototype.ino` and set:
   ```cpp
   #define ENABLE_EDGE_AI  1
   ```
3. If your project name differs, edit this line in `edge_forecast.h`:
   ```cpp
   #define EF_EI_HEADER <your_project_name_inferencing.h>
   ```
4. Board settings stay the same: **ESP32S3 Dev Module**, partition **Huge APP**.
5. **Upload.** The first compile of the Edge Impulse SDK takes a few minutes.

---

## 9. Verify on the device

Open the Serial Monitor at 115200 baud.

| Time after boot | What you see |
|---|---|
| 0–10 min | Normal sensor logs. `ai_action = "warming_up"` while the 20-sample buffer fills. |
| after 10 min | Every 30 s: `🔮 [Edge AI] +10 min forecast: T=24.1°C  H=86.3%  CO2=742ppm  L=401lx  (900 µs)` |

**Spike test:**
1. Warm the SHT3x sensor gently with your hand or a hair dryer on low, from a distance.
2. Temperature starts rising. Watch for `predTemp10m` passing **27 °C** while the live reading is still below 27 °C.
3. The exhaust and intake LEDs should turn on early, and `ai_action` changes to `preempt_exhaust_temp`.

**Firebase check:** `/kabutech/sensors/live` now contains:

```json
"ai_ready": true,
"ai_action": "none",
"ai_pred_temp_10m": 24.1,
"ai_pred_hum_10m": 86.3,
"ai_pred_co2_10m": 742,
"ai_pred_light_10m": 401
```

---

## 9b. 100% Offline Operation Verification (TFT & Main Box)

The Edge AI forecaster runs **completely on-chip** on the ESP32-S3 without any internet or WiFi required.

**Test disconnecting WiFi:**
1. Turn off your WiFi router or set incorrect WiFi credentials.
2. Observe the physical **3.2" TFT screen**:
   - The screen **does NOT turn off, freeze, or display "OFFLINE"** as a system failure.
   - The top-right pill changes to **`LOCAL`** (in cyan), confirming the controller is operating 100% autonomous locally.
   - The footer displays **`AUTO*AI`** in green (or **`PREEMPT`** in amber when actively intervening).
   - Sensor readings update continuously every 500 ms.
3. Observe the **Mobile App** (Firebase):
   - The mobile app will indicate that cloud telemetry is offline (since the remote internet link is down).
   - However, the physical mushroom house box and Edge AI continue running at full capacity on site.

---

## 10. How the pre-emptive control works (safety rules)

| Forecast (+10 min) | Action | Same as the reactive rule? |
|---|---|---|
| Temp > 27 °C (stays on until forecast ≤ 26 °C) | Exhaust + intake ON early | ✅ same thresholds and hysteresis |
| CO₂ > 1150 ppm (stays on until ≤ 1000) | Exhaust + intake ON early | ✅ |
| Humidity < 75 % | Mister ON early | ✅ (OFF still at ≥ 85 %) |

* The AI can only switch actuators **ON earlier**. It never blocks a safety OFF.
* **Cold lockout** (< 16 °C → fans OFF) still wins.
* Only runs in **AUTO** mode. MANUAL and TIMED modes ignore it.
* If more than half of the last 20 samples came from a faulted sensor, the AI stops trusting itself (`ai_action = "sensor_fault"`).
* With `ENABLE_EDGE_AI 0`, the firmware behaves exactly as before.

---

## 11. Improve it over time (retraining loop)

```
record_real_data.py (days) ─► train_forecaster.py ─► Edge Impulse BYOM re-upload ─► Deployment zip ─► re-flash
```

1. Record more real data, especially on hot afternoons and during misting cycles.
2. Retrain. The improvement % against "no-change" should go up.
3. In Edge Impulse: Dashboard → **Upload your model** again (it replaces the old one) → Deployment → Build.
4. In Arduino IDE, remove the old library folder (`Documents/Arduino/libraries/kabutech_forecast_inferencing`), add the new zip, then re-flash. That build also picks up the new `edge_forecast_norm.h`.

---

## 12. Troubleshooting

| Problem | Fix |
|---|---|
| `kabutech_forecast_inferencing.h: No such file` | The library isn't installed, or the project name differs (step 8.3). Or set `ENABLE_EDGE_AI 0`. |
| `edge_forecast_norm.h: No such file` | Run `train_forecaster.py`; it generates the header. |
| Forecast is constant or nonsense | The model and `edge_forecast_norm.h` come from different training runs. Retrain, re-upload, re-flash. Also check the label order (step 6.3). |
| Only 1 forecast value changes | You picked **Regression** in step 6.3. Re-upload and choose **Classification** with 4 labels. |
| `run_classifier failed (-x)` | Re-build the library with the **EON Compiler**. Check that the model input length is 80. |
| Sketch too big | Make sure the partition scheme is **Huge APP (3MB No OTA)**. |
| `record_real_data.py` can't open COM port | Close the Arduino Serial Monitor first. |
| Fans keep switching on too early | Retrain with more real data, or raise the AI thresholds in `runAutoRegulation()` (e.g. `predTemp10m > 27.5`). |
