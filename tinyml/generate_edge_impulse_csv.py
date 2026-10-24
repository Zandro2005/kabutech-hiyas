#!/usr/bin/env python3
"""
KabuTech Hiyas — Edge Impulse Training Data Generator
Generates CSV files formatted for Edge Impulse Studio time-series upload.
Zero external dependencies required (uses standard library math, random, csv).

Usage:
  python tinyml/generate_edge_impulse_csv.py

Output:
  - normal_conditions.csv         (10,000 samples of healthy mushroom climate)
  - fan_failure_anomaly.csv       (500 samples of rising CO2 + rising temp)
  - mister_failure_anomaly.csv    (500 samples of plunging humidity)
  - thermal_runaway_anomaly.csv   (500 samples of rapid temp spike)
"""

import csv
import math
import os
import random

random.seed(42)
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
INTERVAL_MS = 2000  # 2-second intervals matching ESP32 telemetry cadence (0.5 Hz)


def clip(val, low, high):
    return max(low, min(high, val))


def write_csv(filename, rows):
    filepath = os.path.join(OUTPUT_DIR, filename)
    with open(filepath, mode='w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['timestamp', 'temperature', 'humidity', 'co2', 'light'])
        writer.writerows(rows)
    print(f"  [OK] {filename} — {len(rows)} samples")


def generate_normal_data(n_samples=10000):
    """Generate realistic Oyster Mushroom (Pleurotus ostreatus) fruiting conditions.

    Optimal baseline (Islam et al., 2022; Hu et al., 2023; Bellettini et al., 2019):
      Temperature: 18-25 °C (with grace up to 27 °C)
      Humidity:    80-95 % RH
      CO2:         400-1000 ppm
      Light:       150-850 lux
    """
    rows = []
    for t in range(n_samples):
        temp_base = 22.5 + 2.5 * math.sin(2 * math.pi * t / 1800)
        temp = clip(temp_base + random.gauss(0, 0.3), 18.0, 26.5)

        hum_base = 87.0 - (temp - 22.5) * 1.5
        hum = clip(hum_base + random.gauss(0, 1.2), 78.0, 95.0)

        co2_base = 650 + 150 * math.sin(2 * math.pi * t / 2400)
        co2 = int(clip(co2_base + random.gauss(0, 15), 400, 980))

        light_base = 400 + 150 * math.sin(2 * math.pi * t / 3600)
        light = int(clip(light_base + random.gauss(0, 10), 150, 850))

        rows.append([t * INTERVAL_MS, round(temp, 1), round(hum, 1), co2, light])
    return rows


def generate_fan_failure(n_samples=500):
    """Simulate exhaust/intake fan failure: CO2 rises >1200 ppm, temperature climbs."""
    rows = []
    for t in range(n_samples):
        frac = t / n_samples
        temp = clip(25.0 + frac * 10.0 + random.gauss(0, 0.4), 24.0, 38.0)
        co2 = int(clip(950 + frac * 1200 + random.gauss(0, 25), 900, 2500))
        hum = clip(85.0 - frac * 12.0 + random.gauss(0, 1.5), 55.0, 92.0)
        light = int(clip(400 + random.gauss(0, 20), 150, 700))
        rows.append([t * INTERVAL_MS, round(temp, 1), round(hum, 1), co2, light])
    return rows


def generate_mister_failure(n_samples=500):
    """Simulate misting system failure or dry water tank: humidity plunges rapidly <75%."""
    rows = []
    for t in range(n_samples):
        frac = t / n_samples
        hum = clip(84.0 - frac * 45.0 + random.gauss(0, 1.0), 25.0, 88.0)
        temp = clip(24.0 + frac * 5.0 + random.gauss(0, 0.3), 22.0, 32.0)
        co2 = int(clip(650 + random.gauss(0, 30), 400, 950))
        light = int(clip(400 + random.gauss(0, 15), 150, 700))
        rows.append([t * INTERVAL_MS, round(temp, 1), round(hum, 1), co2, light])
    return rows


def generate_thermal_runaway(n_samples=500):
    """Simulate severe ambient heatwave or thermal runaway: rapid temperature spike."""
    rows = []
    for t in range(n_samples):
        frac = t / n_samples
        temp = clip(25.0 + (frac ** 0.7) * 17.0 + random.gauss(0, 0.5), 24.0, 44.0)
        hum = clip(82.0 - frac * 40.0 + random.gauss(0, 2.0), 20.0, 85.0)
        co2 = int(clip(650 + frac * 900 + random.gauss(0, 30), 450, 2000))
        light = int(clip(450 + random.gauss(0, 30), 150, 900))
        rows.append([t * INTERVAL_MS, round(temp, 1), round(hum, 1), co2, light])
    return rows


if __name__ == '__main__':
    print("Generating Edge Impulse training data...")
    write_csv('normal_conditions.csv', generate_normal_data(10000))
    write_csv('fan_failure_anomaly.csv', generate_fan_failure(500))
    write_csv('mister_failure_anomaly.csv', generate_mister_failure(500))
    write_csv('thermal_runaway_anomaly.csv', generate_thermal_runaway(500))
    print("\nDone! Upload these CSVs to Edge Impulse Studio -> Data Acquisition -> CSV Wizard")
