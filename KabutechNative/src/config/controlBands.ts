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
    exhaustTempOn: tempMax + tempGrace,        // 27.0 °C (ON beyond grace)
    exhaustTempOff: tempMax + tempGrace,       // 27.0 °C (OFF as soon as returned to optimal <= 27.0 °C)
    exhaustCo2On: co2Max + co2Grace,           // 1150 ppm (ON beyond grace)
    exhaustCo2Off: co2Max + co2Grace,          // 1150 ppm (OFF as soon as returned to optimal <= 1150 ppm)
    exhaustHumOn: humMax + humGrace,           // 100 % (ON only if 100% saturated)
    exhaustHumOff: humMax + humGrace,          // 100 % (OFF once inside normal crop range <= 100 %)
    misterOn: humMin - humGrace,               // 75 % (ON when dry)
    misterOff: humMin - humGrace,              // 75 % (OFF as soon as returned to optimal >= 75 %)
    lightsOn: lightMin - lightGrace,           // 100 lx (ON when dark)
    lightsOff: lightMin - lightGrace,          // 100 lx (OFF as soon as returned to optimal target >= 100 lx; was 300 lx)
    tempColdBelow: tempMin - tempGrace,        // 16.0 °C
  };
};
