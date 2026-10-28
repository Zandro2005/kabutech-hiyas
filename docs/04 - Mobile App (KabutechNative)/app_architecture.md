# 📱 Mobile Application Architecture (KabutechNative)

> **Framework:** React Native 0.76+ with Expo SDK 52  
> **Source Directory:** [KabutechNative/](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/KabutechNative)  
> **State Management:** React Context API + Local Offline Storage (AsyncStorage)  
> **Styling:** Custom Design System with Dark/Light Theme Support

---

## 🏗️ Architectural Overview

```
                      ┌────────────────────────────┐
                      │          App.tsx           │
                      └─────────────┬──────────────┘
                                    ▼
                      ┌────────────────────────────┐
                      │       ThemeProvider        │
                      └─────────────┬──────────────┘
                                    ▼
                      ┌────────────────────────────┐
                      │        AuthProvider        │
                      └─────────────┬──────────────┘
                                    ▼
                      ┌────────────────────────────┐
                      │    FirebaseDataProvider    │
                      │  (Sync & Offline Engine)   │
                      └─────────────┬──────────────┘
                                    ▼
                      ┌────────────────────────────┐
                      │     NavigationContainer    │
                      │  - AuthStack (Login/Reg)   │
                      │  - AppTabs (Main Tabs)     │
                      │  - StaffStack (Staff Ops)  │
                      └────────────────────────────┘
```

---

## 🧩 Context Providers

### 1. `FirebaseDataContext.tsx`
- Listens to Firebase Realtime Database at `/kabutech/sensors/live` and `/kabutech/settings`.
- Maintains the active live state (`sensorData`, `settings`, `systemStatus`).
- Transparently switches between **Live Streaming** and **Cached Local Storage** when internet connectivity drops.

### 2. `AuthContext.tsx`
- Handles user authentication (Admin, Farm Manager, Staff roles).
- Coordinates with Firebase Auth (Email/Password & Anonymous Demo mode).
- Manages user profiles, role-based screen permissions, and staff approval requests.

### 3. `ThemeContext.tsx` & `TabBarContext.tsx`
- System-wide theme switcher supporting high-contrast dark mode for low-light grow house inspection.
- Tab bar visibility controller for immersive analytics views.

---

## 🗂️ Core Module Structure

| Directory | Purpose | Key Files |
| :--- | :--- | :--- |
| `src/screens/` | Top-level screen components | `HomeScreen`, `ControlsScreen`, `AnalyticsScreen`, `AlertsScreen`, `DeviceSchedulesScreen`, `ManageCropScreen`, `YieldScreen`, `ReportScreen` |
| `src/components/` | Reusable UI widgets | `ChamberStatusHero`, `EnvironmentMetricsGrid`, `MetricGaugeCard`, `AwwSnapOfflineView`, `OfflineBanner`, `TaskCard` |
| `src/config/` | Domain logic & constants | `cropProfiles.ts`, `controlBands.ts` |
| `src/context/` | Global state managers | `FirebaseDataContext.tsx`, `AuthContext.tsx`, `ThemeContext.tsx` |
| `src/utils/` | Calculation & validation helpers | `environmentRanges.ts`, `scheduleLogic.ts`, `offlineStorage.ts` |

---
*Return to [[offline_first_design|Offline-First Engine]] | [[screens_and_features|Screens & Features]] | [[index|Dashboard]]*
