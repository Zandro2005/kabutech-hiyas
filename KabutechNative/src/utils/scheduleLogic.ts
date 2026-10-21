import { ScheduleSettings } from '../types/firebase';
import { ACTIVE_PROFILE, CropProfile } from '../config/cropProfiles';
import { getControlBands } from '../config/controlBands';

/**
 * Computes the expected real-time ON/OFF state of devices based on their schedule and the current time.
 */
export const computeScheduledDevicesState = (schedules?: ScheduleSettings | null) => {
  const state = {
    fanIn: false,
    fanOut: false,
    fans: false,
    misters: false,
    lights: false,
    valve: false,
    co2: false,
  };
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

  // Check Fans (both Fan In and Fan Out run on fan schedule)
  if (schedules.fans?.enabled && schedules.fans.windows) {
    for (const w of schedules.fans.windows) {
      if (isWithinWindow(w.startTime, w.endTime)) {
        state.fans = true;
        state.fanOut = true;
        state.fanIn = true;
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
  states: {
    fanIn: boolean;
    fanOut: boolean;
    fans: boolean;
    fansCo2?: boolean;
    fansTemp?: boolean;
    fansHum?: boolean;
    misters: boolean;
    lights: boolean;
    valve: boolean;
    co2: boolean;
  };
  reasons: {
    fans?: string;
    fanIn?: string;
    fanOut?: string;
    misters?: string;
    lights?: string;
    valve?: string;
    co2?: string;
    mistersBlocked?: string;
  };
}

/**
 * Computes automatic device states AND explicit rationales for why devices are active or blocked.
 * Grounded directly in literature crop profile bands with grace bearing and hysteresis.
 */
export const computeAutoDecision = (
  sensors?: { temperature?: number; humidity?: number; light?: number; co2?: number; waterLevel?: number } | null,
  previousDevicesOrSetpoints?: { fans?: boolean; misters?: boolean; lights?: boolean; fanIn?: boolean; fanOut?: boolean;[key: string]: any } | null,
  profile: CropProfile = ACTIVE_PROFILE
): AutoDecisionResult => {
  const bands = getControlBands(profile);

  // Support both direct device maps and setpoints containers ({ mode, devices: { ... } })
  const actualPrev =
    previousDevicesOrSetpoints &&
      typeof previousDevicesOrSetpoints === 'object' &&
      'devices' in previousDevicesOrSetpoints &&
      previousDevicesOrSetpoints.devices
      ? previousDevicesOrSetpoints.devices
      : previousDevicesOrSetpoints;

  // Check if argument provides previous device states for hysteresis
  const isPreviousDevices =
    actualPrev &&
    ('fans' in actualPrev ||
      'misters' in actualPrev ||
      'lights' in actualPrev ||
      'fanOut' in actualPrev);

  const prevFans = Boolean(
    isPreviousDevices && (actualPrev?.fans || actualPrev?.fanOut)
  );
  const prevMisters = Boolean(isPreviousDevices && actualPrev?.misters);
  const prevLights = Boolean(isPreviousDevices && actualPrev?.lights);

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

  // Cold temperature lockout: Shuts fans OFF to preserve room heat
  const isTempCold = isTempValid && currentTemp < bands.tempColdBelow;

  // Independent previous state tracking (prevents cross-trigger latching between CO2, Temp, and Humidity)
  const prevFansCo2 = Boolean(
    isPreviousDevices &&
    (actualPrev?.fansCo2 !== undefined
      ? actualPrev.fansCo2
      : prevFans && currentCO2 > bands.exhaustCo2Off)
  );

  const prevFansTemp = Boolean(
    isPreviousDevices &&
    (actualPrev?.fansTemp !== undefined
      ? actualPrev.fansTemp
      : prevFans && currentTemp > bands.exhaustTempOff)
  );

  const prevFansHum = Boolean(
    isPreviousDevices &&
    (actualPrev?.fansHum !== undefined
      ? actualPrev.fansHum
      : prevFans && currentHum > bands.exhaustHumOff)
  );

  // 1. CO₂ PURGING & AIR VENTILATION (Exhaust Fans with Hysteresis & Grace)
  // ON at >= 1150 ppm, turns OFF when <= 1000 ppm (returns to optimal target)
  const needFansForCo2 = isCo2Valid && (prevFansCo2 ? currentCO2 > bands.exhaustCo2Off : currentCO2 >= bands.exhaustCo2On);

  // 2. HUMIDITY REGULATION (Exhaust Fans & Misters with Hysteresis & Grace)
  // High humidity exhaust: ON at >= 100%, turns OFF when <= 95% (returns to normal crop range)
  const needFansForHum = isHumValid && (prevFansHum ? currentHum > bands.exhaustHumOff : currentHum >= bands.exhaustHumOn);

  // Misters: ON when hum < 75%, turns OFF when >= 84% (safely inside optimal 80-95% band)
  const needMistersForHum = isHumValid && (prevMisters ? currentHum < bands.misterOff : currentHum < bands.misterOn);

  let misters = false;
  if (needMistersForHum) {
    if (isWaterSafe) {
      misters = true;
      reasons.misters = `Humidity ${Math.round(currentHum)}% below research threshold (< ${bands.misterOn}%) - Islam et al. (2022)`;
    } else {
      reasons.mistersBlocked = `Water at ${Math.round(currentWater)}%: misting paused to protect pump`;
    }
  }

  // 3. TEMPERATURE REGULATION (Exhaust Fans with Hysteresis & Grace)
  // ON when temp > 27.0 °C, turns OFF when <= 26.0 °C (returns to safe optimal zone; avoids tropical lock-on)
  const needFansForTemp = isTempValid && (prevFansTemp ? currentTemp > bands.exhaustTempOff : currentTemp > bands.exhaustTempOn);

  // 4. UNIFIED EXHAUST FAN STATE
  let fans = false;
  let fansCo2 = false;
  let fansTemp = false;
  let fansHum = false;

  if (isTempCold) {
    fans = false;
    reasons.fans = `Ambient temp ${currentTemp.toFixed(1)}°C below safe biological floor (< ${bands.tempColdBelow}°C): fans locked OFF to retain heat`;
  } else {
    if (needFansForTemp) {
      fans = true;
      fansTemp = true;
      reasons.fans = `Temp ${currentTemp.toFixed(1)}°C exceeds research limit with grace (> ${bands.exhaustTempOn}°C) - Islam et al. (2022)`;
    } else if (needFansForCo2) {
      fans = true;
      fansCo2 = true;
      reasons.fans = `CO2 ${Math.round(currentCO2)} ppm exceeds allowable threshold with grace (>= ${bands.exhaustCo2On} ppm) - Bellettini et al. (2019)`;
    } else if (needFansForHum) {
      fans = true;
      fansHum = true;
      reasons.fans = `Humidity ${Math.round(currentHum)}% saturated - ventilating chamber`;
    }
  }

  // 5. GROW LIGHT REGULATION (with Hysteresis & Grace)
  // ON when light < 100 lx, turns OFF as soon as light reaches >= 150 lx (optimal research target)
  const needLights = isLightValid && (prevLights ? currentLight < bands.lightsOff : currentLight < bands.lightsOn);
  let lights = false;
  if (needLights) {
    lights = true;
    reasons.lights = `Light ${Math.round(currentLight)} lx below minimum (< ${bands.lightsOn} lx) - Bellettini et al. (2019)`;
  }

  // 6. SOLENOID VALVE & CO2 (Closed during oyster fruiting)
  const valve = false;
  const co2 = false;

  return {
    states: {
      fanIn: fans,
      fanOut: fans,
      fans,
      fansCo2,
      fansTemp,
      fansHum,
      misters,
      lights,
      valve,
      co2,
    },
    reasons,
  };
};

/**
 * Returns the computed automatic device states.
 */
export const computeAutoDevicesState = (
  sensors?: { temperature?: number; humidity?: number; light?: number; co2?: number; waterLevel?: number } | null,
  previousDevicesOrSetpoints?: any,
  profile: CropProfile = ACTIVE_PROFILE
) => {
  const { states } = computeAutoDecision(sensors, previousDevicesOrSetpoints, profile);
  return {
    fans: states.fans,
    fanIn: states.fanIn,
    fanOut: states.fanOut,
    misters: states.misters,
    lights: states.lights,
    valve: states.valve,
    co2: states.co2,
  };
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
    const { reasons } = computeAutoDecision(sensors, activeDevices);

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
  } else if (normMode === 'scheduled' || normMode === 'timed') {
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


