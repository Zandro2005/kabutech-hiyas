import { useState, useEffect, useRef } from 'react';
import { useSensors, useServerTimeOffset } from './useFirebaseData';

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
  hasAnyError: boolean;
  faultySensorsList: string[];
}

export function useSensorHealth(): SensorHealthStatus {
  const sensors = useSensors();
  const serverTimeOffset = useServerTimeOffset();
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
  useEffect(() => {
    if (sensors && (sensors.temperature != null || sensors.last_seen != null)) {
      lastPacketReceivedAt.current = Date.now();
    }
  }, [sensors?.last_seen, sensors?.temperature, sensors?.humidity, sensors?.light, sensors?.co2, sensors?.waterLevel]);

  const hasTimestamp = typeof sensors?.last_seen === 'number' && sensors.last_seen > 0;
  
  // Stale detection:
  // 1. ESP32 pushes every 2.5s (FIREBASE_PUSH_INTERVAL = 2500).
  // 2. 7 seconds (~3 missed cycles) indicates an unplugged controller or broken link.
  // 3. Current server time combines device clock + Firebase .info/serverTimeOffset to eliminate clock skew.
  const currentServerTime = Date.now() + serverTimeOffset;
  const timeSinceServerTs = hasTimestamp ? Math.max(0, currentServerTime - (sensors.last_seen || 0)) : Infinity;
  const offlineSeconds = hasTimestamp ? Math.round(timeSinceServerTs / 1000) : 0;

  const STALE_THRESHOLD_MS = 7000;
  const isStale = !hasTimestamp || timeSinceServerTs > STALE_THRESHOLD_MS;
  
  const isExplicitOffline = sensors?.esp32_status === 'offline';
  const isControllerOnline = !isExplicitOffline && !isStale;

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

  const waterError = !isControllerOnline || 
    isErr(sensors?.water_error) || 
    sensors?.waterLevel == null || 
    typeof sensors?.waterLevel !== 'number' || 
    isNaN(sensors.waterLevel) || 
    sensors.waterLevel === -999 || 
    sensors.waterLevel < 0;

  // Generate list of disconnected / faulty sensors for alert banners
  const faultySensorsList: string[] = [];
  if (isControllerOnline) {
    if (tempError || humError) faultySensorsList.push('DHT11 Temp/Humidity (GPIO 4)');
    if (lightError) faultySensorsList.push('LDR Light Sensor (GPIO 5)');
    if (co2Error) faultySensorsList.push('MQ-135 Gas Sensor (GPIO 6)');
    if (waterError) faultySensorsList.push('Water Level Sensor (GPIO 7)');
  }

  const hasAnyError = !isControllerOnline || tempError || humError || lightError || co2Error || waterError;

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
    hasAnyError,
    faultySensorsList,
  };
}
