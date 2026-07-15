# KabuTech IoT Tutorial — Part 3: TinyML Anomaly Detection

> Train and deploy a machine learning model on ESP32 to detect environmental anomalies.

---

## What is TinyML and Why Use It?

**TinyML** = Machine Learning that runs directly on microcontrollers like ESP32.

Instead of hard-coded rules like `if (temp > 32) alert()`, the ML model learns **patterns** from normal mushroom house conditions and flags when something looks abnormal — even patterns humans might miss (like a gradual equipment failure).

---

## Step 12: Set Up the Training Environment (on your PC)

### 12.1: Install Python

1. Download Python 3.10+ from [python.org](https://www.python.org/downloads/)
2. During install, check ✅ **"Add Python to PATH"**

### 12.2: Install Libraries

Open terminal/command prompt:

```bash
pip install tensorflow numpy pandas scikit-learn matplotlib
```

---

## Step 13: Generate Training Data

Since we don't have weeks of real sensor data yet, we'll generate **synthetic data** that mimics mushroom house conditions.

Create file `esp32/training/generate_data.py`:

```python
# generate_data.py — Generates synthetic sensor data for TinyML training
import numpy as np
import pandas as pd

np.random.seed(42)
SAMPLES = 10000

# ── Normal mushroom house conditions ──
# Temperature: 22-28°C, slow drift
temp_base = 25 + 3 * np.sin(np.linspace(0, 20 * np.pi, SAMPLES))
temp_noise = np.random.normal(0, 0.3, SAMPLES)
temperature = temp_base + temp_noise

# Humidity: 65-85%, inversely correlated with temp
humidity = 75 - (temperature - 25) * 2 + np.random.normal(0, 1.5, SAMPLES)

# CO2: 400-700 ppm, slight daily cycle
co2 = 550 + 100 * np.sin(np.linspace(0, 15 * np.pi, SAMPLES)) + np.random.normal(0, 20, SAMPLES)

# Light: 200-600 µmol, day/night cycle
light = 400 + 200 * np.sin(np.linspace(0, 10 * np.pi, SAMPLES)) + np.random.normal(0, 15, SAMPLES)

# Clip to realistic bounds
temperature = np.clip(temperature, 18, 32)
humidity = np.clip(humidity, 50, 95)
co2 = np.clip(co2, 350, 900)
light = np.clip(light, 0, 800)

df_normal = pd.DataFrame({
    'temperature': temperature,
    'humidity': humidity,
    'co2': co2,
    'light': light,
    'label': 0  # 0 = normal
})

# ── Anomaly data (10% of samples) ──
n_anomaly = 1000

# Anomaly type 1: Equipment failure (temp spikes + humidity drops)
temp_anom = np.random.uniform(33, 42, n_anomaly)
hum_anom = np.random.uniform(20, 45, n_anomaly)
co2_anom = np.random.uniform(900, 1500, n_anomaly)
light_anom = np.random.uniform(0, 100, n_anomaly)

df_anomaly = pd.DataFrame({
    'temperature': temp_anom,
    'humidity': hum_anom,
    'co2': co2_anom,
    'light': light_anom,
    'label': 1  # 1 = anomaly
})

# Combine and shuffle
df = pd.concat([df_normal, df_anomaly], ignore_index=True)
df = df.sample(frac=1, random_state=42).reset_index(drop=True)

df.to_csv('sensor_data.csv', index=False)
print(f"✅ Generated {len(df)} samples → sensor_data.csv")
print(f"   Normal: {len(df_normal)}, Anomaly: {len(df_anomaly)}")
print(df.describe())
```

Run it:
```bash
cd esp32/training
python generate_data.py
```

---

## Step 14: Train the Anomaly Detection Model

Create file `esp32/training/train_model.py`:

```python
# train_model.py — Train autoencoder for anomaly detection
import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
import matplotlib.pyplot as plt

# ── Load Data ──
df = pd.read_csv('sensor_data.csv')
features = ['temperature', 'humidity', 'co2', 'light']

# Use ONLY normal data for training (autoencoder learns "normal")
df_normal = df[df['label'] == 0][features].values

# ── Normalize to [0, 1] ──
scaler = MinMaxScaler()
data_normalized = scaler.fit_transform(df_normal)

# Save scaler params for ESP32
np.save('scaler_min.npy', scaler.data_min_)
np.save('scaler_max.npy', scaler.data_max_)
print(f"Scaler min: {scaler.data_min_}")
print(f"Scaler max: {scaler.data_max_}")

# ── Create sequences (windows of 30 readings × 4 sensors = 120 features) ──
WINDOW_SIZE = 30

def create_windows(data, window_size):
    windows = []
    for i in range(len(data) - window_size):
        windows.append(data[i:i + window_size].flatten())
    return np.array(windows)

X = create_windows(data_normalized, WINDOW_SIZE)
print(f"Training windows: {X.shape}")  # Should be (N, 120)

X_train, X_val = train_test_split(X, test_size=0.2, random_state=42)

# ── Build Autoencoder ──
input_dim = WINDOW_SIZE * len(features)  # 120

model = tf.keras.Sequential([
    tf.keras.layers.Input(shape=(input_dim,)),
    tf.keras.layers.Dense(64, activation='relu'),
    tf.keras.layers.Dense(32, activation='relu'),
    tf.keras.layers.Dense(16, activation='relu'),     # Bottleneck
    tf.keras.layers.Dense(32, activation='relu'),
    tf.keras.layers.Dense(64, activation='relu'),
    tf.keras.layers.Dense(input_dim, activation='sigmoid')
])

model.compile(optimizer='adam', loss='mse')
model.summary()

# ── Train ──
history = model.fit(
    X_train, X_train,  # Autoencoder: input = target
    epochs=50,
    batch_size=32,
    validation_data=(X_val, X_val),
    verbose=1
)

# ── Determine Anomaly Threshold ──
reconstructions = model.predict(X_val)
mse = np.mean(np.power(X_val - reconstructions, 2), axis=1)

threshold = np.percentile(mse, 95)  # 95th percentile of normal data
print(f"\n🎯 Anomaly threshold: {threshold:.6f}")
print(f"   (readings with MSE > {threshold:.6f} are anomalies)")

# Save threshold
np.save('anomaly_threshold.npy', threshold)

# ── Save Model ──
model.save('kabutech_anomaly_model.h5')

# ── Plot Training Loss ──
plt.figure(figsize=(10, 4))
plt.plot(history.history['loss'], label='Train Loss')
plt.plot(history.history['val_loss'], label='Val Loss')
plt.xlabel('Epoch')
plt.ylabel('MSE Loss')
plt.title('KabuTech TinyML - Autoencoder Training')
plt.legend()
plt.savefig('training_loss.png')
plt.show()

print("\n✅ Model saved → kabutech_anomaly_model.h5")
print("✅ Threshold saved → anomaly_threshold.npy")
```

Run it:
```bash
python train_model.py
```

---

## Step 15: Convert Model to TensorFlow Lite

Create file `esp32/training/convert_to_tflite.py`:

```python
# convert_to_tflite.py — Convert Keras model to quantized TFLite for ESP32
import tensorflow as tf
import numpy as np

# ── Load Model ──
model = tf.keras.models.load_model('kabutech_anomaly_model.h5')

# ── Convert to TFLite with INT8 Quantization ──
converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
converter.target_spec.supported_types = [tf.int8]

tflite_model = converter.convert()

# Save .tflite file
with open('kabutech_model.tflite', 'wb') as f:
    f.write(tflite_model)

print(f"✅ TFLite model size: {len(tflite_model)} bytes ({len(tflite_model)/1024:.1f} KB)")

# ── Convert to C Header Array ──
with open('tinyml_model.h', 'w') as f:
    f.write('// Auto-generated TinyML model for KabuTech anomaly detection\n')
    f.write(f'// Model size: {len(tflite_model)} bytes\n\n')
    f.write('#ifndef TINYML_MODEL_H\n')
    f.write('#define TINYML_MODEL_H\n\n')
    f.write(f'const unsigned int model_len = {len(tflite_model)};\n')
    f.write('alignas(8) const unsigned char model_data[] = {\n  ')

    for i, byte in enumerate(tflite_model):
        f.write(f'0x{byte:02x}')
        if i < len(tflite_model) - 1:
            f.write(', ')
        if (i + 1) % 12 == 0:
            f.write('\n  ')

    f.write('\n};\n\n')

    # Also embed scaler parameters and threshold
    scaler_min = np.load('scaler_min.npy')
    scaler_max = np.load('scaler_max.npy')
    threshold = np.load('anomaly_threshold.npy')

    f.write('// Normalization parameters (min/max for each sensor)\n')
    f.write(f'const float scaler_min[4] = {{{scaler_min[0]:.4f}f, {scaler_min[1]:.4f}f, {scaler_min[2]:.4f}f, {scaler_min[3]:.4f}f}};\n')
    f.write(f'const float scaler_max[4] = {{{scaler_max[0]:.4f}f, {scaler_max[1]:.4f}f, {scaler_max[2]:.4f}f, {scaler_max[3]:.4f}f}};\n')
    f.write(f'const float anomaly_threshold = {float(threshold):.6f}f;\n\n')
    f.write('#endif\n')

print("✅ C header saved → tinyml_model.h")
print("   Copy this file to your Arduino sketch folder!")
```

Run it:
```bash
python convert_to_tflite.py
```

Copy the generated `tinyml_model.h` to your Arduino sketch folder.

---

## Step 16: Add TinyML to ESP32 Firmware

### 16.1: Install TFLite Library

In Arduino IDE: **Sketch → Include Library → Manage Libraries**
Search and install: `TensorFlowLite_ESP32` (by TensorFlow Authors)

### 16.2: Add TinyML Code to Firmware

Add these includes at the top of `kabutech_firmware.ino`:

```cpp
#include <TensorFlowLite_ESP32.h>
#include "tensorflow/lite/micro/all_ops_resolver.h"
#include "tensorflow/lite/micro/micro_interpreter.h"
#include "tensorflow/lite/schema/schema_generated.h"
#include "tinyml_model.h"  // The converted model header
```

Add these global variables after the existing ones:

```cpp
// ── TinyML Variables ──
const int WINDOW_SIZE = 30;
float sensorBuffer[30][4];  // Rolling buffer of last 30 readings
int bufferIndex = 0;
bool bufferFull = false;

// TFLite objects
const tflite::Model* tflModel = nullptr;
tflite::MicroInterpreter* interpreter = nullptr;
constexpr int kTensorArenaSize = 40 * 1024;  // 40 KB
uint8_t tensor_arena[kTensorArenaSize];
```

Add this to the end of `setup()`:

```cpp
  // ── Initialize TinyML ──
  tflModel = tflite::GetModel(model_data);
  static tflite::AllOpsResolver resolver;
  static tflite::MicroInterpreter static_interpreter(
      tflModel, resolver, tensor_arena, kTensorArenaSize);
  interpreter = &static_interpreter;
  interpreter->AllocateTensors();
  Serial.println("✅ TinyML model loaded!");
  Serial.printf("   Model size: %d bytes\n", model_len);
```

Add these functions:

```cpp
void addToBuffer(float temp, float hum, float co2Val, float lightVal) {
    // Normalize using scaler params from training
    sensorBuffer[bufferIndex][0] = (temp - scaler_min[0]) / (scaler_max[0] - scaler_min[0]);
    sensorBuffer[bufferIndex][1] = (hum - scaler_min[1]) / (scaler_max[1] - scaler_min[1]);
    sensorBuffer[bufferIndex][2] = (co2Val - scaler_min[2]) / (scaler_max[2] - scaler_min[2]);
    sensorBuffer[bufferIndex][3] = (lightVal - scaler_min[3]) / (scaler_max[3] - scaler_min[3]);

    bufferIndex = (bufferIndex + 1) % WINDOW_SIZE;
    if (bufferIndex == 0) bufferFull = true;
}

void runTinyMLInference() {
    if (!bufferFull) {
        Serial.println("🧠 TinyML: Buffer not full yet, skipping...");
        return;
    }

    unsigned long startMs = millis();

    // Flatten buffer into model input
    TfLiteTensor* input = interpreter->input(0);
    int idx = 0;
    for (int i = 0; i < WINDOW_SIZE; i++) {
        int pos = (bufferIndex + i) % WINDOW_SIZE;  // Oldest first
        for (int j = 0; j < 4; j++) {
            input->data.f[idx++] = sensorBuffer[pos][j];
        }
    }

    // Run inference
    if (interpreter->Invoke() != kTfLiteOk) {
        Serial.println("❌ TinyML inference failed!");
        return;
    }

    // Calculate reconstruction error (MSE)
    TfLiteTensor* output = interpreter->output(0);
    float mse = 0;
    for (int i = 0; i < WINDOW_SIZE * 4; i++) {
        float diff = input->data.f[i] - output->data.f[i];
        mse += diff * diff;
    }
    mse /= (WINDOW_SIZE * 4);

    unsigned long inferenceMs = millis() - startMs;
    bool isAnomaly = mse > anomaly_threshold;

    Serial.printf("🧠 TinyML: MSE=%.6f, Threshold=%.6f → %s (%dms)\n",
                  mse, anomaly_threshold,
                  isAnomaly ? "⚠️ ANOMALY" : "✅ Normal",
                  inferenceMs);

    // Push result to Firebase
    Firebase.setBool(fbData, "/kabutech/sensors/tinyml/anomaly_detected", isAnomaly);
    Firebase.setString(fbData, "/kabutech/sensors/tinyml/anomaly_type",
                       isAnomaly ? "environmental_anomaly" : "none");
    Firebase.setFloat(fbData, "/kabutech/sensors/tinyml/confidence",
                      isAnomaly ? mse / anomaly_threshold : 1.0 - (mse / anomaly_threshold));
    Firebase.setInt(fbData, "/kabutech/sensors/tinyml/last_inference_ms", inferenceMs);
}
```

In the `loop()`, after `readSensors()`, add:

```cpp
    addToBuffer(temperature, humidity, co2, lightLevel);
```

And add the TinyML timing block:

```cpp
  // ── Run TinyML (every 30 seconds) ──
  if (now - lastTinyMLRun >= TINYML_INTERVAL) {
    lastTinyMLRun = now;
    runTinyMLInference();
  }
```

---

## Step 17: Test the Complete System

### 17.1: Upload Updated Firmware
1. Upload the updated code to ESP32
2. Open Serial Monitor — you should see TinyML inference results:

```
📊 Temp: 26.3°C | Humidity: 72% | CO2: 485 ppm | Light: 312 µmol
📤 Data pushed to Firebase
🧠 TinyML: MSE=0.001234, Threshold=0.005000 → ✅ Normal (12ms)
```

### 17.2: Test Anomaly Detection
- **Blow hot air** on the DHT22 → temperature spikes → TinyML should flag anomaly
- **Cover** the BH1750 → sudden light drop → combined with other changes = anomaly
- Check Firebase Console → `sensors/tinyml/anomaly_detected` should turn `true`
- Check KabuTech web app → alert banner should appear

### 17.3: End-to-End Remote Access Test
1. Open KabuTech web app on your **phone** (over mobile data, not WiFi)
2. Verify dashboard shows real sensor data
3. Toggle a relay from the app → hear the relay click at the mushroom house
4. Trigger an anomaly → see the alert appear on your phone

---

## 📋 Summary Checklist

| # | Task | Status |
|---|---|---|
| 1 | Create Firebase project | ⬜ |
| 2 | Enable Auth + Realtime Database | ⬜ |
| 3 | Set database structure + rules | ⬜ |
| 4 | Add Firebase SDK to web app | ⬜ |
| 5 | Create firebase-config.js | ⬜ |
| 6 | Replace auth with Firebase Auth | ⬜ |
| 7 | Create test users in Firebase | ⬜ |
| 8 | Install Arduino IDE + ESP32 board | ⬜ |
| 9 | Install sensor libraries | ⬜ |
| 10 | Wire DHT22 + MH-Z19B + BH1750 | ⬜ |
| 11 | Wire relay module | ⬜ |
| 12 | Flash base firmware (no TinyML) | ⬜ |
| 13 | Verify data appears in Firebase | ⬜ |
| 14 | Verify web app shows live data | ⬜ |
| 15 | Install Python + TensorFlow | ⬜ |
| 16 | Generate synthetic training data | ⬜ |
| 17 | Train autoencoder model | ⬜ |
| 18 | Convert to TFLite C header | ⬜ |
| 19 | Add TinyML to ESP32 firmware | ⬜ |
| 20 | Test anomaly detection end-to-end | ⬜ |

---

## 🛠 Troubleshooting

| Problem | Solution |
|---|---|
| DHT22 returns NaN | Check 10kΩ pull-up resistor. Try GPIO 15 instead of 4 |
| MH-Z19B reads 0 | Wait 3 min warm-up. Check TX↔RX cross-connection |
| BH1750 not detected | Check I2C wires. Run I2C scanner sketch |
| Firebase "permission denied" | Check security rules allow `.write: true` for sensors |
| ESP32 keeps resetting | Power supply too weak. Use dedicated 5V 2A adapter |
| WiFi keeps disconnecting | Move ESP32 closer to router. Add external antenna |
| TinyML inference fails | Reduce `kTensorArenaSize`. Check model fits in RAM |
| Web app shows 0 values | Check `firebase-config.js` loads after `app.js` |

---

> **🎉 Congratulations!** You now have a complete IoT mushroom monitoring system with real sensors, cloud backend, remote access, and on-device AI anomaly detection.
