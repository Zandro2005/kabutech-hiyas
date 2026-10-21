import { useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSensors, useSettings, useAlerts } from './useFirebaseData';
import { useSensorHealth, SensorHealthStatus } from './useSensorHealth';
import { computeScheduledDevicesState, computeAutoDevicesState } from '../utils/scheduleLogic';
import { evaluateParam } from '../utils/environmentRanges';
import { ACTIVE_PROFILE } from '../config/cropProfiles';


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
  unreadAlerts: EnvironmentAlertItem[];
  hasWarning: boolean;
  hasCritical: boolean;
  hasActiveWarning: boolean;
  count: number;
  totalCount: number;
  primaryAlert: EnvironmentAlertItem | null;
  health: SensorHealthStatus;
  waterLevel: number;
  dismissAlert: (id: string) => void;
  dismissAllAlerts: () => void;
  isDismissed: (id: string) => boolean;
}

const DISMISSED_STORAGE_KEY = '@kabutech_dismissed_env_alerts';
let globalDismissedIds = new Set<string>();
const inactiveSinceMap = new Map<string, number>();
const subscribers = new Set<() => void>();

AsyncStorage.getItem(DISMISSED_STORAGE_KEY)
  .then(raw => {
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          globalDismissedIds = new Set(parsed);
          subscribers.forEach(cb => cb());
        }
      } catch (_) { }
    }
  })
  .catch(() => { });

function notifySubscribers() {
  subscribers.forEach(cb => cb());
}

function persistDismissedIds() {
  AsyncStorage.setItem(
    DISMISSED_STORAGE_KEY,
    JSON.stringify(Array.from(globalDismissedIds))
  ).catch(() => { });
}

export function dismissEnvironmentAlert(id: string) {
  globalDismissedIds.add(id);
  persistDismissedIds();
  notifySubscribers();
}

export function dismissAllEnvironmentAlerts(ids?: string[]) {
  if (ids && ids.length > 0) {
    ids.forEach(id => globalDismissedIds.add(id));
  }
  persistDismissedIds();
  notifySubscribers();
}

export function clearDismissedEnvironmentAlert(id: string) {
  if (globalDismissedIds.has(id)) {
    globalDismissedIds.delete(id);
    persistDismissedIds();
    notifySubscribers();
  }
}

export function useEnvironmentAlerts(): EnvironmentAlertsResult {
  const sensors = useSensors();
  const settings = useSettings();
  const health = useSensorHealth();
  const alerts = useAlerts();

  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const cb = () => setRevision(r => r + 1);
    subscribers.add(cb);
    return () => {
      subscribers.delete(cb);
    };
  }, []);

  const result = useMemo(() => {
    const list: EnvironmentAlertItem[] = [];

    // Active device states (Auto mode, Scheduled mode, or Manual switches)
    const mode = settings?.setpoints?.mode || 'auto';
    const isAuto = mode === 'auto';
    const isScheduled = mode === 'scheduled';

    const activeDevices = isScheduled
      ? computeScheduledDevicesState(settings?.schedules)
      : isAuto
        ? computeAutoDevicesState(sensors, settings?.setpoints?.devices)
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

    // 3. Water Reservoir Level Alerts (Temporarily omitted while sensor is removed)
    const waterLevel = typeof sensors?.waterLevel === 'number' ? sensors.waterLevel : -999;

    const temp = typeof sensors?.temperature === 'number' ? sensors.temperature : 25;
    const hum = typeof sensors?.humidity === 'number' ? sensors.humidity : 80;
    const light = typeof sensors?.light === 'number' ? sensors.light : 500;
    const co2 = typeof sensors?.co2 === 'number' ? sensors.co2 : 600;

    const tempEval = evaluateParam('temp', temp, health.tempError || !health.isControllerOnline, ACTIVE_PROFILE);
    const humEval = evaluateParam('hum', hum, health.humError || !health.isControllerOnline, ACTIVE_PROFILE);
    const co2Eval = evaluateParam('co2', co2, health.co2Error || !health.isControllerOnline, ACTIVE_PROFILE);
    const lightEval = evaluateParam('light', light, health.lightError || !health.isControllerOnline, ACTIVE_PROFILE);

    // 4. CO2 Environmental Alerts
    if (!health.co2Error && co2Eval.state !== 'fault' && co2Eval.state !== 'in_range') {
      if (co2Eval.state === 'high') {
        const isCo2Critical = co2Eval.severity === 'critical';
        list.push({
          id: isCo2Critical ? 'co2-critical' : 'co2-elevated',
          type: isCo2Critical ? 'critical' : 'warning',
          title: isCo2Critical ? 'Critically High CO2' : 'CO2 Above Crop Range',
          shortLabel: `High CO2 - ${Math.round(co2)} ppm`,
          currentValue: `${Math.round(co2)} ppm`,
          targetValue: co2Eval.rangeText,
          action: 'Run exhaust fans to ventilate',
          message: `CO2 reached ${Math.round(co2)} ppm (Crop range: ${co2Eval.rangeText}). Ventilate chamber immediately.`,
          icon: 'molecule-co2',
          metric: 'co2',
        });
      }
    }

    // 5. Temperature Environmental Alerts
    if (!health.tempError && tempEval.state !== 'fault' && tempEval.state !== 'in_range') {
      if (tempEval.state === 'high') {
        const isCritical = tempEval.severity === 'critical';
        list.push({
          id: isCritical ? 'temp-critical-high' : 'temp-high',
          type: isCritical ? 'critical' : 'warning',
          title: isCritical ? 'Critically High Temp' : 'Temperature Above Crop Range',
          shortLabel: `High Temp - ${temp.toFixed(1)}°C`,
          currentValue: `${temp.toFixed(1)}°C`,
          targetValue: tempEval.rangeText,
          action: 'Run exhaust fans to cool chamber',
          message: `Temperature reached ${temp.toFixed(1)}°C (Crop range: ${tempEval.rangeText}). Run exhaust fans to cool chamber.`,
          icon: isCritical ? 'thermometer-alert' : 'thermometer-chevron-up',
          metric: 'temp',
        });
      } else if (tempEval.state === 'low') {
        const isCritical = tempEval.severity === 'critical';
        list.push({
          id: isCritical ? 'temp-critical-low' : 'temp-low',
          type: isCritical ? 'critical' : 'warning',
          title: isCritical ? 'Critically Low Temp' : 'Temperature Below Crop Range',
          shortLabel: `Low Temp - ${temp.toFixed(1)}°C`,
          currentValue: `${temp.toFixed(1)}°C`,
          targetValue: tempEval.rangeText,
          action: 'Reduce fan ventilation to retain heat',
          message: `Temperature dropped to ${temp.toFixed(1)}°C (Crop range: ${tempEval.rangeText}). Reduce fan ventilation to retain heat.`,
          icon: isCritical ? 'snowflake-alert' : 'thermometer-chevron-down',
          metric: 'temp',
        });
      }
    }

    // 6. Humidity Environmental Alerts
    if (!health.humError && humEval.state !== 'fault' && humEval.state !== 'in_range') {
      if (humEval.state === 'high') {
        const isCritical = humEval.severity === 'critical';
        list.push({
          id: isCritical ? 'hum-critical-high' : 'hum-high',
          type: isCritical ? 'critical' : 'warning',
          title: isCritical ? 'Excessive Humidity Alert' : 'Humidity Above Crop Range',
          shortLabel: `Saturated - ${Math.round(hum)}%`,
          currentValue: `${Math.round(hum)}%`,
          targetValue: humEval.rangeText,
          action: 'Run exhaust fans to reduce moisture',
          message: `Humidity reached ${Math.round(hum)}% (Crop range: ${humEval.rangeText}). Ventilate chamber immediately.`,
          icon: 'water-plus',
          metric: 'hum',
        });
      } else if (humEval.state === 'low') {
        const isCritical = humEval.severity === 'critical';
        list.push({
          id: isCritical ? 'hum-critical-low' : 'hum-low',
          type: isCritical ? 'critical' : 'warning',
          title: isCritical ? 'Critically Low Humidity' : 'Humidity Below Crop Range',
          shortLabel: `Dry Air - ${Math.round(hum)}%`,
          currentValue: `${Math.round(hum)}%`,
          targetValue: humEval.rangeText,
          action: `Run misters to raise humidity to ${humEval.rangeText}`,
          message: `Humidity dropped to ${Math.round(hum)}% (Crop range: ${humEval.rangeText}). Run misters to balance.`,
          icon: isCritical ? 'water-percent-alert' : 'water-minus',
          metric: 'hum',
        });
      }
    }

    // 7. Light Environmental Alerts
    if (!health.lightError && lightEval.state !== 'fault' && lightEval.state !== 'in_range') {
      if (lightEval.state === 'high') {
        list.push({
          id: 'light-high',
          type: 'warning',
          title: 'Light Above Crop Range',
          shortLabel: `Bright Light - ${Math.round(light)} lx`,
          currentValue: `${Math.round(light)} lx`,
          targetValue: lightEval.rangeText,
          action: 'Dim or turn off grow lights',
          message: `Light level reached ${Math.round(light)} lx (Crop range: ${lightEval.rangeText}). Dim or turn off grow lights.`,
          icon: 'weather-sunny-alert',
          metric: 'light',
        });
      }
    }

    // 8. Critical unresolved alerts from Firebase Alerts collection (filtered to active within 24h)
    if (alerts && alerts.length > 0) {
      const now = Date.now();
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      const unresolvedCritical = alerts.filter(a => {
        if (!a || a.resolved || a.type !== 'critical') return false;
        if (a.timestamp) {
          const time = new Date(a.timestamp).getTime();
          if (!isNaN(time) && (now - time > TWENTY_FOUR_HOURS || time - now > 300_000)) {
            return false;
          }
        }
        return true;
      });
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

    // Auto-prune dismissed IDs only after sustained resolution (> 2 minutes) to prevent flapping
    const activeIdSet = new Set(list.map(a => a.id));
    const nowTs = Date.now();
    let pruned = false;
    for (const dismissedId of Array.from(globalDismissedIds)) {
      if (!activeIdSet.has(dismissedId)) {
        const inactiveStart = inactiveSinceMap.get(dismissedId);
        if (inactiveStart === undefined) {
          inactiveSinceMap.set(dismissedId, nowTs);
        } else if (nowTs - inactiveStart > 120_000) {
          // Sustained inactive for over 2 minutes -> genuinely resolved
          globalDismissedIds.delete(dismissedId);
          inactiveSinceMap.delete(dismissedId);
          pruned = true;
        }
      } else {
        // Still active or re-occurred within grace period -> reset inactive tracker
        inactiveSinceMap.delete(dismissedId);
      }
    }
    if (pruned) {
      persistDismissedIds();
    }

    // Only unread (undismissed) alerts trigger warnings and badges
    const unreadAlerts = list.filter(a => !globalDismissedIds.has(a.id));

    const hasWarning = unreadAlerts.length > 0;
    const hasCritical = unreadAlerts.some(a => a.type === 'critical');
    const hasActiveWarning = list.length > 0;

    return {
      activeAlerts: list,
      unreadAlerts,
      hasWarning,
      hasCritical,
      hasActiveWarning,
      count: unreadAlerts.length,
      totalCount: list.length,
      primaryAlert: unreadAlerts[0] || list[0] || null,
      health,
      waterLevel,
    };
  }, [sensors, settings, health, alerts, revision]);

  const dismissAlert = useCallback((id: string) => {
    dismissEnvironmentAlert(id);
  }, []);

  const dismissAllAlerts = useCallback(() => {
    dismissAllEnvironmentAlerts(result.activeAlerts.map(a => a.id));
  }, [result.activeAlerts]);

  const isDismissed = useCallback((id: string) => {
    return globalDismissedIds.has(id);
  }, []);

  return {
    ...result,
    dismissAlert,
    dismissAllAlerts,
    isDismissed,
  };
}
