# 📱 Mobile Screens & Operational Features

> **App Root:** [KabutechNative/](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/KabutechNative)  
> **Framework:** React Native 0.76+ (Expo SDK 52) with TypeScript & Tailwind CSS  
> **Target Audience:** Commercial Mushroom Growers, Farm Owners, Facility Operators, and Floor Staff

---

## 🔀 Dual-Tree Navigation Architecture

The mobile client enforces Role-Based Access Control (RBAC) via [AuthContext.tsx](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/KabutechNative/src/context/AuthContext.tsx) and [AppNavigator.tsx](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/KabutechNative/src/navigation/AppNavigator.tsx). Once authenticated, the user is automatically routed to their specific role dashboard:

```
                   ┌──────────────────────────────────────┐
                   │             Auth Stack               │
                   │  Boot ──► Login ──► Register         │
                   │  (Pending Approval Gate if Staff)    │
                   └──────────────────┬───────────────────┘
                                      │ Authenticated & Approved
                 ┌────────────────────┴────────────────────┐
                 │                                         │
                 ▼ (Role: Admin / Operator)                ▼ (Role: Staff)
  ┌───────────────────────────────┐         ┌───────────────────────────────┐
  │      MainTabNavigator         │         │       StaffTabNavigator       │
  ├───────────────────────────────┤         ├───────────────────────────────┤
  │ 1. HomeScreen                 │         │ 1. StaffHomeScreen            │
  │ 2. ControlsScreen             │         │ 2. MyTasksScreen              │
  │ 3. AnalyticsScreen            │         │ 3. ActivityLogScreen          │
  │ 4. AlertsScreen               │         │ 4. StaffCropScreen            │
  │ 5. ManageCropScreen           │         │ 5. StaffYieldScreen           │
  │ 6. YieldScreen                │         │ 6. StaffProfileScreen         │
  │ 7. Staff Management Hub       │         └───────────────────────────────┘
  │    - StaffApprovalsScreen     │
  │    - StaffReportsInboxScreen  │
  │    - AssignTaskScreen         │
  │    - StaffTaskHistoryScreen   │
  │ 8. DeviceSchedulesScreen      │
  │ 9. ProfileScreen              │
  └───────────────────────────────┘
```

---

## 🖥️ Screen Directory & Operational Capabilities

### 👑 Admin / Manager Flow

#### 1. `HomeScreen.tsx` (Grow House Cockpit)
* **Chamber Status Hero**: Evaluates multi-sensor telemetry against biological crop rules to compute an overall health status (`Optimal`, `Warning`, `Critical`).
* **Interactive Welcome HUD**: Provides context-aware quick actions and farm shift announcements.
* **RangeGauge Metrics Grid**: Dynamic SVG arc dials and linear gauges for Temperature (°C), Humidity (% RH), CO₂ (ppm), and Light (lux).
* **Water Level & Flow Card**: Monitored via XKC-Y25 non-contact sensor to safeguard mister pumps against dry-firing.
* **Offline Banner**: Immediately warns the grower if the ESP32 loses internet connectivity or hasn't checked in within 30 seconds.
* **Predictive AI Widget**: Displays +10-minute outlooks and active pre-emptive ventilation warnings.

#### 2. `ControlsScreen.tsx` (Actuator & Mode Manager)
* **Operational Modes**:
  - `AUTO`: ESP32 handles hysteresis & PID regulation autonomously.
  - `MANUAL`: Direct user toggle of relays over Firebase.
  - `SCHEDULED`: Activates predefined timer windows.
  - `TIMED`: Custom countdown actuation.
* **Actuator Relays**:
  - **Intake Fan** (Fresh air exchange)
  - **Exhaust Fan** (Heat and CO₂ evacuation)
  - **Ultrasonic Misters & Water Solenoid** (Interlocked with water level sensor)
  - **Grow Lights** (Fruiting photoperiod lighting)

#### 3. `DeviceSchedulesScreen.tsx` (Timer & Window Automation)
* Configure misting cycles (e.g. 5 minutes ON every 2 hours).
* Define daily photoperiod windows (e.g. 06:00 to 18:00).
* Fan evacuation interval schedules to eliminate stagnant microclimates.

#### 4. `AnalyticsScreen.tsx` (Historical Telemetry & Trends)
* **Time Windows**: Selectable ranges for `24H`, `7D`, and `30D`.
* **Telemetry Charts**: Multi-metric SVG charts showing sensor drift against optimal fruiting bands.
* **Hourly Trend Analysis**: Powered by [useHourlyTrend.ts](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/KabutechNative/src/hooks/useHourlyTrend.ts) to identify recurring thermal spikes or humidity dips.

#### 5. `AlertsScreen.tsx` (Intelligent Triage Center)
* Classifies incidents into **Critical**, **Warning**, and **Info**.
* Diagnostic root-cause guidance (e.g. *"Check water supply valve"*, *"Clean intake dust mesh"*, *"I2C communication timeout"*).
* Acknowledge and mark alerts as resolved.

#### 6. `ManageCropScreen.tsx` (Biological Batch Tracking)
* Track cultivation batches by shelf and rack (`Rack-A`, `Rack-B`).
* Monitor individual grow bag health statuses: `Active`, `Empty`, or `Contaminated`.
* Contamination management with `FlagContaminationModal` to isolate infected bags and protect crop yield.

#### 7. `YieldScreen.tsx` (Harvest Accounting & Biological Efficiency)
* Log wet harvest weights (grams / kilograms) per bag or rack.
* Real-time biological efficiency (BE) calculation:
  $$\text{BE (\%)} = \left(\frac{\text{Fresh Mushroom Weight}}{\text{Dry Substrate Weight}}\right) \times 100$$
* Harvest list visualization and **CSV export** for farm ledger auditing.

#### 8. Staff Management Hub
* **`StaffApprovalsScreen.tsx`**: Review newly registered staff members and approve or reject access.
* **`StaffReportsInboxScreen.tsx`**: Review daily activity logs and photo reports submitted from the floor; write admin review notes.
* **`AssignTaskScreen.tsx` & `StaffTaskHistoryScreen.tsx`**: Assign tasks with specific deadlines and track compliance metrics (on-time vs. overdue).

---

### 🧑‍🌾 Staff Operational Flow

#### 1. `StaffHomeScreen.tsx`
* High-visibility dashboard displaying chamber readiness and critical emergency alerts.
* Direct shortcuts to assigned tasks and fast incident reporting.

#### 2. `MyTasksScreen.tsx`
* Clean checklist of assigned jobs (e.g. *"Mist room floor"*, *"Check water reservoir"*, *"Inspect Bag #14"*).
* Submit completion confirmation with timestamps and optional worker notes.

#### 3. `ActivityLogScreen.tsx` & `MyActivityHistoryScreen.tsx`
* Fast logging of daily actions: `harvest`, `watering`, `inspection`, `cleaning`, `maintenance`, and `contamination_report`.
* Tracks reviewed status and managerial feedback.

#### 4. `StaffCropScreen.tsx` & `StaffYieldScreen.tsx`
* Mobile-optimized bag status updater.
* Fast harvest logger ([LogHarvestModal.tsx](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/KabutechNative/src/components/modals/LogHarvestModal.tsx)) designed for quick data entry directly at the harvest bench.

---

## 🪟 Interactive Modal Systems

The app includes 12 specialized dialog modals for uninterrupted workflows:

| Modal Component | Location | Purpose |
| :--- | :--- | :--- |
| `AddBatchModal.tsx` | `src/components/modals/` | Create new mushroom batch records with substrate formulas. |
| `AddRackModal.tsx` | `src/components/modals/` | Add storage shelves and configure bag capacity limits. |
| `UpdateCapacityModal.tsx` | `src/components/modals/` | Expand or contract rack slot capacity. |
| `LogHarvestModal.tsx` | `src/components/modals/` | Record harvest weights and flush counts. |
| `FlagContaminationModal.tsx`| `src/components/modals/` | Mark infected bags with contamination reason and discard prompt. |
| `EditProfileModal.tsx` | `src/components/modals/` | Update user display name, phone, or credentials. |
| `AiInsightModal.tsx` | `src/components/` | Explains TinyML forecast decisions and early warning signals. |
| `GlobalAlarmModal.tsx` | `src/components/` | Full-screen urgent takeover for critical thermal or gas emergencies. |
| `ActionModal.tsx` | `src/components/` | Contextual action sheet for quick device triggers. |
| `ConfirmModal.tsx` | `src/components/` | Double-check confirmation for critical state overrides. |
| `HelpModal.tsx` | `src/components/modals/` | On-screen user guide and parameter target cheat-sheet. |
| `InfoModal.tsx` | `src/components/modals/` | Diagnostic details for specific sensor faults. |

---

## 💀 Shimmer Loading Skeletons

To provide a flicker-free UI experience while fetching data over mobile networks, custom animated shimmer skeletons are rendered:
* `HomeScreenSkeleton.tsx`
* `ControlsScreenSkeleton.tsx`
* `AnalyticsScreenSkeleton.tsx`
* `CropsScreenSkeleton.tsx`
* `YieldScreenSkeleton.tsx`
* `TasksScreenSkeleton.tsx`
* `ProfileScreenSkeleton.tsx`

---

## 🔊 Multisensory Feedback System

* **Auditory Feedback ([SoundManager.ts](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/KabutechNative/src/utils/SoundManager.ts))**: Audio cues for successful commands, toggle clicks, and audible sirens during high-risk environmental alarms.
* **Haptic Vibration ([haptics.ts](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/KabutechNative/src/utils/haptics.ts))**: Light, medium, and warning vibration patterns for tactile touch confirmation.
* **Push Notifications ([PushNotifications.ts](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/KabutechNative/src/utils/PushNotifications.ts))**: Push delivery of out-of-band alerts when the app is in the background or device is locked.

---
*Return to [[app_architecture|App Architecture]] | [[offline_first_design|Offline-First Engine]] | [[current_project_state|Current Project State]] | [[index|Dashboard]]*
