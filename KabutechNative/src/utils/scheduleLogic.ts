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

/**
 * Computes automatic device states based on live sensor readings and environmental setpoints.
 * Actuators actively mitigate detected environmental deviations:
 * - High Humidity -> Fans turn ON to exhaust moisture
 * - Low Temperature -> Fans turn OFF to retain heat
 * - High Temperature -> Fans turn ON to cool chamber
 * - High CO2 -> Fans turn ON to flush stale air
 * - Low Humidity -> Misters turn ON to raise moisture (with low-water safety cutoff)
 * - Low Light -> Lights turn ON to support mushroom photomorphogenesis
 */
export const computeAutoDevicesState = (
  sensors?: { temperature?: number; humidity?: number; light?: number; co2?: number; waterLevel?: number } | null,
  setpoints?: { temperature?: number; humidity?: number; light?: number; co2?: number } | null
) => {
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

  // ══════════════════════════════════════════════════════════════
  //  1. CO₂ PURGING & AIR VENTILATION (Exhaust Fans)
  // ══════════════════════════════════════════════════════════════
  // Action in alerts: "Run exhaust fans to ventilate"
  // When CO2 is elevated above setpoint, fans MUST turn ON to pull in fresh air.
  const needFansForCo2 = isCo2Valid && currentCO2 > (targetCO2 + 25);

  // ══════════════════════════════════════════════════════════════
  //  2. HUMIDITY REGULATION (Exhaust Fans & Misters)
  // ══════════════════════════════════════════════════════════════
  // HIGH Humidity Action: "Run exhaust fans to reduce moisture"
  // When humidity is above setpoint (+2.5%), exhaust fans turn ON to vent moisture
  const needFansForHum = isHumValid && currentHum > (targetHum + 2.5);

  // LOW Humidity Action: "Run misters to raise humidity to target"
  // When humidity is below setpoint (-2.0%), misters turn ON to raise moisture (if water safe)
  // Misters turn OFF when target is reached or if water is depleted
  const misters = isHumValid && isWaterSafe && currentHum < (targetHum - 2.0);

  // ══════════════════════════════════════════════════════════════
  //  3. TEMPERATURE REGULATION (Exhaust Fans)
  // ══════════════════════════════════════════════════════════════
  // HIGH Temperature Action: "Run exhaust fans to cool chamber"
  // When temperature is above setpoint (+0.5°C), exhaust fans turn ON
  const needFansForTemp = isTempValid && currentTemp > (targetTemp + 0.5);

  // LOW Temperature Action: "Reduce fan ventilation to retain heat"
  // If temperature is cold, we do not run fans for cooling.
  const isTempCold = isTempValid && currentTemp < (targetTemp - 2.0);

  // ══════════════════════════════════════════════════════════════
  //  4. UNIFIED EXHAUST FAN STATE
  // ══════════════════════════════════════════════════════════════
  // Fans turn ON if:
  // - CO2 is elevated (ventilate stale air)
  // - Humidity is high (exhaust moisture)
  // - Temperature is hot (cool chamber)
  //
  // Low temp suppresses fan cooling, but NEVER suppresses CO2 ventilation
  let fans = false;
  if (needFansForCo2) {
    fans = true; // CO2 air exchange is top priority
  } else if (needFansForHum) {
    fans = true; // Moisture reduction
  } else if (needFansForTemp && !isTempCold) {
    fans = true; // Active cooling
  }

  // ══════════════════════════════════════════════════════════════
  //  5. GROW LIGHT REGULATION
  // ══════════════════════════════════════════════════════════════
  // Action in alerts: "Turn on grow lights" when ambient light is dim
  // Turn OFF when light level satisfies the setpoint
  const lights = isLightValid && currentLight < (targetLight - 50);

  // ══════════════════════════════════════════════════════════════
  //  6. CO₂ VALVE
  // ══════════════════════════════════════════════════════════════
  // Stays closed during automated mushroom fruiting (CO2 flushing handled by exhaust fans)
  const co2 = false;

  return { fans, misters, lights, co2 };
};

