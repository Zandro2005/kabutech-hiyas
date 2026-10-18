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
  const lastPacketReceivedAt = useRef<number>(Date.now());
  const prevLastSeenRef = useRef<number | null>(null);
  const detectedIntervalRef = useRef<number>(5000); // Defaults to 5s until measured

  useEffect(() => {
    if (sensors && (sensors.temperature != null || sensors.last_seen != null)) {
      lastPacketReceivedAt.current = Date.now();

      // Measure actual push cadence from the ESP32
      if (typeof sensors.last_seen === 'number') {
        if (prevLastSeenRef.current !== null && sensors.last_seen > prevLastSeenRef.current) {
          const delta = sensors.last_seen - prevLastSeenRef.current;
          // Valid delta range: between 1000ms (1s) and 15000ms (15s)
          if (delta >= 1000 && delta <= 15000) {
            detectedIntervalRef.current = delta;
          }
        }
        prevLastSeenRef.current = sensors.last_seen;
      }
    }
  }, [sensors?.last_seen, sensors?.temperature, sensors?.humidity, sensors?.light, sensors?.co2, sensors?.waterLevel]);

  const hasTimestamp = typeof sensors?.last_seen === 'number' && sensors.last_seen > 0;
  
  // Stale detection:
  // 1. ESP32 pushes every 2s (fast firmware) to 5s (legacy).
  // 2. Dynamic threshold adapts to actual detected push interval:
  //    - At 2s push interval: threshold is Math.max(3500, 2000 + 1500) = 3500ms (3.5 seconds)!
  //    - At 5s push interval: threshold is Math.max(3500, 5000 + 1500) = 6500ms (6.5 seconds)!
  //    - Initial fallback threshold: 6000ms (evaluated instantly on cold boot).
  // 3. Current server time combines device clock + Firebase .info/serverTimeOffset to eliminate clock skew.
  const dynamicThreshold = Math.max(3500, Math.min(8000, detectedIntervalRef.current + 1500));

  const currentServerTime = Date.now() + serverTimeOffset;
  const rawServerElapsed = hasTimestamp ? currentServerTime - (sensors.last_seen || 0) : Infinity;
  const localElapsed = lastPacketReceivedAt.current > 0 ? Date.now() - lastPacketReceivedAt.current : Infinity;

  // Protect against client clock skew:
  // If rawServerElapsed < 0, phone clock is behind the server; fallback to localElapsed.
  const timeSinceServerTs = hasTimestamp
    ? Math.max(0, rawServerElapsed < 0 ? localElapsed : rawServerElapsed)
    : Infinity;

  const offlineSeconds = hasTimestamp ? Math.round(timeSinceServerTs / 1000) : 0;
  const secondsSinceUpdate = hasTimestamp
    ? Math.max(0, Math.round(timeSinceServerTs / 1000))
    : (localElapsed !== Infinity ? Math.max(0, Math.round(localElapsed / 1000)) : null);

  // Stale check:
  // Evaluated immediately against currentServerTime + local elapsed timer.
  // Instantly marks offline when missing or exceeds the fast dynamic threshold.
  const isServerStale = !hasTimestamp || timeSinceServerTs > dynamicThreshold;
  const isStale = isServerStale;
  
  const isExplicitOffline = sensors?.esp32_status === 'offline';
  const isControllerOnline = !isExplicitOffline && !isStale && isFirebaseConnected !== false;

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
