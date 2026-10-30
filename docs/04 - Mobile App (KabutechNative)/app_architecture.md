# 📱 Mobile Application Architecture (KabutechNative)

> **Framework:** React Native 0.76+ with Expo SDK 52  
> **Source Directory:** [KabutechNative/](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/KabutechNative)  
> **Language:** TypeScript  
> **State Management:** React Context API + Local Offline Storage (`AsyncStorage`)  
> **Styling:** NativeWind / Tailwind CSS with High-Contrast Dark & Light Theme Support

---

## 🏗️ Architectural Component Tree

```
                       ┌────────────────────────────┐
                       │          App.tsx           │
                       └─────────────┬──────────────┘
                                     ▼
                       ┌────────────────────────────┐
                       │       ThemeProvider        │
                       │ (High-contrast Dark/Light) │
                       └─────────────┬──────────────┘
                                     ▼
                       ┌────────────────────────────┐
                       │        AuthProvider        │
                       │   (RBAC: Admin vs Staff)   │
                       └─────────────┬──────────────┘
                                     ▼
                       ┌────────────────────────────┐
                       │    FirebaseDataProvider    │
                       │ (Live Stream + Offline DB) │
                       └─────────────┬──────────────┘
                                     ▼
                       ┌────────────────────────────┐
                       │       TabBarProvider       │
                       │ (Immersive Screen Control) │
                       └─────────────┬──────────────┘
                                     ▼
                       ┌────────────────────────────┐
                       │     NavigationContainer    │
                       │  - AuthStack (Login/Reg)   │
                       │  - MainTabs (Admin/Owner)  │
                       │  - StaffTabs (Farm Staff)  │
                       └────────────────────────────┘
```

---

## 🧩 Context Providers

### 1. `FirebaseDataContext.tsx`
* **Realtime Listener**: Subscribes to `/kabutech/sensors/live` and `/kabutech/settings` via Firebase SDK.
* **Offline Fallback Engine**: If network disconnects or Firebase reports timeout, transparently swaps data sources to the latest valid cached snapshot saved in `AsyncStorage`.
* **Queued Sync Engine**: Queues parameter setpoint updates and device state overrides locally when offline, and automatically dispatches them once connectivity recovers.
* **System Status Evaluator**: Calculates connection health:
  $$\text{Is Online} = \text{Firebase.connected} \land (\text{Now} - \text{last\_seen} < 30\text{ seconds})$$

### 2. `AuthContext.tsx`
* Handles authentication with Firebase Auth (Email & Password, with demo mode capability).
* Reads `/users/{uid}` to determine user roles (`admin`, `operator`, `staff`).
* Restricts unapproved staff registrations using a `PendingApprovalScreen` gate until an admin authorizes the account.

### 3. `ThemeContext.tsx` & `TabBarContext.tsx`
* **Theme Context**: Supports dark mode custom-tailored for grow house environments (minimizes bright blue glare when checking sensors in dark fruiting chambers).
* **Tab Bar Context**: Dynamically hides the floating capsule tab bar when full-screen chart analysis or modal flows are active.

---

## 🎣 Custom React Hooks Inventory

| Hook | File | Responsibility |
| :--- | :--- | :--- |
| `useFirebaseData` | `src/hooks/useFirebaseData.ts` | Primary interface for accessing live telemetry, setpoint controls, and sync states. |
| `useHourlyTrend` | `src/hooks/useHourlyTrend.ts` | Processes 24-hour historical records into trend vectors (rising, falling, stable). |
| `useSensorHealth` | `src/hooks/useSensorHealth.ts` | Interprets debounced hardware error codes (`status_*`, `reason_*`) for UI badge warnings. |
| `useSensorHistory` | `src/hooks/useSensorHistory.ts` | Fetches and formats 24H / 7D / 30D historical telemetry for chart plotting. |
| `useEnvironmentAlerts` | `src/hooks/useEnvironmentAlerts.ts` | Evaluates sensor readings against biological control bands to trigger toast notifications and sound alarms. |

---

## 🗂️ Module Directory Layout

```
KabutechNative/
├── src/
│   ├── components/           # Reusable UI widgets (ChamberStatusHero, RangeGauge, ControlCard)
│   │   ├── modals/           # 12 specialized dialog modals (AddBatch, LogHarvest, etc.)
│   │   ├── skeletons/        # Shimmer loading skeleton screens
│   │   └── yield/            # Harvest list and daily yield visualization components
│   ├── config/               # Biological baselines & control band definitions
│   │   ├── controlBands.ts   # Safe, Warning, and Critical threshold boundaries
│   │   └── cropProfiles.ts   # Species presets (Oyster, Shiitake, Lion's Mane)
│   ├── context/              # Global React Context providers (Auth, Data, Theme, TabBar)
│   ├── hooks/                # Data processing and telemetry hooks
│   ├── navigation/           # AppNavigator, MainTabNavigator, StaffTabNavigator
│   ├── screens/              # Top-level screen components
│   │   └── staff/            # Dedicated screens for farm floor workers
│   ├── services/             # Firebase SDK client initialization and API bindings
│   ├── types/                # TypeScript type definitions (Firebase, Navigation, Sensors)
│   └── utils/                # Audio, Haptics, Notifications, and Export helpers
└── App.tsx                   # Master application entry point
```

---
*Return to [[screens_and_features|Screens & Features]] | [[offline_first_design|Offline-First Engine]] | [[current_project_state|Current Project State]] | [[index|Dashboard]]*
