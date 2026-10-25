import { useState, useEffect, useRef } from 'react';
import { useSensors, useServerTimeOffset, useFirebaseConnection } from './useFirebaseData';

export interface SensorHealthStatus {
  isControllerOnline: boolean;
  isStale: boolean;
  dhtError: boolean;
  tempError: boolean;
  humError: boolean;
  lightError: boolean;
  co2Error: boolean;
  waterError: boolean;
  offlineSeconds: number;
  secondsSinceUpdate: number | null;
  hasAnyError: boolean;
  faultySensorsList: string[];
}

export function useSensorHealth(): SensorHealthStatus {
  const sensors = useSensors();
  const serverTimeOffset = useServerTimeOffset();
  const isFirebaseConnected = useFirebaseConnection();
  const [, setTick] = useState(0);

  // 1-second pulse to re-evaluate stale timeout in real time
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => (t + 1) % 10000);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Track the local time when the last snapshot arrived through the WebSocket stream
  const mountedAtRef = useRef<number>(Date.now());
  const lastPacketReceivedAt = useRef<number>(Date.now());
  const lastNewPacketTimeRef = useRef<number>(0);
  const prevLastSeenRef = useRef<number | null>(null);
  const detectedIntervalRef = useRef<number>(2000); // Matches ESP32 2.0s push cadence
  const stablePacketStreakRef = useRef<number>(2);  // Starts qualified on mount; resets to 0 on offline drop
  const wasOnlineRef = useRef<boolean>(false);

  useEffect(() => {
    if (sensors && (sensors.temperature != null || sensors.last_seen != null)) {
      const now = Date.now();
      lastPacketReceivedAt.current = now;

      // Measure actual push cadence from the ESP32 and qualify stability streak
      if (typeof sensors.last_seen === 'number') {
        if (prevLastSeenRef.current !== null && sensors.last_seen > prevLastSeenRef.current) {
          const prevPacketWallTime = lastNewPacketTimeRef.current;
          lastNewPacketTimeRef.current = now;
          const delta = sensors.last_seen - prevLastSeenRef.current;
          if (delta >= 1000 && delta <= 3500) {
            detectedIntervalRef.current = delta;
          }
          // Count consecutive timely packets (<= 4.5s apart) to qualify stable recovery from LOCAL -> ONLINE
          if (prevPacketWallTime === 0 || (now - prevPacketWallTime <= 4500)) {
            stablePacketStreakRef.current = Math.min(5, stablePacketStreakRef.current + 1);
          } else {
            stablePacketStreakRef.current = 1;
          }
        }
        prevLastSeenRef.current = sensors.last_seen;
      }
    }
  }, [sensors?.last_seen, sensors?.temperature, sensors?.humidity, sensors?.light, sensors?.co2, sensors?.waterLevel]);

  const hasTimestamp = typeof sensors?.last_seen === 'number' && sensors.last_seen > 0;
  
  // Asymmetric Hysteresis Threshold:
  // - While ONLINE: allow up to 6.0s-6.5s (matches ESP32 6.5s CLOUD_SYNC_TIMEOUT_MS) before dropping to LOCAL
  // - While LOCAL (recovering): require 2 consecutive timely packets AND fresh timestamp (<= 4.5s) before returning ONLINE
  const onlineHoldThreshold = Math.max(6000, Math.min(6500, detectedIntervalRef.current * 3));

  const currentServerTime = Date.now() + serverTimeOffset;
  const rawServerElapsed = hasTimestamp ? currentServerTime - (sensors.last_seen || 0) : Infinity;
  const localElapsed = lastPacketReceivedAt.current > 0 ? Date.now() - lastPacketReceivedAt.current : Infinity;
  const newPacketElapsed = lastNewPacketTimeRef.current > 0 ? Date.now() - lastNewPacketTimeRef.current : Infinity;

  // Protect against client clock skew:
  const serverOrLocalElapsed = hasTimestamp
    ? Math.max(0, rawServerElapsed < 0 ? localElapsed : rawServerElapsed)
    : Infinity;
  const timeSinceServerTs = Math.min(serverOrLocalElapsed, newPacketElapsed);

  const offlineSeconds = hasTimestamp ? Math.round(timeSinceServerTs / 1000) : 0;
  const secondsSinceUpdate = hasTimestamp
    ? Math.max(0, Math.round(timeSinceServerTs / 1000))
    : (localElapsed !== Infinity ? Math.max(0, Math.round(localElapsed / 1000)) : null);

  const isExplicitOffline = sensors?.esp32_status === 'offline';
  const isBootWindow = Date.now() - mountedAtRef.current < 4000;

  let isStale: boolean;
  if (!hasTimestamp || isExplicitOffline || isFirebaseConnected === false) {
    isStale = true;
  } else if (wasOnlineRef.current || isBootWindow) {
    // Currently ONLINE (or initial boot): stay online unless silence exceeds 6.0s-6.5s
    isStale = timeSinceServerTs > onlineHoldThreshold;
  } else {
    // Currently LOCAL (recovering): require >= 2 consecutive timely packets AND fresh reading (<= 4.5s)
    // so unstable/flapping internet never loops ONLINE <-> LOCAL!
    const isQualifiedStable = stablePacketStreakRef.current >= 2 && timeSinceServerTs <= 4500;
    isStale = !isQualifiedStable;
  }

  const isControllerOnline = !isExplicitOffline && !isStale && isFirebaseConnected !== false;

  if (!isControllerOnline) {
    if (wasOnlineRef.current) {
      stablePacketStreakRef.current = 0; // Reset stability streak upon dropping to LOCAL
    }
    wasOnlineRef.current = false;
  } else {
    wasOnlineRef.current = true;
  }

  // Helper to check for error flags (handles boolean, string "true", number 1)
  const isErr = (val: any) => val === true || val === 'true' || val === 1;

  // Individual sensor error checks:
  // Synchronous and immediate detection when an unplugged sensor reports -999 or error flag:
  const dhtError = !isControllerOnline || 
    isErr(sensors?.dht_error) || 
    isErr(sensors?.temp_error) || 
    isErr(sensors?.hum_error) ||
    sensors?.temperature === -999 ||
    sensors?.humidity === -999 ||
    typeof sensors?.temperature !== 'number' ||
    typeof sensors?.humidity !== 'number';

  const tempError = dhtError || 
    isNaN(sensors.temperature) || 
    sensors.temperature <= 0 || 
    sensors.temperature > 60 || 
    sensors.temperature === -999;

  const humError = dhtError || 
    isNaN(sensors.humidity) || 
    sensors.humidity <= 0 || 
    sensors.humidity > 100 || 
    sensors.humidity === -999;

  const lightError = !isControllerOnline || 
    isErr(sensors?.light_error) || 
    typeof sensors?.light !== 'number' || 
    isNaN(sensors.light) || 
    sensors.light === -999 || 
    sensors.light < 0;

  const co2Error = !isControllerOnline || 
    isErr(sensors?.co2_error) || 
    typeof sensors?.co2 !== 'number' || 
    isNaN(sensors.co2) || 
    sensors.co2 < 300 || 
    sensors.co2 > 5000 || 
    sensors.co2 === -999;

  // Water level sensor is temporarily removed from hardware/code
  const waterError = false;

  // Generate list of disconnected / faulty sensors for alert banners
  const faultySensorsList: string[] = [];
  if (isControllerOnline) {
    if (tempError || humError) faultySensorsList.push('SHT3x Temp/Humidity (I2C)');
    if (lightError) faultySensorsList.push('BH1750 Light Sensor (I2C)');
    if (co2Error) faultySensorsList.push('SCD41 CO₂ Sensor (I2C)');
  }

  const hasAnyError = !isControllerOnline || tempError || humError || lightError || co2Error;

  return {
    isControllerOnline,
    isStale,
    dhtError,
    tempError,
    humError,
    lightError,
    co2Error,
    waterError,
    offlineSeconds,
    secondsSinceUpdate,
    hasAnyError,
    faultySensorsList,
  };
}
