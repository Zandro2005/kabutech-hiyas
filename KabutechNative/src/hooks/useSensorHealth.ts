import { useState, useEffect, useRef } from 'react';
import { useSensors } from './useFirebaseData';

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
  const [offlineSeconds, setOfflineSeconds] = useState(0);

  // Track the local time when the last snapshot arrived through the WebSocket stream
  const lastPacketReceivedAt = useRef<number>(Date.now());
  useEffect(() => {
    if (sensors && (sensors.temperature != null || sensors.last_seen != null)) {
      lastPacketReceivedAt.current = Date.now();
    }
  }, [sensors?.last_seen, sensors?.temperature, sensors?.humidity, sensors?.light, sensors?.co2, sensors?.waterLevel]);

  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (sensors?.last_seen) {
        const diffMs = Date.now() - sensors.last_seen;
        setOfflineSeconds(Math.max(0, Math.round(diffMs / 1000)));
      } else {
        setOfflineSeconds(0);
      }
    }, 2000);
    return () => clearInterval(checkInterval);
  }, [sensors?.last_seen]);

  const hasTimestamp = typeof sensors?.last_seen === 'number' && sensors.last_seen > 0;
  
  // Stale detection:
  // 1. Buffer (45s) accommodates ESP32 heartbeat (30s) + Wi-Fi retry delays.
  // 2. Also checks local snapshot arrival time to eliminate client clock skew.
  const timeSinceServerTs = hasTimestamp ? Date.now() - (sensors.last_seen || 0) : Infinity;
  const timeSinceLocalPacket = Date.now() - lastPacketReceivedAt.current;

  // Controller is considered stale ONLY if BOTH the server timestamp is > 45s AND no local packet arrived in 35s
  const isStale = timeSinceServerTs > 45000 && timeSinceLocalPacket > 35000;
  
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
