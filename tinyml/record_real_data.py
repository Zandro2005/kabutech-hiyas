#!/usr/bin/env python3
"""
KabuTech Hiyas — Real Sensor Data Recorder

Reads the clean CSV lines that the ESP32 prints when CSV_LOG_MODE is enabled
(see firmware/kabutech_prototype/edge_forecast.h):

    CSV:<millis>,<temperature>,<humidity>,<co2>,<light>

and appends them to tinyml/real_sequences.csv, which train_forecaster.py picks
up automatically. Each recording session gets its own sequence_id.

Usage:
  tinyml\\.venv\\Scripts\\python.exe tinyml\\record_real_data.py --port COM5 --hours 24
  (close the Arduino Serial Monitor first — only one program can open the port)
"""

import argparse
import csv
import os
import time

import serial  # pyserial

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", required=True, help="e.g. COM5")
    ap.add_argument("--baud", type=int, default=115200)
    ap.add_argument("--hours", type=float, default=24.0)
    ap.add_argument("--out", default=os.path.join(HERE, "real_sequences.csv"))
    args = ap.parse_args()

    new_file = not os.path.exists(args.out)
    session_id = time.strftime("%Y%m%d%H%M%S")
    deadline = time.time() + args.hours * 3600
    count = 0

    with serial.Serial(args.port, args.baud, timeout=2) as ser, \
            open(args.out, "a", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        if new_file:
            w.writerow(["sequence_id", "timestamp", "temperature", "humidity", "co2", "light"])
        print(f"Recording from {args.port} for {args.hours} h -> {args.out}  (Ctrl+C to stop)")
        try:
            while time.time() < deadline:
                line = ser.readline().decode("utf-8", errors="ignore").strip()
                if not line.startswith("CSV:"):
                    continue
                parts = line[4:].split(",")
                if len(parts) != 5:
                    continue
                w.writerow([session_id] + parts)
                f.flush()
                count += 1
                if count % 20 == 0:
                    print(f"  {count} samples ({count * 30 / 60:.0f} min)  last: {line}")
        except KeyboardInterrupt:
            pass
    print(f"[OK] saved {count} samples (session {session_id})")


if __name__ == "__main__":
    main()
