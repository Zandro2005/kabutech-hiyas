# 📱 Mobile Screens & Operational Features

> **App Root:** [KabutechNative/](file:///c:/Users/ADMIN/Documents/kabutech-hiyas-main/KabutechNative)  
> **Target Audience:** Commercial Mushroom Growers, Farm Staff, and Quality Inspectors

---

## 🖥️ Screen Directory & Workflow

### 1. `HomeScreen.tsx` (Grow House Dashboard)
- **Chamber Status Hero**: Displays overall biological chamber health score (Optimal, Warning, Critical) based on multi-sensor evaluation against active crop profiles.
- **Environment Metrics Grid**: Live interactive cards for Temperature, Humidity, CO₂, and Light with dynamic progress arcs.
- **Predictive AI Widget**: Shows 10-minute forecast outlook and pre-emptive actuation flags.

### 2. `ControlsScreen.tsx` (Manual & Auto Actuation)
- **Mode Toggle**: Switch between **Auto (PID / Hysteresis)**, **Manual Override**, and **Schedule Mode**.
- **Actuator Switches**:
  - Exhaust Fan (Air evacuation)
  - Intake Fan (Fresh oxygen)
  - Ultrasonic Misters & Water Solenoid
  - Fruiting LED Light Strip
- **Safety Interlocks**: Disables manual mister activation if the capacitive water level sensor reports an empty reservoir.

### 3. `AnalyticsScreen.tsx` (Historical Telemetry & Graphs)
- **Time Ranges**: 1 Hour, 24 Hours, 7 Days, and 30 Days.
- **Interactive SVG Charts**: Multi-line visualization comparing actual sensor readings against biological target bands.
- **Correlation Views**: Visualizes the relationship between misting pump runtimes and humidity stabilization rates.

### 4. `AlertsScreen.tsx` (Smart Notification Center)
- **Active Anomalies**: Critical warnings (Thermal runaway, CO₂ accumulation, fan stall, mister failure).
- **Resolution Guides**: Direct action suggestions (e.g., *"Check water supply valve"* or *"Clean exhaust filter"*).

### 5. `ManageCropScreen.tsx` & `YieldScreen.tsx`
- **Species Preset Switcher**: Change the active cultivation target (*Pleurotus ostreatus*, Shiitake, Lion's Mane).
- **Harvest Logging**: Record wet harvest weight (kg), flush numbers, substrate contamination rates, and biological efficiency percentages.

### 6. `StaffOperations` (`StaffReportsInboxScreen`, `AssignTaskScreen`, `StaffApprovalsScreen`)
- **Role-Based Access**: Managers assign daily tasks (e.g., substrate misting check, spore wipe, sanitation).
- **Incident Reporting**: Staff submit photo reports with notes directly from the growing floor.
- **Approval Queue**: Farm owners approve or reject schedule changes and equipment maintenance logs.

---
*Return to [[app_architecture|App Architecture]] | [[crop_profiles_and_control_bands|Crop Profiles]] | [[index|Dashboard]]*
