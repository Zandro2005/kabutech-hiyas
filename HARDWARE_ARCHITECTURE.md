# Hardware Architecture & Firebase Strategy

## Overview
This document serves as a permanent reference for the Kabutech Hiyas hardware integration, specifically outlining the data-logging strategy for the ESP32 sensors and the Firebase Realtime Database. 

**DO NOT DEVIATE FROM THIS PLAN WHEN WRITING THE C++ ESP32 CODE OR THE REACT NATIVE FETCH LOGIC.**

## The Two-Tier IoT Logging Strategy
To ensure the Firebase Free Tier (1 GB storage, 10 GB bandwidth) is never exceeded while maintaining lightning-fast real-time UI updates in the app, the system MUST use a Two-Tier logging approach:

### 1. Live Feed (Instant, 0 Storage Cost)
- **Frequency**: Every 1 second
- **Firebase Node**: `kabutech/sensors/current`
- **ESP32 Logic**: The ESP32 must continuously *overwrite* this single node.
- **React Native Logic**: The app's `HomeScreen` listens to this node for instant updates.
- **Why**: This uses zero extra storage space because it constantly overwrites the same data, but guarantees the app feels instantaneous.

### 2. Historical Log (Analytics, Low Storage Cost)
- **Frequency**: Every 1 hour (3,600 seconds)
- **Firebase Node**: `kabutech/sensors/historical` (List/Array)
- **ESP32 Logic**: The ESP32 must use a timer (non-blocking `millis()`) to `push()` a new record to this node exactly once per hour.
- **React Native Logic**: The `AnalyticsScreen.tsx` must fetch this list to generate the Pure JS Line Graphs (replacing the `generateMockData` function).
- **Why**: 1 record per hour = 24 records a day. This equates to less than 0.5 MB of data per year, guaranteeing the system will never run out of free Firebase storage.

## Implementation Notes for Future Agent
When the user asks to integrate the hardware:
1. Write the `loop()` in C++ (Arduino IDE) for the ESP32 using the logic above.
2. Update `AnalyticsScreen.tsx` in the React Native codebase to pull from `kabutech/sensors/historical`.
3. Use the `react-native-firebase` or Firebase JS SDK to fetch the historical data and map it directly into the Pure JS Line Chart layout algorithms.
