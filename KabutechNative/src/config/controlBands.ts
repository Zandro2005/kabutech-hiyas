import { ACTIVE_PROFILE, CropProfile } from './cropProfiles';

/**
 * Control thresholds with hysteresis and grace bearing.
 * Derived dynamically from the literature crop profile.
 */
export interface ControlBands {
  exhaustTempOn: number;  // Temp above which exhaust fan turns ON (27.0 °C)
  exhaustTempOff: number; // Temp below which exhaust fan turns OFF (25.0 °C)
  exhaustCo2On: number;   // CO2 above which exhaust fan turns ON (1150 ppm)
  exhaustCo2Off: number;  // CO2 below which exhaust fan turns OFF (900 ppm)
  exhaustHumOn: number;   // Hum above which exhaust fan turns ON (100 %)
  exhaustHumOff: number;  // Hum below which exhaust fan turns OFF (92 %)
  misterOn: number;       // Hum below which misters turn ON (75 %)
  misterOff: number;      // Hum above which misters turn OFF (88 %)
  lightsOn: number;       // Light below which grow lights turn ON (100 lx)
  lightsOff: number;      // Light above which grow lights turn OFF (300 lx)
  tempColdBelow: number;  // Temp below which fans are locked OFF to retain heat (16.0 °C)
}

export const getControlBands = (p: CropProfile = ACTIVE_PROFILE): ControlBands => {
  const tempMax = p.temp.max ?? 25;
  const tempMin = p.temp.min ?? 18;
  const tempGrace = p.temp.graceBearing ?? 2.0;

  const humMax = p.hum.max ?? 95;
  const humMin = p.hum.min ?? 80;
  const humGrace = p.hum.graceBearing ?? 5.0;

  const co2Max = p.co2.max ?? 1000;
  const co2Grace = p.co2.graceBearing ?? 150;

  const lightMin = p.light.min ?? 150;
  const lightGrace = p.light.graceBearing ?? 50;

  return {
    exhaustTempOn: tempMax + tempGrace, // 27.0 °C
    exhaustTempOff: tempMax,            // 25.0 °C
    exhaustCo2On: co2Max + co2Grace,    // 1150 ppm
    exhaustCo2Off: co2Max - 100,        // 900 ppm
    exhaustHumOn: humMax + humGrace,    // 100 %
    exhaustHumOff: humMax - 3,          // 92 %
    misterOn: humMin - humGrace,        // 75 %
    misterOff: humMin + 8,              // 88 %
    lightsOn: lightMin - lightGrace,    // 100 lx
    lightsOff: lightMin + 150,          // 300 lx
    tempColdBelow: tempMin - tempGrace, // 16.0 °C
  };
};
