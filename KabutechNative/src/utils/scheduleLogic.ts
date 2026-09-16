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
 */
export const computeAutoDevicesState = (
  sensors?: { temperature?: number; humidity?: number; light?: number; co2?: number } | null,
  setpoints?: { temperature?: number; humidity?: number; light?: number; co2?: number } | null
) => {
  const targetTemp = setpoints?.temperature ?? 28.0;
  const targetHum = setpoints?.humidity ?? 85.0;
  const targetLight = setpoints?.light ?? 580;
  const targetCO2 = setpoints?.co2 ?? 690;

  const currentTemp = typeof sensors?.temperature === 'number' ? sensors.temperature : 0;
  const currentHum = typeof sensors?.humidity === 'number' ? sensors.humidity : 0;
  const currentLight = typeof sensors?.light === 'number' ? sensors.light : 0;
  const currentCO2 = typeof sensors?.co2 === 'number' ? sensors.co2 : 0;

  // Temperature / Exhaust: Fans turn ON if hotter than setpoint + 0.5°C or CO2 is high (> target + 50 ppm)
  const fans = currentTemp > (targetTemp + 0.5) || currentCO2 > (targetCO2 + 50);

  // Humidity: Misters turn ON if humidity drops below target - 3%
  const misters = currentHum < (targetHum - 3.0);

  // Light: Lights turn ON if ambient light is below target - 50 lx
  const lights = currentLight < (targetLight - 50);

  // CO2 Valve / Intake: Turns ON if CO2 is above setpoint
  const co2 = currentCO2 > targetCO2;

  return { fans, misters, lights, co2 };
};

