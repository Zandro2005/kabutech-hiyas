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
