# 🗄️ Firebase Realtime Database Schema

The **Kabutech Hiyas** ecosystem syncs state bi-directionally between the ESP32-S3 microcontroller and the React Native mobile client using Google Firebase Realtime Database.

> **Database URL:** `https://kabutech-hiyas-default-rtdb.asia-southeast1.firebasedatabase.app`  
> **Root Node:** `/kabutech` and `/users`

---

## 🌳 Master Data Tree Overview

```
kabutech/
├── sensors/
│   ├── live/                 <-- Real-time telemetry & actuator states (every 2s)
│   └── history/
│       └── {YYYY-MM-DD}/
│           └── {HH}/         <-- Hourly historical records (auto-pruned after 30 days)
├── settings/
│   ├── setpoints/            <-- Target environmental parameters & modes
│   └── schedules/            <-- Configured timer windows (misters, fans, lights)
├── batches/                  <-- Mushroom batches, racks, bags, and flush logs
├── alerts/                   <-- Critical anomalies & warning notifications
└── staff/
    ├── tasks/                <-- Assigned staff work items & completion records
    └── activity_logs/        <-- Floor operations logged by workers
users/
└── {uid}/                    <-- User profiles, RBAC permissions, and push tokens
```

---

## 📊 1. Live Telemetry Node (`/kabutech/sensors/live`)

Updated continuously by the ESP32 (every **2,000 ms**). If values drift or errors occur, flags latch immediately.

```json
{
  "temperature": 23.8,
  "humidity": 88.5,
  "co2": 780,
  "light": 420,
  "chip_temperature": 48.2,
  "esp32_status": "online",
  "last_seen": 1793340000000,
  "mode": "AUTO",

  "dht_error": false,
  "temp_error": false,
  "hum_error": false,
  "light_error": false,
  "co2_error": false,

  "status_temp": 1,
  "status_hum": 1,
  "status_light": 1,
  "status_co2": 1,

  "reason_temp": 0,
  "reason_hum": 0,
  "reason_light": 0,
  "reason_co2": 0,

  "actuator_fans": false,
  "actuator_fanIn": false,
  "actuator_misters": true,
  "actuator_lights": true,

  "ai_ready": true,
  "ai_action": "MIST_MAINTAIN",
  "ai_pred_temp_10m": 24.1,
  "ai_pred_hum_10m": 90.8,
  "ai_pred_co2_10m": 810,
  "ai_pred_light_10m": 420
}
```

### Telemetry Field Dictionary

| Field | Type | Description |
| :--- | :--- | :--- |
| `temperature` | `number` | Ambient canopy temperature in °C (SHT31-D, with offset applied). `-999.0` on fault. |
| `humidity` | `number` | Relative humidity in % RH (SHT31-D, with offset applied). `-999.0` on fault. |
| `co2` | `number` | Carbon dioxide concentration in ppm (Sensirion SCD41 True NDIR). `-999` on fault. |
| `light` | `number` | Ambient illuminance in lux (BH1750 digital ambient light sensor). `-999` on fault. |
| `chip_temperature` | `number` | Internal ESP32-S3 silicon junction temperature (°C) for thermal health monitoring. |
| `esp32_status` | `string` | Connection heartbeat: `"online"` \| `"offline"`. |
| `last_seen` | `timestamp` | Firebase server timestamp (`.sv: "timestamp"`). |
| `mode` | `string` | Active operational mode: `"AUTO"`, `"MANUAL"`, `"SCHEDULE"`, or `"TIMED"`. |
| `status_*` | `number` | Debounced health enum: `0` = INIT, `1` = OK, `2` = FAULT. |
| `reason_*` | `number` | Root cause fault enum: `0` = NONE, `1` = NOT_PRESENT, `2` = READ_FAIL, `3` = OUT_OF_RANGE, `4` = STALLED, `5` = BUS. |
| `actuator_*` | `boolean` | Real-time hardware relay status (`actuator_fans` for exhaust, `actuator_fanIn` for intake, `actuator_misters`, `actuator_lights`). |
| `ai_ready` | `boolean` | `true` when the 20-sample rolling buffer is full and the model is inferring. |
| `ai_pred_*_10m` | `number` | +10-minute predicted value computed on-device by the TinyML regression model. |

---

## ⚙️ 2. Control Settings & Overrides (`/kabutech/settings`)

### `setpoints/` Sub-node
Written by the mobile app when adjusting parameters or toggling manual relays.

```json
{
  "setpoints": {
    "temperature": 24.0,
    "humidity": 90.0,
    "light": 500,
    "co2": 900,
    "mode": "auto",
    "devices": {
      "fanIn": false,
      "fanOut": false,
      "fans": false,
      "misters": true,
      "lights": true,
      "valve": true,
      "co2": false
    },
    "aiOverride": true,
    "syncPulse": 1793340120
  }
}
```

### `schedules/` Sub-node
Defines automated timer windows for cyclic actuation.

```json
{
  "schedules": {
    "misters": {
      "enabled": true,
      "durationMins": 5,
      "intervalHours": 2,
      "windows": [
        { "id": "w1", "startTime": "06:00", "endTime": "06:05" },
        { "id": "w2", "startTime": "12:00", "endTime": "12:05" }
      ]
    },
    "fans": {
      "enabled": true,
      "durationMins": 10,
      "intervalHours": 1
    },
    "lights": {
      "enabled": true,
      "windows": [
        { "id": "daylight", "startTime": "06:00", "endTime": "18:00" }
      ]
    }
  }
}
```

---

## 📈 3. Historical Telemetry (`/kabutech/sensors/history`)

The ESP32 pushes hourly aggregated records every 60 minutes:

```
/kabutech/sensors/history/2026-10-30/14
{
  "timestamp": 1793343600000,
  "temp": 24.1,
  "hum": 89.4,
  "light": 450,
  "co2": 820
}
```

> [!NOTE]
> **Automatic 30-Day Retention Pruning:** The firmware calculates date offsets (`millis() - 30 days`) and automatically issues deletion requests for dates exceeding 30 days to keep database storage lightweight and within free-tier limits.

---

## 🍄 4. Crop Batches & Harvest Records (`/kabutech/batches`)

Tracks physical cultivation production inside the grow house:

```json
{
  "batch_2026_10_01": {
    "rack": "Rack-A",
    "substrate": "Sawdust & Rice Bran (70/30)",
    "setupDate": "2026-10-01",
    "archived": false,
    "bags": {
      "1": {
        "status": "Active",
        "harvestLog": [
          { "date": "2026-10-15", "grams": 420 },
          { "date": "2026-10-22", "grams": 380 }
        ]
      },
      "2": {
        "status": "Contaminated"
      }
    }
  }
}
```

---

## 👥 5. User Profiles & Role-Based Access (`/users/{uid}`)

```json
{
  "name": "Juan Dela Cruz",
  "email": "juan@example.com",
  "role": "staff",
  "approved": true,
  "declined": false,
  "pushToken": "ExponentPushToken[xxxxxxxxxxxxxx]",
  "createdAt": "2026-10-12T08:00:00Z"
}
```

* **Roles**:
  - `"admin"` / `"operator"`: Full control access, schedule authoring, task dispatching, staff approval.
  - `"staff"`: Operational execution only, task checklists, contamination logging, quick harvest reporting.

---

## 📋 6. Staff Tasks & Operations (`/kabutech/staff`)

### Tasks (`/kabutech/staff/tasks/{taskId}`)
```json
{
  "id": "task_101",
  "title": "Sanitize Misting Nozzles",
  "description": "Inspect and wipe nozzle tips with isopropyl alcohol.",
  "assignedTo": "user_uid_123",
  "assignedToName": "Juan Dela Cruz",
  "assignedBy": "admin_uid_456",
  "assignedByName": "Admin Manager",
  "createdAt": "2026-10-30T08:00:00Z",
  "dueDate": "2026-10-30",
  "dueTime": "16:00",
  "status": "completed",
  "completedAt": "2026-10-30T14:35:10Z",
  "completionNotes": "Nozzles cleared and checked for scale.",
  "isOnTime": true
}
```

### Activity Logs (`/kabutech/staff/activity_logs/{logId}`)
```json
{
  "id": "act_201",
  "staffId": "user_uid_123",
  "staffName": "Juan Dela Cruz",
  "action": "harvest",
  "description": "Harvested Flush #2 from Rack B.",
  "timestamp": "2026-10-30T10:15:00Z",
  "status": "reviewed",
  "reviewedBy": "Admin Manager",
  "reviewedAt": "2026-10-30T11:00:00Z",
  "adminNotes": "Good yield density."
}
```

---
*Return to [[current_project_state|Current Project State]] | [[system_overview|System Overview]] | [[index|Dashboard]]*
