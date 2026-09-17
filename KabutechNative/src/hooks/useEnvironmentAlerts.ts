import { useMemo } from 'react';
import { useSensors, useSettings, useAlerts } from './useFirebaseData';
import { useSensorHealth, SensorHealthStatus } from './useSensorHealth';
import { computeScheduledDevicesState, computeAutoDevicesState } from '../utils/scheduleLogic';

export interface EnvironmentAlertItem {
  id: string;
  type: 'critical' | 'warning';
  title: string;
  shortLabel: string;
  action: string;
  currentValue?: string;
  targetValue?: string;
  message: string;
  icon: string;
  metric: 'hardware' | 'co2' | 'temp' | 'hum' | 'light' | 'water' | 'system';
}

export interface EnvironmentAlertsResult {
  activeAlerts: EnvironmentAlertItem[];
  hasWarning: boolean;
  hasCritical: boolean;
  count: number;
  primaryAlert: EnvironmentAlertItem | null;
  health: SensorHealthStatus;
  waterLevel: number;
}

export function useEnvironmentAlerts(): EnvironmentAlertsResult {
  const sensors = useSensors();
  const settings = useSettings();
  const health = useSensorHealth();
  const alerts = useAlerts();

  return useMemo(() => {
    const list: EnvironmentAlertItem[] = [];

    // Target Setpoints from Settings (Strictly numeric parsing)
    const targetTemp = typeof settings?.setpoints?.temperature === 'number'
      ? settings.setpoints.temperature
      : parseFloat(settings?.setpoints?.temperature as any) || 28.0;

    const targetHum = typeof settings?.setpoints?.humidity === 'number'
      ? settings.setpoints.humidity
      : parseFloat(settings?.setpoints?.humidity as any) || 85;

    const targetLight = typeof settings?.setpoints?.light === 'number'
      ? settings.setpoints.light
      : parseFloat(settings?.setpoints?.light as any) || 580;

    const targetCO2 = typeof settings?.setpoints?.co2 === 'number'
      ? settings.setpoints.co2
      : parseFloat(settings?.setpoints?.co2 as any) || 690;

    // Active device states (Auto mode, Scheduled mode, or Manual switches)
    const mode = settings?.setpoints?.mode || 'auto';
    const isAuto = mode === 'auto';
    const isScheduled = mode === 'scheduled';

    const activeDevices = isScheduled
      ? computeScheduledDevicesState(settings?.schedules)
      : isAuto
      ? computeAutoDevicesState(sensors, settings?.setpoints)
      : {
          fans: Boolean(settings?.setpoints?.devices?.fans),
          misters: Boolean(settings?.setpoints?.devices?.misters),
          lights: Boolean(settings?.setpoints?.devices?.lights),
          co2: Boolean(settings?.setpoints?.devices?.co2),
        };

    // 1. Controller Connection Status
    if (!health.isControllerOnline) {
      list.push({
        id: 'controller-offline',
        type: 'critical',
        title: 'Controller Offline',
        shortLabel: 'Controller Offline',
        currentValue: 'Offline',
        targetValue: 'Online',
        action: 'Check ESP32 power & Wi-Fi',
        message: 'Check ESP32 power & Wi-Fi',
        icon: 'wifi-alert',
        metric: 'hardware',
      });
    }

    // 2. Hardware Sensor Disconnection / Malfunction
    if (health.isControllerOnline && health.faultySensorsList.length > 0) {
      const shortNames = health.faultySensorsList
        .map(s => {
          if (s.includes('DHT11')) return 'Temp/Hum';
          if (s.includes('MQ-135')) return 'CO₂';
          if (s.includes('LDR')) return 'Light';
          if (s.includes('Water')) return 'Water';
          return s.split(' ')[0];
        })
        .join(', ');

      list.push({
        id: 'sensor-disconnected',
        type: 'critical',
        title: 'Sensor Fault',
        shortLabel: 'Sensor Fault',
        currentValue: shortNames,
        targetValue: 'Nominal',
        action: 'Inspect sensor wiring',
        message: 'Inspect sensor wiring',
        icon: 'alert-rhombus',
        metric: 'hardware',
      });
    }

    // 3. Water Reservoir Level Alerts
    const waterLevel = typeof sensors?.waterLevel === 'number' ? sensors.waterLevel : 75;
    if (!health.waterError) {
      if (waterLevel <= 10) {
        list.push({
          id: 'water-critical',
          type: 'critical',
          title: 'Water Depleted',
          shortLabel: `Water Empty • ${Math.round(waterLevel)}%`,
          currentValue: `${Math.round(waterLevel)}%`,
          targetValue: '> 25%',
          action: 'Refill reservoir tank immediately',
          message: 'Refill reservoir tank immediately',
          icon: 'water-alert',
          metric: 'water',
        });
      } else if (waterLevel <= 20) {
        list.push({
          id: 'water-low',
          type: 'warning',
          title: 'Water Level Low',
          shortLabel: `Water Low • ${Math.round(waterLevel)}%`,
          currentValue: `${Math.round(waterLevel)}%`,
          targetValue: '> 25%',
          action: 'Refill reservoir tank',
          message: 'Refill reservoir tank',
          icon: 'water-alert',
          metric: 'water',
        });
      }
    }

    const temp = typeof sensors?.temperature === 'number' ? sensors.temperature : 25;
    const hum = typeof sensors?.humidity === 'number' ? sensors.humidity : 80;
    const light = typeof sensors?.light === 'number' ? sensors.light : 500;
    const co2 = typeof sensors?.co2 === 'number' ? sensors.co2 : 600;

    // 4. CO₂ Environmental Alerts (Requires significant deviation; Clears only when target is met)
    if (!health.co2Error && co2 > 0 && co2 !== -999) {
      const isCo2Critical = co2 > targetCO2 + 450;
      const isCo2High = co2 > targetCO2 + 200;

      if (isCo2Critical) {
        list.push({
          id: 'co2-critical',
          type: 'critical',
          title: 'Critically High CO₂',
          shortLabel: `High CO₂ • ${Math.round(co2)} ppm`,
          currentValue: `${Math.round(co2)} ppm`,
          targetValue: `${targetCO2} ppm`,
          action: 'Run exhaust fans to ventilate',
          message: 'Run exhaust fans to ventilate',
          icon: 'molecule-co2',
          metric: 'co2',
        });
      } else if (isCo2High) {
        list.push({
          id: 'co2-elevated',
          type: 'warning',
          title: 'CO₂ Above Target',
          shortLabel: `High CO₂ • ${Math.round(co2)} ppm`,
          currentValue: `${Math.round(co2)} ppm`,
          targetValue: `${targetCO2} ppm`,
          action: 'Run exhaust fans to ventilate',
          message: 'Run exhaust fans to ventilate',
          icon: 'molecule-co2',
          metric: 'co2',
        });
      }
    }

    // 5. Temperature Environmental Alerts (No warnings for 1-2° drift; Warns only on significant deviation)
    if (!health.tempError && temp > -50 && temp !== -999) {
      const isTempCriticalHigh = temp > targetTemp + 5.0;
      const isTempHigh = temp > targetTemp + 3.0; // 1-2° drift is ignored; only warns at +3.0° or above
      const isTempCriticalLow = temp < targetTemp - 5.5;
      const isTempLow = temp < targetTemp - 3.5;  // 1-2° drift is ignored; only warns at -3.5° or below

      if (isTempCriticalHigh) {
        list.push({
          id: 'temp-critical-high',
          type: 'critical',
          title: 'Critically High Temp',
          shortLabel: `High Temp • ${temp.toFixed(1)}°C`,
          currentValue: `${temp.toFixed(1)}°C`,
          targetValue: `${targetTemp.toFixed(1)}°C`,
          action: 'Run exhaust fans to cool chamber',
          message: 'Run exhaust fans to cool chamber',
          icon: 'thermometer-alert',
          metric: 'temp',
        });
      } else if (isTempHigh) {
        list.push({
          id: 'temp-high',
          type: 'warning',
          title: 'Temperature Above Target',
          shortLabel: `High Temp • ${temp.toFixed(1)}°C`,
          currentValue: `${temp.toFixed(1)}°C`,
          targetValue: `${targetTemp.toFixed(1)}°C`,
          action: 'Run exhaust fans to cool chamber',
          message: 'Run exhaust fans to cool chamber',
          icon: 'thermometer-chevron-up',
          metric: 'temp',
        });
      } else if (isTempCriticalLow) {
        list.push({
          id: 'temp-critical-low',
          type: 'critical',
          title: 'Critically Low Temp',
          shortLabel: `Low Temp • ${temp.toFixed(1)}°C`,
          currentValue: `${temp.toFixed(1)}°C`,
          targetValue: `${targetTemp.toFixed(1)}°C`,
          action: 'Reduce fan ventilation to retain heat',
          message: 'Reduce fan ventilation to retain heat',
          icon: 'snowflake-alert',
          metric: 'temp',
        });
      } else if (isTempLow) {
        list.push({
          id: 'temp-low',
          type: 'warning',
          title: 'Temperature Below Target',
          shortLabel: `Low Temp • ${temp.toFixed(1)}°C`,
          currentValue: `${temp.toFixed(1)}°C`,
          targetValue: `${targetTemp.toFixed(1)}°C`,
          action: 'Reduce fan ventilation to retain heat',
          message: 'Reduce fan ventilation to retain heat',
          icon: 'thermometer-chevron-down',
          metric: 'temp',
        });
      }
    }

    // 6. Humidity Environmental Alerts (Unambiguous text; Warns only on significant deviation)
    if (!health.humError && hum > 0 && hum !== -999) {
      const isHumCriticalLow = hum < targetHum - 25;
      const isHumLow = hum < targetHum - 12; // Minor drift ignored; warns when humidity is genuinely deficient
      const isHumCriticalHigh = hum > 98;
      const isHumHigh = hum > targetHum + 10 && hum > 95;

      if (isHumCriticalLow) {
        list.push({
          id: 'hum-critical-low',
          type: 'critical',
          title: 'Critically Low Humidity',
          shortLabel: `Dry Air • ${Math.round(hum)}%`,
          currentValue: `${Math.round(hum)}%`,
          targetValue: `${targetHum}%`,
          action: `Run misters to raise humidity to ${targetHum}%`,
          message: `Run misters to raise humidity to ${targetHum}%`,
          icon: 'water-percent-alert',
          metric: 'hum',
        });
      } else if (isHumLow) {
        list.push({
          id: 'hum-low',
          type: 'warning',
          title: 'Humidity Below Target',
          shortLabel: `Low Humidity • ${Math.round(hum)}%`,
          currentValue: `${Math.round(hum)}%`,
          targetValue: `${targetHum}%`,
          action: `Run misters to raise humidity to ${targetHum}%`,
          message: `Run misters to raise humidity to ${targetHum}%`,
          icon: 'water-minus',
          metric: 'hum',
        });
      } else if (isHumCriticalHigh) {
        list.push({
          id: 'hum-critical-high',
          type: 'critical',
          title: 'Excessive Humidity',
          shortLabel: `Saturated • ${Math.round(hum)}%`,
          currentValue: `${Math.round(hum)}%`,
          targetValue: `${targetHum}%`,
          action: 'Run exhaust fans to reduce moisture',
          message: 'Run exhaust fans to reduce moisture',
          icon: 'water-plus',
          metric: 'hum',
        });
      } else if (isHumHigh) {
        list.push({
          id: 'hum-high',
          type: 'warning',
          title: 'Humidity Above Target',
          shortLabel: `High Humidity • ${Math.round(hum)}%`,
          currentValue: `${Math.round(hum)}%`,
          targetValue: `${targetHum}%`,
          action: 'Run exhaust fans to reduce moisture',
          message: 'Run exhaust fans to reduce moisture',
          icon: 'water-plus',
          metric: 'hum',
        });
      }
    }

    // 7. Light Environmental Alerts (Warns only on significant over-illumination)
    if (!health.lightError && light >= 0 && light !== -999) {
      const isLightHigh = light > targetLight + 400;

      if (isLightHigh) {
        list.push({
          id: 'light-high',
          type: 'warning',
          title: 'Light Above Target',
          shortLabel: `Bright Light • ${Math.round(light)} lx`,
          currentValue: `${Math.round(light)} lx`,
          targetValue: `${targetLight} lx`,
          action: 'Dim or turn off grow lights',
          message: 'Dim or turn off grow lights',
          icon: 'weather-sunny-alert',
          metric: 'light',
        });
      }
    }

    // 8. Critical unresolved alerts from Firebase Alerts collection
    if (alerts && alerts.length > 0) {
      const unresolvedCritical = alerts.filter(a => !a.resolved && a.type === 'critical');
      for (const crit of unresolvedCritical) {
        if (!list.some(l => l.title === crit.title || l.id === crit.id)) {
          list.push({
            id: crit.id || `fb-${Math.random()}`,
            type: 'critical',
            title: crit.title || 'System Alert',
            shortLabel: crit.title || 'System Alert',
            action: 'Check system controls',
            message: crit.message || 'Action required.',
            icon: 'alert-circle',
            metric: 'system',
          });
        }
      }
    }

    const hasCritical = list.some(a => a.type === 'critical');
    const hasWarning = list.length > 0;

    return {
      activeAlerts: list,
      hasWarning,
      hasCritical,
      count: list.length,
      primaryAlert: list[0] || null,
      health,
      waterLevel,
    };
  }, [sensors, settings, health, alerts]);
}
