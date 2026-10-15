import { ScheduleSettings } from '../types/firebase';

/**
 * Computes the expected real-time ON/OFF state of devices based on their schedule and the current time.
 */
export const computeScheduledDevicesState = (schedules?: ScheduleSettings | null) => {
  const state = { fans: false, misters: false, lights: false, co2: false };
  if (!schedules) return state;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Helper to check if current time falls within a time window (e.g. "06:00" to "18:00")
  const isWithinWindow = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return false;
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    
    if (endMins > startMins) {
      // Normal day window (e.g., 08:00 to 17:00)
      return currentMinutes >= startMins && currentMinutes < endMins;
    } else {
      // Overnight window (e.g., 22:00 to 06:00)
      return currentMinutes >= startMins || currentMinutes < endMins;
    }
  };

  // Check Fans
  if (schedules.fans?.enabled && schedules.fans.windows) {
    for (const w of schedules.fans.windows) {
      if (isWithinWindow(w.startTime, w.endTime)) {
        state.fans = true;
        break;
      }
    }
  }

  // Check Lights
  if (schedules.lights?.enabled && schedules.lights.windows) {
    for (const w of schedules.lights.windows) {
      if (isWithinWindow(w.startTime, w.endTime)) {
        state.lights = true;
        break;
      }
    }
  }

  // Check Misters (duration and interval)
  if (schedules.misters?.enabled) {
    const durationMins = schedules.misters.durationMins || 30;
    const intervalHours = schedules.misters.intervalHours || 2;
    const intervalMins = intervalHours * 60;
    
    // Simplistic modulus approach based on minutes since midnight
    // e.g. interval = 120m, duration = 30m. 
    // From 00:00 to 00:30 it's ON. 02:00 to 02:30 it's ON.
    if (intervalMins > 0) {
      const remainder = currentMinutes % intervalMins;
      if (remainder < durationMins) {
        state.misters = true;
      }
    }
  }

  return state;
};

export interface AutoDecisionResult {
  states: { fans: boolean; misters: boolean; lights: boolean; co2: boolean };
  reasons: {
    fans?: string;
    misters?: string;
    lights?: string;
    co2?: string;
    mistersBlocked?: string;
  };
}

/**
 * Computes automatic device states AND explicit rationales for why devices are active or blocked.
 * Grounded in agricultural control thresholds and setpoints.
 */
export const computeAutoDecision = (
  sensors?: { temperature?: number; humidity?: number; light?: number; co2?: number; waterLevel?: number } | null,
  setpoints?: { temperature?: number; humidity?: number; light?: number; co2?: number } | null
): AutoDecisionResult => {
  const targetTemp = typeof setpoints?.temperature === 'number'
    ? setpoints.temperature
    : parseFloat(setpoints?.temperature as any) || 28.0;
  const targetHum = typeof setpoints?.humidity === 'number'
    ? setpoints.humidity
    : parseFloat(setpoints?.humidity as any) || 85.0;
  const targetLight = typeof setpoints?.light === 'number'
    ? setpoints.light
    : parseFloat(setpoints?.light as any) || 580;
  const targetCO2 = typeof setpoints?.co2 === 'number'
    ? setpoints.co2
    : parseFloat(setpoints?.co2 as any) || 690;

  const currentTemp = typeof sensors?.temperature === 'number'
    ? sensors.temperature
    : parseFloat(sensors?.temperature as any) || 0;
  const currentHum = typeof sensors?.humidity === 'number'
    ? sensors.humidity
    : parseFloat(sensors?.humidity as any) || 0;
  const currentLight = typeof sensors?.light === 'number'
    ? sensors.light
    : parseFloat(sensors?.light as any) || 0;
  const currentCO2 = typeof sensors?.co2 === 'number'
    ? sensors.co2
    : parseFloat(sensors?.co2 as any) || 0;
  const currentWater = typeof sensors?.waterLevel === 'number'
    ? sensors.waterLevel
    : parseFloat(sensors?.waterLevel as any) || 75;

  // Sensor validity checks (ignore disconnect / -999 / 0 fault values)
  const isTempValid = currentTemp > -50 && currentTemp !== -999 && currentTemp !== 0;
  const isHumValid = currentHum > 0 && currentHum !== -999;
  const isLightValid = currentLight >= 0 && currentLight !== -999;
  const isCo2Valid = currentCO2 > 0 && currentCO2 !== -999;
  const isWaterSafe = currentWater > 15; // Low water safety threshold to protect mister pump

  const reasons: AutoDecisionResult['reasons'] = {};

  // 1. CO₂ PURGING & AIR VENTILATION (Exhaust Fans)
  const needFansForCo2 = isCo2Valid && currentCO2 > (targetCO2 + 25);

  // 2. HUMIDITY REGULATION (Exhaust Fans & Misters)
  const needFansForHum = isHumValid && currentHum > (targetHum + 2.5);
  const needMistersForHum = isHumValid && currentHum < (targetHum - 2.0);

  let misters = false;
  if (needMistersForHum) {
    if (isWaterSafe) {
      misters = true;
      reasons.misters = `Humidity ${Math.round(currentHum)}% is below target ${Math.round(targetHum)}%`;
    } else {
      reasons.mistersBlocked = `Water at ${Math.round(currentWater)}%: misting paused to protect pump`;
    }
  }

  // 3. TEMPERATURE REGULATION (Exhaust Fans)
  const needFansForTemp = isTempValid && currentTemp > (targetTemp + 0.5);
  const isTempCold = isTempValid && currentTemp < (targetTemp - 2.0);

  // 4. UNIFIED EXHAUST FAN STATE
  let fans = false;
  if (needFansForCo2) {
    fans = true;
    reasons.fans = `CO₂ ${Math.round(currentCO2)} ppm is above target ${Math.round(targetCO2)} ppm`;
  } else if (needFansForHum) {
    fans = true;
    reasons.fans = `Humidity ${Math.round(currentHum)}% is above target ${Math.round(targetHum)}%`;
  } else if (needFansForTemp && !isTempCold) {
    fans = true;
    reasons.fans = `Temp ${currentTemp.toFixed(1)}°C is above target ${targetTemp.toFixed(1)}°C`;
  }

  // 5. GROW LIGHT REGULATION
  let lights = false;
  if (isLightValid && currentLight < (targetLight - 50)) {
    lights = true;
    reasons.lights = `Light ${Math.round(currentLight)} lx is below target ${Math.round(targetLight)} lx`;
  }

  // 6. CO₂ VALVE (Closed during oyster fruiting)
  const co2 = false;

  return {
    states: { fans, misters, lights, co2 },
    reasons,
  };
};

/**
 * Backwards-compatible wrapper returning only the device states.
 */
export const computeAutoDevicesState = (
  sensors?: { temperature?: number; humidity?: number; light?: number; co2?: number; waterLevel?: number } | null,
  setpoints?: { temperature?: number; humidity?: number; light?: number; co2?: number } | null
) => {
  return computeAutoDecision(sensors, setpoints).states;
};

export interface DeviceActivityExplanation {
  device: 'fans' | 'misters' | 'lights' | 'co2';
  label: string;
  isActive: boolean;
  reason: string;
  isWarning?: boolean;
}

/**
 * Produces structured explanations for why devices are active or idle in the current mode.
 */
export const explainDeviceActivity = (
  mode: string = 'auto',
  activeDevices: { fans: boolean; misters: boolean; lights: boolean; co2: boolean },
  sensors?: { temperature?: number; humidity?: number; light?: number; co2?: number; waterLevel?: number } | null,
  setpoints?: { temperature?: number; humidity?: number; light?: number; co2?: number } | null,
  schedules?: ScheduleSettings | null
): DeviceActivityExplanation[] => {
  const normMode = mode.toLowerCase();
  const list: DeviceActivityExplanation[] = [];

  if (normMode === 'auto') {
    const { reasons } = computeAutoDecision(sensors, setpoints);

    if (activeDevices.fans) {
      list.push({
        device: 'fans',
        label: 'Fans',
        isActive: true,
        reason: reasons.fans || 'Ventilating chamber',
      });
    }
    if (activeDevices.misters) {
      list.push({
        device: 'misters',
        label: 'Mister',
        isActive: true,
        reason: reasons.misters || 'Humidifying chamber',
      });
    } else if (reasons.mistersBlocked) {
      list.push({
        device: 'misters',
        label: 'Mister',
        isActive: false,
        reason: reasons.mistersBlocked,
        isWarning: true,
      });
    }
    if (activeDevices.lights) {
      list.push({
        device: 'lights',
        label: 'Lights',
        isActive: true,
        reason: reasons.lights || 'Fruiting photoperiod lighting active',
      });
    }
    if (activeDevices.co2) {
      list.push({
        device: 'co2',
        label: 'Valve',
        isActive: true,
        reason: 'Solenoid valve open',
      });
    }

    if (list.length === 0) {
      list.push({
        device: 'fans',
        label: 'System',
        isActive: false,
        reason: 'All devices idle • Chamber readings within setpoints',
      });
    }
  } else if (normMode === 'scheduled') {
    if (activeDevices.fans) {
      list.push({ device: 'fans', label: 'Fans', isActive: true, reason: 'Active on schedule window' });
    }
    if (activeDevices.misters) {
      list.push({
        device: 'misters',
        label: 'Mister',
        isActive: true,
        reason: `Misting interval (${schedules?.misters?.durationMins || 30}m every ${schedules?.misters?.intervalHours || 2}h)`,
      });
    }
    if (activeDevices.lights) {
      list.push({ device: 'lights', label: 'Lights', isActive: true, reason: 'Active on photoperiod schedule' });
    }
    if (list.length === 0) {
      list.push({ device: 'fans', label: 'Schedule', isActive: false, reason: 'Standby between scheduled cycles' });
    }
  } else {
    // Manual mode
    const activeNames: string[] = [];
    if (activeDevices.fans) activeNames.push('Fans');
    if (activeDevices.misters) activeNames.push('Mister');
    if (activeDevices.lights) activeNames.push('Lights');
    if (activeDevices.co2) activeNames.push('Valve');

    if (activeNames.length > 0) {
      list.push({
        device: 'fans',
        label: 'Manual Control',
        isActive: true,
        reason: `${activeNames.join(', ')} switched on manually by operator`,
      });
    } else {
      list.push({
        device: 'fans',
        label: 'Manual Control',
        isActive: false,
        reason: 'All actuators currently switched off manually',
      });
    }
  }

  return list;
};


