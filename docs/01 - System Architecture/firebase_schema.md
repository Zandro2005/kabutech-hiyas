# 🗄️ Firebase Realtime Database Schema

The **Kabutech Hiyas** ecosystem syncs state bi-directionally between the ESP32 microcontroller and the React Native mobile app using Google Firebase Realtime Database (`/kabutech`).

---

## 🌳 Root Data Tree Structure

```json
{
  "kabutech": {
    "sensors": {
      "live": { ... },
      "history": { ... }
    },
    "settings": {
      "setpoints": { ... },
      "controlBands": { ... },
      "activeCrop": "oyster_mushroom"
    },
    "device": {
      "status": "ONLINE",
      "firmwareVersion": "2.0.0",
      "wifiSignal": -58,
      "uptime": 86400,
      "lastSeen": 1726115000
    },
    "staff": {
      "tasks": { ... },
      "reports": { ... },
      "approvals": { ... }
    }
  }
}
```

---

## 📊 Live Sensor Telemetry (`/kabutech/sensors/live`)

Updated by the ESP32 every **1 to 5 seconds** (or when values drift beyond delta deadbands).

| Field | Type | Unit | Description |
| :--- | :--- | :--- | :--- |
| `temperature` | `number` | °C | Ambient canopy temperature (from SHT31-D) |
| `humidity` | `number` | % RH | Relative humidity at canopy level (from SHT31-D) |
| `co2` | `number` | ppm | Carbon dioxide concentration (from SCD41 NDIR) |
| `light` | `number` | lux | Ambient illuminance (from BH1750) |
| `waterLevel` | `number` | % / bool | Reservoir status (capacitive level sensor XKC-Y25) |
| `waterFlow` | `number` | L/min | Active mist line flow rate (YF-S201 Hall sensor) |
| `esp32_status` | `string` | — | `"ONLINE"` \| `"OFFLINE"` \| `"CALIBRATING"` |
| `ai_pred_temp` | `number` | °C | TinyML 10-minute predicted temperature |
| `ai_pred_humidity` | `number` | % RH | TinyML 10-minute predicted humidity |
| `ai_pred_co2` | `number` | ppm | TinyML 10-minute predicted CO₂ concentration |
| `ai_pred_light` | `number` | lux | TinyML 10-minute predicted light level |

---

## ⚙️ Control Settings & Actuator Overrides (`/kabutech/settings`)

Managed by the mobile app or automatically initialized upon first boot:

```json
{
  "setpoints": {
    "temperature": 24.0,
    "humidity": 90.0,
    "light": 500,
    "co2": 900,
    "mode": "auto",
    "devices": {
      "fans": false,
      "misters": true,
      "lights": true,
      "waterValve": false
    }
  }
}
```

### Modes
- `"auto"`: The ESP32's local PID and hysteresis logic autonomously controls all relays.
- `"manual"`: Relays follow explicit boolean values inside `devices/*`.
- `"schedule"`: Timers dictate lighting photoperiods (e.g. 10 hours ON, 14 hours OFF) and periodic purge cycles.

---

## 📶 Heartbeat & Connection Health

The ESP32 updates `lastSeen` with its epoch timestamp periodically. The mobile app uses Firebase `.info/connected` along with evaluating `lastSeen > (now - 30 seconds)` to transition UI into **Live** or **Offline** status.

---
*Return to [[system_overview|System Overview]] | [[index|Dashboard]]*
