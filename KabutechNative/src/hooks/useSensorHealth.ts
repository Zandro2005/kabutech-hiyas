import { useState, useEffect } from 'react';
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
  // Consider stale if no update has arrived in > 12 seconds
  const isStale = hasTimestamp ? (Date.now() - (sensors.last_seen || 0)) > 12000 : false;
  
  const isExplicitOffline = sensors?.esp32_status === 'offline';
  const isControllerOnline = !isExplicitOffline && !isStale;

  // Helper to check for error flags (handles boolean, string "true", number 1)
  const isErr = (val: any) => val === true || val === 'true' || val === 1;

  // Individual sensor error checks with -999 disconnected sentinel
  const dhtError = !isControllerOnline || 
    isErr(sensors?.dht_error) || 
    isErr(sensors?.temp_error) || 
    isErr(sensors?.hum_error) ||
    sensors?.temperature === -999 ||
    sensors?.humidity === -999;

  const tempError = dhtError || 
    typeof sensors?.temperature !== 'number' || 
    isNaN(sensors.temperature) || 
    sensors.temperature < 15 || 
    sensors.temperature > 50 || 
    sensors.temperature === -999;

  const humError = dhtError || 
    typeof sensors?.humidity !== 'number' || 
    isNaN(sensors.humidity) || 
    sensors.humidity < 20 || 
    sensors.humidity > 99.5 || 
    sensors.humidity === -999;

  const lightError = !isControllerOnline || 
    isErr(sensors?.light_error) || 
    typeof sensors?.light !== 'number' || 
    isNaN(sensors.light) || 
    sensors.light <= 0 || 
    sensors.light === -999;

  const co2Error = !isControllerOnline || 
    isErr(sensors?.co2_error) || 
    typeof sensors?.co2 !== 'number' || 
    isNaN(sensors.co2) || 
    sensors.co2 < 350 || 
    sensors.co2 > 5000 || 
    sensors.co2 === -999;

  const waterError = !isControllerOnline || 
    isErr(sensors?.water_error) || 
    sensors?.waterLevel == null || 
    isNaN(sensors.waterLevel) || 
    sensors.waterLevel < 0 || 
    sensors.waterLevel === -999;

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
