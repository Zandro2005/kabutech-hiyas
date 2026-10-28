# 📶 Offline-First Engine & Resilience Architecture

> **Component Reference:** `AwwSnapOfflineView.tsx`, `OfflineBanner.tsx`, `offlineStorage.ts`  
> **Source Directory:** [KabutechNative/src/](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/KabutechNative/src)

---

## 🎯 Design Philosophy

Agricultural grow houses are frequently located in rural, shielded, or concrete structures with intermittent cellular reception and unreliable Wi-Fi. **KabutechNative** is designed with an **Offline-First Guarantee**:
1. **Never Show Blank Error Screens**: When offline, the app displays the last known good telemetry with an explicit timestamp and offline badge.
2. **Local Parameter Queuing**: When a grower changes setpoints (e.g. adjusts target humidity from 88% to 92%) while disconnected, changes are persisted to `AsyncStorage` and automatically synchronized to Firebase once connection recovers.
3. **Friendly Diagnostic UI ("Aww Snap" View)**: Instead of a cryptic network timeout crash, users receive a clean diagnostic screen with clear recovery steps and a manual retry button.

---

## 🔄 State Transition Flow

```
                      ┌──────────────────────┐
                      │ App Launch / Resume  │
                      └──────────┬───────────┘
                                 │
                   Check NetInfo / Firebase .info
                                 │
                ┌────────────────┴────────────────┐
                ▼                                 ▼
      [Network Connected]               [Network Disconnected]
                │                                 │
   Fetch Live Telemetry from          Load Cached Telemetry from
   Firebase Realtime Database                 AsyncStorage
                │                                 │
   Save to AsyncStorage Cache                     │
                │                                 │
         Display Full UI                   Display Full UI +
    (Green "Connected" Badge)             (Amber "Offline Banner")
```

---

## 🎨 Offline UI Components

### 1. `OfflineBanner`
- Positioned floating at the top of the screen beneath the status bar.
- Shows: *"Offline Mode — Showing cached data from 12:45 PM. Reconnecting..."*
- Includes a subtle pulsing retry spinner.

### 2. `AwwSnapOfflineView`
- Shown when user navigates to an uncached view requiring live internet connection (e.g. live Cloud Staff Approvals or initial account registration).
- Provides:
  - Mascot / Diagnostic illustration.
  - Explanation of network status.
  - **"Try Again"** button with haptic feedback.
  - Option to view cached local dashboard instead.

### 3. Graceful Control Locks
- When offline, manual relay overrides display an amber badge: *"Queued for sync — will execute once controller reconnects"*.

---
*Return to [[app_architecture|App Architecture]] | [[screens_and_features|Screens & Features]] | [[index|Dashboard]]*
