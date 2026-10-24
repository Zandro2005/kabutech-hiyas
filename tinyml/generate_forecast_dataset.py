#!/usr/bin/env python3
"""
KabuTech Hiyas — Edge AI Forecasting Dataset Generator (synthetic)

Creates long, continuous grow-house climate sequences sampled every 30 s,
including the *transition* from healthy conditions into danger (heat waves,
fan failures, mister failures) and the recovery when the reactive controller
kicks in. A forecaster needs these transitions to learn "a spike is coming".

The simulated controller uses exactly the same thresholds as
firmware/kabutech_prototype/kabutech_prototype.ino -> runAutoRegulation().

Zero external dependencies (standard library only).

Usage:
  python tinyml/generate_forecast_dataset.py [--sequences 80] [--hours 12] [--seed 7]

Output:
  tinyml/forecast_sequences.csv
    columns: sequence_id, timestamp, temperature, humidity, co2, light
"""

import argparse
import csv
import math
import os
import random

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
STEP_S = 30                       # 30-second cadence (matches firmware ring buffer)
STEPS_PER_HOUR = 3600 // STEP_S   # 120


def clip(v, lo, hi):
    return max(lo, min(hi, v))


class Event:
    """A disturbance with a smooth ramp-in, plateau and ramp-out."""

    def __init__(self, kind, start, ramp, length, magnitude):
        self.kind = kind
        self.start = start
        self.ramp = ramp
        self.length = length
        self.magnitude = magnitude

    def strength(self, t):
        """0..1 envelope (smoothstep ramps)."""
        if t < self.start or t > self.start + self.length + self.ramp:
            return 0.0
        if t < self.start + self.ramp:
            x = (t - self.start) / self.ramp
        elif t < self.start + self.length:
            x = 1.0
        else:
            x = 1.0 - (t - self.start - self.length) / self.ramp
        x = clip(x, 0.0, 1.0)
        return x * x * (3 - 2 * x)


def random_events(rng, n_steps):
    events = []
    n = rng.randint(1, 4)
    for _ in range(n):
        kind = rng.choice(["heatwave", "fan_failure", "mister_failure", "co2_burst"])
        start = rng.randint(STEPS_PER_HOUR // 2, max(STEPS_PER_HOUR, n_steps - STEPS_PER_HOUR))
        ramp = rng.randint(20, 180)             # 10 – 90 min onset
        length = rng.randint(60, 360)           # 30 min – 3 h
        magnitude = rng.uniform(0.6, 1.0)
        events.append(Event(kind, start, ramp, length, magnitude))
    return events


def simulate_sequence(seq_id, n_steps, rng):
    # Per-sequence "personality" (different grow houses / seasons)
    base_temp = rng.uniform(21.0, 24.5)
    day_swing = rng.uniform(0.8, 2.5)
    base_rh = rng.uniform(84.0, 90.0)
    co2_prod = rng.uniform(3.0, 7.0)            # ppm per 30 s from mycelium
    phase = rng.uniform(0, 2 * math.pi)
    start_hour = rng.uniform(0, 24)
    events = random_events(rng, n_steps)

    T = base_temp + rng.uniform(-0.5, 0.5)
    H = base_rh + rng.uniform(-2, 2)
    C = rng.uniform(550, 800)

    exhaust = mister = light_on = False
    rows = []

    for t in range(n_steps):
        hour = (start_hour + t / STEPS_PER_HOUR) % 24

        heat = fan_fail = mist_fail = co2_burst = 0.0
        for e in events:
            s = e.strength(t) * e.magnitude
            if e.kind == "heatwave":
                heat = max(heat, s)
            elif e.kind == "fan_failure":
                fan_fail = max(fan_fail, s)
            elif e.kind == "mister_failure":
                mist_fail = max(mist_fail, s)
            elif e.kind == "co2_burst":
                co2_burst = max(co2_burst, s)

        # ── Equilibrium targets ──
        daily = math.sin(2 * math.pi * (hour - 9) / 24 + phase * 0.2)
        T_eq = base_temp + day_swing * daily + heat * rng.uniform(9.0, 11.0)
        H_eq = base_rh - 4.0 * max(0.0, daily) - mist_fail * 35.0 - heat * 10.0

        fans_effective = exhaust and fan_fail < 0.5
        mister_effective = mister and mist_fail < 0.5

        # ── Temperature ──
        dT = 0.025 * (T_eq - T)
        if fans_effective:
            dT -= 0.03 * max(0.0, T - (base_temp - 1.0))
        if light_on:
            dT += 0.004
        T = T + dT + rng.gauss(0, 0.04)

        # ── Humidity (warming lowers RH) ──
        dH = 0.03 * (H_eq - H) - 1.6 * dT
        if mister_effective:
            dH += 0.9
        if fans_effective:
            dH -= 0.25
        H = clip(H + dH + rng.gauss(0, 0.25), 20.0, 100.0)

        # ── CO2 ──
        prod = co2_prod * (1.0 + 1.5 * fan_fail + 2.0 * co2_burst)
        leak = 0.008 * (C - 420)
        vent = 0.08 * (C - 420) if fans_effective else 0.0
        C = clip(C + prod - leak - vent + rng.gauss(0, 4), 400, 5000)

        # ── Light (daylight leakage + grow light) ──
        daylight = max(0.0, math.sin(math.pi * (hour - 6) / 12)) * rng.uniform(60, 130) if 6 <= hour <= 18 else 0.0
        L = daylight + (380.0 if light_on else 0.0) + rng.gauss(0, 8)
        L = clip(L, 0, 2000)

        rows.append([seq_id, t * STEP_S * 1000, round(T, 2), round(H, 2), int(round(C)), int(round(L))])

        # ── Reactive controller (mirrors runAutoRegulation thresholds) ──
        cold = T < 16.0
        need_co2 = (C > 1000) if exhaust else (C > 1150)
        need_hum = (H > 95.0) if exhaust else (H >= 100.0)
        need_temp = (T > 26.0) if exhaust else (T > 27.0)
        exhaust = (not cold) and (need_co2 or need_hum or need_temp)
        if H < 75.0:
            mister = True
        elif H >= 85.0:
            mister = False
        if L < 100:
            light_on = True
        elif L >= 150 + (380 if light_on else 0):
            light_on = False

    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sequences", type=int, default=80)
    ap.add_argument("--hours", type=float, default=12.0)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--out", default=os.path.join(OUTPUT_DIR, "forecast_sequences.csv"))
    args = ap.parse_args()

    rng = random.Random(args.seed)
    n_steps = int(args.hours * STEPS_PER_HOUR)

    total = 0
    with open(args.out, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["sequence_id", "timestamp", "temperature", "humidity", "co2", "light"])
        for s in range(args.sequences):
            rows = simulate_sequence(s, n_steps, rng)
            w.writerows(rows)
            total += len(rows)

    print(f"[OK] {args.out}")
    print(f"     {args.sequences} sequences x {n_steps} steps (30 s) = {total} rows")


if __name__ == "__main__":
    main()
